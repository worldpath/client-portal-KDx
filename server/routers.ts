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

  // ============ SEARCH ============
  search: router({
    files: protectedProcedure
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
        
        return { success: true };
      }),
    
    myPendingReviews: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingReviewsForReviewer(ctx.user.id);
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
