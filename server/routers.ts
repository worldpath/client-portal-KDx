import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";
import crypto from "crypto";

// Helper to check if user is admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Helper to create audit log
async function logAction(
  userId: number,
  action: string,
  entityType: string,
  entityId?: number,
  details?: Record<string, any>,
  req?: any
) {
  await db.createAuditLog({
    userId,
    action,
    entityType,
    entityId: entityId ?? null,
    details: details ? JSON.stringify(details) : null,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ USER MANAGEMENT ============
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    invite: adminProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["admin", "client"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        await db.createInvitation({
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
          token,
          status: "pending",
          expiresAt,
        });

        await logAction(ctx.user.id, 'user_invite', 'user', undefined, { email: input.email, role: input.role }, ctx.req);

        return { 
          success: true, 
          inviteLink: `${process.env.VITE_OAUTH_PORTAL_URL || ''}/register?token=${token}` 
        };
      }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "client"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserRole(input.userId, input.role);
        await logAction(ctx.user.id, 'user_role_update', 'user', input.userId, { newRole: input.role }, ctx.req);
        return { success: true };
      }),

    pendingInvitations: adminProcedure.query(async () => {
      return await db.getPendingInvitations();
    }),
  }),

  // ============ FOLDER MANAGEMENT ============
  folders: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create folders' });
        }

        const result = await db.createFolder({
          name: input.name,
          parentId: input.parentId ?? null,
          createdBy: ctx.user.id,
        });

        const folderId = Number((result as any).insertId);
        await logAction(ctx.user.id, 'folder_create', 'folder', folderId, { name: input.name, parentId: input.parentId }, ctx.req);

        return { success: true, folderId };
      }),

    list: protectedProcedure
      .input(z.object({
        parentId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Admin sees all folders
        if (ctx.user.role === 'admin') {
          if (input.parentId) {
            return await db.getSubfolders(input.parentId);
          }
          return await db.getRootFolders();
        }

        // Client sees only folders they have permission to
        const permissions = await db.getFolderPermissionsByUser(ctx.user.id);
        const allowedFolderIds = permissions.filter(p => p.canView).map(p => p.folderId);

        if (allowedFolderIds.length === 0) return [];

        let folders;
        if (input.parentId) {
          folders = await db.getSubfolders(input.parentId);
        } else {
          folders = await db.getRootFolders();
        }

        return folders.filter(f => allowedFolderIds.includes(f.id));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const folder = await db.getFolderById(input.id);
        if (!folder) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Folder not found' });
        }

        // Check permission for clients
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(input.id, ctx.user.id);
          if (!permission || !permission.canView) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        return folder;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check for subfolders and files
        const subfolders = await db.getSubfolders(input.id);
        const folderFiles = await db.getFilesByFolder(input.id);

        if (subfolders.length > 0 || folderFiles.length > 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Cannot delete folder with subfolders or files' 
          });
        }

        await db.deleteFolder(input.id);
        await logAction(ctx.user.id, 'folder_delete', 'folder', input.id, {}, ctx.req);

        return { success: true };
      }),

    rename: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateFolder(input.id, input.name);
        await logAction(ctx.user.id, 'folder_rename', 'folder', input.id, { newName: input.name }, ctx.req);
        return { success: true };
      }),
  }),

  // ============ FILE MANAGEMENT ============
  files: router({
    upload: protectedProcedure
      .input(z.object({
        folderId: z.number(),
        name: z.string(),
        content: z.string(), // base64 encoded
        mimeType: z.string(),
        size: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(input.folderId, ctx.user.id);
          if (!permission || !permission.canUpload) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Upload permission denied' });
          }
        }

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.content, 'base64');
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const fileKey = `files/${ctx.user.id}/${input.folderId}/${randomSuffix}-${input.name}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Save to database
        const result = await db.createFile({
          name: input.name,
          fileKey,
          url,
          mimeType: input.mimeType,
          size: input.size,
          folderId: input.folderId,
          uploadedBy: ctx.user.id,
        });

        const fileId = Number((result as any).insertId);
        await logAction(ctx.user.id, 'file_upload', 'file', fileId, { 
          name: input.name, 
          folderId: input.folderId,
          size: input.size 
        }, ctx.req);

        return { success: true, fileId, url };
      }),

    list: protectedProcedure
      .input(z.object({ folderId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Check folder permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(input.folderId, ctx.user.id);
          if (!permission || !permission.canView) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        return await db.getFilesByFolder(input.folderId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const file = await db.getFileById(input.id);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }

        // Check folder permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canView) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        await logAction(ctx.user.id, 'file_view', 'file', input.id, { name: file.name }, ctx.req);

        return file;
      }),

    download: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.id);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }

        // Check folder permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canView) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        await logAction(ctx.user.id, 'file_download', 'file', input.id, { name: file.name }, ctx.req);

        return { url: file.url, name: file.name };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.id);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }

        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canDelete) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Delete permission denied' });
          }
        }

        await db.deleteFile(input.id);
        await logAction(ctx.user.id, 'file_delete', 'file', input.id, { name: file.name }, ctx.req);

        return { success: true };
      }),

    updateContent: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string(), // base64 encoded new content
      }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.id);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }

        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canEdit) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Edit permission denied' });
          }
        }

        // Upload new version to S3
        const buffer = Buffer.from(input.content, 'base64');
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const fileKey = `files/${ctx.user.id}/${file.folderId}/${randomSuffix}-${file.name}`;
        
        const { url } = await storagePut(fileKey, buffer, file.mimeType || 'text/plain');

        await db.updateFileContent(input.id, url, fileKey);
        await logAction(ctx.user.id, 'file_edit', 'file', input.id, { name: file.name }, ctx.req);

        return { success: true, url };
      }),
  }),

  // ============ PERMISSIONS MANAGEMENT ============
  permissions: router({
    grant: adminProcedure
      .input(z.object({
        folderId: z.number(),
        userId: z.number(),
        canView: z.boolean().default(true),
        canUpload: z.boolean().default(false),
        canEdit: z.boolean().default(false),
        canDelete: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if permission already exists
        const existing = await db.getFolderPermission(input.folderId, input.userId);
        
        if (existing) {
          await db.updateFolderPermission(existing.id, {
            canView: input.canView,
            canUpload: input.canUpload,
            canEdit: input.canEdit,
            canDelete: input.canDelete,
          });
        } else {
          await db.grantFolderPermission({
            folderId: input.folderId,
            userId: input.userId,
            canView: input.canView,
            canUpload: input.canUpload,
            canEdit: input.canEdit,
            canDelete: input.canDelete,
            grantedBy: ctx.user.id,
          });
        }

        await logAction(ctx.user.id, 'permission_grant', 'permission', undefined, {
          folderId: input.folderId,
          userId: input.userId,
          permissions: { canView: input.canView, canUpload: input.canUpload, canEdit: input.canEdit, canDelete: input.canDelete }
        }, ctx.req);

        return { success: true };
      }),

    revoke: adminProcedure
      .input(z.object({ permissionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.revokeFolderPermission(input.permissionId);
        await logAction(ctx.user.id, 'permission_revoke', 'permission', input.permissionId, {}, ctx.req);
        return { success: true };
      }),

    listByFolder: adminProcedure
      .input(z.object({ folderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFolderPermissionsByFolder(input.folderId);
      }),

    listByUser: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.userId ?? ctx.user.id;
        
        // Only admins can view other users' permissions
        if (userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        return await db.getFolderPermissionsByUser(userId);
      }),
  }),

  // ============ AUDIT LOGS ============
  audit: router({
    list: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return await db.getAuditLogs(input);
      }),

    recent: adminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return await db.getRecentAuditLogs(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
