import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Loader2, Shield, User as UserIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "client">("client");
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const utils = trpc.useUtils();

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = trpc.users.list.useQuery();

  // Fetch pending invitations
  const { data: invitations = [], isLoading: loadingInvitations } = trpc.users.pendingInvitations.useQuery();

  // Invite user mutation
  const inviteUserMutation = trpc.users.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation sent successfully");
      setInviteLink(data.inviteLink);
      setInviteEmail("");
      utils.users.pendingInvitations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  // Update role mutation
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    inviteUserMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpdateRole = (userId: number, newRole: "admin" | "client") => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Invite and manage portal users</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Active Users */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Active Users</h3>
        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length > 0 ? (
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="border-border/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="w-6 h-6 text-primary" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last signed in: {new Date(user.lastSignedIn).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value as "admin" | "client")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No users yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Invitations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Pending Invitations</h3>
        {loadingInvitations ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : invitations.length > 0 ? (
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="border-border/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited: {new Date(invitation.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(invitation.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{invitation.role}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join the portal
            </DialogDescription>
          </DialogHeader>
          {inviteLink ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with the user. It will expire in 7 days.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "admin" | "client")}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {inviteLink ? (
              <Button onClick={() => {
                setShowInviteDialog(false);
                setInviteLink("");
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                  {inviteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invitation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
