import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { templateVersions, fileTemplates } from "../drizzle/schema";

/**
 * Upload a new version of an existing template
 */
export async function uploadNewTemplateVersion(params: {
  templateId: number;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  uploadedBy: number;
  changeNotes?: string;
}): Promise<{ id: number; versionNumber: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current latest version number
  const existingVersions = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, params.templateId))
    .orderBy(desc(templateVersions.versionNumber))
    .limit(1);

  const newVersionNumber = existingVersions.length > 0 
    ? existingVersions[0].versionNumber + 1 
    : 1;

  // Mark all existing versions as not latest
  await db
    .update(templateVersions)
    .set({ isLatest: 0 })
    .where(eq(templateVersions.templateId, params.templateId));

  // Insert new version
  const result = await db.insert(templateVersions).values({
    templateId: params.templateId,
    versionNumber: newVersionNumber,
    fileUrl: params.fileUrl,
    fileKey: params.fileKey,
    fileName: params.fileName,
    mimeType: params.mimeType,
    size: params.size,
    downloadCount: 0,
    isLatest: 1,
    uploadedBy: params.uploadedBy,
    changeNotes: params.changeNotes || null,
  });

  // Update template's updatedAt timestamp
  await db
    .update(fileTemplates)
    .set({ updatedAt: new Date() })
    .where(eq(fileTemplates.id, params.templateId));

  const insertId = (result as any).insertId || 0;
  return {
    id: Number(insertId),
    versionNumber: newVersionNumber,
  };
}

/**
 * Get all versions of a template
 */
export async function getTemplateVersionHistory(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const versions = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(desc(templateVersions.versionNumber));

  return versions;
}

/**
 * Get the latest version of a template
 */
export async function getLatestTemplateVersion(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const versions = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(desc(templateVersions.isLatest), desc(templateVersions.versionNumber))
    .limit(1);

  return versions.length > 0 ? versions[0] : null;
}

/**
 * Set a specific version as the latest (rollback)
 */
export async function setLatestTemplateVersion(params: {
  templateId: number;
  versionId: number;
  userId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify the version belongs to the template
  const version = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.id, params.versionId))
    .limit(1);

  if (version.length === 0 || version[0].templateId !== params.templateId) {
    throw new Error("Version not found or does not belong to template");
  }

  // Mark all versions as not latest
  await db
    .update(templateVersions)
    .set({ isLatest: 0 })
    .where(eq(templateVersions.templateId, params.templateId));

  // Mark specified version as latest
  await db
    .update(templateVersions)
    .set({ isLatest: 1 })
    .where(eq(templateVersions.id, params.versionId));

  // Update template's updatedAt timestamp
  await db
    .update(fileTemplates)
    .set({ updatedAt: new Date() })
    .where(eq(fileTemplates.id, params.templateId));
}

/**
 * Increment download count for a specific version
 */
export async function incrementVersionDownloadCount(versionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const version = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.id, versionId))
    .limit(1);

  if (version.length === 0) {
    throw new Error("Version not found");
  }

  await db
    .update(templateVersions)
    .set({ downloadCount: version[0].downloadCount + 1 })
    .where(eq(templateVersions.id, versionId));

  // Also increment the template's total download count
  const template = await db
    .select()
    .from(fileTemplates)
    .where(eq(fileTemplates.id, version[0].templateId))
    .limit(1);

  if (template.length > 0) {
    await db
      .update(fileTemplates)
      .set({ downloadCount: template[0].downloadCount + 1 })
      .where(eq(fileTemplates.id, version[0].templateId));
  }
}
