import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Loader2, GitBranch, MoveUp, MoveDown, X } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface TemplateFormData {
  name: string;
  description: string;
}

interface StageFormData {
  stageName: string;
  stageOrder: number;
  requiredApprovals: number;
}

export default function WorkflowTemplateManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [stages, setStages] = useState<StageFormData[]>([]);

  const utils = trpc.useUtils();

  const { register: registerTemplate, handleSubmit: handleTemplateSubmit, reset: resetTemplate, formState: { errors: templateErrors } } = useForm<TemplateFormData>();
  const { register: registerStage, handleSubmit: handleStageSubmit, reset: resetStage } = useForm<StageFormData>();

  // Fetch all workflow templates
  const { data: templates, isLoading } = trpc.workflows.getTemplates.useQuery();

  // Create template mutation
  const createTemplate = trpc.workflows.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Workflow template created successfully");
      setShowCreateDialog(false);
      resetTemplate();
      setStages([]);
      utils.workflows.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  // Update template mutation (not implemented yet)
  const updateTemplate = {
    mutate: (input: any) => {
      toast.error("Update functionality not yet implemented");
    },
    isPending: false,
  };

  // Delete template mutation (not implemented yet)
  const deleteTemplate = {
    mutate: (input: { id: number }) => {
      toast.error("Delete functionality not yet implemented");
    },
    isPending: false,
  };

  const handleCreateTemplate = (data: TemplateFormData) => {
    if (stages.length === 0) {
      toast.error("Please add at least one stage");
      return;
    }

    createTemplate.mutate({
      name: data.name,
      description: data.description || null,
      stages: stages.map((s, idx) => ({ ...s, stageOrder: idx + 1 })),
    });
  };

  const handleUpdateTemplate = (data: TemplateFormData) => {
    if (!selectedTemplate) return;
    toast.error("Update functionality will be implemented in the next phase");
    setShowEditDialog(false);
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;
    toast.error("Delete functionality will be implemented in the next phase");
    setShowDeleteDialog(false);
  };

  const handleAddStage = (data: StageFormData) => {
    setStages([...stages, { ...data, stageOrder: stages.length + 1 }]);
    resetStage();
  };

  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleMoveStageUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...stages];
    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    setStages(newStages);
  };

  const handleMoveStageDown = (index: number) => {
    if (index === stages.length - 1) return;
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    setStages(newStages);
  };

  const openEditDialog = (template: { id: number; name: string; description: string | null; stages?: any[] }) => {
    setSelectedTemplate(template);
    setStages(template.stages || []);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (template: { id: number; name: string; description: string | null; stages?: any[] }) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    resetTemplate();
    setStages([]);
  };

  const closeEditDialog = () => {
    setShowEditDialog(false);
    setSelectedTemplate(null);
    setStages([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflow Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage multi-stage approval workflows for regulatory documents
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates && templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No workflow templates yet</p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {templates?.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteDialog(template)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Stages ({template.stages?.length || 0}):</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {template.stages?.map((stage: any) => (
                      <li key={stage.id} className="text-sm text-muted-foreground">
                        {stage.stageName}
                        {stage.requiredApprovals > 1 && (
                          <span className="ml-2 text-xs">
                            ({stage.requiredApprovals} approvals)
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workflow Template</DialogTitle>
            <DialogDescription>
              Define a multi-stage approval workflow for regulatory documents
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTemplateSubmit(handleCreateTemplate)}>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., FDA Submission Workflow"
                  {...registerTemplate("name", { required: "Name is required" })}
                />
                {templateErrors.name && (
                  <p className="text-sm text-red-600">{templateErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this workflow..."
                  rows={3}
                  {...registerTemplate("description")}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Workflow Stages</h3>
                
                {stages.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {stages.map((stage, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        <span className="font-medium text-sm w-8">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium">{stage.stageName}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.requiredApprovals} approval{stage.requiredApprovals !== 1 ? 's' : ''} required
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStageUp(index)}
                            disabled={index === 0}
                          >
                            <MoveUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStageDown(index)}
                            disabled={index === stages.length - 1}
                          >
                            <MoveDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStage(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleStageSubmit(handleAddStage)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="stageName">Stage Name</Label>
                      <Input
                        id="stageName"
                        placeholder="e.g., Technical Review"
                        {...registerStage("stageName", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requiredApprovals">Required Approvals</Label>
                      <Input
                        id="requiredApprovals"
                        type="number"
                        min="1"
                        defaultValue="1"
                        {...registerStage("requiredApprovals", { required: true, valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stage
                  </Button>
                </form>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workflow Template</DialogTitle>
            <DialogDescription>
              Modify the workflow stages and settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTemplateSubmit(handleUpdateTemplate)}>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={selectedTemplate?.name}
                  {...registerTemplate("name", { required: "Name is required" })}
                />
                {templateErrors.name && (
                  <p className="text-sm text-red-600">{templateErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={selectedTemplate?.description || ""}
                  rows={3}
                  {...registerTemplate("description")}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Workflow Stages</h3>
                
                {stages.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {stages.map((stage, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        <span className="font-medium text-sm w-8">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium">{stage.stageName}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.requiredApprovals} approval{stage.requiredApprovals !== 1 ? 's' : ''} required
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStageUp(index)}
                            disabled={index === 0}
                          >
                            <MoveUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStageDown(index)}
                            disabled={index === stages.length - 1}
                          >
                            <MoveDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStage(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleStageSubmit(handleAddStage)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-stageName">Stage Name</Label>
                      <Input
                        id="edit-stageName"
                        placeholder="e.g., Technical Review"
                        {...registerStage("stageName", { required: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-requiredApprovals">Required Approvals</Label>
                      <Input
                        id="edit-requiredApprovals"
                        type="number"
                        min="1"
                        defaultValue="1"
                        {...registerStage("requiredApprovals", { required: true, valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stage
                  </Button>
                </form>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTemplate.isPending}>
                {updateTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
