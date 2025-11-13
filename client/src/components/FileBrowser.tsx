import { useState, useRef } from "react";
import PermissionManager from "@/components/PermissionManager";
import FilePreview from "@/components/FilePreview";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Folder, 
  File, 
  FolderPlus, 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  Eye,
  Shield,
  ChevronRight,
  ChevronDown,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileBrowserProps {
  isAdmin: boolean;
}

export default function FileBrowser({ isAdmin }: FileBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedFolderForPermissions, setSelectedFolderForPermissions] = useState<{ id: number; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ id: number; name: string; url: string; mimeType: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Fetch folders
  const { data: folders = [], isLoading: loadingFolders } = trpc.folders.list.useQuery({
    parentId: currentFolderId,
  });

  // Fetch files
  const { data: files = [], isLoading: loadingFiles } = trpc.files.list.useQuery(
    { folderId: currentFolderId || 0 },
    { enabled: currentFolderId !== undefined }
  );

  // Create folder mutation
  const createFolderMutation = trpc.folders.create.useMutation({
    onSuccess: () => {
      toast.success("Folder created successfully");
      setShowCreateFolder(false);
      setNewFolderName("");
      utils.folders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create folder");
    },
  });

  // Upload file mutation
  const uploadFileMutation = trpc.files.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      setShowUploadFile(false);
      setSelectedFile(null);
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload file");
    },
  });

  // Delete file mutation
  const deleteFileMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });

  // Download file mutation
  const downloadFileMutation = trpc.files.download.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download file");
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }
    createFolderMutation.mutate({
      name: newFolderName,
      parentId: currentFolderId,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file as any);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || currentFolderId === undefined) {
      toast.error("Please select a file and folder");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const content = base64.split(',')[1]; // Remove data:...;base64, prefix

      uploadFileMutation.mutate({
        folderId: currentFolderId,
        name: selectedFile.name,
        content,
        mimeType: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
      });
    };
    reader.readAsDataURL(selectedFile as any);
  };

  const handleDeleteFile = (fileId: number) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFileMutation.mutate({ id: fileId });
    }
  };

  const handleDownloadFile = (fileId: number) => {
    downloadFileMutation.mutate({ id: fileId });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(undefined)}
            className="h-8"
          >
            Root
          </Button>
          {currentFolderId && <ChevronRight className="w-4 h-4" />}
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
              className="gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </Button>
            {currentFolderId !== undefined && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadFile(true)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Folders Grid */}
      {loadingFolders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : folders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="hover:shadow-lg transition-all hover:-translate-y-1 border-border/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentFolderId(folder.id)}>
                    <CardTitle className="text-sm font-medium truncate text-foreground">
                      {folder.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFolderForPermissions({ id: folder.id, name: folder.name });
                        setShowPermissions(true);
                      }}
                    >
                      <Shield className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No folders yet</p>
            {isAdmin && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowCreateFolder(true)}
                className="mt-2"
              >
                Create your first folder
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {currentFolderId !== undefined && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Files</h3>
          {loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <Card key={file.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <File className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewFile({ id: file.id, name: file.name, url: file.url, mimeType: file.mimeType })}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadFile(file.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <File className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No files in this folder</p>
                {isAdmin && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowUploadFile(true)}
                    className="mt-2"
                  >
                    Upload your first file
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Project Documents"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={showUploadFile} onOpenChange={setShowUploadFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Select a file to upload to this folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadFile(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadFile} disabled={uploadFileMutation.isPending}>
              {uploadFileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Manager */}
      {selectedFolderForPermissions && (
        <PermissionManager
          folderId={selectedFolderForPermissions.id}
          folderName={selectedFolderForPermissions.name}
          open={showPermissions}
          onOpenChange={(open) => {
            setShowPermissions(open);
            if (!open) setSelectedFolderForPermissions(null);
          }}
        />
      )}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
          mimeType={previewFile.mimeType}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
