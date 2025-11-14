import { and, desc, eq, inArray, isNull, or, sql, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  userInvitations, InsertUserInvitation,
  folders, InsertFolder,
  files, InsertFile,
  fileVersions, InsertFileVersion,
  folderPermissions, InsertFolderPermission,
  auditLogs, InsertAuditLog,
  shareLinks, InsertShareLink,
  fileComments,
  commentMentions
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "client") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============ USER INVITATION OPERATIONS ============

export async function createInvitation(invitation: InsertUserInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userInvitations).values(invitation);
  return result;
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userInvitations).where(eq(userInvitations.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateInvitationStatus(id: number, status: "pending" | "accepted" | "expired") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userInvitations).set({ status }).where(eq(userInvitations.id, id));
}

export async function getPendingInvitations() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(userInvitations)
    .where(eq(userInvitations.status, "pending"))
    .orderBy(desc(userInvitations.createdAt));
}

// ============ FOLDER OPERATIONS ============

export async function createFolder(folder: InsertFolder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(folders).values(folder);
  return result;
}

export async function getFolderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRootFolders() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(folders)
    .where(isNull(folders.parentId))
    .orderBy(folders.name);
}

export async function getSubfolders(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(folders)
    .where(eq(folders.parentId, parentId))
    .orderBy(folders.name);
}

export async function deleteFolder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(folders).where(eq(folders.id, id));
}

export async function updateFolder(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(folders).set({ name }).where(eq(folders.id, id));
}

// ============ FILE OPERATIONS ============

export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(files).values(file);
  return result;
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFilesByFolder(folderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(files)
    .where(eq(files.folderId, folderId))
    .orderBy(desc(files.createdAt));
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(files).where(eq(files.id, id));
}

export async function updateFileContent(id: number, url: string, fileKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(files).set({ url, fileKey }).where(eq(files.id, id));
}

export async function updateFile(id: number, updates: Partial<InsertFile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(files).set(updates).where(eq(files.id, id));
}

// ============ PERMISSION OPERATIONS ============

export async function grantFolderPermission(permission: InsertFolderPermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(folderPermissions).values(permission);
  return result;
}

