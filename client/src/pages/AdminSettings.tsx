import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Home as HomeIcon, LogOut, Moon, Sun, Settings } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import GitHubSettingsCard from "@/components/GitHubSettingsCard";

/**
 * Admin Settings Page
 * 
 * Centralized settings management for administrators including
 * GitHub integration, system configuration, and preferences.
 */
export default function AdminSettings() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
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
              onClick={() => setLocation('/admin')}
            >
              <HomeIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{APP_TITLE}</h1>
              <p className="text-xs text-muted-foreground">Admin Settings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
              <div className="text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
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
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              System Settings
            </h2>
            <p className="text-muted-foreground mt-2">
              Configure system integrations and preferences
            </p>
          </div>

          <div className="space-y-6">
            <GitHubSettingsCard />

            {/* Future settings sections can be added here */}
            {/* <NotificationSettingsCard /> */}
            {/* <BackupSettingsCard /> */}
            {/* <SecurityPolicyCard /> */}
          </div>
        </div>
      </main>
    </div>
  );
}
