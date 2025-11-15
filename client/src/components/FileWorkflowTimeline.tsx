import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Circle, Clock, XCircle, Loader2, User, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileWorkflowTimelineProps {
  fileId: number;
}

export default function FileWorkflowTimeline({ fileId }: FileWorkflowTimelineProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedWorkflowInstanceId, setSelectedWorkflowInstanceId] = useState<number | null>(null);
  const [undoTimers, setUndoTimers] = useState<Record<number, number>>({});

  const utils = trpc.useUtils();

  // Fetch workflow progress
  const { data: workflowProgress, isLoading } = trpc.workflows.getFileProgress.useQuery({ fileId });

  // Approve stage mutation
  const approveStage = trpc.workflows.approveStage.useMutation({
    onSuccess: () => {
      toast.success("Stage approved successfully");
      setShowApproveDialog(false);
      setApprovalComment("");
      setSelectedStageId(null);
      setSelectedWorkflowInstanceId(null);
      utils.workflows.getFileProgress.invalidate({ fileId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve stage");
    },
  });

  // Reject stage mutation
  const rejectStage = trpc.workflows.rejectStage.useMutation({
    onSuccess: () => {
      toast.success("Stage rejected");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedStageId(null);
      utils.workflows.getFileProgress.invalidate({ fileId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject stage");
    },
  });

  // Undo action mutation
  const undoAction = trpc.workflows.undoAction.useMutation({
    onSuccess: () => {
      toast.success("Action undone successfully");
      utils.workflows.getFileProgress.invalidate({ fileId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to undo action");
    },
  });

  // Update countdown timers
  useEffect(() => {
    if (!workflowProgress) return;

    const interval = setInterval(() => {
      const newTimers: Record<number, number> = {};
      workflowProgress.progress.forEach((progressItem: any) => {
        if (progressItem.actionTimestamp && !progressItem.undoneAt) {
          const actionTime = new Date(progressItem.actionTimestamp).getTime();
          const now = Date.now();
          const elapsed = (now - actionTime) / 1000; // seconds
          const remaining = Math.max(0, 300 - elapsed); // 5 minutes = 300 seconds
          newTimers[progressItem.stageId] = Math.floor(remaining);
        }
      });
      setUndoTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [workflowProgress]);

  const handleApproveClick = (workflowInstanceId: number, stageId: number) => {
    setSelectedWorkflowInstanceId(workflowInstanceId);
    setSelectedStageId(stageId);
    setShowApproveDialog(true);
  };

  const handleApproveConfirm = () => {
    if (!selectedWorkflowInstanceId || !selectedStageId) return;
    approveStage.mutate({
      workflowInstanceId: selectedWorkflowInstanceId,
      stageId: selectedStageId,
      comment: approvalComment.trim() || undefined,
    });
  };

  const handleRejectClick = (stageId: number) => {
    setSelectedStageId(stageId);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (!workflowProgress || !selectedStageId || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
      rejectStage.mutate({
        workflowInstanceId: workflowProgress.instance.id,
      stageId: selectedStageId,
      reason: rejectReason,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflowProgress) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Circle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No workflow assigned to this file</p>
        </CardContent>
      </Card>
    );
  }

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case "in_progress":
        return <Clock className="w-6 h-6 text-blue-600" />;
      case "rejected":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStageStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
          <CardDescription>
            Workflow Status: <span className="font-medium capitalize">{workflowProgress.instance.status.replace('_', ' ')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {workflowProgress.progress.map((progressItem: any, index: number) => {
              const stage = progressItem.stage;
              if (!stage) return null;
              const isCurrentStage = progressItem.status === "in_progress";
              const isCompleted = progressItem.status === "completed";
              const isRejected = progressItem.status === "rejected";
              const isPending = progressItem.status === "pending";

              return (
                <div key={stage.stageId} className="relative">
                  {/* Connector line */}
                  {index < workflowProgress.progress.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-3 top-12 w-0.5 h-full",
                        isCompleted ? "bg-green-600" : "bg-border"
                      )}
                    />
                  )}

                  <div className={cn(
                    "flex gap-4 p-4 rounded-lg border",
                    isCurrentStage && "bg-blue-50 border-blue-200",
                    isCompleted && "bg-green-50 border-green-200",
                    isRejected && "bg-red-50 border-red-200",
                    isPending && "bg-muted/30"
                  )}>
                    {/* Stage icon */}
                    <div className="flex-shrink-0">
                      {getStageIcon(progressItem.status)}
                    </div>

                    {/* Stage content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{stage.stageName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getStageStatusText(progressItem.status)}
                            {stage.requiredApprovals > 1 && ` (${stage.requiredApprovals} approvals required)`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {isCurrentStage && progressItem.canApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveClick(workflowProgress.instance.id, progressItem.stageId)}
                                disabled={approveStage.isPending}
                              >
                                {approveStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClick(progressItem.stageId)}
                                disabled={rejectStage.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {/* Undo button for recent actions */}
                          {(isCompleted || isRejected) && progressItem.canUndo && undoTimers[progressItem.stageId] > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => undoAction.mutate({ 
                                workflowInstanceId: workflowProgress.instance.id, 
                                stageId: progressItem.stageId 
                              })}
                              disabled={undoAction.isPending}
                              className="gap-2"
                            >
                              {undoAction.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Undo2 className="w-4 h-4" />
                              )}
                              Undo ({Math.floor(undoTimers[progressItem.stageId] / 60)}:{String(undoTimers[progressItem.stageId] % 60).padStart(2, '0')})
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Assigned reviewers */}
                      {progressItem.assignedReviewers && progressItem.assignedReviewers.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Reviewers:</span>
                          <span>{progressItem.assignedReviewers}</span>
                        </div>
                      )}

                      {/* Approval/Rejection details */}
                      {isCompleted && progressItem.approvedBy && (
                        <div className="space-y-2">
                          <p className="text-sm text-green-700">
                            Approved by: {progressItem.approvedBy}
                            {progressItem.completedAt && ` on ${new Date(progressItem.completedAt).toLocaleDateString()}`}
                          </p>
                          {/* Approval comments */}
                          {progressItem.approvalComments && JSON.parse(progressItem.approvalComments).length > 0 && (
                            <div className="space-y-1 pl-4 border-l-2 border-green-200">
                              {JSON.parse(progressItem.approvalComments).map((comment: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <p className="text-muted-foreground italic">"{comment.comment}"</p>
                                  <p className="text-xs text-muted-foreground">
                                    — {new Date(comment.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isRejected && progressItem.rejectedBy && (
                        <div className="text-sm text-red-700">
                          <p>Rejected by: {progressItem.rejectedBy}</p>
                          {progressItem.rejectionReason && (
                            <p className="mt-1 italic">Reason: {progressItem.rejectionReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Stage</DialogTitle>
            <DialogDescription>
              Add an optional comment to your approval (recommended for transparency)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment (Optional)</Label>
              <Textarea
                id="approval-comment"
                placeholder="Add context, notes, or feedback about your approval..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={approveStage.isPending}
            >
              {approveStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Stage</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this workflow stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this stage is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectStage.isPending || !rejectReason.trim()}
            >
              {rejectStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
