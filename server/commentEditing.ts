import { getDb } from "./db";
import { workflowComments } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

const EDIT_WINDOW_MINUTES = 15;

/**
 * Check if a comment can be edited (within 15-minute window and by author)
 */
export async function canEditComment(commentId: number, userId: number): Promise<{
  canEdit: boolean;
  reason?: string;
  timeRemaining?: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const comment = await db
    .select()
    .from(workflowComments)
    .where(eq(workflowComments.id, commentId))
    .limit(1);

  if (comment.length === 0) {
    return { canEdit: false, reason: "Comment not found" };
  }

  const commentData = comment[0];

  // Check if user is the author
  if (commentData.userId !== userId) {
    return { canEdit: false, reason: "You can only edit your own comments" };
  }

  // Check if comment is deleted
  if (commentData.deletedAt) {
    return { canEdit: false, reason: "Cannot edit deleted comments" };
  }

  // Check 15-minute window
  const createdAt = new Date(commentData.createdAt);
  const now = new Date();
  const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  if (minutesElapsed > EDIT_WINDOW_MINUTES) {
    return { canEdit: false, reason: "Edit window has expired (15 minutes)" };
  }

  const timeRemaining = Math.max(0, EDIT_WINDOW_MINUTES - minutesElapsed);

  return { canEdit: true, timeRemaining };
}

/**
 * Edit a comment
 */
export async function editComment(
  commentId: number,
  userId: number,
  newContent: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if comment can be edited
  const { canEdit, reason } = await canEditComment(commentId, userId);
  if (!canEdit) {
    return { success: false, error: reason };
  }

  // Update comment
  await db
    .update(workflowComments)
    .set({
      content: newContent,
      editedAt: new Date(),
    })
    .where(eq(workflowComments.id, commentId));

  // Note: Audit logging handled by router

  return { success: true };
}

/**
 * Soft delete a comment
 */
export async function deleteComment(
  commentId: number,
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const comment = await db
    .select()
    .from(workflowComments)
    .where(eq(workflowComments.id, commentId))
    .limit(1);

  if (comment.length === 0) {
    return { success: false, error: "Comment not found" };
  }

  const commentData = comment[0];

  // Check if user is the author
  if (commentData.userId !== userId) {
    return { success: false, error: "You can only delete your own comments" };
  }

  // Check if already deleted
  if (commentData.deletedAt) {
    return { success: false, error: "Comment already deleted" };
  }

  // Soft delete
  await db
    .update(workflowComments)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(workflowComments.id, commentId));

  // Note: Audit logging handled by router

  return { success: true };
}
