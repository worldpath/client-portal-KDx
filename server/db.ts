import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  userInvitations, InsertUserInvitation,
  folders, InsertFolder,
  files, InsertFile,
  folderPermissions, InsertFolderPermission,
  auditLogs, InsertAuditLog
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
