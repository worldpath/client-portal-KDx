import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Download, RotateCcw, User, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VersionHistoryProps {
  fileId: number;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VersionHistory({ fileId, fileName, isOpen, onClose, canEdit }: VersionHistoryProps) {
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  // Fetch versions
  const { data: versions = [], isLoading, error } = trpc.files.getVersions.useQuery(
    { fileId },
    { enabled: isOpen }
  );
  
  // Restore version mutation
  const restoreVersionMutation = trpc.files.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Version restored successfully");
      setConfirmRestore(null);
      utils.files.getVersions.invalidate({ fileId });
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restore version");
    },
  });
  
  // Download version mutation
  const downloadVersionMutation = trpc.files.downloadVersion.useMutation({
    onSuccess: (data) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download version");
    },
  });
  
  const handleRestore = (versionNumber: number) => {
    restoreVersionMutation.mutate({ fileId, versionNumber });
  };
  
  const handleDownload = (versionNumber: number) => {
    downloadVersionMutation.mutate({ fileId, versionNumber });
  };
  
  const currentVersion = versions.length > 0 ? versions[0].versionNumber : 0;
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {fileName} - {versions.length} version{versions.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="border-destructive/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <p className="text-sm text-destructive">Failed to load version history</p>
                </CardContent>
              </Card>
            ) : versions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No version history available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <Card 
                    key={version.id}
                    className={cn(
                      "border transition-all hover:shadow-md",
                      index === 0 ? "border-primary/50 bg-primary/5" : "border-border/50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                              "text-sm font-semibold px-2 py-1 rounded",
                              index === 0 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              Version {version.versionNumber}
                            </span>
                            {index === 0 && (
                              <span className="text-xs text-primary font-medium">Current</span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>{version.uploadedByName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(version.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="w-4 h-4" />
                              <span>{formatFileSize(version.size)}</span>
                            </div>
                          </div>
                          
                          {version.changeDescription && (
                            <p className="text-sm text-foreground mt-2 italic">
                              "{version.changeDescription}"
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(version.versionNumber)}
                            disabled={downloadVersionMutation.isPending}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          
                          {canEdit && index !== 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRestore(version.versionNumber)}
                              disabled={restoreVersionMutation.isPending}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={confirmRestore !== null} onOpenChange={() => setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version?</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore version {confirmRestore}? This will create a new version
              with the content from version {confirmRestore}. The current version will be preserved in history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              disabled={restoreVersionMutation.isPending}
            >
              {restoreVersionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
