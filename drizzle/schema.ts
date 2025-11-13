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
 * User invitations table for email-based invites
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
