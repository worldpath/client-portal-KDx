import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, FileText, Send } from "lucide-react";

interface WorkflowManagerProps {
  fileId: number;
  fileName: string;
  currentStatus: string;
  reviewerId?: number | null;
  reviewNotes?: string | null;
  uploadedBy: number;
  onStatusChange?: () => void;
}

export function WorkflowManager({
  fileId,
  fileName,
  currentStatus,
  reviewerId,
  reviewNotes,
  uploadedBy,
  onStatusChange,
}: WorkflowManagerProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: users } = trpc.users.list.useQuery();
  const { data: auth } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const submitMutation = trpc.workflow.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("File submitted for review");
      setShowSubmitDialog(false);
      setSelectedReviewer("");
      onStatusChange?.();
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approveMutation = trpc.workflow.approve.useMutation({
    onSuccess: () => {
      toast.success("File approved");
      setShowApproveDialog(false);
      setApprovalNotes("");
      onStatusChange?.();
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.workflow.reject.useMutation({
    onSuccess: () => {
      toast.success("File rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      onStatusChange?.();
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetMutation = trpc.workflow.resetToDraft.useMutation({
    onSuccess: () => {
      toast.success("File reset to draft");
      onStatusChange?.();
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate({
      fileId,
      reviewerId: selectedReviewer ? parseInt(selectedReviewer) : undefined,
    });
  };

  const handleApprove = () => {
    approveMutation.mutate({
      fileId,
      notes: approvalNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      fileId,
      reason: rejectionReason,
    });
  };

  const handleReset = () => {
    if (confirm("Reset this file to draft status?")) {
      resetMutation.mutate({ fileId });
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "draft":
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            Draft
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <Clock className="h-3 w-3" />
            Under Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const canSubmit = currentStatus === "draft" || currentStatus === "rejected";
  const canApprove = currentStatus === "under_review" && (reviewerId === auth?.id || auth?.role === "admin");
  const canReset = (uploadedBy === auth?.id || auth?.role === "admin") && currentStatus !== "draft";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {getStatusBadge()}
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowSubmitDialog(true)}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              Submit for Review
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowApproveDialog(true)}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                className="gap-1"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {canReset && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Reset to Draft
            </Button>
          )}
        </div>
      </div>

      {reviewNotes && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-1">Review Notes:</p>
          <p className="text-sm text-muted-foreground">{reviewNotes}</p>
        </div>
      )}

      {/* Submit for Review Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
            <DialogDescription>
              Submit "{fileName}" for review. You can optionally assign a specific reviewer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Reviewer (Optional)</label>
              <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.id !== auth?.id).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve File</DialogTitle>
            <DialogDescription>
              Approve "{fileName}". You can add optional notes about your approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Approval Notes (Optional)</label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject File</DialogTitle>
            <DialogDescription>
              Reject "{fileName}". Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this file is being rejected..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
