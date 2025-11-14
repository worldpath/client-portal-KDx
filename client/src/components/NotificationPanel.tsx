import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileUp,
  CheckCircle,
  XCircle,
  AtSign,
  UserPlus,
  Share2,
  Check,
  Bell,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface NotificationPanelProps {
  onClose: () => void;
}

const iconMap = {
  file_upload: FileUp,
  file_approved: CheckCircle,
  file_rejected: XCircle,
  comment_mention: AtSign,
  reviewer_assigned: UserPlus,
  share_created: Share2,
};

const colorMap = {
  file_upload: "text-blue-500",
  file_approved: "text-green-500",
  file_rejected: "text-red-500",
  comment_mention: "text-purple-500",
  reviewer_assigned: "text-orange-500",
  share_created: "text-cyan-500",
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const snoozeMutation = trpc.notifications.snooze.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }
    if (notification.fileId) {
      onClose();
      setLocation(`/?fileId=${notification.fileId}`);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="gap-2 text-xs"
            >
              <Check className="w-3 h-3" />
              Mark all as read
            </Button>
          )}
        </div>
        {unreadCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type as keyof typeof iconMap] || Bell;
              const iconColor = colorMap[notification.type as keyof typeof colorMap] || "text-gray-500";

              return (
                <div
                  key={notification.id}
                  className={`w-full p-4 hover:bg-accent/50 transition-colors ${
                    notification.isRead === 0 ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {notification.isRead === 0 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => snoozeMutation.mutate({
                            notificationId: notification.id,
                            duration: "15min"
                          })}
                        >
                          Snooze for 15 minutes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => snoozeMutation.mutate({
                            notificationId: notification.id,
                            duration: "1hr"
                          })}
                        >
                          Snooze for 1 hour
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => snoozeMutation.mutate({
                            notificationId: notification.id,
                            duration: "4hr"
                          })}
                        >
                          Snooze for 4 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => snoozeMutation.mutate({
                            notificationId: notification.id,
                            duration: "tomorrow"
                          })}
                        >
                          Snooze until tomorrow
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
