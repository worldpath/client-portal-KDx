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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Users, UserPlus, UserMinus } from "lucide-react";

interface MultiReviewerManagerProps {
  fileId: number;
  fileName: string;
  approvalRequirement: string;
  onUpdate?: () => void;
}

export function MultiReviewerManager({
  fileId,
  fileName,
  approvalRequirement,
  onUpdate,
}: MultiReviewerManagerProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<number[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState(approvalRequirement);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: users } = trpc.users.list.useQuery();
  const { data: reviewers, refetch: refetchReviewers } = trpc.workflow.getFileReviewers.useQuery({ fileId });
  const utils = trpc.useUtils();

  const assignReviewersMutation = trpc.workflow.assignReviewers.useMutation({
    onSuccess: () => {
      toast.success("Reviewers assigned successfully");
      setShowAssignDialog(false);
      setSelectedReviewerIds([]);
      refetchReviewers();
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to assign reviewers: ${error.message}`);
    },
  });

  const removeReviewerMutation = trpc.workflow.removeReviewer.useMutation({
    onSuccess: () => {
      toast.success("Reviewer removed successfully");
      refetchReviewers();
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to remove reviewer: ${error.message}`);
    },
  });

  const approveMutation = trpc.workflow.approveByReviewer.useMutation({
    onSuccess: () => {
      toast.success("File approved successfully");
      setShowApproveDialog(false);
      setApprovalNotes("");
      refetchReviewers();
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.workflow.rejectByReviewer.useMutation({
    onSuccess: () => {
      toast.success("File rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetchReviewers();
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleAssignReviewers = () => {
    if (selectedReviewerIds.length === 0) {
      toast.error("Please select at least one reviewer");
      return;
    }

    assignReviewersMutation.mutate({
      fileId,
      reviewerIds: selectedReviewerIds,
      approvalRequirement: selectedRequirement as any,
    });
  };

  const handleRemoveReviewer = (reviewerId: number) => {
    if (confirm("Are you sure you want to remove this reviewer?")) {
      removeReviewerMutation.mutate({ fileId, reviewerId });
    }
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

  const toggleReviewerSelection = (reviewerId: number) => {
    setSelectedReviewerIds(prev =>
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequirementLabel = (req: string) => {
    switch (req) {
      case "all_must_approve":
        return "All Must Approve";
      case "majority_must_approve":
        return "Majority Must Approve";
      case "any_can_approve":
        return "Any Can Approve";
      default:
        return req;
    }
  };

  const approvedCount = reviewers?.filter(r => r.reviewStatus === "approved").length || 0;
  const totalCount = reviewers?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Multi-Reviewer Approval
          </h3>
          <p className="text-sm text-muted-foreground">
            Approval Requirement: {getRequirementLabel(approvalRequirement)}
          </p>
          <p className="text-sm text-muted-foreground">
            Progress: {approvedCount} / {totalCount} approved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAssignDialog(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Reviewers
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowApproveDialog(true)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>

      {/* Reviewers List */}
      <div className="space-y-2">
        {reviewers && reviewers.length > 0 ? (
          reviewers.map((reviewer) => (
            <div
              key={reviewer.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{reviewer.reviewerName || reviewer.reviewerEmail}</p>
                  {getStatusBadge(reviewer.reviewStatus)}
                </div>
                {reviewer.reviewNotes && (
                  <p className="text-sm text-muted-foreground mt-1">{reviewer.reviewNotes}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned: {new Date(reviewer.assignedAt).toLocaleString()}
                  {reviewer.reviewedAt && ` • Reviewed: ${new Date(reviewer.reviewedAt).toLocaleString()}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveReviewer(reviewer.reviewerId)}
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No reviewers assigned yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setShowAssignDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Reviewers
            </Button>
          </div>
        )}
      </div>

      {/* Assign Reviewers Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Reviewers</DialogTitle>
            <DialogDescription>
              Select reviewers for {fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Approval Requirement</Label>
              <Select value={selectedRequirement} onValueChange={setSelectedRequirement}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_must_approve">All Must Approve</SelectItem>
                  <SelectItem value="majority_must_approve">Majority Must Approve</SelectItem>
                  <SelectItem value="any_can_approve">Any Can Approve</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Reviewers</Label>
              <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                {users?.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reviewer-${user.id}`}
                      checked={selectedReviewerIds.includes(user.id)}
                      onCheckedChange={() => toggleReviewerSelection(user.id)}
                    />
                    <Label
                      htmlFor={`reviewer-${user.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {user.name || user.email}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({user.role})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignReviewers} disabled={assignReviewersMutation.isPending}>
              {assignReviewersMutation.isPending ? "Assigning..." : "Assign"}
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
              Add optional notes for your approval
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Approval notes (optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
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
              Please provide a reason for rejection
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Reason for rejection *"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            required
          />

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
