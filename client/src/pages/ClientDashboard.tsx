import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  LogOut, 
  Moon, 
  Sun, 
  Home as HomeIcon, 
  Search,
  HardDrive,
  File,
  Folder,
  Share,
  Download,
  Clock,
  TrendingUp
} from "lucide-react";
import { APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import FileBrowser from "@/components/FileBrowser";

export default function ClientDashboard() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch analytics data
  const { data: storageUsage } = trpc.analytics.storageUsage.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: storageByFolder } = trpc.analytics.storageByFolder.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: quickStats } = trpc.analytics.quickStats.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: recentActivity } = trpc.analytics.recentActivity.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );
  const { data: recentFiles } = trpc.analytics.recentFiles.useQuery(
    { limit: 5 },
    { enabled: !!user }
  );

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/');
    } else if (!loading && user && user.role === 'admin') {
      setLocation('/admin');
    }
  }, [user, loading, setLocation]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setLocation('/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      upload_file: "Uploaded file",
      download_file: "Downloaded file",
      delete_file: "Deleted file",
      create_folder: "Created folder",
      delete_folder: "Deleted folder",
      create_share_link: "Created share link",
      access_share_link: "Accessed share link",
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'client') {
    return null;
  }

  // Calculate storage percentage (assuming 10GB limit for demo)
  const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  const storagePercentage = storageUsage ? (storageUsage.totalSize / storageLimit) * 100 : 0;

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
              title="Home"
            >
              <HomeIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {APP_TITLE}
              </h1>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/search')}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files & Folders</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quickStats?.totalFiles || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {quickStats?.totalFolders || 0} folders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatFileSize(storageUsage?.totalSize || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {storagePercentage.toFixed(1)}% of {formatFileSize(storageLimit)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Shares</CardTitle>
                  <Share className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quickStats?.totalShares || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Shareable links created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Downloads</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quickStats?.recentDownloads || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    In the last 7 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Storage Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage Usage
                </CardTitle>
                <CardDescription>
                  Your current storage usage across all folders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {formatFileSize(storageUsage?.totalSize || 0)} / {formatFileSize(storageLimit)}
                    </span>
                  </div>
                  <Progress value={storagePercentage} className="h-2" />
                </div>

                {storageByFolder && storageByFolder.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Storage by Folder</h4>
                    {storageByFolder.map((folder) => (
                      <div key={folder.folderId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-primary" />
                            <span>{folder.folderName}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {formatFileSize(folder.totalSize)} ({folder.fileCount} files)
                          </span>
                        </div>
                        <Progress 
                          value={(folder.totalSize / (storageUsage?.totalSize || 1)) * 100} 
                          className="h-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your latest file operations</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity && recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 text-sm pb-3 border-b last:border-0 last:pb-0"
                        >
                          <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {getActionLabel(activity.action)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent activity
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <File className="w-5 h-5" />
                    Recent Files
                  </CardTitle>
                  <CardDescription>Recently added files</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentFiles && recentFiles.length > 0 ? (
                    <div className="space-y-3">
                      {recentFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-start gap-3 text-sm pb-3 border-b last:border-0 last:pb-0"
                        >
                          <File className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No files yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <FileBrowser isAdmin={false} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
