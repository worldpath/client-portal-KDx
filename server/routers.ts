import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import * as db from "./db";
import crypto from "crypto";
import { 
  sendReviewerAssignmentNotification,
  sendStatusChangeNotification,
  sendMentionNotification,
  sendShareLinkNotification
} from "./_core/emailNotification";
import { createAndBroadcastNotification } from "./_core/notificationHelper";

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

    searchUsers: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        if (!input.query || input.query.length < 1) return [];
        return await db.searchUsers(input.query);
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

        const folderId = result.insertId;
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
        workflowTemplateId: z.number().optional(),
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
          currentVersion: 1,
        });

        const fileId = Number((result as any).insertId);
        
        // Create initial version record
        await db.createFileVersion({
          fileId,
          versionNumber: 1,
          fileKey,
          url,
          size: input.size,
          changeDescription: 'Initial upload',
          uploadedBy: ctx.user.id,
        });
        
        await logAction(ctx.user.id, 'file_upload', 'file', fileId, { 
          name: input.name, 
          folderId: input.folderId,
          size: input.size 
        }, ctx.req);

        // Notify admins of new file upload
        const admins = await db.getUsersByRole('admin');
        for (const admin of admins) {
          if (admin.id !== ctx.user.id) {
            await createAndBroadcastNotification({
              userId: admin.id,
              type: 'file_upload',
              title: 'New File Uploaded',
              message: `${ctx.user.name || 'A user'} uploaded "${input.name}"`,
              fileId,
            });
          }
        }

        // Assign workflow if specified
        if (input.workflowTemplateId) {
          await db.assignWorkflowToFile(fileId, input.workflowTemplateId);
        }

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
        changeDescription: z.string().optional(),
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
        const newSize = buffer.length;
        const newVersion = file.currentVersion + 1;

        // Create version record
        await db.createFileVersion({
          fileId: input.id,
          versionNumber: newVersion,
          fileKey,
          url,
          size: newSize,
          changeDescription: input.changeDescription || 'File updated',
          uploadedBy: ctx.user.id,
        });

        // Update file with new version
        await db.updateFileContent(input.id, url, fileKey);
        await db.updateFile(input.id, { currentVersion: newVersion });
        
        await logAction(ctx.user.id, 'file_edit', 'file', input.id, { 
          name: file.name,
          version: newVersion 
        }, ctx.req);

        return { success: true, url, version: newVersion };
      }),

    // Version history procedures
    getVersions: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
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

        const versions = await db.getFileVersions(input.fileId);
        
        // Get user info for each version
        const versionsWithUsers = await Promise.all(
          versions.map(async (version) => {
            const user = await db.getUserById(version.uploadedBy);
            return {
              ...version,
              uploadedByName: user?.name || 'Unknown',
            };
          })
        );

        return versionsWithUsers;
      }),

    restoreVersion: protectedProcedure
      .input(z.object({ 
        fileId: z.number(),
        versionNumber: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
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

        // Get the version to restore
        const version = await db.getFileVersion(input.fileId, input.versionNumber);
        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }

        const newVersion = file.currentVersion + 1;

        // Create new version record (restore creates a new version)
        await db.createFileVersion({
          fileId: input.fileId,
          versionNumber: newVersion,
          fileKey: version.fileKey,
          url: version.url,
          size: version.size,
          changeDescription: `Restored from version ${input.versionNumber}`,
          uploadedBy: ctx.user.id,
        });

        // Update file to point to restored version
        await db.updateFileContent(input.fileId, version.url, version.fileKey);
        await db.updateFile(input.fileId, { currentVersion: newVersion });
        
        await logAction(ctx.user.id, 'file_version_restore', 'file', input.fileId, { 
          name: file.name,
          restoredVersion: input.versionNumber,
          newVersion 
        }, ctx.req);

        return { success: true, version: newVersion };
      }),

    downloadVersion: protectedProcedure
      .input(z.object({ 
        fileId: z.number(),
        versionNumber: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
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

        const version = await db.getFileVersion(input.fileId, input.versionNumber);
        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }

        await logAction(ctx.user.id, 'file_version_download', 'file', input.fileId, { 
          name: file.name,
          version: input.versionNumber 
        }, ctx.req);

        return { url: version.url, name: file.name };
      }),

    // Bulk operations
    bulkDelete: protectedProcedure
      .input(z.object({ fileIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        if (input.fileIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No files selected' });
        }

        // Check permissions for each file
        const files = await Promise.all(
          input.fileIds.map(id => db.getFileById(id))
        );

        for (const file of files) {
          if (!file) continue;
          
          if (ctx.user.role === 'client') {
            const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
            if (!permission || !permission.canDelete) {
              throw new TRPCError({ 
                code: 'FORBIDDEN', 
                message: `Delete permission denied for file: ${file.name}` 
              });
            }
          }
        }

        // Delete all files
        await Promise.all(
          input.fileIds.map(id => db.deleteFile(id))
        );

        await logAction(ctx.user.id, 'bulk_file_delete', 'file', undefined, { 
          fileIds: input.fileIds,
          count: input.fileIds.length 
        }, ctx.req);

        return { success: true, count: input.fileIds.length };
      }),

    bulkMove: protectedProcedure
      .input(z.object({ 
        fileIds: z.array(z.number()),
        targetFolderId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.fileIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No files selected' });
        }

        // Check source permissions
        const files = await Promise.all(
          input.fileIds.map(id => db.getFileById(id))
        );

        for (const file of files) {
          if (!file) continue;
          
          if (ctx.user.role === 'client') {
            const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
            if (!permission || !permission.canDelete) {
              throw new TRPCError({ 
                code: 'FORBIDDEN', 
                message: `Move permission denied for file: ${file.name}` 
              });
            }
          }
        }

        // Check target folder permission
        if (ctx.user.role === 'client') {
          const targetPermission = await db.getFolderPermission(input.targetFolderId, ctx.user.id);
          if (!targetPermission || !targetPermission.canUpload) {
            throw new TRPCError({ 
              code: 'FORBIDDEN', 
              message: 'Upload permission denied for target folder' 
            });
          }
        }

        // Move all files
        await Promise.all(
          input.fileIds.map(id => 
            db.updateFile(id, { folderId: input.targetFolderId })
          )
        );

        await logAction(ctx.user.id, 'bulk_file_move', 'file', undefined, { 
          fileIds: input.fileIds,
          targetFolderId: input.targetFolderId,
          count: input.fileIds.length 
        }, ctx.req);

        return { success: true, count: input.fileIds.length };
      }),

    bulkDownload: protectedProcedure
      .input(z.object({ fileIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        if (input.fileIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No files selected' });
        }

        // Check permissions and get file info
        const fileInfos = [];
        for (const fileId of input.fileIds) {
          const file = await db.getFileById(fileId);
          if (!file) continue;

          if (ctx.user.role === 'client') {
            const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
            if (!permission || !permission.canView) {
              throw new TRPCError({ 
                code: 'FORBIDDEN', 
                message: `Access denied for file: ${file.name}` 
              });
            }
          }

          fileInfos.push({
            id: file.id,
            name: file.name,
            url: file.url,
          });
        }

        await logAction(ctx.user.id, 'bulk_file_download', 'file', undefined, { 
          fileIds: input.fileIds,
          count: fileInfos.length 
        }, ctx.req);

        return { files: fileInfos };
      }),
    
    activityTimeline: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        return await db.getFileActivityTimeline(input.fileId);
      }),
    
    versionsForComparison: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        return await db.getFileVersionsForComparison(input.fileId);
      }),
    
    setExpiration: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        expiresAt: z.string().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canEdit) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Edit permission required' });
          }
        }
        
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        await db.setFileExpiration(input.fileId, expiresAt);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'set_expiration',
          entityType: 'file',
          entityId: input.fileId,
          details: JSON.stringify({ expiresAt: input.expiresAt }),
        });
        
        return { success: true };
      }),
    
    archive: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canDelete) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Delete permission required' });
          }
        }
        
        await db.archiveFile(input.fileId, ctx.user.id);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'archive_file',
          entityType: 'file',
          entityId: input.fileId,
          details: JSON.stringify({ fileId: input.fileId }),
        });
        
        return { success: true };
      }),
    
    restoreArchived: adminProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.restoreArchivedFile(input.fileId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'restore_archived_file',
          entityType: 'file',
          entityId: input.fileId,
          details: JSON.stringify({ fileId: input.fileId }),
        });
        
        return { success: true };
      }),
    
    permanentlyDelete: adminProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.permanentlyDeleteFile(input.fileId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'permanently_delete_file',
          entityType: 'file',
          entityId: input.fileId,
          details: JSON.stringify({ fileId: input.fileId }),
        });
        
        return { success: true };
      }),
    
    getExpired: adminProcedure
      .query(async () => {
        return await db.getExpiredFiles();
      }),
    
    getArchived: adminProcedure
      .query(async () => {
        return await db.getArchivedFiles();
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

  // ============ SHARE LINKS ============
  share: router({
    create: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        recipientEmail: z.string().email().optional(),
        recipientName: z.string().optional(),
        message: z.string().optional(),
        password: z.string().optional(),
        expiresIn: z.number().optional(), // Hours until expiration
        maxDownloads: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user has access to the file
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permissions
        if (ctx.user.role !== 'admin') {
          const hasAccess = await db.checkFolderAccess(ctx.user.id, file.folderId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Hash password if provided
        let hashedPassword: string | undefined;
        if (input.password) {
          const bcrypt = await import('bcryptjs');
          hashedPassword = await bcrypt.hash(input.password, 10);
        }
        
        // Calculate expiration date
        let expiresAt: Date | undefined;
        if (input.expiresIn) {
          expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + input.expiresIn);
        }
        
        // Create share link
        const shareLinkId = await db.createShareLink({
          fileId: input.fileId,
          token,
          createdBy: ctx.user.id,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          message: input.message,
          password: hashedPassword,
          expiresAt,
          maxDownloads: input.maxDownloads,
        });
        
        // Log action
        await logAction(
          ctx.user.id,
          'create_share_link',
          'file',
          input.fileId,
          { token, expiresAt, maxDownloads: input.maxDownloads, recipientEmail: input.recipientEmail },
          ctx.req
        );
        
        // Send email notification if recipient email provided
        if (input.recipientEmail) {
          try {
            const baseUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
            const shareUrl = `${baseUrl}/share/${token}`;
            
            await sendShareLinkNotification({
              recipientEmail: input.recipientEmail,
              recipientName: input.recipientName || 'Recipient',
              fileName: file.name,
              sharedBy: ctx.user.name || 'User',
              shareUrl,
              expiresAt,
              hasPassword: !!input.password,
              message: input.message,
            });
          } catch (error) {
            console.error(`Failed to send share link notification:`, error);
            // Don't fail the share creation if email fails
          }
        }
        
        return { token, shareLinkId };
      }),
    
    list: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Check if user has access to the file
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check permissions
        if (ctx.user.role !== 'admin') {
          const hasAccess = await db.checkFolderAccess(ctx.user.id, file.folderId);
          if (!hasAccess) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        return await db.getShareLinksByFile(input.fileId);
      }),
    
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Get share link
        const shareLink = await db.getShareLinkByToken('');
        // We need to get by ID, let's add that function
        
        await db.revokeShareLink(input.id);
        
        // Log action
        await logAction(
          ctx.user.id,
          'revoke_share_link',
          'share_link',
          input.id,
          {},
          ctx.req
        );
        
        return { success: true };
      }),
    
    // Public procedure to access shared file
    access: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get share link
        const shareLink = await db.getShareLinkByToken(input.token);
        
        if (!shareLink || !shareLink.isActive) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Share link not found or expired' });
        }
        
        // Check expiration
        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Share link has expired' });
        }
        
        // Check max downloads
        if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Download limit reached' });
        }
        
        // Check password
        if (shareLink.password) {
          if (!input.password) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password required' });
          }
          
          const bcrypt = await import('bcryptjs');
          const isValid = await bcrypt.compare(input.password, shareLink.password);
          if (!isValid) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
          }
        }
        
        // Get file
        const file = await db.getFileById(shareLink.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Update access count
        await db.updateShareLinkAccess(shareLink.id);
        
        // Log access (use a system user ID for public access)
        await logAction(
          shareLink.createdBy,
          'access_share_link',
          'file',
          file.id,
          { token: input.token, downloadCount: shareLink.downloadCount + 1 },
          ctx.req
        );
        
        return {
          file: {
            id: file.id,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
            url: file.url,
          },
          shareLink: {
            downloadCount: shareLink.downloadCount + 1,
            maxDownloads: shareLink.maxDownloads,
            expiresAt: shareLink.expiresAt,
          },
        };
      }),
  }),

    // ============ FILE COMPARISON ============
  fileComparison: router({
    compareVersions: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        oldVersionNumber: z.number(),
        newVersionNumber: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }

        // Check permission
        if (ctx.user.role === 'client') {
          const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
          if (!permission || !permission.canView) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        const { compareFileVersions } = await import('./fileComparison');
        return await compareFileVersions(input.fileId, input.oldVersionNumber, input.newVersionNumber);
      }),
  }),

  // ============ STORAGE ============
  storage: router({
    upload: protectedProcedure
      .input(z.object({
        fileKey: z.string(),
        content: z.string(), // base64
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const buffer = Buffer.from(input.content, 'base64');
        const { url } = await storagePut(input.fileKey, buffer, input.contentType);
        return { url };
      }),
  }),

  // ============ TEMPLATE LIBRARY ============
  templates: router({
    // Categories
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createTemplateCategory } = await import('./templateManagement');
        return await createTemplateCategory({
          name: input.name,
          description: input.description,
          createdBy: ctx.user.id,
        });
      }),

    getCategories: publicProcedure
      .query(async () => {
        const { getAllTemplateCategories } = await import('./templateManagement');
        return await getAllTemplateCategories();
      }),

    // Templates
    createTemplate: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string(),
        mimeType: z.string().optional(),
        createdFromRequestId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createFileTemplate } = await import('./templateManagement');
        return await createFileTemplate({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),

    updateTemplate: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateFileTemplate } = await import('./templateManagement');
        const { id, ...data } = input;
        return await updateFileTemplate(id, data);
      }),

    deleteTemplate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteFileTemplate } = await import('./templateManagement');
        return await deleteFileTemplate(input.id);
      }),

    getByCategory: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }))
      .query(async ({ input }) => {
        const { getTemplatesByCategory } = await import('./templateManagement');
        return await getTemplatesByCategory(input.categoryId);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const { searchTemplates } = await import('./templateManagement');
        return await searchTemplates(input.query);
      }),

    download: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { downloadTemplate } = await import('./templateManagement');
        return await downloadTemplate(input.id);
      }),

    uploadVersion: adminProcedure
      .input(z.object({
        templateId: z.number(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string(),
        mimeType: z.string().nullable(),
        changeNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { uploadNewTemplateVersion } = await import('./templateVersions');
        return await uploadNewTemplateVersion({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),

    getVersionHistory: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        const { getTemplateVersionHistory } = await import('./templateVersions');
        return await getTemplateVersionHistory(input.templateId);
      }),

    setLatestVersion: adminProcedure
      .input(z.object({
        templateId: z.number(),
        versionId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { setLatestTemplateVersion } = await import('./templateVersions');
        await setLatestTemplateVersion({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),

    downloadVersion: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input }) => {
        const { incrementVersionDownloadCount } = await import('./templateVersions');
        const { templateVersions } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq } = await import('drizzle-orm');
        await incrementVersionDownloadCount(input.versionId);
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const version = await db.select().from(templateVersions).where(eq(templateVersions.id, input.versionId)).limit(1);
        if (version.length === 0) throw new Error("Version not found");
        return {
          fileUrl: version[0].fileUrl,
          fileName: version[0].fileName,
        };
      }),

    getWithCategory: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getTemplateWithCategory } = await import('./templateManagement');
        return await getTemplateWithCategory(input.id);
      }),

    regenerateThumbnail: adminProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        const { regenerateTemplateThumbnail } = await import('./regenerateThumbnails');
        const success = await regenerateTemplateThumbnail(input.templateId);
        return { success };
      }),

    regenerateAllThumbnails: adminProcedure
      .mutation(async () => {
        const { regenerateAllThumbnails } = await import('./regenerateThumbnails');
        return await regenerateAllThumbnails();
      }),

    regenerateSvgThumbnails: adminProcedure
      .mutation(async () => {
        const { regenerateSvgThumbnails } = await import('./regenerateThumbnails');
        return await regenerateSvgThumbnails();
      }),

    // Template requests
    submitRequest: protectedProcedure
      .input(z.object({
        templateName: z.string(),
        description: z.string().optional(),
        justification: z.string(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { submitTemplateRequest } = await import('./templateRequests');
        return submitTemplateRequest({
          requesterId: ctx.user.id,
          ...input,
        });
      }),

    getRequests: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        myRequests: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !input.myRequests) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getTemplateRequests } = await import('./templateRequests');
        return getTemplateRequests({
          status: input.status,
          requesterId: input.myRequests ? ctx.user.id : undefined,
        });
      }),

    approveRequest: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        adminComment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { approveTemplateRequest } = await import('./templateRequests');
        return approveTemplateRequest({
          requestId: input.requestId,
          adminId: ctx.user.id,
          adminComment: input.adminComment,
        });
      }),

    rejectRequest: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        adminComment: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { rejectTemplateRequest } = await import('./templateRequests');
        return rejectTemplateRequest({
          requestId: input.requestId,
          adminId: ctx.user.id,
          adminComment: input.adminComment,
        });
      }),
  }),

  // ============ FILE SEARCH ============
  fileSearch: router({
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
      }))
      .query(async ({ input, ctx }) => {
        const results = await db.searchFiles(input.query, ctx.user.id, ctx.user.role);
        
        // Get folder paths for each result
        const resultsWithPaths = await Promise.all(
          results.map(async (file) => {
            const folderPath = await db.getFolderPath(file.folderId);
            return {
              ...file,
              folderPath,
            };
          })
        );
        
        // Log search action
        await logAction(
          ctx.user.id,
          'search',
          'file',
          undefined,
          { query: input.query, resultCount: results.length },
          ctx.req
        );
        
        return resultsWithPaths;
      }),
  }),

  // ============ ANALYTICS ============
  analytics: router({
    storageUsage: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserStorageUsage(ctx.user.id);
      }),
    
    getWorkflowAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        // Only admins can view analytics
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only administrators can view analytics' });
        }

        const { getWorkflowAnalytics } = await import('./workflowAnalytics');
        return await getWorkflowAnalytics();
      }),
    
    sendWorkflowReminders: protectedProcedure
      .input(z.object({
        daysThreshold: z.number().default(3),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can send reminders
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only administrators can send reminders' });
        }

        const { sendWorkflowReminders } = await import('./workflowReminders');
        return await sendWorkflowReminders(input.daysThreshold);
      }),
    
    storageByFolder: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserStorageByFolder(ctx.user.id);
      }),
    
    recentActivity: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserRecentActivity(ctx.user.id, input.limit);
      }),
    
    quickStats: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserQuickStats(ctx.user.id);
      }),
    
    recentFiles: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserRecentFiles(ctx.user.id, input.limit);
      }),
  }),

  // ============ FILE COMMENTS ============
  comments: router({
    create: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        content: z.string().min(1),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has access to the file
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        const hasAccess = await db.checkFolderAccess(ctx.user.id, file.folderId);
        if (!hasAccess) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this file' });
        }
        
        // Create comment
        const commentId = await db.createComment({
          fileId: input.fileId,
          userId: ctx.user.id,
          content: input.content,
          parentId: input.parentId,
        });
        
        // Parse and create mentions
        const mentionedNames = db.parseMentions(input.content);
        if (mentionedNames.length > 0) {
          const mentionedUsers = await db.getUsersByNames(mentionedNames);
          const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
          
          for (const user of mentionedUsers) {
            if (user.id !== ctx.user.id) {
              await db.createMention(commentId, user.id);
              
              // Send email notification for @mention
              if (user.email) {
                // Check user preferences
                const prefs = await db.getUserPreferences(user.id);
                if (prefs.emailMentions && prefs.deliveryMode === 'instant') {
                  try {
                    await sendMentionNotification({
                      recipientEmail: user.email,
                      recipientName: user.name || 'User',
                      fileName: file.name,
                      fileId: file.id,
                      mentionedBy: ctx.user.name || 'User',
                      commentText: input.content,
                      portalUrl,
                    });
                  } catch (error) {
                    console.error(`Failed to send mention notification to ${user.email}:`, error);
                  }
                }
              }
              
              // Send in-app notification
              await createAndBroadcastNotification({
                userId: user.id,
                type: 'comment_mention',
                title: 'You were mentioned',
                message: `${ctx.user.name || 'Someone'} mentioned you in a comment on "${file.name}"`,
                fileId: file.id,
              });
            }
          }
        }
        
        // Log activity
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'create_comment',
          entityType: 'file',
          entityId: input.fileId,
          details: `Commented on file`,
        });
        
        return { commentId };
      }),
    
    list: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user has access to the file
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        const hasAccess = await db.checkFolderAccess(ctx.user.id, file.folderId);
        if (!hasAccess) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this file' });
        }
        
        return await db.getFileComments(input.fileId);
      }),
    
    update: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const comment = await db.getCommentById(input.commentId);
        if (!comment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
        }
        
        if (comment.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Can only edit your own comments' });
        }
        
        await db.updateComment(input.commentId, input.content);
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const comment = await db.getCommentById(input.commentId);
        if (!comment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
        }
        
        if (comment.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Can only delete your own comments' });
        }
        
        await db.deleteComment(input.commentId);
        
        return { success: true };
      }),
    
    mentions: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserMentions(ctx.user.id, input.unreadOnly);
      }),
    
    markMentionRead: protectedProcedure
      .input(z.object({ mentionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markMentionAsRead(input.mentionId);
        return { success: true };
      }),
    
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUnreadMentionCount(ctx.user.id);
      }),
  }),

  // ============ WORKFLOW MANAGEMENT ============
  workflow: router({
    submitForReview: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        reviewerId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Check if user has permission
        const hasAccess = await db.checkFolderAccess(ctx.user.id, file.folderId);
        if (!hasAccess && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this file' });
        }
        
        await db.submitFileForReview(input.fileId, input.reviewerId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'submit_for_review',
          entityType: 'file',
          entityId: input.fileId,
          details: `Submitted file for review`,
        });
        
        return { success: true };
      }),
    
    approve: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Only assigned reviewer or admin can approve
        if (file.reviewerId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only assigned reviewer can approve' });
        }
        
        await db.approveFile(input.fileId, ctx.user.id, input.notes);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'approve_file',
          entityType: 'file',
          entityId: input.fileId,
          details: `Approved file${input.notes ? ': ' + input.notes : ''}`,
        });
        
        return { success: true };
      }),
    
    reject: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Only assigned reviewer or admin can reject
        if (file.reviewerId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only assigned reviewer can reject' });
        }
        
        await db.rejectFile(input.fileId, ctx.user.id, input.reason);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'reject_file',
          entityType: 'file',
          entityId: input.fileId,
          details: `Rejected file: ${input.reason}`,
        });
        
        return { success: true };
      }),
    
    resetToDraft: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Only file owner or admin can reset
        if (file.uploadedBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only file owner can reset to draft' });
        }
        
        await db.resetFileToDraft(input.fileId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'reset_to_draft',
          entityType: 'file',
          entityId: input.fileId,
          details: `Reset file to draft`,
        });
        
        return { success: true };
      }),
    
    pendingReviews: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingReviews(ctx.user.id);
      }),
    
    mySubmissions: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getMySubmittedFiles(ctx.user.id);
      }),
    
    bulkUpdateStatus: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        status: z.enum(["draft", "under_review", "approved", "rejected"]),
        reviewerId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admin can bulk update
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can bulk update status' });
        }
        
        await db.bulkUpdateWorkflowStatus(input.fileIds, input.status, input.reviewerId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'bulk_update_status',
          entityType: 'file',
          entityId: 0,
          details: `Bulk updated ${input.fileIds.length} files to ${input.status}`,
        });
        
        return { success: true };
      }),
    
    // Multi-reviewer procedures
    assignReviewers: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        reviewerIds: z.array(z.number()),
        approvalRequirement: z.enum(["all_must_approve", "majority_must_approve", "any_can_approve"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Only file owner or admin can assign reviewers
        if (file.uploadedBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only file owner can assign reviewers' });
        }
        
        await db.assignReviewers(input.fileId, input.reviewerIds);
        
        // Update approval requirement if provided
        if (input.approvalRequirement) {
          await db.updateFileApprovalRequirement(input.fileId, input.approvalRequirement);
        }
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'assign_reviewers',
          entityType: 'file',
          entityId: input.fileId,
          details: `Assigned ${input.reviewerIds.length} reviewers`,
        });
        
        // Send email notifications to all assigned reviewers
        const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
        const reviewers = await db.getUsersByIds(input.reviewerIds);
        
        for (const reviewer of reviewers) {
          if (reviewer.email) {
            // Check user preferences
            const prefs = await db.getUserPreferences(reviewer.id);
            if (prefs.emailReviewerAssignment && prefs.deliveryMode === 'instant') {
              try {
                await sendReviewerAssignmentNotification({
                  reviewerEmail: reviewer.email,
                  reviewerName: reviewer.name || 'Reviewer',
                  fileName: file.name,
                  fileId: file.id,
                  assignedBy: ctx.user.name || 'Admin',
                  portalUrl,
                });
              } catch (error) {
                console.error(`Failed to send email to ${reviewer.email}:`, error);
                // Continue with other notifications even if one fails
              }
            }
          }
          
          // Send in-app notification
          await createAndBroadcastNotification({
            userId: reviewer.id,
            type: 'reviewer_assigned',
            title: 'Assigned as Reviewer',
            message: `${ctx.user.name || 'Admin'} assigned you to review "${file.name}"`,
            fileId: file.id,
          });
        }
        
        return { success: true };
      }),
    
    removeReviewer: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        reviewerId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        // Only file owner or admin can remove reviewers
        if (file.uploadedBy !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only file owner can remove reviewers' });
        }
        
        await db.removeReviewer(input.fileId, input.reviewerId);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'remove_reviewer',
          entityType: 'file',
          entityId: input.fileId,
          details: `Removed reviewer ${input.reviewerId}`,
        });
        
        return { success: true };
      }),
    
    getFileReviewers: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFileReviewers(input.fileId);
      }),
    
    approveByReviewer: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        await db.approveFileByReviewer(input.fileId, ctx.user.id, input.notes);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'approve_file',
          entityType: 'file',
          entityId: input.fileId,
          details: input.notes || 'File approved',
        });
        
        // Send email notification to file owner
        const fileOwner = await db.getUserById(file.uploadedBy);
        if (fileOwner && fileOwner.email) {
          // Check user preferences
          const prefs = await db.getUserPreferences(fileOwner.id);
          if (prefs.emailStatusChange && prefs.deliveryMode === 'instant') {
            try {
              const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
              await sendStatusChangeNotification({
                recipientEmail: fileOwner.email,
                recipientName: fileOwner.name || 'User',
                fileName: file.name,
                fileId: file.id,
                oldStatus: 'under_review',
                newStatus: 'approved',
                changedBy: ctx.user.name || 'Reviewer',
                notes: input.notes,
                portalUrl,
              });
            } catch (error) {
              console.error(`Failed to send approval notification:`, error);
            }
          }
          
          // Send in-app notification
          await createAndBroadcastNotification({
            userId: fileOwner.id,
            type: 'file_approved',
            title: 'File Approved',
            message: `${ctx.user.name || 'A reviewer'} approved "${file.name}"`,
            fileId: file.id,
          });
        }
        
        return { success: true };
      }),
    
    rejectByReviewer: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const file = await db.getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
        }
        
        await db.rejectFileByReviewer(input.fileId, ctx.user.id, input.reason);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'reject_file',
          entityType: 'file',
          entityId: input.fileId,
          details: input.reason,
        });
        
        // Send email notification to file owner
        const fileOwner = await db.getUserById(file.uploadedBy);
        if (fileOwner && fileOwner.email) {
          // Check user preferences
          const prefs = await db.getUserPreferences(fileOwner.id);
          if (prefs.emailStatusChange && prefs.deliveryMode === 'instant') {
            try {
              const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
              await sendStatusChangeNotification({
                recipientEmail: fileOwner.email,
                recipientName: fileOwner.name || 'User',
                fileName: file.name,
                fileId: file.id,
                oldStatus: 'under_review',
                newStatus: 'rejected',
                changedBy: ctx.user.name || 'Reviewer',
                notes: input.reason,
                portalUrl,
              });
            } catch (error) {
              console.error(`Failed to send rejection notification:`, error);
            }
          }
          
          // Send in-app notification
          await createAndBroadcastNotification({
            userId: fileOwner.id,
            type: 'file_rejected',
            title: 'File Rejected',
            message: `${ctx.user.name || 'A reviewer'} rejected "${file.name}"`,
            fileId: file.id,
          });
        }
        
        return { success: true };
      }),
    
    bulkApproveFiles: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { succeeded: [] as number[], failed: [] as number[] };
        
        for (const fileId of input.fileIds) {
          try {
            const file = await db.getFileById(fileId);
            if (!file) {
              results.failed.push(fileId);
              continue;
            }
            
            await db.approveFileByReviewer(fileId, ctx.user.id, input.notes);
            
            await db.createAuditLog({
              userId: ctx.user.id,
              action: 'approve_file',
              entityType: 'file',
              entityId: fileId,
              details: input.notes || 'File approved (bulk action)',
            });
            
            // Send email notification to file owner
            const fileOwner = await db.getUserById(file.uploadedBy);
            if (fileOwner && fileOwner.email) {
              const prefs = await db.getUserPreferences(fileOwner.id);
              if (prefs.emailStatusChange && prefs.deliveryMode === 'instant') {
                try {
                  const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
                  await sendStatusChangeNotification({
                    recipientEmail: fileOwner.email,
                    recipientName: fileOwner.name || 'User',
                    fileName: file.name,
                    fileId: file.id,
                    oldStatus: 'under_review',
                    newStatus: 'approved',
                    changedBy: ctx.user.name || 'Reviewer',
                    notes: input.notes,
                    portalUrl,
                  });
                } catch (error) {
                  console.error(`Failed to send approval notification:`, error);
                }
              }
            }
            
            results.succeeded.push(fileId);
          } catch (error) {
            console.error(`Failed to approve file ${fileId}:`, error);
            results.failed.push(fileId);
          }
        }
        
        return results;
      }),
    
    bulkRejectFiles: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { succeeded: [] as number[], failed: [] as number[] };
        
        for (const fileId of input.fileIds) {
          try {
            const file = await db.getFileById(fileId);
            if (!file) {
              results.failed.push(fileId);
              continue;
            }
            
            await db.rejectFileByReviewer(fileId, ctx.user.id, input.reason);
            
            await db.createAuditLog({
              userId: ctx.user.id,
              action: 'reject_file',
              entityType: 'file',
              entityId: fileId,
              details: input.reason,
            });
            
            // Send email notification to file owner
            const fileOwner = await db.getUserById(file.uploadedBy);
            if (fileOwner && fileOwner.email) {
              const prefs = await db.getUserPreferences(fileOwner.id);
              if (prefs.emailStatusChange && prefs.deliveryMode === 'instant') {
                try {
                  const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || '';
                  await sendStatusChangeNotification({
                    recipientEmail: fileOwner.email,
                    recipientName: fileOwner.name || 'User',
                    fileName: file.name,
                    fileId: file.id,
                    oldStatus: 'under_review',
                    newStatus: 'rejected',
                    changedBy: ctx.user.name || 'Reviewer',
                    notes: input.reason,
                    portalUrl,
                  });
                } catch (error) {
                  console.error(`Failed to send rejection notification:`, error);
                }
              }
            }
            
            results.succeeded.push(fileId);
          } catch (error) {
            console.error(`Failed to reject file ${fileId}:`, error);
            results.failed.push(fileId);
          }
        }
        
        return results;
      }),
    
    myPendingReviews: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingReviewsForReviewer(ctx.user.id);
      }),
    
    pendingApprovalsOverview: adminProcedure
      .query(async () => {
        return await db.getPendingApprovalsOverview();
      }),
    
    reviewerWorkloadStats: adminProcedure
      .query(async () => {
        return await db.getReviewerWorkloadStats();
      }),
  }),

  // ============ NOTIFICATION PREFERENCES ============
  preferences: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserPreferences(ctx.user.id);
      }),
    
    update: protectedProcedure
      .input(z.object({
        emailReviewerAssignment: z.boolean().optional(),
        emailStatusChange: z.boolean().optional(),
        emailMentions: z.boolean().optional(),
        emailShareLinks: z.boolean().optional(),
        deliveryMode: z.enum(["instant", "daily_digest"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferences(ctx.user.id, input);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          action: 'update_notification_preferences',
          entityType: 'user',
          entityId: ctx.user.id,
          details: JSON.stringify(input),
        });
        
        return { success: true };
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



  // ============ BULK OPERATIONS ============
  bulk: router({
    assignWorkflow: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        templateId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          throw new Error('Only administrators can perform bulk workflow assignments');
        }

        const { bulkAssignWorkflow } = await import('./bulkWorkflowAssignment');
        const result = await bulkAssignWorkflow({
          fileIds: input.fileIds,
          templateId: input.templateId,
          userId: ctx.user.id,
        });

        return result;
      }),
  }),

  // ============ WORKFLOW COMMENTS ============
  workflowComments: router({
    getStageComments: protectedProcedure
      .input(z.object({ 
        workflowInstanceId: z.number(),
        stageId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getStageComments } = await import('./workflowComments');
        return await getStageComments(input.workflowInstanceId, input.stageId);
      }),

    getCommentThread: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .query(async ({ input }) => {
        const { getCommentThread } = await import('./workflowComments');
        return await getCommentThread(input.commentId);
      }),

    editComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        newContent: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { editComment } = await import('./commentEditing');
        const result = await editComment(
          input.commentId,
          ctx.user.id,
          input.newContent,
          ctx.req.headers['x-forwarded-for'] as string,
          ctx.req.headers['user-agent'] as string
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'Failed to edit comment' });
        }
        
        await logAction(ctx.user.id, 'comment_edit', 'workflow_comment', input.commentId, { newContent: input.newContent }, ctx.req);
        return result;
      }),
    
    deleteComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { deleteComment } = await import('./commentEditing');
        const result = await deleteComment(
          input.commentId,
          ctx.user.id,
          ctx.req.headers['x-forwarded-for'] as string,
          ctx.req.headers['user-agent'] as string
        );
        
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'Failed to delete comment' });
        }
        
        await logAction(ctx.user.id, 'comment_delete', 'workflow_comment', input.commentId, {}, ctx.req);
        return result;
      }),
    
    canEditComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { canEditComment } = await import('./commentEditing');
        return await canEditComment(input.commentId, ctx.user.id);
      }),
    
    replyToComment: protectedProcedure
      .input(z.object({
        parentCommentId: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { replyToComment } = await import('./workflowComments');
        await replyToComment({
          parentCommentId: input.parentCommentId,
          userId: ctx.user.id,
          content: input.content,
        });

        // Process mentions in reply
        if (input.content) {
          const { processMentions } = await import('./mentionNotifications');
          const { getCommentThread } = await import('./workflowComments');
          const thread = await getCommentThread(input.parentCommentId);
          if (thread) {
            const file = await db.getFileById(thread.fileId);
            if (file) {
              await processMentions({
                fileId: file.id,
                fileName: file.name,
                commentText: input.content,
                mentionerUserId: ctx.user.id,
                mentionerName: ctx.user.name || ctx.user.email || 'User',
                workflowStageId: thread.stageId,
              });
            }
          }
        }

        return { success: true };
      }),

    getCommentCount: protectedProcedure
      .input(z.object({ 
        workflowInstanceId: z.number(),
        stageId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getStageCommentCount } = await import('./workflowComments');
        return await getStageCommentCount(input.workflowInstanceId, input.stageId);
      }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.getNotifications(ctx.user.id, input.limit);
      }),
    
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUnreadNotificationCount(ctx.user.id);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.notificationId);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
    
    snooze: protectedProcedure
      .input(z.object({ 
        notificationId: z.number(),
        duration: z.enum(["15min", "1hr", "4hr", "tomorrow"])
      }))
      .mutation(async ({ input }) => {
        const now = new Date();
        let snoozedUntil: Date;
        
        switch (input.duration) {
          case "15min":
            snoozedUntil = new Date(now.getTime() + 15 * 60 * 1000);
            break;
          case "1hr":
            snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case "4hr":
            snoozedUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
            break;
          case "tomorrow":
            snoozedUntil = new Date(now);
            snoozedUntil.setDate(snoozedUntil.getDate() + 1);
            snoozedUntil.setHours(9, 0, 0, 0); // 9 AM tomorrow
            break;
        }
        
        await db.snoozeNotification(input.notificationId, snoozedUntil);
        return { success: true };
      }),
    
    unsnooze: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unsnoozeNotification(input.notificationId);
        return { success: true };
      }),
  }),

  // ============ BATCH FILE OPERATIONS ============
  batch: router({
    moveFiles: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        targetFolderId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        let successCount = 0;
        let failureCount = 0;
        
        for (const fileId of input.fileIds) {
          try {
            const file = await db.getFileById(fileId);
            if (!file) {
              failureCount++;
              continue;
            }
            
            // Check permission on source folder
            if (ctx.user.role === 'client') {
              const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
              if (!permission || !permission.canEdit) {
                failureCount++;
                continue;
              }
            }
            
            // Check permission on target folder
            if (ctx.user.role === 'client') {
              const targetPermission = await db.getFolderPermission(input.targetFolderId, ctx.user.id);
              if (!targetPermission || !targetPermission.canUpload) {
                failureCount++;
                continue;
              }
            }
            
            await db.moveFileToFolder(fileId, input.targetFolderId);
            
            await db.createAuditLog({
              userId: ctx.user.id,
              action: 'move_file',
              entityType: 'file',
              entityId: fileId,
              details: JSON.stringify({ targetFolderId: input.targetFolderId }),
            });
            
            successCount++;
          } catch (error) {
            failureCount++;
          }
        }
        
        return { successCount, failureCount, total: input.fileIds.length };
      }),
    
    deleteFiles: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        let successCount = 0;
        let failureCount = 0;
        
        for (const fileId of input.fileIds) {
          try {
            const file = await db.getFileById(fileId);
            if (!file) {
              failureCount++;
              continue;
            }
            
            // Check permission
            if (ctx.user.role === 'client') {
              const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
              if (!permission || !permission.canDelete) {
                failureCount++;
                continue;
              }
            }
            
            await db.deleteFile(fileId);
            
            await db.createAuditLog({
              userId: ctx.user.id,
              action: 'delete_file',
              entityType: 'file',
              entityId: fileId,
              details: JSON.stringify({ fileId }),
            });
            
            successCount++;
          } catch (error) {
            failureCount++;
          }
        }
        
        return { successCount, failureCount, total: input.fileIds.length };
      }),
    
    archiveFiles: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        let successCount = 0;
        let failureCount = 0;
        
        for (const fileId of input.fileIds) {
          try {
            const file = await db.getFileById(fileId);
            if (!file) {
              failureCount++;
              continue;
            }
            
            // Check permission
            if (ctx.user.role === 'client') {
              const permission = await db.getFolderPermission(file.folderId, ctx.user.id);
              if (!permission || !permission.canDelete) {
                failureCount++;
                continue;
              }
            }
            
            await db.archiveFile(fileId, ctx.user.id);
            
            await db.createAuditLog({
              userId: ctx.user.id,
              action: 'archive_file',
              entityType: 'file',
              entityId: fileId,
              details: JSON.stringify({ fileId }),
            });
            
            successCount++;
          } catch (error) {
            failureCount++;
          }
        }
        
        return { successCount, failureCount, total: input.fileIds.length };
      }),
  }),

  // ============ WORKFLOW MANAGEMENT ============
  workflows: router({
    getTemplates: protectedProcedure.query(async () => {
      return await db.getWorkflowTemplates();
    }),

    getTemplateById: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkflowTemplateById(input.templateId);
      }),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().nullable(),
        stages: z.array(z.object({
          stageName: z.string(),
          stageOrder: z.number(),
          requiredApprovals: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const templateId = await db.createWorkflowTemplate(
          input.name,
          input.description,
          ctx.user.id,
          input.stages
        );
        return { templateId };
      }),

    assignToFile: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        workflowTemplateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const instanceId = await db.assignWorkflowToFile(input.fileId, input.workflowTemplateId);
        return { instanceId };
      }),

    getFileProgress: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getFileWorkflowProgress(input.fileId, ctx.user.id);
      }),

    approveStage: protectedProcedure
      .input(z.object({
        workflowInstanceId: z.number(),
        stageId: z.number(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.approveWorkflowStage(
          input.workflowInstanceId,
          input.stageId,
          ctx.user.id,
          input.comment
        );
      }),

    rejectStage: protectedProcedure
      .input(z.object({
        workflowInstanceId: z.number(),
        stageId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.rejectWorkflowStage(
          input.workflowInstanceId,
          input.stageId,
          ctx.user.id,
          input.reason
        );
      }),

    canUndoAction: protectedProcedure
      .input(z.object({
        workflowInstanceId: z.number(),
        stageId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { canUndoWorkflowAction } = await import('./db_undo');
        return await canUndoWorkflowAction(
          input.workflowInstanceId,
          input.stageId,
          ctx.user.id
        );
      }),

    undoAction: protectedProcedure
      .input(z.object({
        workflowInstanceId: z.number(),
        stageId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { undoWorkflowStageAction } = await import('./db_undo');
        return await undoWorkflowStageAction(
          input.workflowInstanceId,
          input.stageId,
          ctx.user.id
        );
      }),
  }),

  // ============ SECURITY DASHBOARD ============
  security: router({
    metrics: adminProcedure.query(async () => {
      const { getSecurityMetrics, isGitHubConfigured } = await import('./githubSecurityService');
      
      if (!isGitHubConfigured()) {
        return {
          configured: false,
          message: 'GitHub integration not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.',
        };
      }
      
      const metrics = await getSecurityMetrics();
      return {
        configured: true,
        ...metrics,
      };
    }),

    codeqlAlerts: adminProcedure.query(async () => {
      const { getCodeQLAlerts, isGitHubConfigured } = await import('./githubSecurityService');
      
      if (!isGitHubConfigured()) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: 'GitHub integration not configured' 
        });
      }
      
      return await getCodeQLAlerts();
    }),

    dependabotAlerts: adminProcedure.query(async () => {
      const { getDependabotAlerts, isGitHubConfigured } = await import('./githubSecurityService');
      
      if (!isGitHubConfigured()) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: 'GitHub integration not configured' 
        });
      }
      
      return await getDependabotAlerts();
    }),

    workflowRuns: adminProcedure.query(async () => {
      const { getWorkflowRuns, isGitHubConfigured } = await import('./githubSecurityService');
      
      if (!isGitHubConfigured()) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: 'GitHub integration not configured' 
        });
      }
      
      return await getWorkflowRuns();
    }),

    // GitHub Settings Management
    getGitHubSettings: adminProcedure.query(async () => {
      const { getGitHubSettings } = await import('./githubSettings');
      const settings = await getGitHubSettings();
      
      // Mask token (show only last 4 characters)
      if (settings.token) {
        const token = settings.token;
        settings.token = '****' + token.slice(-4);
      }
      
      return settings;
    }),

    saveGitHubSettings: adminProcedure
      .input(z.object({
        token: z.string().optional(),
        owner: z.string().min(1).optional(),
        repo: z.string().min(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { saveGitHubSettings } = await import('./githubSettings');
        
        await saveGitHubSettings(input, ctx.user.id);
        
        return { success: true };
      }),

    testGitHubConnection: adminProcedure
      .input(z.object({
        token: z.string().min(1),
        owner: z.string().min(1),
        repo: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { testGitHubConnection } = await import('./githubSettings');
        
        return await testGitHubConnection(input.token, input.owner, input.repo);
      }),
  }),

  // System Health Checks
  health: router({
    checkSystem: adminProcedure.query(async () => {
      const { checkSystemHealth } = await import('./systemHealthService');
      return await checkSystemHealth();
    }),
  }),
});

export type AppRouter = typeof appRouter;
