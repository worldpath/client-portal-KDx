import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Activity, 
  FileUp, 
  FileDown, 
  FileEdit, 
  FileX, 
  FolderPlus, 
  FolderX, 
  UserPlus, 
  Shield,
  Loader2,
  Search
} from "lucide-react";

const actionIcons: Record<string, any> = {
  file_upload: FileUp,
  file_download: FileDown,
  file_edit: FileEdit,
  file_delete: FileX,
  file_view: FileDown,
  folder_create: FolderPlus,
  folder_delete: FolderX,
  folder_rename: FolderPlus,
  user_invite: UserPlus,
  user_role_update: Shield,
  permission_grant: Shield,
  permission_revoke: Shield,
};

const actionColors: Record<string, string> = {
  file_upload: "bg-green-500/10 text-green-600",
  file_download: "bg-blue-500/10 text-blue-600",
  file_edit: "bg-yellow-500/10 text-yellow-600",
  file_delete: "bg-red-500/10 text-red-600",
  file_view: "bg-blue-500/10 text-blue-600",
  folder_create: "bg-green-500/10 text-green-600",
  folder_delete: "bg-red-500/10 text-red-600",
  folder_rename: "bg-yellow-500/10 text-yellow-600",
  user_invite: "bg-purple-500/10 text-purple-600",
  user_role_update: "bg-orange-500/10 text-orange-600",
  permission_grant: "bg-green-500/10 text-green-600",
  permission_revoke: "bg-red-500/10 text-red-600",
};

export default function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch audit logs
  const { data: logs = [], isLoading } = trpc.audit.recent.useQuery({ limit: 100 });

  // Fetch users for name mapping
  const { data: users = [] } = trpc.users.list.useQuery();

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || `User ${userId}`;
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
    if (searchTerm && !getUserName(log.userId).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="file_upload">File Upload</SelectItem>
              <SelectItem value="file_download">File Download</SelectItem>
              <SelectItem value="file_edit">File Edit</SelectItem>
              <SelectItem value="file_delete">File Delete</SelectItem>
              <SelectItem value="folder_create">Folder Create</SelectItem>
              <SelectItem value="folder_delete">Folder Delete</SelectItem>
              <SelectItem value="user_invite">User Invite</SelectItem>
              <SelectItem value="permission_grant">Permission Grant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="file">Files</SelectItem>
              <SelectItem value="folder">Folders</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="permission">Permissions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Search User</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const Icon = actionIcons[log.action] || Activity;
            const colorClass = actionColors[log.action] || "bg-muted text-muted-foreground";
            
            return (
              <Card key={log.id} className="border-border/50">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {formatAction(log.action)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {log.entityType}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{getUserName(log.userId)}</span>
                          {log.details && (() => {
                            try {
                              const details = JSON.parse(log.details);
                              if (details.name) return ` • ${details.name}`;
                              if (details.email) return ` • ${details.email}`;
                              if (details.newRole) return ` • Role: ${details.newRole}`;
                            } catch (e) {}
                            return '';
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                          {log.ipAddress && ` • IP: ${log.ipAddress}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {actionFilter !== "all" || entityFilter !== "all" || searchTerm
                ? "Try adjusting your filters"
                : "Activity will appear here once users start interacting with the system"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">File Operations</p>
            <p className="text-2xl font-bold text-foreground">
              {logs.filter(l => l.entityType === 'file').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">User Actions</p>
            <p className="text-2xl font-bold text-foreground">
              {logs.filter(l => l.entityType === 'user').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Permission Changes</p>
            <p className="text-2xl font-bold text-foreground">
              {logs.filter(l => l.entityType === 'permission').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
