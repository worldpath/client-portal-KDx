import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  MessageSquare, 
  Send, 
  Edit2, 
  Trash2, 
  X,
  User
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface FileCommentsProps {
  fileId: number;
  fileName: string;
}

export default function FileComments({ fileId, fileName }: FileCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const utils = trpc.useUtils();

  // Fetch comments
  const { data: comments = [], isLoading } = trpc.comments.list.useQuery({ fileId });

  // Create comment mutation
  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ fileId });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  // Update comment mutation
  const updateCommentMutation = trpc.comments.update.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ fileId });
      setEditingCommentId(null);
      setEditContent("");
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update comment");
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ fileId });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      fileId,
      content: newComment,
    });
  };

  const handleSubmitReply = (parentId: number) => {
    if (!replyContent.trim()) return;
    
    createCommentMutation.mutate({
      fileId,
      content: replyContent,
      parentId,
    });
  };

  const handleUpdateComment = (commentId: number) => {
    if (!editContent.trim()) return;
    
    updateCommentMutation.mutate({
      commentId,
      content: editContent,
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate({ commentId });
    }
  };

  const startEdit = (commentId: number, content: string) => {
    setEditingCommentId(commentId);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const startReply = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyContent("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent("");
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Highlight @mentions in text
  const highlightMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="text-primary font-semibold">@$1</span>');
  };

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: number) => comments.filter(c => c.parentId === parentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Input */}
      <Card className="p-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Add a comment... Use @username to mention someone"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Tip: Use @username to mention team members
            </p>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          topLevelComments.map((comment) => (
            <Card key={comment.id} className="p-4">
              {/* Comment Header */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isEdited && (
                      <span className="text-xs text-muted-foreground italic">(edited)</span>
                    )}
                  </div>

                  {/* Comment Content */}
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={updateCommentMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="text-sm text-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }}
                      />

                      {/* Comment Actions */}
                      <div className="flex items-center gap-3 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startReply(comment.id)}
                          className="h-7 text-xs"
                        >
                          Reply
                        </Button>
                        
                        {user && comment.userId === user.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(comment.id, comment.content)}
                              className="h-7 text-xs"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim() || createCommentMutation.isPending}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelReply}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="mt-3 pl-4 border-l-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{reply.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(reply.createdAt)}
                            </span>
                            {reply.isEdited && (
                              <span className="text-xs text-muted-foreground italic">(edited)</span>
                            )}
                          </div>

                          {editingCommentId === reply.id ? (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[60px] resize-none text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateComment(reply.id)}
                                  disabled={updateCommentMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div 
                                className="text-sm text-foreground"
                                dangerouslySetInnerHTML={{ __html: highlightMentions(reply.content) }}
                              />

                              {user && reply.userId === user.id && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(reply.id, reply.content)}
                                    className="h-6 text-xs"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="h-6 text-xs text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
