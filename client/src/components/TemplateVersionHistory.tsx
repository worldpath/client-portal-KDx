import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, History, Download, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface TemplateVersionHistoryProps {
  templateId: number;
  templateName: string;
  isAdmin?: boolean;
}

export default function TemplateVersionHistory({
  templateId,
  templateName,
  isAdmin = false,
}: TemplateVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: versions = [], isLoading } = trpc.templates.getVersionHistory.useQuery(
    { templateId },
    { enabled: open }
  );

  const downloadMutation = trpc.templates.downloadVersion.useMutation({
    onSuccess: (data) => {
      const link = document.createElement('a');
      link.href = data.fileUrl;
      link.download = data.fileName;
      link.click();
      toast.success("Version downloaded successfully");
      utils.templates.getVersionHistory.invalidate({ templateId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download version");
    },
  });

  const setLatestMutation = trpc.templates.setLatestVersion.useMutation({
    onSuccess: () => {
      toast.success("Version set as latest successfully");
      utils.templates.getVersionHistory.invalidate({ templateId });
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to set latest version");
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = (versionId: number) => {
    downloadMutation.mutate({ versionId });
  };

  const handleSetLatest = (versionId: number) => {
    if (confirm("Are you sure you want to set this version as the latest?")) {
      setLatestMutation.mutate({ templateId, versionId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>{templateName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No version history available
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 border rounded-lg ${
                  version.isLatest ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Version {version.versionNumber}</span>
                      {version.isLatest && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Uploaded {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </div>
                      <div>{version.downloadCount} downloads</div>
                      {version.changeNotes && (
                        <div className="mt-2 p-2 bg-muted rounded text-foreground">
                          <span className="font-medium">Changes: </span>
                          {version.changeNotes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(version.id)}
                      disabled={downloadMutation.isPending}
                    >
                      {downloadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                    {isAdmin && !version.isLatest && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetLatest(version.id)}
                        disabled={setLatestMutation.isPending}
                      >
                        {setLatestMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Set as Latest
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
