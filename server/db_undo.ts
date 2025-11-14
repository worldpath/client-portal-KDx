import { and, eq } from "drizzle-orm";
import { getDb, createAuditLog } from "./db";
import { fileWorkflowStageProgress, fileWorkflowInstances, workflowStages, files } from "../drizzle/schema";
import { sendEmailNotification } from "./_core/emailNotification";

const UNDO_WINDOW_MINUTES = 5;

/**
 * Check if a workflow action can be undone (within 5-minute window)
 */
export async function canUndoWorkflowAction(
  workflowInstanceId: number,
  stageId: number,
  userId: number
): Promise<{ canUndo: boolean; reason?: string; progress?: any; timeRemaining?: number }> {
  const db = await getDb();
  if (!db) return { canUndo: false, reason: "Database unavailable" };

  // Get the progress record
  const progress = await db
    .select()
    .from(fileWorkflowStageProgress)
    .where(
      and(
        eq(fileWorkflowStageProgress.workflowInstanceId, workflowInstanceId),
        eq(fileWorkflowStageProgress.stageId, stageId)
      )
    )
    .limit(1);

  if (progress.length === 0) {
    return { canUndo: false, reason: "Stage progress not found" };
  }

  const progressRecord = progress[0];

  // Check if already undone
  if (progressRecord.undoneAt) {
    return { canUndo: false, reason: "Action already undone" };
  }

  // Check if action was performed
  if (!progressRecord.actionTimestamp) {
    return { canUndo: false, reason: "No action to undo" };
  }

  // Check if user is the one who performed the action
  if (progressRecord.actionUserId !== userId) {
    return { canUndo: false, reason: "Only the user who performed the action can undo it" };
  }

  // Check if within 5-minute window
  const now = new Date();
  const actionTime = new Date(progressRecord.actionTimestamp);
  const minutesSinceAction = (now.getTime() - actionTime.getTime()) / (1000 * 60);

  if (minutesSinceAction > UNDO_WINDOW_MINUTES) {
    return { canUndo: false, reason: "Undo window expired (5 minutes)" };
  }

  // Check if stage is still in approved/rejected status (not moved forward)
  if (progressRecord.status !== "approved" && progressRecord.status !== "rejected") {
    return { canUndo: false, reason: "Stage status has changed" };
  }

  return { 
    canUndo: true, 
    progress: progressRecord,
    timeRemaining: Math.ceil(UNDO_WINDOW_MINUTES - minutesSinceAction)
  };
}

/**
 * Undo a workflow stage approval or rejection
 */
