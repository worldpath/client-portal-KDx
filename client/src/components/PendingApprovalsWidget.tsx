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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, Loader2, User, FileText, CheckSquare, Square, Filter, X } from "lucide-react";
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
  
  // Bulk selection state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  
  // Filter state
  const [approvalRequirementFilter, setApprovalRequirementFilter] = useState<string>("all");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");

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
  
  // Bulk approve mutation
  const bulkApproveMutation = trpc.workflow.bulkApproveFiles.useMutation({
    onSuccess: (results) => {
      const successCount = results.succeeded.length;
      const failCount = results.failed.length;
      
      if (failCount === 0) {
        toast.success(`${successCount} file(s) approved successfully`);
      } else {
        toast.warning(`${successCount} file(s) approved, ${failCount} failed`);
      }
      
      setBulkApproveDialogOpen(false);
      setBulkNotes("");
      setSelectedFileIds(new Set());
      utils.workflow.pendingApprovalsOverview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve files");
    },
  });
  
  // Bulk reject mutation
  const bulkRejectMutation = trpc.workflow.bulkRejectFiles.useMutation({
    onSuccess: (results) => {
      const successCount = results.succeeded.length;
      const failCount = results.failed.length;
      
      if (failCount === 0) {
        toast.success(`${successCount} file(s) rejected successfully`);
      } else {
        toast.warning(`${successCount} file(s) rejected, ${failCount} failed`);
      }
      
      setBulkRejectDialogOpen(false);
      setBulkReason("");
      setSelectedFileIds(new Set());
      utils.workflow.pendingApprovalsOverview.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject files");
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
  
  // Bulk selection handlers
  const toggleFileSelection = (fileId: number) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };
  
  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };
  
  const confirmBulkApprove = () => {
    if (selectedFileIds.size === 0) return;
    bulkApproveMutation.mutate({
      fileIds: Array.from(selectedFileIds),
      notes: bulkNotes || undefined,
    });
  };
  
  const confirmBulkReject = () => {
    if (selectedFileIds.size === 0 || !bulkReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    bulkRejectMutation.mutate({
      fileIds: Array.from(selectedFileIds),
      reason: bulkReason.trim(),
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
  
  // Apply filters
  const filteredFiles = pendingFiles.filter(file => {
    if (approvalRequirementFilter !== "all" && file.approvalRequirement !== approvalRequirementFilter) {
      return false;
    }
    if (uploaderFilter !== "all" && file.uploaderName !== uploaderFilter) {
      return false;
    }
    if (reviewerFilter !== "all") {
      const hasReviewer = file.reviewers.some((r: { name: string }) => r.name === reviewerFilter);
      if (!hasReviewer) return false;
    }
    return true;
  });
  
  // Get unique values for filters
  const uniqueApprovalRequirements = Array.from(new Set(pendingFiles.map(f => f.approvalRequirement)));
  const uniqueUploaders = Array.from(new Set(pendingFiles.map(f => f.uploaderName)));
  const uniqueReviewers = Array.from(new Set(pendingFiles.flatMap(f => f.reviewers.map((r: { name: string }) => r.name))));
  
  const hasActiveFilters = approvalRequirementFilter !== "all" || reviewerFilter !== "all" || uploaderFilter !== "all";
  
  const clearFilters = () => {
    setApprovalRequirementFilter("all");
    setReviewerFilter("all");
    setUploaderFilter("all");
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Approvals
              </CardTitle>
              {pendingFiles.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {filteredFiles.length}
                </Badge>
              )}
              {selectedFileIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedFileIds.size} selected
                </Badge>
              )}
              {hasActiveFilters && (
                <Badge variant="outline" className="ml-2 gap-1">
                  <Filter className="w-3 h-3" />
                  Filtered
                </Badge>
              )}
            </div>
            {filteredFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSelectAll}
                  className="gap-2"
                >
                  {selectedFileIds.size === pendingFiles.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedFileIds.size === filteredFiles.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setBulkApproveDialogOpen(true)}
                  disabled={selectedFileIds.size === 0}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve ({selectedFileIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkRejectDialogOpen(true)}
                  disabled={selectedFileIds.size === 0}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject ({selectedFileIds.size})
                </Button>
              </div>
            )}
          </div>
          <CardDescription>
            Files awaiting review and approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={approvalRequirementFilter} onValueChange={setApprovalRequirementFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Approval Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueApprovalRequirements.map(req => (
                    <SelectItem key={req} value={req}>
                      {req === 'all_must_approve' ? 'All Must Approve' : 'Any Can Approve'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviewers</SelectItem>
                  {uniqueReviewers.map(reviewer => (
                    <SelectItem key={reviewer} value={reviewer}>
                      {reviewer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Uploader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Uploaders</SelectItem>
                  {uniqueUploaders.map(uploader => (
                    <SelectItem key={uploader} value={uploader}>
                      {uploader}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
          
          {pendingFiles.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No files pending approval
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                No files match the current filters
              </p>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 border border-border rounded-lg space-y-3 hover:bg-accent/5 transition-colors"
                >
                  {/* File Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleFileSelection(file.id)}
                        className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {selectedFileIds.has(file.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
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

      {/* Bulk Approve Dialog */}
      <Dialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedFileIds.size} file(s)?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bulk-approve-notes">Notes (Optional)</Label>
              <Textarea
                id="bulk-approve-notes"
                placeholder="Add any notes about these approvals..."
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkApproveDialogOpen(false);
                setBulkNotes("");
              }}
              disabled={bulkApproveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkApproveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve {selectedFileIds.size} File(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Files</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedFileIds.size} file(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bulk-reject-reason">Reason *</Label>
              <Textarea
                id="bulk-reject-reason"
                placeholder="Explain why these files are being rejected..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkRejectDialogOpen(false);
                setBulkReason("");
              }}
              disabled={bulkRejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkReject}
              disabled={bulkRejectMutation.isPending || !bulkReason.trim()}
            >
              {bulkRejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject {selectedFileIds.size} File(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
