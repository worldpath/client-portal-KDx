import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { fileTemplates } from "../drizzle/schema";
import { generateThumbnail } from "./thumbnailService";

/**
 * Regenerate thumbnail for a specific template
 */
export async function regenerateTemplateThumbnail(templateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get template details
  const templates = await db
    .select()
    .from(fileTemplates)
    .where(eq(fileTemplates.id, templateId))
    .limit(1);

  if (templates.length === 0) {
    throw new Error("Template not found");
  }

  const template = templates[0];

  // Generate new thumbnail
  const thumbnail = await generateThumbnail(
    template.fileUrl,
    template.fileName,
    template.mimeType
  );

  if (!thumbnail) {
    console.warn(`Failed to generate thumbnail for template ${templateId}`);
    return false;
  }

  // Update template with new thumbnail
  await db
    .update(fileTemplates)
    .set({ thumbnailUrl: thumbnail.thumbnailUrl })
    .where(eq(fileTemplates.id, templateId));

  return true;
}

/**
 * Regenerate thumbnails for all templates
 */
export async function regenerateAllThumbnails(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all templates
  const templates = await db.select().from(fileTemplates);

  let success = 0;
  let failed = 0;

  for (const template of templates) {
    try {
      // Generate new thumbnail
      const thumbnail = await generateThumbnail(
        template.fileUrl,
        template.fileName,
        template.mimeType
      );

      if (thumbnail) {
        // Update template with new thumbnail
        await db
          .update(fileTemplates)
          .set({ thumbnailUrl: thumbnail.thumbnailUrl })
          .where(eq(fileTemplates.id, template.id));
        
        success++;
        console.log(`✓ Regenerated thumbnail for: ${template.name}`);
      } else {
        failed++;
        console.warn(`✗ Failed to generate thumbnail for: ${template.name}`);
      }
    } catch (error) {
      failed++;
      console.error(`✗ Error regenerating thumbnail for ${template.name}:`, error);
    }
  }

  return {
    total: templates.length,
    success,
    failed,
  };
}

/**
 * Regenerate thumbnails for templates with SVG placeholders
 */
export async function regenerateSvgThumbnails(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all templates with SVG thumbnails or no thumbnails
  const allTemplates = await db.select().from(fileTemplates);
  const templatesNeedingRegen = allTemplates.filter(
    t => !t.thumbnailUrl || t.thumbnailUrl.endsWith('.svg')
  );

  let success = 0;
  let failed = 0;

  for (const template of templatesNeedingRegen) {
    try {
      // Only regenerate for PDFs (Word docs keep SVG placeholders)
      if (template.mimeType !== 'application/pdf') {
        continue;
      }

      const thumbnail = await generateThumbnail(
        template.fileUrl,
        template.fileName,
        template.mimeType
      );

      if (thumbnail) {
        await db
          .update(fileTemplates)
          .set({ thumbnailUrl: thumbnail.thumbnailUrl })
          .where(eq(fileTemplates.id, template.id));
        
        success++;
        console.log(`✓ Regenerated PDF thumbnail for: ${template.name}`);
      } else {
        failed++;
        console.warn(`✗ Failed to generate thumbnail for: ${template.name}`);
      }
    } catch (error) {
      failed++;
      console.error(`✗ Error regenerating thumbnail for ${template.name}:`, error);
    }
  }

  return {
    total: templatesNeedingRegen.length,
    success,
    failed,
  };
}