export async function undoWorkflowStageAction(
  workflowInstanceId: number,
  stageId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  // Check if undo is allowed
  const undoCheck = await canUndoWorkflowAction(workflowInstanceId, stageId, userId);
  if (!undoCheck.canUndo) {
    return { success: false, error: undoCheck.reason };
  }

  const progressRecord = undoCheck.progress;

  try {
    // Get the workflow instance
    const instance = await db
      .select()
      .from(fileWorkflowInstances)
      .where(eq(fileWorkflowInstances.id, workflowInstanceId))
      .limit(1);

    if (instance.length === 0) {
      return { success: false, error: "Workflow instance not found" };
    }

    const wasRejected = progressRecord.status === "rejected";
    const wasApproved = progressRecord.status === "approved";

    if (wasRejected) {
      // Undo rejection: revert stage to in_progress and workflow to in_progress
      await db
        .update(fileWorkflowStageProgress)
        .set({
          status: "in_progress",
          rejectedBy: null,
          rejectionReason: null,
          completedAt: null,
          undoneAt: new Date(),
          undoneBy: userId,
        })
        .where(eq(fileWorkflowStageProgress.id, progressRecord.id));

      // Revert workflow instance status if it was rejected
      if (instance[0].status === "rejected") {
        await db
          .update(fileWorkflowInstances)
          .set({
            status: "in_progress",
            completedAt: null,
            currentStageId: stageId,
          })
          .where(eq(fileWorkflowInstances.id, workflowInstanceId));
      }
    } else if (wasApproved) {
      // Undo approval: remove user from approvedBy list
      const approvedBy = progressRecord.approvedBy ? JSON.parse(progressRecord.approvedBy) : [];
      const updatedApprovedBy = approvedBy.filter((id: number) => id !== userId);

      // Get stage info to check if it was complete
      const stage = await db
        .select()
        .from(workflowStages)
        .where(eq(workflowStages.id, stageId))
        .limit(1);

      if (stage.length === 0) {
        return { success: false, error: "Stage not found" };
      }

      const wasStageComplete = approvedBy.length >= stage[0].requiredApprovals;

      // If stage was complete, we need to roll back to this stage
      if (wasStageComplete) {
        // Revert workflow to this stage
        await db
          .update(fileWorkflowInstances)
          .set({
            status: "in_progress",
            currentStageId: stageId,
            completedAt: null,
          })
          .where(eq(fileWorkflowInstances.id, workflowInstanceId));

        // Reset any subsequent stages that were started
        const allStages = await db
          .select()
          .from(workflowStages)
          .where(eq(workflowStages.workflowTemplateId, instance[0].workflowTemplateId))
          .orderBy(workflowStages.stageOrder);

        const currentStageIndex = allStages.findIndex((s) => s.id === stageId);
        const subsequentStageIds = allStages.slice(currentStageIndex + 1).map((s) => s.id);

        if (subsequentStageIds.length > 0) {
          for (const subsequentStageId of subsequentStageIds) {
            await db
              .update(fileWorkflowStageProgress)
              .set({
                status: "pending",
                startedAt: null,
                completedAt: null,
                approvedBy: null,
                rejectedBy: null,
                rejectionReason: null,
              })
              .where(
                and(
                  eq(fileWorkflowStageProgress.workflowInstanceId, workflowInstanceId),
                  eq(fileWorkflowStageProgress.stageId, subsequentStageId)
                )
              );
          }
        }
      }

      // Update the current stage progress
      await db
        .update(fileWorkflowStageProgress)
        .set({
          approvedBy: updatedApprovedBy.length > 0 ? JSON.stringify(updatedApprovedBy) : null,
          status: updatedApprovedBy.length > 0 ? "in_progress" : "in_progress",
          completedAt: null,
          undoneAt: new Date(),
          undoneBy: userId,
        })
        .where(eq(fileWorkflowStageProgress.id, progressRecord.id));
    }

    // Create audit log entry
    const file = await db
      .select()
      .from(files)
      .where(eq(files.id, instance[0].fileId))
      .limit(1);

    if (file.length > 0) {
      await createAuditLog({
        userId,
        action: wasRejected ? "workflow_rejection_undone" : "workflow_approval_undone",
        entityType: "file",
        entityId: file[0].id,
        details: JSON.stringify({
          workflowInstanceId,
          stageId,
          previousStatus: progressRecord.status,
          fileName: file[0].name,
        }),
      });

      // Send email notification to file owner
      // Note: In production, you would fetch the user's email from the users table
      // For now, we'll just log the event
      console.log(`[Undo] Workflow action undone for file ${file[0].name} by user ${userId}`);
      
      // TODO: Fetch user email and send notification
      // const user = await db.select().from(users).where(eq(users.id, file[0].uploadedBy)).limit(1);
      // if (user.length > 0 && user[0].email) {
      //   await sendEmailNotification({
      //     recipientEmail: user[0].email,
      //     recipientName: user[0].name || 'User',
      //     subject: `Workflow action undone: ${file[0].name}`,
      //     body: `A workflow ${wasRejected ? 'rejection' : 'approval'} has been undone for file "${file[0].name}". The workflow stage has been reverted to in-progress status.`,
      //   });
      // }
    }

    return { success: true };
  } catch (error) {
    console.error("[Undo] Error undoing workflow action:", error);
    return { success: false, error: "Failed to undo action" };
  }
}

/**
 * Get time remaining in undo window (in seconds)
 */
export function getUndoTimeRemaining(actionTimestamp: Date): number {
  const now = new Date();
  const actionTime = new Date(actionTimestamp);
  const secondsSinceAction = (now.getTime() - actionTime.getTime()) / 1000;
  const windowSeconds = UNDO_WINDOW_MINUTES * 60;
  const remaining = Math.max(0, windowSeconds - secondsSinceAction);
  return Math.floor(remaining);
}
