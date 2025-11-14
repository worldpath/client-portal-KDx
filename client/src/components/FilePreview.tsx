import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit, Save, X, MessageSquare, GitBranch, Clock } from "lucide-react";
import { toast } from "sonner";
import FileComments from "@/components/FileComments";
import { WorkflowManager } from "@/components/WorkflowManager";
import { MultiReviewerManager } from "@/components/MultiReviewerManager";
import FileActivityTimeline from "@/components/FileActivityTimeline";
import FileVersionComparison from "@/components/FileVersionComparison";
import FileWorkflowTimeline from "@/components/FileWorkflowTimeline";

interface FilePreviewProps {
  fileId: number;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  workflowStatus?: string;
  reviewerId?: number | null;
  reviewNotes?: string | null;
  uploadedBy?: number;
  approvalRequirement?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onWorkflowChange?: () => void;
}

export default function FilePreview({
  fileId,
  fileName,
  fileUrl,
  mimeType,
  workflowStatus,
  reviewerId,
  reviewNotes,
  uploadedBy,
  approvalRequirement = "all_must_approve",
  open,
  onOpenChange,
  isAdmin,
  onWorkflowChange,
}: FilePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();

  // Update file content mutation
  const updateContentMutation = trpc.files.updateContent.useMutation({
    onSuccess: () => {
      toast.success("File updated successfully");
      setIsEditing(false);
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update file");
    },
  });

  // Check if file is editable (text-based)
  const isEditable = mimeType?.includes('text') || 
    fileName.endsWith('.txt') || 
    fileName.endsWith('.md') || 
    fileName.endsWith('.json') ||
    fileName.endsWith('.csv');

  // Check if file is an image
  const isImage = mimeType?.startsWith('image/');

  // Check if file is a PDF
  const isPDF = mimeType === 'application/pdf' || fileName.endsWith('.pdf');

  // Fetch text content for editable files
  useEffect(() => {
    if (open && isEditable) {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => {
          setOriginalContent(text);
          setEditContent(text);
        })
        .catch(err => {
          toast.error("Failed to load file content");
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [open, fileUrl, isEditable]);

  const handleSave = async () => {
    if (editContent === originalContent) {
      setIsEditing(false);
      return;
    }

    // Convert text to base64
    const base64Content = btoa(unescape(encodeURIComponent(editContent)));
    
    updateContentMutation.mutate({
      id: fileId,
      content: base64Content,
    });
  };

  const handleCancel = () => {
    setEditContent(originalContent);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{fileName}</span>
            {isEditable && isAdmin && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit the file content below" : "Preview"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="w-4 h-4 mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <GitBranch className="w-4 h-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Clock className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="versions">
              Versions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center p-4">
              <img 
                src={fileUrl} 
                alt={fileName} 
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-[60vh]">
              <iframe
                src={fileUrl}
                className="w-full h-full border-0 rounded-lg"
                title={fileName}
              />
            </div>
          ) : isEditable ? (
            isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60vh] font-mono text-sm"
                placeholder="File content..."
              />
            ) : (
              <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[60vh] text-sm">
                <code>{editContent}</code>
              </pre>
            )
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Preview not available for this file type
            </div>
          )}
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-auto mt-4">
            <FileComments fileId={fileId} fileName={fileName} />
          </TabsContent>

          <TabsContent value="workflow" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {/* Multi-Stage Workflow Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Multi-Stage Workflow</h3>
                <FileWorkflowTimeline fileId={fileId} />
              </div>

              {/* Multi-Reviewer Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Multi-Reviewer Approval</h3>
                <MultiReviewerManager
                  fileId={fileId}
                  fileName={fileName}
                  approvalRequirement={approvalRequirement}
                  onUpdate={onWorkflowChange}
                />
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Legacy Workflow</h3>
                {workflowStatus && uploadedBy !== undefined && (
                  <WorkflowManager
                    fileId={fileId}
                    fileName={fileName}
                    currentStatus={workflowStatus}
                    reviewerId={reviewerId}
                    reviewNotes={reviewNotes}
                    uploadedBy={uploadedBy}
                    onStatusChange={onWorkflowChange}
                  />
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="flex-1 overflow-auto mt-4">
            <FileActivityTimeline fileId={fileId} />
          </TabsContent>
          
          <TabsContent value="versions" className="flex-1 overflow-auto mt-4">
            <FileVersionComparison fileId={fileId} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateContentMutation.isPending}
              >
                {updateContentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
