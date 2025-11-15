import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * GitHub Integration Settings Card
 * 
 * Allows administrators to configure GitHub repository and API token
 * for security dashboard integration.
 */
export default function GitHubSettingsCard() {
  const utils = trpc.useUtils();
  
  const { data: settings, isLoading } = trpc.security.getGitHubSettings.useQuery();
  
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveMutation = trpc.security.saveGitHubSettings.useMutation({
    onSuccess: () => {
      toast.success("GitHub settings saved successfully");
      utils.security.getGitHubSettings.invalidate();
      utils.security.metrics.invalidate();
      setToken(""); // Clear token input after save
      setTestResult(null);
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const testMutation = trpc.security.testGitHubConnection.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`,
      });
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  // Initialize form with current settings
  useState(() => {
    if (settings) {
      if (settings.owner) setOwner(settings.owner);
      if (settings.repo) setRepo(settings.repo);
    }
  });

  const handleTestConnection = () => {
    if (!token || !owner || !repo) {
      toast.error("Please fill in all fields before testing");
      return;
    }

    testMutation.mutate({ token, owner, repo });
  };

  const handleSave = () => {
    if (!owner || !repo) {
      toast.error("Owner and Repository are required");
      return;
    }

    const updates: { token?: string; owner?: string; repo?: string } = {
      owner,
      repo,
    };

    // Only include token if it was changed (not empty and not masked)
    if (token && !token.startsWith("****")) {
      updates.token = token;
    }

    saveMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const hasExistingSettings = settings && (settings.owner || settings.repo || settings.token);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          GitHub Integration
          {hasExistingSettings && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
        </CardTitle>
        <CardDescription>
          Configure GitHub repository for security dashboard metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2">
              To enable the security dashboard, you need a GitHub Personal Access Token with the following permissions:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code className="bg-muted px-1 py-0.5 rounded">repo</code> - Full control of private repositories</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">security_events</code> - Read security events</li>
            </ul>
            <Button
              variant="link"
              className="px-0 h-auto mt-2"
              asChild
            >
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,security_events&description=KDx%20Security%20Dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create Token on GitHub
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-token">Personal Access Token</Label>
            <div className="relative">
              <Input
                id="github-token"
                type={showToken ? "text" : "password"}
                placeholder={hasExistingSettings ? "****" + (settings?.token?.slice(-4) || "") : "ghp_..."}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to keep existing token
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="github-owner">Repository Owner</Label>
              <Input
                id="github-owner"
                type="text"
                placeholder="your-username"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                GitHub username or organization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-repo">Repository Name</Label>
              <Input
                id="github-repo"
                type="text"
                placeholder="kdx-secure-portal"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Repository name (without owner)
              </p>
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              disabled={testMutation.isPending || !token || !owner || !repo}
            >
              {testMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Test Connection
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !owner || !repo}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Current Configuration</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner:</span>
              <span className="font-mono">{settings?.owner || "Not configured"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repository:</span>
              <span className="font-mono">{settings?.repo || "Not configured"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token:</span>
              <span className="font-mono">
                {settings?.token ? settings.token : "Not configured"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
