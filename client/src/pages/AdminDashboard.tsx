import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FolderPlus, Upload, Users, Activity, LogOut, Moon, Sun, Home as HomeIcon, Search, GitBranch } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import FileBrowser from "@/components/FileBrowser";
import UserManagement from "@/components/UserManagement";
import AuditLogViewer from "@/components/AuditLogViewer";
import PendingApprovalsWidget from "@/components/PendingApprovalsWidget";
import ReviewerWorkloadWidget from "@/components/ReviewerWorkloadWidget";
import WorkflowAnalytics from "@/pages/WorkflowAnalytics";
import TemplateManager from "@/pages/TemplateManager";
import TemplateRequestsManager from "@/pages/TemplateRequestsManager";

type Tab = "files" | "users" | "audit" | "workflows" | "analytics" | "templates" | "template-requests";

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("files");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
    } else if (!loading && user && user.role !== 'admin') {
      setLocation('/client');
    }
  }, [user, loading, setLocation]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setLocation('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
            >
              <HomeIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">WorldPath Regulatory Solutions</h1>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/search')}
              title="Search files"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container">
          <nav className="flex gap-1 py-2">
            <Button
              variant={activeTab === "files" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("files")}
            >
              <FolderPlus className="w-4 h-4" />
              Files & Folders
            </Button>
            <Button
              variant={activeTab === "users" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("users")}
            >
              <Users className="w-4 h-4" />
              User Management
            </Button>
            <Button
              variant={activeTab === "audit" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("audit")}
            >
              <Activity className="w-4 h-4" />
              Audit Logs
            </Button>
            <Button
              variant={activeTab === "workflows" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("workflows")}
            >
              <GitBranch className="w-4 h-4" />
              Workflow Templates
            </Button>
            <Button
              variant={activeTab === "analytics" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("analytics")}
            >
              <Activity className="w-4 h-4" />
              Analytics
            </Button>
            <Button
              variant={activeTab === "templates" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("templates")}
            >
              <Upload className="w-4 h-4" />
              Template Library
            </Button>
            <Button
              variant={activeTab === "template-requests" ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => setActiveTab("template-requests")}
            >
              <Activity className="w-4 h-4" />
              Template Requests
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {activeTab === "files" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendingApprovalsWidget />
              <ReviewerWorkloadWidget />
            </div>
            <FileBrowser isAdmin={true} />
          </>
        )}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "audit" && <AuditLogViewer />}
        {activeTab === "analytics" && <WorkflowAnalytics />}
        {activeTab === "templates" && <TemplateManager />}
        {activeTab === "template-requests" && <TemplateRequestsManager />}
        {activeTab === "workflows" && (
          <div className="max-w-6xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setLocation('/workflow-templates')}
              className="mb-6"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Manage Workflow Templates
            </Button>
            <Card>
              <CardHeader>
                <CardTitle>Workflow Templates</CardTitle>
                <CardDescription>
                  Multi-stage approval workflows are now available. Click the button above to create and manage workflow templates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Workflow templates allow you to define custom multi-stage approval processes for regulatory documents.
                  Each workflow can have multiple stages with different reviewers and approval requirements.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
