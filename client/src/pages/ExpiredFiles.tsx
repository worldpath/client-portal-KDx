import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ExpiredFiles() {
  const { data: expiredFiles, isLoading } = trpc.files.getExpired.useQuery();
  const utils = trpc.useUtils();

  const archiveMutation = trpc.files.archive.useMutation({
    onSuccess: () => {
      toast.success("File archived successfully");
      utils.files.getExpired.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to archive file: ${error.message}`);
    },
  });

  const deleteMutation = trpc.files.permanentlyDelete.useMutation({
    onSuccess: () => {
      toast.success("File permanently deleted");
      utils.files.getExpired.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });

  const handleArchive = (fileId: number, fileName: string) => {
    if (confirm(`Archive "${fileName}"? It can be restored later from the Archived Files view.`)) {
      archiveMutation.mutate({ fileId });
    }
  };

  const handleDelete = (fileId: number, fileName: string) => {
    if (confirm(`Permanently delete "${fileName}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ fileId });
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Expired Files</h1>
          <p className="text-muted-foreground">
            Files that have passed their expiration date and require action
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !expiredFiles || expiredFiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Expired Files</p>
              <p className="text-sm text-muted-foreground">
                All files are within their valid period
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {expiredFiles.map((file) => (
              <Card key={file.id} className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{file.name}</CardTitle>
                      <CardDescription>
                        Uploaded by {file.uploaderName || file.uploaderEmail || "Unknown"} •{" "}
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(file.id, file.name)}
                        disabled={archiveMutation.isPending}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.id, file.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Expired{" "}
                      {file.expiresAt
                        ? formatDistanceToNow(new Date(file.expiresAt), { addSuffix: true })
                        : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
