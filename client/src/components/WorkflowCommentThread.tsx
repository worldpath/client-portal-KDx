import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserMentionInput from "@/components/UserMentionInput";
import { MessageCircle, ChevronDown, ChevronRight, Reply, Loader2, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkflowCommentThreadProps {
  workflowInstanceId: number;
  stageId: number;
}

interface CommentNodeProps {
  comment: any;
  depth: number;
  onReply: (commentId: number) => void;
  replyingTo: number | null;
  replyContent: string;
  setReplyContent: (content: string) => void;
  handleReplySubmit: (parentCommentId: number) => void;
  isSubmitting: boolean;
  currentUserId?: number;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
}

function CommentNode({
  comment,
  depth,
  onReply,
  replyingTo,
  replyContent,
  setReplyContent,
  handleReplySubmit,
  isSubmitting,
  currentUserId,
  onEdit,
  onDelete,
}: CommentNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReplying = replyingTo === comment.id;

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case "approval":
        return "text-green-700 bg-green-50 border-green-200";
      case "rejection":
        return "text-red-700 bg-red-50 border-red-200";
      case "reply":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case "approval":
        return "✓ Approved";
      case "rejection":
        return "✗ Rejected";
      case "reply":
        return "💬 Reply";
      default:
        return "Comment";
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-8 mt-2")}>
      <Card className={cn("p-4 border", getCommentTypeColor(comment.commentType))}>
        <div className="flex items-start gap-3">
          {hasReplies && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mt-1 hover:bg-accent rounded p-1"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium">
                {getCommentTypeLabel(comment.commentType)}
              </span>
              <span className="text-sm font-semibold">
                {comment.userName || comment.userEmail || "Unknown User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                className="h-7 text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              {currentUserId === comment.userId && !comment.deletedAt && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(comment.id, comment.content)}
                    className="h-7 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              {hasReplies && (
                <span className="text-xs text-muted-foreground">
                  {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reply input */}
        {isReplying && (
          <div className="mt-4 space-y-2 pl-8">
            <UserMentionInput
              value={replyContent}
              onChange={setReplyContent}
              placeholder="Write a reply... (Use @ to mention users)"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleReplySubmit(comment.id)}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Post Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReply(null as any)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Nested replies */}
      {!collapsed && hasReplies && (
        <div className="space-y-2">
          {comment.replies.map((reply: any) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleReplySubmit={handleReplySubmit}
              isSubmitting={isSubmitting}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowCommentThread({
  workflowInstanceId,
  stageId,
}: WorkflowCommentThreadProps) {
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch comments
  const { data: comments, isLoading } = trpc.workflowComments.getStageComments.useQuery({
    workflowInstanceId,
    stageId,
  });

  // Edit mutation
  const editMutation = trpc.workflowComments.editComment.useMutation({
    onSuccess: () => {
      toast.success("Comment updated successfully");
      setEditingCommentId(null);
      utils.workflowComments.getStageComments.invalidate({ workflowInstanceId, stageId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update comment");
    },
  });

  // Delete mutation
  const deleteMutation = trpc.workflowComments.deleteComment.useMutation({
    onSuccess: () => {
      toast.success("Comment deleted successfully");
      setDeletingCommentId(null);
      utils.workflowComments.getStageComments.invalidate({ workflowInstanceId, stageId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  // Reply mutation
  const replyMutation = trpc.workflowComments.replyToComment.useMutation({
    onSuccess: () => {
      toast.success("Reply posted successfully");
      setReplyingTo(null);
      setReplyContent("");
      utils.workflowComments.getStageComments.invalidate({ workflowInstanceId, stageId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to post reply");
    },
  });

  const handleReplySubmit = (parentCommentId: number) => {
    if (!replyContent.trim()) return;
    replyMutation.mutate({
      parentCommentId,
      content: replyContent,
    });
  };

  const handleEdit = (commentId: number, content: string) => {
    setEditingCommentId(commentId);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (!editingCommentId || !editContent.trim()) return;
    editMutation.mutate({
      commentId: editingCommentId,
      newContent: editContent,
    });
  };

  const handleDelete = (commentId: number) => {
    setDeletingCommentId(commentId);
  };

  const confirmDelete = () => {
    if (!deletingCommentId) return;
    deleteMutation.mutate({ commentId: deletingCommentId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
        <p>No comments yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {comments.map((comment: any) => (
          <CommentNode
            key={comment.id}
            comment={comment}
            depth={0}
            onReply={setReplyingTo}
            replyingTo={replyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            handleReplySubmit={handleReplySubmit}
            isSubmitting={replyMutation.isPending}
            currentUserId={user?.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingCommentId !== null} onOpenChange={() => setEditingCommentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
            <DialogDescription>
              You can edit your comment within 15 minutes of posting.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            placeholder="Edit your comment..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCommentId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
              {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingCommentId !== null} onOpenChange={() => setDeletingCommentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCommentId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
