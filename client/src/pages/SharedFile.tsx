import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  File,
  Download,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function SharedFile() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token || "";
  const [password, setPassword] = useState("");
  const [fileData, setFileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Access share link mutation
  const accessMutation = trpc.share.access.useMutation({
    onSuccess: (data) => {
      setFileData(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setFileData(null);
    },
  });

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    accessMutation.mutate({
      token,
      password: password || undefined,
    });
  };

  const handleDownload = () => {
    if (fileData?.file?.url) {
      window.open(fileData.file.url, "_blank");
      toast.success("Download started");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="w-12 h-12 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <File className="w-12 h-12 text-blue-500" />;
    if (mimeType.includes("pdf")) return <File className="w-12 h-12 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document"))
      return <File className="w-12 h-12 text-blue-600" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel"))
      return <File className="w-12 h-12 text-green-600" />;
    return <File className="w-12 h-12 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          {APP_LOGO && (
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold text-foreground">{APP_TITLE}</h1>
          <p className="text-sm text-muted-foreground mt-1">Secure File Sharing</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {fileData ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  File Ready
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Access Shared File
                </>
              )}
            </CardTitle>
            <CardDescription>
              {fileData
                ? "Your file is ready to download"
                : "Enter the password if required to access this file"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!fileData ? (
              <form onSubmit={handleAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password (if required)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={accessMutation.isPending}
                >
                  {accessMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accessing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Access File
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-start gap-4 p-4 bg-accent/10 rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(fileData.file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {fileData.file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(fileData.file.size)}
                    </p>
                  </div>
                </div>

                {/* Share Info */}
                {(fileData.shareLink.maxDownloads || fileData.shareLink.expiresAt) && (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {fileData.shareLink.maxDownloads && (
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>
                          Downloads: {fileData.shareLink.downloadCount}/
                          {fileData.shareLink.maxDownloads}
                        </span>
                      </div>
                    )}
                    {fileData.shareLink.expiresAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          Expires: {new Date(fileData.shareLink.expiresAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Download Button */}
                <Button
                  onClick={handleDownload}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download File
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This link was shared securely via {APP_TITLE}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by {APP_TITLE} • Secure File Sharing
        </p>
      </div>
    </div>
  );
}
