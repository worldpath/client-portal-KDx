import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Bell, Mail, MessageSquare, Share2, Clock, Save } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch preferences
  const { data: preferences, isLoading: prefsLoading } = trpc.preferences.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Local state for form
  const [emailReviewerAssignment, setEmailReviewerAssignment] = useState(true);
  const [emailStatusChange, setEmailStatusChange] = useState(true);
  const [emailMentions, setEmailMentions] = useState(true);
  const [emailShareLinks, setEmailShareLinks] = useState(true);
  const [deliveryMode, setDeliveryMode] = useState<"instant" | "daily_digest">("instant");

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setEmailReviewerAssignment(preferences.emailReviewerAssignment ?? true);
      setEmailStatusChange(preferences.emailStatusChange ?? true);
      setEmailMentions(preferences.emailMentions ?? true);
      setEmailShareLinks(preferences.emailShareLinks ?? true);
      setDeliveryMode(preferences.deliveryMode ?? "instant");
    }
  }, [preferences]);

  // Update mutation
  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update preferences");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      emailReviewerAssignment,
      emailStatusChange,
      emailMentions,
      emailShareLinks,
      deliveryMode,
    });
  };

  // Check if any changes were made
  const hasChanges = preferences && (
    emailReviewerAssignment !== (preferences.emailReviewerAssignment ?? true) ||
    emailStatusChange !== (preferences.emailStatusChange ?? true) ||
    emailMentions !== (preferences.emailMentions ?? true) ||
    emailShareLinks !== (preferences.emailShareLinks ?? true) ||
    deliveryMode !== (preferences.deliveryMode ?? "instant")
  );

  if (authLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(user.role === "admin" ? "/admin" : "/client")}
            >
              ← Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{user.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{user.email || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <p className="text-sm font-medium capitalize">{user.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3 flex-1">
                    <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="reviewer-assignment" className="text-base cursor-pointer">
                        Reviewer Assignments
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you're assigned to review a file
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="reviewer-assignment"
                    checked={emailReviewerAssignment}
                    onCheckedChange={setEmailReviewerAssignment}
                  />
                </div>

                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3 flex-1">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="status-change" className="text-base cursor-pointer">
                        Status Changes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when files you own are approved or rejected
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="status-change"
                    checked={emailStatusChange}
                    onCheckedChange={setEmailStatusChange}
                  />
                </div>

                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3 flex-1">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="mentions" className="text-base cursor-pointer">
                        @Mentions
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone mentions you in a comment
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="mentions"
                    checked={emailMentions}
                    onCheckedChange={setEmailMentions}
                  />
                </div>

                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3 flex-1">
                    <Share2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="share-links" className="text-base cursor-pointer">
                        Share Links
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone shares a file with you via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="share-links"
                    checked={emailShareLinks}
                    onCheckedChange={setEmailShareLinks}
                  />
                </div>
              </div>

              {/* Delivery Mode */}
              <div className="space-y-3 pt-4 border-t border-border">
                <Label htmlFor="delivery-mode" className="text-base">
                  Delivery Mode
                </Label>
                <Select value={deliveryMode} onValueChange={(value: "instant" | "daily_digest") => setDeliveryMode(value)}>
                  <SelectTrigger id="delivery-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Instant</span>
                        <span className="text-xs text-muted-foreground">
                          Receive emails immediately as events occur
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="daily_digest">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Daily Digest</span>
                        <span className="text-xs text-muted-foreground">
                          Receive a summary email once per day
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {deliveryMode === "instant" 
                    ? "You'll receive emails immediately when events occur."
                    : "You'll receive a single summary email each day with all notifications."}
                </p>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4">
                {hasChanges && (
                  <p className="text-sm text-muted-foreground">
                    You have unsaved changes
                  </p>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateMutation.isPending}
                  size="lg"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
