import { createNotification } from "../db";
import { notificationBroadcaster } from "./notificationBroadcaster";

interface CreateNotificationParams {
  userId: number;
  type: "file_upload" | "file_approved" | "file_rejected" | "comment_mention" | "reviewer_assigned" | "share_created";
  title: string;
  message: string;
  fileId?: number;
}

export async function createAndBroadcastNotification(params: CreateNotificationParams) {
  try {
    // Create notification in database
    const result = await createNotification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      fileId: params.fileId || null,
      isRead: 0,
    });

    // Broadcast to connected clients
    if (result) {
      const notification = {
        id: (result as any).insertId || Date.now(),
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        fileId: params.fileId || null,
        isRead: 0,
        createdAt: new Date(),
      };

      notificationBroadcaster.broadcast(params.userId, notification);
    }

    return result;
  } catch (error) {
    console.error("[Notification] Error creating notification:", error);
    return null;
  }
}
