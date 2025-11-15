import { extractMentionedUsernames } from "../shared/mentionUtils";
import { createNotification, getUserByName } from "./db";
import { sendEmailNotification } from "./_core/emailNotification";

interface MentionContext {
  fileId: number;
  fileName: string;
  commentText: string;
  mentionerUserId: number;
  mentionerName: string;
  workflowStageId?: number;
  stageName?: string;
}

/**
 * Process @mentions in a comment and create notifications
 */
export async function processMentions(context: MentionContext): Promise<void> {
  const { commentText, fileId, fileName, mentionerUserId, mentionerName, workflowStageId, stageName } = context;

  // Extract mentioned usernames
  const mentionedUsernames = extractMentionedUsernames(commentText);
  
  if (mentionedUsernames.length === 0) return;

  // Get user IDs for mentioned usernames
  const mentionedUsers = await Promise.all(
    mentionedUsernames.map(username => getUserByName(username))
  );

  // Filter out null results and duplicates
  const validUsers = mentionedUsers
    .filter((user): user is NonNullable<typeof user> => user !== null && user !== undefined)
    .filter((user, index, self: any) => self.findIndex((u: any) => u.id === user.id) === index)
    .filter((user: any) => user.id !== mentionerUserId); // Don't notify the person who made the comment

  // Create notifications for each mentioned user
  for (const user of validUsers) {
    try {
      // Create in-app notification
      await createNotification({
        userId: user.id,
        type: "comment_mention",
        title: `${mentionerName} mentioned you in a comment`,
        message: stageName 
          ? `You were mentioned in a workflow comment on "${fileName}" (${stageName}): "${commentText.substring(0, 100)}..."`
          : `You were mentioned in a comment on "${fileName}": "${commentText.substring(0, 100)}..."`,
        fileId,
      });

      // Send email notification if user has email preferences enabled
      if (user.email) {
        const emailBody = stageName
          ? `${mentionerName} mentioned you in a workflow comment:\n\n"${commentText}"\n\nFile: ${fileName}\nStage: ${stageName}\n\nView file: [Link to file]`
          : `${mentionerName} mentioned you in a comment:\n\n"${commentText}"\n\nFile: ${fileName}\n\nView file: [Link to file]`;

        await sendEmailNotification({
          recipientEmail: user.email,
          recipientName: user.name || user.email,
          subject: `You were mentioned in a comment on ${fileName}`,
          body: emailBody,
        });
      }
    } catch (error) {
      console.error(`[Mentions] Failed to notify user ${user.id}:`, error);
    }
  }
}
