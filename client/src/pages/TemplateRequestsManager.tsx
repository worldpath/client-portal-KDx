import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { CreateTemplateFromRequest } from "@/components/CreateTemplateFromRequest";
import { toast } from "sonner";

export default function TemplateRequestsManager() {
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const utils = trpc.useUtils();

  const { data: pendingRequests = [], isLoading: pendingLoading } =
    trpc.templates.getRequests.useQuery({ status: "pending" });

  const { data: approvedRequests = [], isLoading: approvedLoading } =
    trpc.templates.getRequests.useQuery({ status: "approved" });

  const { data: rejectedRequests = [], isLoading: rejectedLoading } =
    trpc.templates.getRequests.useQuery({ status: "rejected" });

  const approveMutation = trpc.templates.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Request approved successfully");
      utils.templates.getRequests.invalidate();
      setSelectedRequest(null);
      setAdminComment("");
      setActionType(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const rejectMutation = trpc.templates.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Request rejected");
      utils.templates.getRequests.invalidate();
      setSelectedRequest(null);
      setAdminComment("");
      setActionType(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  const handleApprove = (requestId: number) => {
    setSelectedRequest(requestId);
    setActionType("approve");
  };

  const handleReject = (requestId: number) => {
    setSelectedRequest(requestId);
    setActionType("reject");
  };

  const confirmAction = () => {
    if (!selectedRequest) return;

    if (actionType === "approve") {
      approveMutation.mutate({
        requestId: selectedRequest,
        adminComment: adminComment || undefined,
      });
    } else if (actionType === "reject") {
      if (!adminComment.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }
      rejectMutation.mutate({
        requestId: selectedRequest,
        adminComment,
      });
    }
  };

  const [createTemplateRequest, setCreateTemplateRequest] = useState<any>(null);

  const renderRequestCard = (request: any, showActions = false, showCreateTemplate = false) => (
    <Card key={request.id}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{request.templateName}</CardTitle>
              {request.description && (
                <CardDescription className="mt-1">{request.description}</CardDescription>
              )}
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>
                  <span className="font-medium">Requested by:</span> {request.requesterName}
                </p>
                <p>
                  <span className="font-medium">Submitted:</span>{" "}
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium mb-1">Justification:</p>
          <p className="text-sm text-muted-foreground">{request.justification}</p>
        </div>
        {request.adminComment && (
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-1">Admin Comment:</p>
            <p className="text-sm text-muted-foreground">{request.adminComment}</p>
          </div>
        )}
        {showCreateTemplate && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => setCreateTemplateRequest(request)}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleApprove(request.id)}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(request.id)}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Template Requests</h1>
        <p className="text-muted-foreground mt-1">Review and manage user template requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => renderRequestCard(request, true))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p>No approved requests yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            approvedRequests.map((request) => renderRequestCard(request, false, true))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p>No rejected requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            rejectedRequests.map((request) => renderRequestCard(request))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={selectedRequest !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setAdminComment("");
            setActionType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Add an optional comment for the requester."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              placeholder={
                actionType === "approve"
                  ? "Optional comment..."
                  : "Reason for rejection (required)"
              }
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setAdminComment("");
                setActionType(null);
              }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createTemplateRequest && (
        <CreateTemplateFromRequest
          request={createTemplateRequest}
          open={!!createTemplateRequest}
          onOpenChange={(open) => !open && setCreateTemplateRequest(null)}
          onSuccess={() => {
            setCreateTemplateRequest(null);
            approvedRefetch();
          }}
        />
      )}
    </div>
  );
}
