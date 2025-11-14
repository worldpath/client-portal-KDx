import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Check, X, Loader2, Link as LinkIcon, Clock, Lock, Mail, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ShareDialogProps {
  fileId: number;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ fileId, fileName, open, onOpenChange }: ShareDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("168"); // 7 days default
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  // Fetch existing shares
  const { data: shares = [], isLoading: sharesLoading } = trpc.share.list.useQuery(
    { fileId },
    { enabled: open }
  );

  // Create share link mutation
  const createShareMutation = trpc.share.create.useMutation({
    onSuccess: (data) => {
      const shareUrl = `${window.location.origin}/share/${data.token}`;
      setGeneratedLink(shareUrl);
      toast.success("Share link created successfully");
      utils.share.list.invalidate({ fileId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
    },
  });

  // Revoke share link mutation
  const revokeShareMutation = trpc.share.revoke.useMutation({
    onSuccess: () => {
      toast.success("Share link revoked");
      utils.share.list.invalidate({ fileId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke share link");
    },
  });

  const handleCreateShare = () => {
    createShareMutation.mutate({
      fileId,
      recipientEmail: recipientEmail || undefined,
      recipientName: recipientName || undefined,
      message: message || undefined,
      password: password || undefined,
      expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
      maxDownloads: maxDownloads ? parseInt(maxDownloads) : undefined,
    });
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeShare = (shareId: number) => {
    if (confirm("Are you sure you want to revoke this share link?")) {
      revokeShareMutation.mutate({ id: shareId });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create a shareable link for "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Create New Share Link</h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recipientEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Recipient Email (Optional)
                </Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, an email with the share link will be sent automatically
                </p>
              </div>

              {recipientEmail && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">
                      Recipient Name (Optional)
                    </Label>
                    <Input
                      id="recipientName"
                      type="text"
                      placeholder="John Doe"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Personal Message (Optional)
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personal message to include in the email..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password Protection (Optional)
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave empty for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expiration
                </Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger id="expires">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                    <SelectItem value="0">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDownloads">
                  Max Downloads (Optional)
                </Label>
                <Input
                  id="maxDownloads"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateShare}
                disabled={createShareMutation.isPending}
                className="w-full"
              >
                {createShareMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </>
                )}
              </Button>
            </div>

            {/* Generated Link */}
            {generatedLink && (
              <div className="p-4 bg-accent/10 rounded-lg space-y-2">
                <Label className="text-sm font-medium">Your Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {password && (
                  <p className="text-sm text-muted-foreground">
                    🔒 This link is password protected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Active Shares */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Active Share Links</h3>
            
            {sharesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active share links
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="p-3 border border-border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-muted-foreground truncate">
                          {window.location.origin}/share/{share.token}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span>Created: {formatDate(share.createdAt)}</span>
                          {share.expiresAt && (
                            <span>Expires: {formatDate(share.expiresAt)}</span>
                          )}
                          {share.password && <span>🔒 Password protected</span>}
                          {share.maxDownloads && (
                            <span>
                              Downloads: {share.downloadCount}/{share.maxDownloads}
                            </span>
                          )}
                          {!share.maxDownloads && share.downloadCount > 0 && (
                            <span>Downloads: {share.downloadCount}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeShare(share.id)}
                        disabled={revokeShareMutation.isPending}
                        title="Revoke link"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
