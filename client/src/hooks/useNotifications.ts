import { useEffect, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  fileId: number | null;
  isRead: number;
  createdAt: Date;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const utils = trpc.useUtils();

  // Fetch initial notifications
  const { data: initialNotifications = [] } = trpc.notifications.list.useQuery({ limit: 50 });
  const { data: initialUnreadCount = 0 } = trpc.notifications.unreadCount.useQuery();

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
      utils.notifications.list.invalidate();
    },
  });

  // Initialize notifications from query
  useEffect(() => {
    setNotifications(initialNotifications as Notification[]);
  }, [initialNotifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Setup SSE connection
  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[SSE] Connected to notification stream");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "connected") {
            console.log("[SSE] Connection confirmed");
            return;
          }

          // New notification received
          const newNotification = data as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          });

          // Invalidate queries
          utils.notifications.list.invalidate();
          utils.notifications.unreadCount.invalidate();
        } catch (error) {
          console.error("[SSE] Error parsing notification:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        eventSource.close();
        
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[SSE] Attempting to reconnect...");
          connectSSE();
        }, 5000);
      };
    };

    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [utils]);

  const markAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: 1 } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
