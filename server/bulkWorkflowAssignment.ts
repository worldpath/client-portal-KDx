import { getDb, assignWorkflowToFile, createAuditLog } from "./db";

export interface BulkAssignmentResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    fileId: number;
    fileName: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Assign a workflow template to multiple files in bulk
 */
export async function bulkAssignWorkflow(params: {
  fileIds: number[];
  templateId: number;
  userId: number;
}): Promise<BulkAssignmentResult> {
  const { fileIds, templateId, userId } = params;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: BulkAssignmentResult = {
    total: fileIds.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  // Process each file
  for (const fileId of fileIds) {
    try {
      // Get file info for result
      const { getFileById } = await import('./db');
      const file = await getFileById(fileId);
      
      if (!file) {
        results.failed++;
        results.results.push({
          fileId,
          fileName: `File #${fileId}`,
          success: false,
          error: "File not found",
        });
        continue;
      }

      // Assign workflow
      await assignWorkflowToFile(fileId, templateId);

      results.successful++;
      results.results.push({
        fileId,
        fileName: file.name,
        success: true,
      });

      // Create audit log
      await createAuditLog({
        userId,
        action: "bulk_workflow_assign",
        entityType: "file",
        entityId: fileId,
        details: JSON.stringify({
          templateId,
          fileName: file.name,
          bulkOperation: true,
        }),
      });
    } catch (error) {
      results.failed++;
      results.results.push({
        fileId,
        fileName: `File #${fileId}`,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Create summary audit log
  await createAuditLog({
    userId,
    action: "bulk_workflow_assign_summary",
    entityType: "system",
    entityId: 0,
    details: JSON.stringify({
      templateId,
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      fileIds,
    }),
  });

  return results;
}
