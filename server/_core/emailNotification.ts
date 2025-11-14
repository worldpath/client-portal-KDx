import { notifyOwner } from "./notification";

/**
 * Email notification service for workflow events
 * Uses the built-in Manus notification API to send emails to users
 */

export interface EmailNotificationOptions {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
}

/**
 * Send an email notification to a user
 * Note: Currently sends to project owner as a notification
 * In production, this would integrate with a proper email service
 */
export async function sendEmailNotification(options: EmailNotificationOptions): Promise<boolean> {
  const { recipientEmail, recipientName, subject, body } = options;
  
  // For now, notify the owner about the event
  // In production, you would integrate with an email service like SendGrid, AWS SES, etc.
  const success = await notifyOwner({
    title: `Email Notification: ${subject}`,
    content: `To: ${recipientName} (${recipientEmail})\n\n${body}`,
  });
  
  return success;
}

/**
 * Send reviewer assignment notification
 */
export async function sendReviewerAssignmentNotification(params: {
  reviewerEmail: string;
  reviewerName: string;
  fileName: string;
  fileId: number;
  assignedBy: string;
  portalUrl: string;
}): Promise<boolean> {
  const { reviewerEmail, reviewerName, fileName, fileId, assignedBy, portalUrl } = params;
  
  const subject = `You've been assigned to review: ${fileName}`;
  const body = `Hello ${reviewerName},

${assignedBy} has assigned you to review the file "${fileName}".

Please log in to the WorldPath Regulatory Solutions portal to review this file:
${portalUrl}

File Details:
- File Name: ${fileName}
- Assigned By: ${assignedBy}
- Status: Pending Review

Thank you,
WorldPath Regulatory Solutions`;

  return sendEmailNotification({
    recipientEmail: reviewerEmail,
    recipientName: reviewerName,
    subject,
    body,
  });
}

/**
 * Send file status change notification
 */
export async function sendStatusChangeNotification(params: {
  recipientEmail: string;
  recipientName: string;
  fileName: string;
  fileId: number;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  notes?: string;
  portalUrl: string;
}): Promise<boolean> {
  const { recipientEmail, recipientName, fileName, fileId, oldStatus, newStatus, changedBy, notes, portalUrl } = params;
  
  const subject = `File status updated: ${fileName}`;
  const body = `Hello ${recipientName},

The status of "${fileName}" has been updated.

Status Change:
- Previous Status: ${oldStatus.replace(/_/g, ' ').toUpperCase()}
- New Status: ${newStatus.replace(/_/g, ' ').toUpperCase()}
- Changed By: ${changedBy}
${notes ? `\nReviewer Notes:\n${notes}\n` : ''}

View the file in the WorldPath Regulatory Solutions portal:
${portalUrl}

Thank you,
WorldPath Regulatory Solutions`;

  return sendEmailNotification({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    subject,
    body,
  });
}

/**
 * Send @mention notification
 */
export async function sendMentionNotification(params: {
  recipientEmail: string;
  recipientName: string;
  fileName: string;
  fileId: number;
  mentionedBy: string;
  commentText: string;
  portalUrl: string;
}): Promise<boolean> {
  const { recipientEmail, recipientName, fileName, fileId, mentionedBy, commentText, portalUrl } = params;
  
  const subject = `${mentionedBy} mentioned you in a comment`;
  const body = `Hello ${recipientName},

${mentionedBy} mentioned you in a comment on "${fileName}":

"${commentText}"

View and respond to this comment in the WorldPath Regulatory Solutions portal:
${portalUrl}

Thank you,
WorldPath Regulatory Solutions`;

  return sendEmailNotification({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    subject,
    body,
  });
}

/**
 * Send share link notification
 */
export async function sendShareLinkNotification(params: {
  recipientEmail: string;
  recipientName: string;
  fileName: string;
  sharedBy: string;
  shareUrl: string;
  expiresAt?: Date;
  hasPassword: boolean;
  message?: string;
}): Promise<boolean> {
  const { recipientEmail, recipientName, fileName, sharedBy, shareUrl, expiresAt, hasPassword, message } = params;
  
  const subject = `${sharedBy} shared a file with you: ${fileName}`;
  const body = `Hello ${recipientName},

${sharedBy} has shared "${fileName}" with you via WorldPath Regulatory Solutions.

${message ? `Message from ${sharedBy}:\n"${message}"\n\n` : ''}Access the file here:
${shareUrl}
${hasPassword ? '\nNote: This link is password protected. Please contact the sender for the password.' : ''}
${expiresAt ? `\nThis link will expire on: ${expiresAt.toLocaleString()}` : ''}

Thank you,
WorldPath Regulatory Solutions`;

  return sendEmailNotification({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    subject,
    body,
  });
}
