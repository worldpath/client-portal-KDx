import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for admin/client access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "client"]).default("client").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Template categories for organizing file templates
 */
export const templateCategories = mysqlTable("template_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
});

export type TemplateCategory = typeof templateCategories.$inferSelect;
export type InsertTemplateCategory = typeof templateCategories.$inferInsert;

/**
 * File templates library for standard forms, checklists, and protocols
 */
export const fileTemplates = mysqlTable("file_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId").notNull().references(() => templateCategories.id),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 127 }),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdFromRequestId: int("createdFromRequestId").references(() => templateRequests.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FileTemplate = typeof fileTemplates.$inferSelect;
export type InsertFileTemplate = typeof fileTemplates.$inferInsert;

/**
 * Template versions for tracking version history
 */
export const templateVersions = mysqlTable("template_versions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull().references(() => fileTemplates.id, { onDelete: 'cascade' }),
  versionNumber: int("versionNumber").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  size: int("size").notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  isLatest: int("isLatest").default(1).notNull(),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  changeNotes: text("changeNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = typeof templateVersions.$inferInsert;

/**
 * Template requests for user-submitted template needs
 */
export const templateRequests = mysqlTable("template_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull().references(() => users.id),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  description: text("description"),
  justification: text("justification").notNull(),
  categoryId: int("categoryId").references(() => templateCategories.id),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminId: int("adminId").references(() => users.id),
  adminComment: text("adminComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateRequest = typeof templateRequests.$inferSelect;
export type InsertTemplateRequest = typeof templateRequests.$inferInsert;

/**
 * User invitations for email-based invites
 */
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "client"]).default("client").notNull(),
  invitedBy: int("invitedBy").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  tokenIdx: index("token_idx").on(table.token),
}));

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

/**
 * Folders table with hierarchical structure
 */
export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: int("parentId"), // null for root folders
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentIdx: index("parent_idx").on(table.parentId),
  createdByIdx: index("created_by_idx").on(table.createdBy),
}));

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

/**
 * Files table with S3 references and metadata
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  url: text("url").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 127 }),
  size: int("size").notNull(), // bytes
  folderId: int("folderId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  currentVersion: int("currentVersion").default(1).notNull(), // Current version number
  workflowStatus: mysqlEnum("workflowStatus", ["draft", "under_review", "approved", "rejected"]).default("draft").notNull(),
  reviewerId: int("reviewerId"), // Legacy single reviewer (kept for backward compatibility)
  reviewNotes: text("reviewNotes"), // Legacy review notes
  reviewedAt: timestamp("reviewedAt"), // When review was completed
  approvalRequirement: mysqlEnum("approvalRequirement", [
    "all_must_approve",
    "majority_must_approve",
    "any_can_approve"
  ]).default("all_must_approve").notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration date
  isArchived: int("isArchived").default(0).notNull(), // 0 = active, 1 = archived
  archivedAt: timestamp("archivedAt"), // When file was archived
  archivedBy: int("archivedBy"), // User who archived the file
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  folderIdx: index("folder_idx").on(table.folderId),
  uploadedByIdx: index("uploaded_by_idx").on(table.uploadedBy),
}));

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * File versions table for tracking version history
 */
export const fileVersions = mysqlTable("file_versions", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(), // Reference to parent file
  versionNumber: int("versionNumber").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key for this version
  url: text("url").notNull(), // S3 URL for this version
  size: int("size").notNull(), // bytes
  changeDescription: text("changeDescription"), // Optional description of changes
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  fileIdx: index("file_idx").on(table.fileId),
  fileVersionIdx: index("file_version_idx").on(table.fileId, table.versionNumber),
  uploadedByIdx: index("uploaded_by_idx").on(table.uploadedBy),
}));

export type FileVersion = typeof fileVersions.$inferSelect;
export type InsertFileVersion = typeof fileVersions.$inferInsert;

/**
 * Folder permissions table for granular access control
 */
export const folderPermissions = mysqlTable("folder_permissions", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId").notNull(),
  userId: int("userId").notNull(),
  canView: boolean("canView").default(true).notNull(),
  canUpload: boolean("canUpload").default(false).notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  grantedBy: int("grantedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  folderUserIdx: index("folder_user_idx").on(table.folderId, table.userId),
  userIdx: index("user_idx").on(table.userId),
}));

export type FolderPermission = typeof folderPermissions.$inferSelect;
export type InsertFolderPermission = typeof folderPermissions.$inferInsert;

/**
 * Audit logs table for tracking all actions
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 64 }).notNull(), // e.g., "file_upload", "file_download", "permission_grant"
  entityType: varchar("entityType", { length: 32 }).notNull(), // e.g., "file", "folder", "user"
  entityId: int("entityId"), // ID of the affected entity
  details: text("details"), // JSON string with additional context
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  actionIdx: index("action_idx").on(table.action),
  entityIdx: index("entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Share links table for generating shareable file links
 */
export const shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(), // Unique shareable token
  createdBy: int("createdBy").notNull(), // User who created the share
  recipientEmail: varchar("recipientEmail", { length: 320 }), // Optional recipient email for notifications
  recipientName: varchar("recipientName", { length: 255 }), // Optional recipient name
  message: text("message"), // Optional personal message from sender
  password: varchar("password", { length: 255 }), // Bcrypt hashed password (optional)
  expiresAt: timestamp("expiresAt"), // Expiration date (optional)
  maxDownloads: int("maxDownloads"), // Maximum number of downloads (optional)
  downloadCount: int("downloadCount").default(0).notNull(), // Current download count
  isActive: boolean("isActive").default(true).notNull(), // Can be revoked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"), // Track last access
}, (table) => ({
  fileIdx: index("file_idx").on(table.fileId),
  tokenIdx: index("token_idx").on(table.token),
  createdByIdx: index("created_by_idx").on(table.createdBy),
}));

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;

