import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import TemplateRequestForm from "@/components/TemplateRequestForm";

export default function MyTemplateRequests() {
  const { data: requests = [], isLoading } = trpc.templates.getRequests.useQuery({
    myRequests: true,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Template Requests</h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your template requests
          </p>
        </div>
        <TemplateRequestForm />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No template requests yet.</p>
              <p className="text-sm mt-1">Submit a request to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{request.templateName}</CardTitle>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.description && (
                        <CardDescription className="mt-1">{request.description}</CardDescription>
                      )}
                      <div className="text-sm text-muted-foreground mt-2">
                        <p>
                          <span className="font-medium">Submitted:</span>{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {getStatusIcon(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Justification:</p>
                  <p className="text-sm text-muted-foreground">{request.justification}</p>
                </div>
                {request.adminComment && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-1">Admin Response:</p>
                    <p className="text-sm text-muted-foreground">{request.adminComment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
