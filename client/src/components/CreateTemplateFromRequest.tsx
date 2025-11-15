import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { storagePut } from "@/lib/storage";
import { Loader2, Upload } from "lucide-react";

interface CreateTemplateFromRequestProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTemplateFromRequest({
  request,
  open,
  onOpenChange,
  onSuccess,
}: CreateTemplateFromRequestProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(request?.templateName || "");
  const [description, setDescription] = useState(request?.description || "");
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: categories } = trpc.templates.getCategories.useQuery();
  const createTemplateMutation = trpc.templates.createTemplate.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !name || !categoryId) {
      toast.error("Please fill all required fields and select a file");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileKey = `templates/${Date.now()}-${file.name}`;
      const uploadResult = await storagePut(fileKey, file, file.type);

      // Create template with link to request
      await createTemplateMutation.mutateAsync({
        name,
        description: description || undefined,
        categoryId: parseInt(categoryId),
        fileUrl: uploadResult.url,
        fileKey,
        mimeType: file.type,
        createdFromRequestId: request.id,
      });

      toast.success("Template created successfully from request");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Template from Request</DialogTitle>
          <DialogDescription>
            Creating template for request: {request?.templateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter template description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Template File *</Label>
            <div className="mt-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium mb-1">Request Justification:</p>
            <p className="text-sm text-muted-foreground">{request?.justification}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !file || !name || !categoryId}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Create Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
