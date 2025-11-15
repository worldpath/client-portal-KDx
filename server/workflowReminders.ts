import { getDb } from "./db";
import { fileWorkflowStageProgress, workflowStages, fileWorkflowInstances, files, users, workflowTemplates } from "../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { sendEmailNotification } from "./_core/emailNotification";

interface PendingReview {
  fileId: number;
  fileName: string;
  stageId: number;
  stageName: string;
  templateName: string;
  assignedReviewers: string; // JSON array
  daysPending: number;
  workflowInstanceId: number;
}

/**
 * Find all pending reviews that exceed the reminder threshold
 * @param daysThreshold Number of days before sending reminder (default: 3)
 */
export async function findPendingReviews(daysThreshold: number = 3): Promise<PendingReview[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      fileId: files.id,
      fileName: files.name,
      stageId: workflowStages.id,
      stageName: workflowStages.stageName,
      templateName: workflowTemplates.name,
      assignedReviewers: fileWorkflowStageProgress.assignedReviewers,
      daysPending: sql<number>`DATEDIFF(NOW(), ${fileWorkflowStageProgress.startedAt})`.as('daysPending'),
      workflowInstanceId: fileWorkflowInstances.id,
    })
    .from(fileWorkflowStageProgress)
    .innerJoin(workflowStages, eq(fileWorkflowStageProgress.stageId, workflowStages.id))
    .innerJoin(fileWorkflowInstances, eq(fileWorkflowStageProgress.workflowInstanceId, fileWorkflowInstances.id))
    .innerJoin(workflowTemplates, eq(fileWorkflowInstances.workflowTemplateId, workflowTemplates.id))
    .innerJoin(files, eq(fileWorkflowInstances.fileId, files.id))
    .where(
      and(
        eq(fileWorkflowStageProgress.status, 'pending'),
        sql`DATEDIFF(NOW(), ${fileWorkflowStageProgress.startedAt}) >= ${daysThreshold}`
      )
    );

  return results.map(r => ({
    fileId: r.fileId,
    fileName: r.fileName,
    stageId: r.stageId,
    stageName: r.stageName,
    templateName: r.templateName,
    assignedReviewers: r.assignedReviewers || '[]',
    daysPending: Number(r.daysPending) || 0,
    workflowInstanceId: r.workflowInstanceId,
  }));
}

/**
 * Send reminder emails to reviewers for pending reviews
 */
export async function sendWorkflowReminders(daysThreshold: number = 3): Promise<{
  sent: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pendingReviews = await findPendingReviews(daysThreshold);
  
  let sent = 0;
  let failed = 0;

  for (const review of pendingReviews) {
    try {
      // Parse assigned reviewers
      const reviewerIds: number[] = JSON.parse(review.assignedReviewers);
      
      // Get reviewer details
      const reviewers = await db
        .select()
        .from(users)
        .where(sql`${users.id} IN (${sql.join(reviewerIds.map(id => sql`${id}`), sql`, `)})`);

      // Send email to each reviewer
      for (const reviewer of reviewers) {
        if (reviewer.email) {
          try {
            await sendEmailNotification({
              recipientEmail: reviewer.email,
              recipientName: reviewer.name || 'Reviewer',
              subject: `Workflow Reminder: ${review.fileName} pending review`,
              body: `
                <h2>Workflow Review Reminder</h2>
                <p>Hello ${reviewer.name || 'Reviewer'},</p>
                <p>This is a reminder that the following file is pending your review:</p>
                <ul>
                  <li><strong>File:</strong> ${review.fileName}</li>
                  <li><strong>Workflow:</strong> ${review.templateName}</li>
                  <li><strong>Stage:</strong> ${review.stageName}</li>
                  <li><strong>Days Pending:</strong> ${review.daysPending}</li>
                </ul>
                <p>Please log in to the WorldPath Regulatory Solutions portal to review and approve/reject this file.</p>
                <p>Thank you for your prompt attention to this matter.</p>
              `,
            });
            sent++;
          } catch (emailError) {
            console.error(`Failed to send reminder to ${reviewer.email}:`, emailError);
            failed++;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process reminder for file ${review.fileName}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Schedule workflow reminders to run daily
 * This should be called from a cron job or scheduled task
 */
export async function scheduleWorkflowReminders() {
  console.log('[Workflow Reminders] Starting daily reminder check...');
  
  try {
    const result = await sendWorkflowReminders(3); // 3 days threshold
    console.log(`[Workflow Reminders] Sent ${result.sent} reminders, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('[Workflow Reminders] Error sending reminders:', error);
    throw error;
  }
}
