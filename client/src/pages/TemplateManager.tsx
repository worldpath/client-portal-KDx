import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Upload, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { storagePut } from "@/lib/storage";
import TemplateVersionHistory from "@/components/TemplateVersionHistory";
import UploadVersionDialog from "@/components/UploadVersionDialog";

export default function TemplateManager() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [versionUploadDialogOpen, setVersionUploadDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const utils = trpc.useUtils();

  // Fetch categories and templates
  const { data: categories = [], isLoading: categoriesLoading } = trpc.templates.getCategories.useQuery();
  const { data: templates = [], isLoading: templatesLoading } = trpc.templates.getByCategory.useQuery({});

  // Create category mutation
  const createCategoryMutation = trpc.templates.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      setCategoryDialogOpen(false);
      utils.templates.getCategories.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create category");
    },
  });

  // Create template mutation
  const createTemplateMutation = trpc.templates.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template uploaded successfully");
      setUploadDialogOpen(false);
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload template");
    },
  });

  // Update template mutation
  const updateTemplateMutation = trpc.templates.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      setEditDialogOpen(false);
      setSelectedTemplate(null);
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = trpc.templates.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const uploadVersionMutation = trpc.templates.uploadVersion.useMutation({
    onSuccess: () => {
      toast.success("New version uploaded successfully");
      setVersionUploadDialogOpen(false);
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload version");
    },
  });

  const handleUploadVersion = async (data: { file: File; changeNotes: string }) => {
    if (!selectedTemplate) return;

    try {
      const fileKey = `templates/${selectedTemplate.id}/v${Date.now()}-${data.file.name}`;
      const uploadResult = await storagePut(fileKey, data.file, data.file.type);
      uploadVersionMutation.mutate({
        templateId: selectedTemplate.id,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileName: data.file.name,
        mimeType: data.file.type || null,
        changeNotes: data.changeNotes,
      });
    } catch (error) {
      toast.error("Failed to upload file");
    }
  };

  const handleDeleteTemplate = (templateId: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate({ id: templateId });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Library Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage standard forms, checklists, and protocols for users to download
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCategoryDialogOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Template
          </Button>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoriesLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No categories yet. Create your first category to organize templates.
          </div>
        ) : (
          categories.map((category) => {
            const categoryTemplates = templates.filter((t) => t.categoryId === category.id);
            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {categoryTemplates.length} {categoryTemplates.length === 1 ? "template" : "templates"}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
          <CardDescription>Manage uploaded templates</CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates yet. Upload your first template to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                const category = categories.find((c) => c.id === template.categoryId);
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {template.thumbnailUrlMedium ? (
                        <div className="w-12 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
                          <img 
                            src={template.thumbnailUrlMedium} 
                            srcSet={`${template.thumbnailUrlSmall} 200w, ${template.thumbnailUrlMedium} 400w, ${template.thumbnailUrlLarge} 800w`}
                            sizes="48px"
                            alt={template.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{category?.name}</span>
                          <span>•</span>
                          <span>{template.downloadCount} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TemplateVersionHistory
                        templateId={template.id}
                        templateName={template.name}
                        isAdmin={true}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setVersionUploadDialogOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        New Version
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={(data) => createCategoryMutation.mutate(data)}
        isLoading={createCategoryMutation.isPending}
      />

      {/* Upload Template Dialog */}
      <UploadTemplateDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        categories={categories}
        onSubmit={(data) => createTemplateMutation.mutate(data)}
        isLoading={createTemplateMutation.isPending}
      />

      {/* Edit Template Dialog */}
      {selectedTemplate && (
        <EditTemplateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          template={selectedTemplate}
          categories={categories}
          onSubmit={(data) => updateTemplateMutation.mutate({ id: selectedTemplate.id, ...data })}
          isLoading={updateTemplateMutation.isPending}
        />
      )}

      {/* Upload Version Dialog */}
      {selectedTemplate && (
        <UploadVersionDialog
          open={versionUploadDialogOpen}
          onOpenChange={setVersionUploadDialogOpen}
          templateName={selectedTemplate.name}
          onSubmit={handleUploadVersion}
          isLoading={uploadVersionMutation.isPending}
        />
      )}
    </div>
  );
}

// Create Category Dialog Component
function CreateCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined });
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Create a new category to organize your templates
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Forms, Checklists, Protocols"
                required
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description (Optional)</Label>
              <Textarea
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this category..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Upload Template Dialog Component
function UploadTemplateDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !categoryId) return;

    setUploading(true);
    try {
      // Upload file to S3
      const fileKey = `templates/${Date.now()}-${file.name}`;
      const { url } = await storagePut(fileKey, file, file.type);

      // Submit template data
      onSubmit({
        name,
        description: description || undefined,
        categoryId: parseInt(categoryId),
        fileUrl: url,
      fileKey,
      fileName: file.name,
      mimeType: file.type,
      });

      // Reset form
      setName("");
      setDescription("");
      setCategoryId("");
      setFile(null);
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Template</DialogTitle>
          <DialogDescription>
            Upload a new template for users to download
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., FDA Submission Form"
                required
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template-file">File</Label>
              <Input
                id="template-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || uploading}>
              {(isLoading || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Template Dialog Component
function EditTemplateDialog({
  open,
  onOpenChange,
  template,
  categories,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  categories: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || "");
  const [categoryId, setCategoryId] = useState(template.categoryId.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      categoryId: parseInt(categoryId),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update template information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-template-description">Description (Optional)</Label>
              <Textarea
                id="edit-template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-template-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
