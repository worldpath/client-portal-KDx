import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock, 
  Upload, 
  Edit, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Share2,
  FileText,
  Loader2,
  Filter,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  fileId: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  upload_file: <Upload className="w-4 h-4" />,
  update_file: <Edit className="w-4 h-4" />,
  add_comment: <MessageSquare className="w-4 h-4" />,
  approve_file: <CheckCircle className="w-4 h-4 text-green-600" />,
  reject_file: <XCircle className="w-4 h-4 text-red-600" />,
  assign_reviewer: <UserPlus className="w-4 h-4" />,
  create_share_link: <Share2 className="w-4 h-4" />,
  submit_for_review: <FileText className="w-4 h-4" />,
  reset_to_draft: <FileText className="w-4 h-4" />,
};

const actionLabels: Record<string, string> = {
  upload_file: "Uploaded file",
  update_file: "Updated file",
  add_comment: "Added comment",
  approve_file: "Approved file",
  reject_file: "Rejected file",
  assign_reviewer: "Assigned reviewer",
  create_share_link: "Created share link",
  submit_for_review: "Submitted for review",
  reset_to_draft: "Reset to draft",
};

export default function FileActivityTimeline({ fileId }: ActivityTimelineProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: activities = [], isLoading } = trpc.files.activityTimeline.useQuery({ fileId });

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredActivities = actionFilter === "all" 
    ? activities 
    : activities.filter(a => a.action === actionFilter);

  const uniqueActions = Array.from(new Set(activities.map(a => a.action)));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Complete history of all actions performed on this file
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actionFilter !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActionFilter("all")}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {actionFilter === "all" ? "No activity recorded yet" : "No matching activities"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {index < filteredActivities.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-border" />
                )}
                
                {/* Activity item */}
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center relative z-10">
                    {actionIcons[activity.action] || <FileText className="w-4 h-4" />}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {activity.userName || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {actionLabels[activity.action] || activity.action}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    
                    {/* Details */}
                    {activity.details && (
                      <div className="mt-2">
                        {activity.details.length > 100 ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {expandedItems.has(activity.id) 
                                ? activity.details 
                                : `${activity.details.substring(0, 100)}...`}
                            </p>
                            <Button
                              size="sm"
                              variant="link"
                              onClick={() => toggleExpanded(activity.id)}
                              className="h-auto p-0 text-xs"
                            >
                              {expandedItems.has(activity.id) ? "Show less" : "Show more"}
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {activity.details}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
