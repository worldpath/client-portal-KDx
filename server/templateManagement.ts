import { eq, and, like, or, desc } from "drizzle-orm";
import { getDb } from "./db";
import { templateCategories, fileTemplates, InsertTemplateCategory, InsertFileTemplate } from "../drizzle/schema";

/**
 * Create a new template category
 */
export async function createTemplateCategory(data: {
  name: string;
  description?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(templateCategories).values({
    name: data.name,
    description: data.description || null,
    createdBy: data.createdBy,
  });

  return { id: Number((result as any).insertId) };
}

/**
 * Get all template categories
 */
export async function getAllTemplateCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(templateCategories).orderBy(templateCategories.name);
}

/**
 * Create a new file template
 */
export async function createFileTemplate(data: {
  name: string;
  description?: string;
  categoryId: number;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  mimeType?: string;
  size: number;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(fileTemplates).values({
    name: data.name,
    description: data.description || null,
    categoryId: data.categoryId,
    fileUrl: data.fileUrl,
    fileKey: data.fileKey,
    fileName: data.fileName,
    mimeType: data.mimeType || null,
    size: data.size,
    version: 1,
    downloadCount: 0,
    uploadedBy: data.uploadedBy,
  });

  return { id: Number((result as any).insertId) };
}

/**
 * Update a file template
 */
export async function updateFileTemplate(
  templateId: number,
  data: {
    name?: string;
    description?: string;
    categoryId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  await db.update(fileTemplates)
    .set(updateData)
    .where(eq(fileTemplates.id, templateId));

  return { success: true };
}

/**
 * Delete a file template
 */
export async function deleteFileTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(fileTemplates).where(eq(fileTemplates.id, templateId));

  return { success: true };
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(categoryId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (categoryId) {
    return await db.select()
      .from(fileTemplates)
      .where(eq(fileTemplates.categoryId, categoryId))
      .orderBy(desc(fileTemplates.createdAt));
  }

  return await db.select()
    .from(fileTemplates)
    .orderBy(desc(fileTemplates.createdAt));
}

/**
 * Search templates by name or description
 */
export async function searchTemplates(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchPattern = `%${query}%`;

  return await db.select()
    .from(fileTemplates)
    .where(
      or(
        like(fileTemplates.name, searchPattern),
        like(fileTemplates.description, searchPattern)
      )
    )
    .orderBy(desc(fileTemplates.downloadCount));
}

/**
 * Download a template (increment download count)
 */
export async function downloadTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get template details
  const templates = await db.select()
    .from(fileTemplates)
    .where(eq(fileTemplates.id, templateId))
    .limit(1);

  if (templates.length === 0) {
    throw new Error("Template not found");
  }

  const template = templates[0];

  // Increment download count
  await db.update(fileTemplates)
    .set({ downloadCount: template.downloadCount + 1 })
    .where(eq(fileTemplates.id, templateId));

  return {
    fileUrl: template.fileUrl,
    fileName: template.fileName,
    mimeType: template.mimeType,
  };
}

/**
 * Get template with category info
 */
export async function getTemplateWithCategory(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select({
    template: fileTemplates,
    category: templateCategories,
  })
    .from(fileTemplates)
    .leftJoin(templateCategories, eq(fileTemplates.categoryId, templateCategories.id))
    .where(eq(fileTemplates.id, templateId))
    .limit(1);

  if (result.length === 0) {
    throw new Error("Template not found");
  }

  return result[0];
}
