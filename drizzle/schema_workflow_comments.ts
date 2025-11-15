import { int, mysqlEnum, mysqlTable, text, timestamp, index } from "drizzle-orm/mysql-core";

/**
 * Workflow comments table for threaded discussions
 * Stores all approval/rejection comments and their replies
 */
export const workflowComments = mysqlTable("workflow_comments", {
  id: int("id").autoincrement().primaryKey(),
  workflowInstanceId: int("workflowInstanceId").notNull(),
  stageId: int("stageId").notNull(),
  fileId: int("fileId").notNull(), // Denormalized for easier querying
  userId: int("userId").notNull(), // Comment author
  commentType: mysqlEnum("commentType", ["approval", "rejection", "reply"]).notNull(),
  content: text("content").notNull(), // Comment text
  parentCommentId: int("parentCommentId"), // For threaded replies (null for top-level comments)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workflowInstanceIdx: index("workflow_instance_idx").on(table.workflowInstanceId),
  stageIdx: index("stage_idx").on(table.stageId),
  fileIdx: index("file_idx").on(table.fileId),
  userIdx: index("user_idx").on(table.userId),
  parentCommentIdx: index("parent_comment_idx").on(table.parentCommentId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type WorkflowComment = typeof workflowComments.$inferSelect;
export type InsertWorkflowComment = typeof workflowComments.$inferInsert;
