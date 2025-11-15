import { desc, eq, isNull, and } from "drizzle-orm";
import { workflowComments, users, InsertWorkflowComment } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Create a new workflow comment (approval, rejection, or reply)
 */
export async function createWorkflowComment(comment: InsertWorkflowComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workflowComments).values(comment);
  return result;
}

/**
 * Get all comments for a workflow stage (including nested replies)
 */
export async function getStageComments(workflowInstanceId: number, stageId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all comments for this stage
  const comments = await db
    .select({
      id: workflowComments.id,
      workflowInstanceId: workflowComments.workflowInstanceId,
      stageId: workflowComments.stageId,
      fileId: workflowComments.fileId,
      userId: workflowComments.userId,
      commentType: workflowComments.commentType,
      content: workflowComments.content,
      parentCommentId: workflowComments.parentCommentId,
      createdAt: workflowComments.createdAt,
      updatedAt: workflowComments.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(workflowComments)
    .leftJoin(users, eq(workflowComments.userId, users.id))
    .where(
      and(
        eq(workflowComments.workflowInstanceId, workflowInstanceId),
        eq(workflowComments.stageId, stageId)
      )
    )
    .orderBy(workflowComments.createdAt);

  return buildCommentTree(comments);
}

/**
 * Get a specific comment thread (comment and all its replies)
 */
export async function getCommentThread(commentId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get the parent comment
  const parentComment = await db
    .select({
      id: workflowComments.id,
      workflowInstanceId: workflowComments.workflowInstanceId,
      stageId: workflowComments.stageId,
      fileId: workflowComments.fileId,
      userId: workflowComments.userId,
      commentType: workflowComments.commentType,
      content: workflowComments.content,
      parentCommentId: workflowComments.parentCommentId,
      createdAt: workflowComments.createdAt,
      updatedAt: workflowComments.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(workflowComments)
    .leftJoin(users, eq(workflowComments.userId, users.id))
    .where(eq(workflowComments.id, commentId))
    .limit(1);

  if (parentComment.length === 0) return null;

  // Get all replies
  const replies = await db
    .select({
      id: workflowComments.id,
      workflowInstanceId: workflowComments.workflowInstanceId,
      stageId: workflowComments.stageId,
      fileId: workflowComments.fileId,
      userId: workflowComments.userId,
      commentType: workflowComments.commentType,
      content: workflowComments.content,
      parentCommentId: workflowComments.parentCommentId,
      createdAt: workflowComments.createdAt,
      updatedAt: workflowComments.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(workflowComments)
    .leftJoin(users, eq(workflowComments.userId, users.id))
    .where(eq(workflowComments.parentCommentId, commentId))
    .orderBy(workflowComments.createdAt);

  return {
    ...parentComment[0],
    replies,
  };
}

/**
 * Get comment count for a workflow stage
 */
export async function getStageCommentCount(workflowInstanceId: number, stageId: number) {
  const db = await getDb();
  if (!db) return 0;

  const comments = await db
    .select()
    .from(workflowComments)
    .where(
      and(
        eq(workflowComments.workflowInstanceId, workflowInstanceId),
        eq(workflowComments.stageId, stageId)
      )
    );

  return comments.length;
}

/**
 * Build a nested comment tree from flat array
 */
function buildCommentTree(comments: any[]) {
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id);
    if (comment.parentCommentId === null) {
      // Top-level comment
      rootComments.push(commentNode);
    } else {
      // Reply to another comment
      const parentNode = commentMap.get(comment.parentCommentId);
      if (parentNode) {
        parentNode.replies.push(commentNode);
      }
    }
  });

  return rootComments;
}

/**
 * Reply to a workflow comment
 */
export async function replyToComment(params: {
  parentCommentId: number;
  userId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get parent comment to inherit workflow context
  const parentComment = await db
    .select()
    .from(workflowComments)
    .where(eq(workflowComments.id, params.parentCommentId))
    .limit(1);

  if (parentComment.length === 0) {
    throw new Error("Parent comment not found");
  }

  const parent = parentComment[0];

  // Create reply
  const reply: InsertWorkflowComment = {
    workflowInstanceId: parent.workflowInstanceId,
    stageId: parent.stageId,
    fileId: parent.fileId,
    userId: params.userId,
    commentType: "reply",
    content: params.content,
    parentCommentId: params.parentCommentId,
  };

  const result = await db.insert(workflowComments).values(reply);
  return result;
}
