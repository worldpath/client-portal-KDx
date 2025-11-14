import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Loader2, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ArchivedFiles() {
  const { data: archivedFiles, isLoading } = trpc.files.getArchived.useQuery();
  const utils = trpc.useUtils();

  const restoreMutation = trpc.files.restoreArchived.useMutation({
    onSuccess: () => {
      toast.success("File restored successfully");
      utils.files.getArchived.invalidate();
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to restore file: ${error.message}`);
    },
  });

  const deleteMutation = trpc.files.permanentlyDelete.useMutation({
    onSuccess: () => {
      toast.success("File permanently deleted");
      utils.files.getArchived.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });

  const handleRestore = (fileId: number, fileName: string) => {
    if (confirm(`Restore "${fileName}" to active files?`)) {
      restoreMutation.mutate({ fileId });
    }
  };

  const handleDelete = (fileId: number, fileName: string) => {
    if (confirm(`Permanently delete "${fileName}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ fileId });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Archived Files</h1>
          <p className="text-muted-foreground">
            Files that have been archived and can be restored or permanently deleted
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !archivedFiles || archivedFiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Archived Files</p>
              <p className="text-sm text-muted-foreground">
                Archived files will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {archivedFiles.map((file) => (
              <Card key={file.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{file.name}</CardTitle>
                      <CardDescription>
                        {formatBytes(file.size)} • Archived by{" "}
                        {file.archiverName || file.archiverEmail || "Unknown"} •{" "}
                        {file.archivedAt
                          ? formatDistanceToNow(new Date(file.archivedAt), { addSuffix: true })
                          : ""}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(file.id, file.name)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
