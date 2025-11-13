import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Moon, Sun, Home as HomeIcon } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import FileBrowser from "@/components/FileBrowser";

export default function ClientDashboard() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

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
              <h1 className="text-xl font-semibold text-foreground">{APP_TITLE}</h1>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                <p className="text-xs text-muted-foreground">Client</p>
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

      {/* Main Content */}
      <main className="container py-6">
        <FileBrowser isAdmin={false} />
      </main>
    </div>
  );
}
