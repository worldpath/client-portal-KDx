import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface PermissionManagerProps {
  folderId: number;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PermissionManager({ folderId, folderName, open, onOpenChange }: PermissionManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [canView, setCanView] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const utils = trpc.useUtils();

  // Fetch all users
  const { data: users = [] } = trpc.users.list.useQuery();

  // Fetch permissions for this folder
  const { data: permissions = [], isLoading } = trpc.permissions.listByFolder.useQuery(
    { folderId },
    { enabled: open }
  );

  // Grant permission mutation
  const grantPermissionMutation = trpc.permissions.grant.useMutation({
    onSuccess: () => {
      toast.success("Permission granted successfully");
      setSelectedUserId("");
      setCanView(true);
      setCanUpload(false);
      setCanEdit(false);
      setCanDelete(false);
      utils.permissions.listByFolder.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to grant permission");
    },
  });

  // Revoke permission mutation
  const revokePermissionMutation = trpc.permissions.revoke.useMutation({
    onSuccess: () => {
      toast.success("Permission revoked successfully");
      utils.permissions.listByFolder.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke permission");
    },
  });

  const handleGrantPermission = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    grantPermissionMutation.mutate({
      folderId,
      userId: parseInt(selectedUserId),
      canView,
      canUpload,
      canEdit,
      canDelete,
    });
  };

  const handleRevokePermission = (permissionId: number) => {
    if (confirm("Are you sure you want to revoke this permission?")) {
      revokePermissionMutation.mutate({ permissionId });
    }
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || `User ${userId}`;
  };

  const getUserRole = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.role || 'client';
  };

  const availableUsers = users.filter(u => 
    u.role === 'client' && !permissions.some(p => p.userId === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Control who can access "{folderName}" and what they can do
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Grant New Permission */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Grant Access</h3>
            <div className="space-y-4 p-4 border rounded-lg border-border/50">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No available users
                      </div>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name || user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="canView" className="cursor-pointer">
                    View Files
                  </Label>
                  <Switch
                    id="canView"
                    checked={canView}
                    onCheckedChange={setCanView}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="canUpload" className="cursor-pointer">
                    Upload Files
                  </Label>
                  <Switch
                    id="canUpload"
                    checked={canUpload}
                    onCheckedChange={setCanUpload}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="canEdit" className="cursor-pointer">
                    Edit Files
                  </Label>
                  <Switch
                    id="canEdit"
                    checked={canEdit}
                    onCheckedChange={setCanEdit}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="canDelete" className="cursor-pointer">
                    Delete Files
                  </Label>
                  <Switch
                    id="canDelete"
                    checked={canDelete}
                    onCheckedChange={setCanDelete}
                  />
                </div>
              </div>

              <Button
                onClick={handleGrantPermission}
                disabled={grantPermissionMutation.isPending || !selectedUserId}
                className="w-full gap-2"
              >
                {grantPermissionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <UserPlus className="w-4 h-4" />
                Grant Permission
              </Button>
            </div>
          </div>

          {/* Current Permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Current Permissions</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : permissions.length > 0 ? (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <Card key={permission.id} className="border-border/50">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {getUserName(permission.userId)}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {permission.canView && <Badge variant="secondary" className="text-xs">View</Badge>}
                            {permission.canUpload && <Badge variant="secondary" className="text-xs">Upload</Badge>}
                            {permission.canEdit && <Badge variant="secondary" className="text-xs">Edit</Badge>}
                            {permission.canDelete && <Badge variant="secondary" className="text-xs">Delete</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokePermission(permission.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Shield className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No permissions set</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grant access to users to share this folder
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