/**
 * File comments table for collaboration
 */
export const fileComments = mysqlTable("file_comments", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  userId: int("userId").notNull(), // User who created the comment
  content: text("content").notNull(), // Comment text (supports markdown)
  parentId: int("parentId"), // For threaded replies
  isEdited: boolean("isEdited").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fileIdx: index("file_idx").on(table.fileId),
  userIdx: index("user_idx").on(table.userId),
  parentIdx: index("parent_idx").on(table.parentId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type FileComment = typeof fileComments.$inferSelect;
export type InsertFileComment = typeof fileComments.$inferInsert;

/**
 * Comment mentions table for @mention notifications
 */
export const commentMentions = mysqlTable("comment_mentions", {
  id: int("id").autoincrement().primaryKey(),
  commentId: int("commentId").notNull(),
  userId: int("userId").notNull(), // User who was mentioned
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  commentIdx: index("comment_idx").on(table.commentId),
  userIdx: index("user_idx").on(table.userId),
  isReadIdx: index("is_read_idx").on(table.isRead),
}));

export type CommentMention = typeof commentMentions.$inferSelect;
export type InsertCommentMention = typeof commentMentions.$inferInsert;

/**
 * File reviewers table for multi-reviewer approval workflows
 */
export const fileReviewers = mysqlTable("file_reviewers", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  reviewerId: int("reviewerId").notNull(), // User assigned as reviewer
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewNotes: text("reviewNotes"), // Reviewer's specific notes
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"), // When review was completed
}, (table) => ({
  fileIdx: index("file_idx").on(table.fileId),
  reviewerIdx: index("reviewer_idx").on(table.reviewerId),
  statusIdx: index("status_idx").on(table.reviewStatus),
  uniqueFileReviewer: index("unique_file_reviewer").on(table.fileId, table.reviewerId),
}));

export type FileReviewer = typeof fileReviewers.$inferSelect;
export type InsertFileReviewer = typeof fileReviewers.$inferInsert;

/**
 * User notification preferences table
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // One preference record per user
  
  // Email notification toggles
  emailReviewerAssignment: boolean("emailReviewerAssignment").default(true).notNull(),
  emailStatusChange: boolean("emailStatusChange").default(true).notNull(),
  emailMentions: boolean("emailMentions").default(true).notNull(),
  emailShareLinks: boolean("emailShareLinks").default(true).notNull(),
  
  // Delivery mode
  deliveryMode: mysqlEnum("deliveryMode", ["instant", "daily_digest"]).default("instant").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Recipient user
  type: mysqlEnum("type", [
    "file_upload",
    "file_approved", 
    "file_rejected",
    "comment_mention",
    "reviewer_assigned",
    "share_created"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  fileId: int("fileId"), // Related file (optional)
  isRead: int("isRead").default(0).notNull(), // 0 = unread, 1 = read
  snoozedUntil: timestamp("snoozedUntil"), // When snoozed notification should reappear
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  isReadIdx: index("is_read_idx").on(table.isRead),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============ WORKFLOW TEMPLATES ============

export const workflowTemplates = mysqlTable("workflow_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workflowStages = mysqlTable("workflow_stages", {
  id: int("id").autoincrement().primaryKey(),
  workflowTemplateId: int("workflowTemplateId").notNull(),
  stageName: varchar("stageName", { length: 255 }).notNull(),
  stageOrder: int("stageOrder").notNull(),
  requiredApprovals: int("requiredApprovals").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fileWorkflowInstances = mysqlTable("file_workflow_instances", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  workflowTemplateId: int("workflowTemplateId").notNull(),
  currentStageId: int("currentStageId"),
  status: mysqlEnum("status", ["in_progress", "completed", "rejected"]).default("in_progress").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const fileWorkflowStageProgress = mysqlTable("file_workflow_stage_progress", {
  id: int("id").autoincrement().primaryKey(),
  workflowInstanceId: int("workflowInstanceId").notNull(),
  stageId: int("stageId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "approved", "rejected"]).default("pending").notNull(),
  assignedReviewers: text("assignedReviewers"), // JSON array of reviewer IDs
  approvedBy: text("approvedBy"), // JSON array of reviewer IDs who approved
  approvalComments: text("approvalComments"), // JSON array of { userId, comment, timestamp }
  rejectedBy: int("rejectedBy"), // Reviewer ID who rejected
  rejectionReason: text("rejectionReason"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  actionTimestamp: timestamp("actionTimestamp"), // When approval/rejection happened
  actionUserId: int("actionUserId"), // Who performed the action
  undoneAt: timestamp("undoneAt"), // When action was undone
  undoneBy: int("undoneBy"), // Who undid the action
});

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert;
export type WorkflowStage = typeof workflowStages.$inferSelect;
export type InsertWorkflowStage = typeof workflowStages.$inferInsert;
export type FileWorkflowInstance = typeof fileWorkflowInstances.$inferSelect;
export type InsertFileWorkflowInstance = typeof fileWorkflowInstances.$inferInsert;
export type FileWorkflowStageProgress = typeof fileWorkflowStageProgress.$inferSelect;
export type InsertFileWorkflowStageProgress = typeof fileWorkflowStageProgress.$inferInsert;

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
  editedAt: timestamp("editedAt"), // When comment was last edited
  deletedAt: timestamp("deletedAt"), // Soft delete timestamp
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
