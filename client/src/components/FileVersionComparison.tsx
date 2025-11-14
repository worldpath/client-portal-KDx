import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Download, RotateCcw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface FileVersionComparisonProps {
  fileId: number;
}

export default function FileVersionComparison({ fileId }: FileVersionComparisonProps) {
  const [versionA, setVersionA] = useState<number | null>(null);
  const [versionB, setVersionB] = useState<number | null>(null);

  const { data: versions, isLoading } = trpc.files.versionsForComparison.useQuery({ fileId });
  const utils = trpc.useUtils();

  const restoreMutation = trpc.files.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Version restored successfully");
      utils.files.versionsForComparison.invalidate({ fileId });
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to restore version: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!versions || versions.length < 2) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            At least 2 versions are required to compare
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedVersionA = versions.find((v) => v.id === versionA);
  const selectedVersionB = versions.find((v) => v.id === versionB);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleRestore = (versionId: number, versionNumber: number) => {
    if (confirm(`Are you sure you want to restore to version ${versionNumber}? This will create a new version.`)) {
      restoreMutation.mutate({ fileId, versionNumber });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare Versions</CardTitle>
          <CardDescription>
            Select two versions to compare their metadata and content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="text-sm font-medium mb-2 block">Version A</label>
              <Select
                value={versionA?.toString()}
                onValueChange={(value) => setVersionA(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      Version {version.versionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Version B</label>
              <Select
                value={versionB?.toString()}
                onValueChange={(value) => setVersionB(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      Version {version.versionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedVersionA && selectedVersionB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Version A Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version {selectedVersionA.versionNumber}</CardTitle>
              <CardDescription>
                {formatDistanceToNow(new Date(selectedVersionA.createdAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">File Size</p>
                <p className={`text-sm ${
                  selectedVersionA.size !== selectedVersionB.size ? "font-bold text-orange-600" : ""
                }`}>
                  {formatBytes(selectedVersionA.size)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Uploaded By</p>
                <p className="text-sm">
                  {selectedVersionA.uploaderName || selectedVersionA.uploaderEmail || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Upload Date</p>
                <p className="text-sm">
                  {new Date(selectedVersionA.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedVersionA.changeDescription && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Changes</p>
                  <p className="text-sm">{selectedVersionA.changeDescription}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedVersionA.url, "_blank")}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(selectedVersionA.id, selectedVersionA.versionNumber)}
                  disabled={restoreMutation.isPending}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Version B Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version {selectedVersionB.versionNumber}</CardTitle>
              <CardDescription>
                {formatDistanceToNow(new Date(selectedVersionB.createdAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">File Size</p>
                <p className={`text-sm ${
                  selectedVersionA.size !== selectedVersionB.size ? "font-bold text-orange-600" : ""
                }`}>
                  {formatBytes(selectedVersionB.size)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Uploaded By</p>
                <p className="text-sm">
                  {selectedVersionB.uploaderName || selectedVersionB.uploaderEmail || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Upload Date</p>
                <p className="text-sm">
                  {new Date(selectedVersionB.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedVersionB.changeDescription && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Changes</p>
                  <p className="text-sm">{selectedVersionB.changeDescription}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedVersionB.url, "_blank")}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(selectedVersionB.id, selectedVersionB.versionNumber)}
                  disabled={restoreMutation.isPending}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedVersionA && selectedVersionB && selectedVersionA.size !== selectedVersionB.size && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-800">
              <strong>Size difference:</strong> {Math.abs(selectedVersionA.size - selectedVersionB.size)} bytes
              ({selectedVersionA.size > selectedVersionB.size ? "Version A is larger" : "Version B is larger"})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