export async function getFolderPermission(folderId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(folderPermissions)
    .where(and(
      eq(folderPermissions.folderId, folderId),
      eq(folderPermissions.userId, userId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFolderPermissionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(folderPermissions)
    .where(eq(folderPermissions.userId, userId));
}

export async function getFolderPermissionsByFolder(folderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(folderPermissions)
    .where(eq(folderPermissions.folderId, folderId));
}

export async function updateFolderPermission(
  id: number,
  updates: Partial<Pick<InsertFolderPermission, "canView" | "canUpload" | "canEdit" | "canDelete">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(folderPermissions).set(updates).where(eq(folderPermissions.id, id));
}

export async function revokeFolderPermission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(folderPermissions).where(eq(folderPermissions.id, id));
}

export async function checkFolderAccess(userId: number, folderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const permissions = await db.select()
    .from(folderPermissions)
    .where(and(
      eq(folderPermissions.userId, userId),
      eq(folderPermissions.folderId, folderId),
      eq(folderPermissions.canView, true)
    ))
    .limit(1);
  
  return permissions.length > 0;
}

// ============ AUDIT LOG OPERATIONS ============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  entityType?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(auditLogs);
  
  const conditions = [];
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(auditLogs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getRecentAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============ FILE VERSION OPERATIONS ============

export async function createFileVersion(version: InsertFileVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(fileVersions).values(version);
  return result;
}

export async function getFileVersions(fileId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(fileVersions)
    .where(eq(fileVersions.fileId, fileId))
    .orderBy(desc(fileVersions.versionNumber));
}

export async function getFileVersion(fileId: number, versionNumber: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(fileVersions)
    .where(and(
      eq(fileVersions.fileId, fileId),
      eq(fileVersions.versionNumber, versionNumber)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getLatestFileVersion(fileId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(fileVersions)
    .where(eq(fileVersions.fileId, fileId))
    .orderBy(desc(fileVersions.versionNumber))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

// ============ SEARCH OPERATIONS ============

export async function searchFiles(query: string, userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Search by file name using LIKE
  const searchPattern = `%${query}%`;
  
  if (userRole === 'admin') {
    // Admin can search all files
    return await db.select({
      id: files.id,
      name: files.name,
      size: files.size,
      mimeType: files.mimeType,
      url: files.url,
      fileKey: files.fileKey,
      folderId: files.folderId,
      createdAt: files.createdAt,
      folderName: folders.name,
    })
      .from(files)
      .leftJoin(folders, eq(files.folderId, folders.id))
      .where(like(files.name, searchPattern))
      .orderBy(desc(files.createdAt))
      .limit(100);
  } else {
    // Clients can only search files in folders they have access to
    const accessibleFolderIds = await db.select({ folderId: folderPermissions.folderId })
      .from(folderPermissions)
      .where(and(
        eq(folderPermissions.userId, userId),
        eq(folderPermissions.canView, true)
      ));
    
    if (accessibleFolderIds.length === 0) return [];
    
    const folderIds = accessibleFolderIds.map(f => f.folderId);
    
    return await db.select({
      id: files.id,
      name: files.name,
      size: files.size,
      mimeType: files.mimeType,
      url: files.url,
      fileKey: files.fileKey,
      folderId: files.folderId,
      createdAt: files.createdAt,
      folderName: folders.name,
    })
      .from(files)
      .leftJoin(folders, eq(files.folderId, folders.id))
      .where(and(
        like(files.name, searchPattern),
        inArray(files.folderId, folderIds)
      ))
      .orderBy(desc(files.createdAt))
      .limit(100);
  }
}

export async function getFolderPath(folderId: number): Promise<Array<{ id: number; name: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const path: Array<{ id: number; name: string }> = [];
  let currentId: number | null = folderId;
  
  while (currentId !== null) {
    const folder = await db.select()
      .from(folders)
      .where(eq(folders.id, currentId))
      .limit(1);
    
    if (folder.length === 0) break;
    
    path.unshift({ id: folder[0].id, name: folder[0].name });
    currentId = folder[0].parentId;
  }
  
  return path;
}

// ============ SHARE LINK OPERATIONS ============

export async function createShareLink(data: InsertShareLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(shareLinks).values(data);
  return result[0].insertId;
}

export async function getShareLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(shareLinks)
    .where(eq(shareLinks.token, token))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getShareLinksByFile(fileId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(shareLinks)
    .where(and(
      eq(shareLinks.fileId, fileId),
      eq(shareLinks.isActive, true)
    ))
    .orderBy(desc(shareLinks.createdAt));
}

export async function updateShareLinkAccess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(shareLinks)
    .set({
      downloadCount: sql`${shareLinks.downloadCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(shareLinks.id, id));
}

export async function revokeShareLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(shareLinks)
    .set({ isActive: false })
    .where(eq(shareLinks.id, id));
}

// ============ ANALYTICS & STATISTICS ============

export async function getUserStorageUsage(userId: number) {
  const db = await getDb();
  if (!db) return { totalSize: 0, fileCount: 0 };
  
  // Get all folders accessible to user
  const permissions = await db.select()
    .from(folderPermissions)
    .where(and(
      eq(folderPermissions.userId, userId),
      eq(folderPermissions.canView, true)
    ));
  
  if (permissions.length === 0) {
    return { totalSize: 0, fileCount: 0 };
  }
  
  const folderIds = permissions.map(p => p.folderId);
  
  // Get total size and count of files in accessible folders
  const result = await db.select({
    totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)`,
    fileCount: sql<number>`COUNT(${files.id})`,
  })
    .from(files)
    .where(inArray(files.folderId, folderIds));
  
  return result[0] || { totalSize: 0, fileCount: 0 };
}

export async function getUserStorageByFolder(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all folders accessible to user
  const permissions = await db.select()
    .from(folderPermissions)
    .where(and(
      eq(folderPermissions.userId, userId),
      eq(folderPermissions.canView, true)
    ));
  
  if (permissions.length === 0) return [];
  
  const folderIds = permissions.map(p => p.folderId);
  
  // Get storage usage per folder
  const result = await db.select({
    folderId: files.folderId,
    folderName: folders.name,
    totalSize: sql<number>`SUM(${files.size})`,
    fileCount: sql<number>`COUNT(${files.id})`,
  })
    .from(files)
    .innerJoin(folders, eq(files.folderId, folders.id))
    .where(inArray(files.folderId, folderIds))
    .groupBy(files.folderId, folders.name);
  
  return result;
}

export async function getUserRecentActivity(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  // Get recent audit logs for the user
  return await db.select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getUserQuickStats(userId: number) {
  const db = await getDb();
  if (!db) return {
    totalFiles: 0,
    totalFolders: 0,
    totalShares: 0,
    recentDownloads: 0,
  };
  
  // Get accessible folders
  const permissions = await db.select()
    .from(folderPermissions)
    .where(and(
      eq(folderPermissions.userId, userId),
      eq(folderPermissions.canView, true)
    ));
  
  const folderIds = permissions.map(p => p.folderId);
  
  // Count files
  const fileCount = folderIds.length > 0
    ? await db.select({ count: sql<number>`COUNT(*)` })
        .from(files)
        .where(inArray(files.folderId, folderIds))
    : [{ count: 0 }];
  
  // Count shares created by user
  const shareCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(shareLinks)
    .where(and(
      eq(shareLinks.createdBy, userId),
      eq(shareLinks.isActive, true)
    ));
  
  // Count recent downloads (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const downloadCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.userId, userId),
      eq(auditLogs.action, 'download_file'),
      sql`${auditLogs.createdAt} >= ${sevenDaysAgo}`
    ));
  
  return {
    totalFiles: fileCount[0]?.count || 0,
    totalFolders: folderIds.length,
    totalShares: shareCount[0]?.count || 0,
    recentDownloads: downloadCount[0]?.count || 0,
  };
}

export async function getUserRecentFiles(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  // Get accessible folders
  const permissions = await db.select()
    .from(folderPermissions)
    .where(and(
      eq(folderPermissions.userId, userId),
      eq(folderPermissions.canView, true)
    ));
  
  if (permissions.length === 0) return [];
  
  const folderIds = permissions.map(p => p.folderId);
  
  // Get recent files from accessible folders
  return await db.select()
    .from(files)
    .where(inArray(files.folderId, folderIds))
    .orderBy(desc(files.createdAt))
    .limit(limit);
}

// ============ FILE COMMENTS ============

export async function createComment(data: {
  fileId: number;
  userId: number;
  content: string;
  parentId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(fileComments).values(data);
  return result[0].insertId;
}

export async function getFileComments(fileId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const comments = await db.select({
    id: fileComments.id,
    fileId: fileComments.fileId,
    userId: fileComments.userId,
    userName: users.name,
    userEmail: users.email,
    content: fileComments.content,
    parentId: fileComments.parentId,
    isEdited: fileComments.isEdited,
    createdAt: fileComments.createdAt,
    updatedAt: fileComments.updatedAt,
  })
    .from(fileComments)
    .innerJoin(users, eq(fileComments.userId, users.id))
    .where(eq(fileComments.fileId, fileId))
    .orderBy(fileComments.createdAt);
  
  return comments;
}

export async function updateComment(commentId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(fileComments)
    .set({ content, isEdited: true })
    .where(eq(fileComments.id, commentId));
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete mentions first
  await db.delete(commentMentions)
    .where(eq(commentMentions.commentId, commentId));
  
  // Delete comment
  await db.delete(fileComments)
    .where(eq(fileComments.id, commentId));
}

export async function getCommentById(commentId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(fileComments)
    .where(eq(fileComments.id, commentId))
    .limit(1);
  
  return result[0] || null;
}

// ============ COMMENT MENTIONS ============

export async function createMention(commentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(commentMentions).values({
    commentId,
    userId,
  });
}

export async function getUserMentions(userId: number, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(commentMentions.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(commentMentions.isRead, false));
  }
  
  const mentions = await db.select({
    id: commentMentions.id,
    commentId: commentMentions.commentId,
    isRead: commentMentions.isRead,
    createdAt: commentMentions.createdAt,
    comment: {
      id: fileComments.id,
      content: fileComments.content,
      fileId: fileComments.fileId,
      userId: fileComments.userId,
      userName: users.name,
      createdAt: fileComments.createdAt,
    },
  })
    .from(commentMentions)
    .innerJoin(fileComments, eq(commentMentions.commentId, fileComments.id))
    .innerJoin(users, eq(fileComments.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(commentMentions.createdAt));
  
  return mentions;
}

export async function markMentionAsRead(mentionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(commentMentions)
    .set({ isRead: true })
    .where(eq(commentMentions.id, mentionId));
}

export async function getUnreadMentionCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(commentMentions)
    .where(and(
      eq(commentMentions.userId, userId),
      eq(commentMentions.isRead, false)
    ));
  
  return result[0]?.count || 0;
}

// Parse @mentions from comment text
export function parseMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

export async function getUsersByNames(names: string[]) {
  const db = await getDb();
  if (!db || names.length === 0) return [];
  
  return await db.select()
    .from(users)
    .where(sql`${users.name} IN (${sql.join(names.map(n => sql`${n}`), sql`, `)})`);
}
