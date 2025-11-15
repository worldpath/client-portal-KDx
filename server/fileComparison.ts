import { getDb } from "./db";
import { fileVersions, files } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { extractText } from "./textExtraction";
import { computeDiff, DiffResult } from "./diffAlgorithm";

export interface FileComparisonResult {
  oldVersion: {
    versionNumber: number;
    url: string;
    createdAt: Date;
    uploadedBy: string;
  };
  newVersion: {
    versionNumber: number;
    url: string;
    createdAt: Date;
    uploadedBy: string;
  };
  diff: DiffResult;
  fileName: string;
  mimeType: string;
}

/**
 * Compare two file versions and return diff
 */
export async function compareFileVersions(
  fileId: number,
  oldVersionNumber: number,
  newVersionNumber: number
): Promise<FileComparisonResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get file info
  const fileResult = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (fileResult.length === 0) {
    throw new Error("File not found");
  }

  const file = fileResult[0];

  // Get both versions
  const versionsResult = await db
    .select()
    .from(fileVersions)
    .where(
      and(
        eq(fileVersions.fileId, fileId),
        // We'll filter version numbers in memory since we need both
      )
    );

  const oldVersion = versionsResult.find(v => v.versionNumber === oldVersionNumber);
  const newVersion = versionsResult.find(v => v.versionNumber === newVersionNumber);

  if (!oldVersion || !newVersion) {
    throw new Error("One or both versions not found");
  }

  // Extract text from both versions
  let oldText: string;
  let newText: string;

  const mimeType = file.mimeType || 'application/octet-stream';

  try {
    oldText = await extractText(oldVersion.url, mimeType);
    newText = await extractText(newVersion.url, mimeType);
  } catch (error) {
    throw new Error(`Failed to extract text for comparison: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Compute diff
  const diff = computeDiff(oldText, newText);

  // Get uploader names
  const [oldUploader] = await db
    .select()
    .from(await import('../drizzle/schema').then(m => m.users))
    .where(eq((await import('../drizzle/schema').then(m => m.users)).id, oldVersion.uploadedBy))
    .limit(1);

  const [newUploader] = await db
    .select()
    .from(await import('../drizzle/schema').then(m => m.users))
    .where(eq((await import('../drizzle/schema').then(m => m.users)).id, newVersion.uploadedBy))
    .limit(1);

  return {
    oldVersion: {
      versionNumber: oldVersion.versionNumber,
      url: oldVersion.url,
      createdAt: oldVersion.createdAt,
      uploadedBy: oldUploader?.name || oldUploader?.email || 'Unknown',
    },
    newVersion: {
      versionNumber: newVersion.versionNumber,
      url: newVersion.url,
      createdAt: newVersion.createdAt,
      uploadedBy: newUploader?.name || newUploader?.email || 'Unknown',
    },
    diff,
    fileName: file.name,
    mimeType: file.mimeType || 'application/octet-stream',
  };
}
