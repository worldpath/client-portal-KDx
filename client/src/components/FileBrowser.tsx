import { useState, useRef, useMemo } from "react";
import PermissionManager from "@/components/PermissionManager";
import FilePreview from "@/components/FilePreview";
import VersionHistory from "@/components/VersionHistory";
import ShareDialog from "@/components/ShareDialog";
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
  Loader2,
  Search,
  SortAsc,
  SortDesc,
  Filter,
  History,
  Share,
  Archive,
  GitBranch
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
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedFolderForPermissions, setSelectedFolderForPermissions] = useState<{ id: number; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ id: number; name: string; url: string; mimeType: string | null; workflowStatus?: string; reviewerId?: number | null; reviewNotes?: string | null; uploadedBy?: number; approvalRequirement?: string } | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<{ id: number; name: string } | null>(null);
  const [shareDialogFile, setShareDialogFile] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch workflow templates
  const { data: workflowTemplates } = trpc.workflows.getTemplates.useQuery();
  
  // Sorting and filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<string>("all");
  
  // Bulk selection state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<number | undefined>(undefined);
  const [showBulkWorkflowDialog, setShowBulkWorkflowDialog] = useState(false);
  const [bulkWorkflowTemplateId, setBulkWorkflowTemplateId] = useState<number | null>(null);

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

  // Helper function to get file type category
  const getFileTypeCategory = (mimeType: string | null, filename: string): string => {
    if (!mimeType) {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
      if (['pdf'].includes(ext)) return 'pdf';
      if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'document';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
      return 'other';
    }
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('csv')) return 'spreadsheet';
    return 'other';
  };

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(file => getFileTypeCategory(file.mimeType, file.name) === filterType);
    }

    // Apply workflow status filter
    if (workflowStatusFilter !== 'all') {
      result = result.filter(file => file.workflowStatus === workflowStatusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          const typeA = getFileTypeCategory(a.mimeType, a.name);
          const typeB = getFileTypeCategory(b.mimeType, b.name);
          comparison = typeA.localeCompare(typeB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, filterType, workflowStatusFilter, sortBy, sortOrder]);

  // Get unique file types for filter dropdown
  const fileTypes = useMemo(() => {
    const types = new Set(files.map(file => getFileTypeCategory(file.mimeType, file.name)));
    return Array.from(types);
  }, [files]);

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

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
      const message = selectedWorkflowId 
        ? "File uploaded and workflow assigned successfully"
        : "File uploaded successfully";
      toast.success(message);
      setShowUploadFile(false);
      setSelectedFile(null);
      setSelectedWorkflowId(null);
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

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.batch.deleteFiles.useMutation({
    onSuccess: (data) => {
      const message = data.successCount === data.total 
        ? `${data.successCount} file(s) deleted successfully`
        : `${data.successCount} of ${data.total} file(s) deleted (${data.failureCount} failed)`;
      toast.success(message);
      setSelectedFileIds(new Set());
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete files");
    },
  });

  // Bulk move mutation
  const bulkMoveMutation = trpc.batch.moveFiles.useMutation({
    onSuccess: (data) => {
      const message = data.successCount === data.total
        ? `${data.successCount} file(s) moved successfully`
        : `${data.successCount} of ${data.total} file(s) moved (${data.failureCount} failed)`;
      toast.success(message);
      setSelectedFileIds(new Set());
      setShowMoveDialog(false);
      setTargetFolderId(undefined);
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to move files");
    },
  });

  // Bulk archive mutation
  const bulkArchiveMutation = trpc.batch.archiveFiles.useMutation({
    onSuccess: (data) => {
      const message = data.successCount === data.total
        ? `${data.successCount} file(s) archived successfully`
        : `${data.successCount} of ${data.total} file(s) archived (${data.failureCount} failed)`;
      toast.success(message);
      setSelectedFileIds(new Set());
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive files");
    },
  });

  // Bulk workflow assignment mutation
  const bulkAssignWorkflowMutation = trpc.bulk.assignWorkflow.useMutation({
    onSuccess: (data) => {
      const message = data.successful === data.total
        ? `Workflow assigned to ${data.successful} file(s) successfully`
        : `Workflow assigned to ${data.successful} of ${data.total} file(s) (${data.failed} failed)`;
      toast.success(message);
      setSelectedFileIds(new Set());
      setShowBulkWorkflowDialog(false);
      setBulkWorkflowTemplateId(null);
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign workflow");
    },
  });

  // Bulk download mutation
  const bulkDownloadMutation = trpc.files.bulkDownload.useMutation({
    onSuccess: (data) => {
      // Download each file
      data.files.forEach(file => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      toast.success(`${data.files.length} file(s) downloaded`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download files");
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
        workflowTemplateId: selectedWorkflowId || undefined,
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

  // Bulk operation handlers
  const toggleFileSelection = (fileId: number) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };

  const selectAllFiles = () => {
    const allFileIds = new Set(filteredAndSortedFiles.map(f => f.id));
    setSelectedFileIds(allFileIds);
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedFileIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedFileIds.size} file(s)?`)) {
      bulkDeleteMutation.mutate({ fileIds: Array.from(selectedFileIds) });
    }
  };

  const handleBulkMove = () => {
    if (selectedFileIds.size === 0) return;
    if (targetFolderId === undefined) {
      toast.error("Please select a target folder");
      return;
    }
    bulkMoveMutation.mutate({ 
      fileIds: Array.from(selectedFileIds),
      targetFolderId 
    });
  };

  const handleBulkDownload = () => {
    if (selectedFileIds.size === 0) return;
    bulkDownloadMutation.mutate({ fileIds: Array.from(selectedFileIds) });
  };

  const handleBulkArchive = () => {
    if (selectedFileIds.size === 0) return;
    if (confirm(`Archive ${selectedFileIds.size} file(s)? They can be restored later from the Archived Files view.`)) {
      bulkArchiveMutation.mutate({ fileIds: Array.from(selectedFileIds) });
    }
  };

  const handleBulkWorkflowAssignment = () => {
    if (selectedFileIds.size === 0) return;
    setShowBulkWorkflowDialog(true);
  };

  const confirmBulkWorkflowAssignment = () => {
    if (!bulkWorkflowTemplateId) {
      toast.error("Please select a workflow template");
      return;
    }
    bulkAssignWorkflowMutation.mutate({
      fileIds: Array.from(selectedFileIds),
      templateId: bulkWorkflowTemplateId,
    });
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
          {/* Bulk Actions Toolbar */}
          {selectedFileIds.size > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedFileIds.size} file(s) selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredAndSortedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiles}
                    >
                      Select All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    disabled={bulkDownloadMutation.isPending}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMoveDialog(true)}
                      >
                        Move
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkWorkflowAssignment}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Only administrators can assign workflows" : ""}
                      >
                        <GitBranch className="w-4 h-4 mr-1" />
                        Assign Workflow
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkArchive}
                        disabled={bulkArchiveMutation.isPending}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground">Files</h3>
            
            {/* Workflow Status Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { value: 'all', label: 'All Files', count: files.length },
                { value: 'draft', label: 'Draft', count: files.filter(f => f.workflowStatus === 'draft').length },
                { value: 'under_review', label: 'Pending Review', count: files.filter(f => f.workflowStatus === 'under_review').length },
                { value: 'approved', label: 'Approved', count: files.filter(f => f.workflowStatus === 'approved').length },
                { value: 'rejected', label: 'Rejected', count: files.filter(f => f.workflowStatus === 'rejected').length },
              ].map(status => (
                <Button
                  key={status.value}
                  variant={workflowStatusFilter === status.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWorkflowStatusFilter(status.value)}
                  className="whitespace-nowrap"
                >
                  {status.label}
                  {status.count > 0 && (
                    <span className={cn(
                      "ml-2 px-1.5 py-0.5 rounded-full text-xs",
                      workflowStatusFilter === status.value
                        ? "bg-primary-foreground/20"
                        : "bg-muted"
                    )}>
                      {status.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filter by Type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Types</option>
                {fileTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              
              {/* Sort Controls */}
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "date" | "size" | "type")}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortOrder}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          {loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedFiles.length > 0 ? (
            <div className="space-y-2">
              {/* Results count */}
              {(searchQuery || filterType !== 'all' || workflowStatusFilter !== 'all') && (
                <p className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedFiles.length} of {files.length} files
                </p>
              )}
              {filteredAndSortedFiles.map((file) => (
                <Card key={file.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="w-4 h-4 rounded border-border cursor-pointer"
                      />
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
                        onClick={() => setPreviewFile({ id: file.id, name: file.name, url: file.url, mimeType: file.mimeType, workflowStatus: file.workflowStatus, reviewerId: file.reviewerId, reviewNotes: file.reviewNotes, uploadedBy: file.uploadedBy, approvalRequirement: file.approvalRequirement })}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setVersionHistoryFile({ id: file.id, name: file.name })}
                        title="Version History"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShareDialogFile({ id: file.id, name: file.name })}
                        title="Share File"
                      >
                        <Share className="w-4 h-4" />
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
                {searchQuery || filterType !== 'all' || workflowStatusFilter !== 'all' ? (
                  <>
                    <p className="text-sm text-muted-foreground">No files match your filters</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                        setWorkflowStatusFilter('all');
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
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
            <div className="space-y-2">
              <Label htmlFor="workflow">Workflow (Optional)</Label>
              <select
                id="workflow"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedWorkflowId || ""}
                onChange={(e) => setSelectedWorkflowId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">No workflow</option>
                {workflowTemplates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {selectedWorkflowId && (
                <p className="text-sm text-muted-foreground">
                  This file will be assigned to the selected workflow upon upload
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

      {/* Bulk Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Files</DialogTitle>
            <DialogDescription>
              Select a folder to move {selectedFileIds.size} file(s) to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Folder</Label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a folder...</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkMove} 
              disabled={bulkMoveMutation.isPending || targetFolderId === undefined}
            >
              {bulkMoveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Move Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Workflow Assignment Dialog */}
      <Dialog open={showBulkWorkflowDialog} onOpenChange={setShowBulkWorkflowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workflow to Files</DialogTitle>
            <DialogDescription>
              Select a workflow template to assign to {selectedFileIds.size} file(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Workflow Template</Label>
              <select
                value={bulkWorkflowTemplateId || ""}
                onChange={(e) => setBulkWorkflowTemplateId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a workflow template...</option>
                {workflowTemplates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {bulkAssignWorkflowMutation.isSuccess && bulkAssignWorkflowMutation.data && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Assignment Results:</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {bulkAssignWorkflowMutation.data.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs p-2 rounded",
                        result.success
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      )}
                    >
                      {result.success ? "✓" : "✗"} {result.fileName}
                      {result.error && ` - ${result.error}`}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {bulkAssignWorkflowMutation.data.successful} successful, {bulkAssignWorkflowMutation.data.failed} failed
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkWorkflowDialog(false)}>
              {bulkAssignWorkflowMutation.isSuccess ? "Close" : "Cancel"}
            </Button>
            {!bulkAssignWorkflowMutation.isSuccess && (
              <Button
                onClick={confirmBulkWorkflowAssignment}
                disabled={bulkAssignWorkflowMutation.isPending || !bulkWorkflowTemplateId}
              >
                {bulkAssignWorkflowMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign Workflow
              </Button>
            )}
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
          workflowStatus={previewFile.workflowStatus}
          reviewerId={previewFile.reviewerId}
          reviewNotes={previewFile.reviewNotes}
          uploadedBy={previewFile.uploadedBy}
          approvalRequirement={previewFile.approvalRequirement}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          isAdmin={isAdmin}
          onWorkflowChange={() => {
            utils.files.list.invalidate();
            setPreviewFile(null);
          }}
        />
      )}

      {/* Version History */}
      {versionHistoryFile && (
        <VersionHistory
          fileId={versionHistoryFile.id}
          fileName={versionHistoryFile.name}
          isOpen={!!versionHistoryFile}
          onClose={() => setVersionHistoryFile(null)}
          canEdit={isAdmin}
        />
      )}

      {/* Share Dialog */}
      {shareDialogFile && (
        <ShareDialog
          fileId={shareDialogFile.id}
          fileName={shareDialogFile.name}
          open={!!shareDialogFile}
          onOpenChange={(open) => !open && setShareDialogFile(null)}
        />
      )}
    </div>
  );
}
