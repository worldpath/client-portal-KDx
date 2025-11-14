import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Loader2, User, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingFile {
  id: number;
  name: string;
  url: string;
  folderId: number;
  uploadedBy: number;
  uploaderName: string;
  uploadedAt: Date;
  approvalRequirement: string;
  reviewers: Array<{
    id: number;
    name: string;
    status: string;
    assignedAt: Date;
  }>;
}

export default function PendingApprovalsWidget() {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PendingFile | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();

  // Fetch pending approvals
  const { data: pendingFiles = [], isLoading } = trpc.workflow.pendingApprovalsOverview.useQuery();

  // Approve mutation
  const approveMutation = trpc.workflow.approveByReviewer.useMutation({
    onSuccess: () => {
      toast.success("File approved successfully");
      setApproveDialogOpen(false);
      setNotes("");
      setSelectedFile(null);
      utils.workflow.pendingApprovalsOverview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve file");
    },
  });

  // Reject mutation
  const rejectMutation = trpc.workflow.rejectByReviewer.useMutation({
    onSuccess: () => {
      toast.success("File rejected");
      setRejectDialogOpen(false);
      setReason("");
      setSelectedFile(null);
      utils.workflow.pendingApprovalsOverview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject file");
    },
  });

  const handleApprove = (file: PendingFile) => {
    setSelectedFile(file);
    setApproveDialogOpen(true);
  };

  const handleReject = (file: PendingFile) => {
    setSelectedFile(file);
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedFile) return;
    approveMutation.mutate({
      fileId: selectedFile.id,
      notes: notes || undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedFile || !reason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      fileId: selectedFile.id,
      reason: reason.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Approvals
              </CardTitle>
              {pendingFiles.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingFiles.length}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Files awaiting review and approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingFiles.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No files pending approval
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 border border-border rounded-lg space-y-3 hover:bg-accent/5 transition-colors"
                >
                  {/* File Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {file.uploaderName}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
                          </span>
                          <span className="capitalize">
                            Requires: {file.approvalRequirement?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reviewers */}
                  {file.reviewers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {file.reviewers.map((reviewer: { id: number; name: string; status: string; assignedAt: Date }) => (
                        <div
                          key={reviewer.id}
                          className="flex items-center gap-2 text-xs bg-accent/10 px-2 py-1 rounded"
                        >
                          <span>{reviewer.name}</span>
                          {getStatusBadge(reviewer.status)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pl-8">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(file)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(file)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve File</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{selectedFile?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false);
                setNotes("");
              }}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject File</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedFile?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this file is being rejected..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !reason.trim()}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
