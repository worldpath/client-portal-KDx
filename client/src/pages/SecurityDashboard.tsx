import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Activity,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Clock,
  TrendingUp,
  GitBranch,
} from "lucide-react";

/**
 * Security Dashboard
 * 
 * Displays real-time security metrics from GitHub Advanced Security:
 * - CodeQL code scanning alerts
 * - Dependabot vulnerability alerts
 * - CI/CD pipeline status
 * - Security trends
 */
export default function SecurityDashboard() {
  const { data: metrics, isLoading, error, refetch } = trpc.security.metrics.useQuery(
    undefined,
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    }
  );

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load security metrics: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metrics?.configured) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {metrics?.message || "GitHub integration not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables."}
          </AlertDescription>
        </Alert>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>Configure GitHub integration to view security metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Create GitHub Personal Access Token</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Go to GitHub Settings → Developer settings → Personal access tokens → Generate new token
              </p>
              <p className="text-sm text-muted-foreground">
                Required permissions: <code className="bg-muted px-1 py-0.5 rounded">repo</code>, <code className="bg-muted px-1 py-0.5 rounded">security_events</code>
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Set Environment Variables</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=kdx-secure-portal`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Restart Server</h3>
              <p className="text-sm text-muted-foreground">
                Restart the application server to load the new environment variables
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Type guard to ensure metrics is configured
  if (!('codeql' in metrics)) {
    return null; // This should never happen due to earlier check
  }

  const codeqlTotal = metrics.codeql.total;
  const codeqlCritical = metrics.codeql.by_severity.critical || 0;
  const codeqlHigh = metrics.codeql.by_severity.high || 0;
  const codeqlMedium = metrics.codeql.by_severity.medium || 0;
  const codeqlLow = metrics.codeql.by_severity.low || 0;

  const dependabotTotal = metrics.dependabot.total;
  const dependabotCritical = metrics.dependabot.by_severity.critical || 0;
  const dependabotHigh = metrics.dependabot.by_severity.high || 0;
  const dependabotMedium = metrics.dependabot.by_severity.medium || 0;
  const dependabotLow = metrics.dependabot.by_severity.low || 0;

  const cicdSuccessRate = metrics.ci_cd.success_rate;
  const lastScanDate = metrics.ci_cd.last_scan_date 
    ? new Date(metrics.ci_cd.last_scan_date).toLocaleString()
    : "Never";

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time security metrics from GitHub Advanced Security
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* CodeQL Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CodeQL Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codeqlTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {codeqlCritical + codeqlHigh} critical/high severity
            </p>
            <div className="flex gap-1 mt-2">
              {codeqlCritical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {codeqlCritical} Critical
                </Badge>
              )}
              {codeqlHigh > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {codeqlHigh} High
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dependabot Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependabot Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dependabotTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dependabotCritical + dependabotHigh} critical/high severity
            </p>
            <div className="flex gap-1 mt-2">
              {dependabotCritical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {dependabotCritical} Critical
                </Badge>
              )}
              {dependabotHigh > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {dependabotHigh} High
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CI/CD Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CI/CD Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cicdSuccessRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 20 workflow runs
            </p>
            {cicdSuccessRate >= 90 ? (
              <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            ) : cicdSuccessRate >= 70 ? (
              <Badge variant="outline" className="mt-2 text-yellow-600 border-yellow-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Warning
              </Badge>
            ) : (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Last Scan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Security Scan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{lastScanDate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              CodeQL analysis
            </p>
            <Badge variant="outline" className="mt-2">
              <GitBranch className="h-3 w-3 mr-1" />
              Automated
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* CodeQL Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              CodeQL Code Scanning
            </CardTitle>
            <CardDescription>
              Security vulnerabilities detected in code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {codeqlTotal === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">No active alerts</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical</span>
                    <Badge variant={getSeverityColor('critical')}>{codeqlCritical}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High</span>
                    <Badge variant={getSeverityColor('high')}>{codeqlHigh}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium</span>
                    <Badge variant={getSeverityColor('medium')}>{codeqlMedium}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low</span>
                    <Badge variant={getSeverityColor('low')}>{codeqlLow}</Badge>
                  </div>
                </div>

                {metrics.codeql.recent_alerts.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold">Recent Alerts</h4>
                    {metrics.codeql.recent_alerts.slice(0, 3).map((alert) => (
                      <div key={alert.number} className="text-sm space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{alert.rule.name}</span>
                          <Badge variant={getSeverityColor(alert.rule.security_severity_level || alert.rule.severity)} className="text-xs">
                            {alert.rule.security_severity_level || alert.rule.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.most_recent_instance.location.path}:{alert.most_recent_instance.location.start_line}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button variant="outline" className="w-full" asChild>
              <a href={`https://github.com/${process.env.GITHUB_OWNER || 'owner'}/${process.env.GITHUB_REPO || 'repo'}/security/code-scanning`} target="_blank" rel="noopener noreferrer">
                View All Alerts
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Dependabot Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Dependabot Alerts
            </CardTitle>
            <CardDescription>
              Vulnerable dependencies in packages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dependabotTotal === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">No active alerts</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical</span>
                    <Badge variant={getSeverityColor('critical')}>{dependabotCritical}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High</span>
                    <Badge variant={getSeverityColor('high')}>{dependabotHigh}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium</span>
                    <Badge variant={getSeverityColor('medium')}>{dependabotMedium}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low</span>
                    <Badge variant={getSeverityColor('low')}>{dependabotLow}</Badge>
                  </div>
                </div>

                {metrics.dependabot.recent_alerts.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold">Recent Alerts</h4>
                    {metrics.dependabot.recent_alerts.slice(0, 3).map((alert) => (
                      <div key={alert.number} className="text-sm space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{alert.dependency.package.name}</span>
                          <Badge variant={getSeverityColor(alert.security_advisory.severity)} className="text-xs">
                            {alert.security_advisory.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.security_advisory.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button variant="outline" className="w-full" asChild>
              <a href={`https://github.com/${process.env.GITHUB_OWNER || 'owner'}/${process.env.GITHUB_REPO || 'repo'}/security/dependabot`} target="_blank" rel="noopener noreferrer">
                View All Alerts
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CI/CD Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent CI/CD Runs
          </CardTitle>
          <CardDescription>
            Latest workflow executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.ci_cd.latest_runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent workflow runs</p>
          ) : (
            <div className="space-y-2">
              {metrics.ci_cd.latest_runs.slice(0, 5).map((run: any) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {run.conclusion === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : run.conclusion === 'failure' ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{run.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.head_branch} • {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full mt-4" asChild>
            <a href={`https://github.com/${process.env.GITHUB_OWNER || 'owner'}/${process.env.GITHUB_REPO || 'repo'}/actions`} target="_blank" rel="noopener noreferrer">
              View All Runs
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(metrics.last_updated || new Date()).toLocaleString()}
      </div>
    </div>
  );
}
