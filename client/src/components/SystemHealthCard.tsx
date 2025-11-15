import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Database,
  HardDrive,
  Github,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

/**
 * System Health Check Card
 * 
 * Displays real-time health status of all system integrations
 * with troubleshooting recommendations.
 */
export default function SystemHealthCard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  const { data: health, isLoading, refetch, isFetching } = trpc.health.checkSystem.useQuery(
    undefined,
    {
      refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
      refetchOnWindowFocus: true,
    }
  );

  const handleRefresh = () => {
    refetch();
    toast.info("Refreshing system health checks...");
  };

  const toggleExpand = (checkName: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(checkName)) {
      newExpanded.delete(checkName);
    } else {
      newExpanded.add(checkName);
    }
    setExpandedChecks(newExpanded);
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'error') => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      error: 'destructive',
    } as const;

    const labels = {
      healthy: 'Healthy',
      warning: 'Warning',
      error: 'Error',
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {labels[status]}
      </Badge>
    );
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'storage':
        return <HardDrive className="h-5 w-5" />;
      case 'github':
        return <Github className="h-5 w-5" />;
      case 'oauth':
        return <Shield className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      database: 'Database',
      storage: 'S3 Storage',
      github: 'GitHub Integration',
      oauth: 'OAuth Authentication',
    };
    return names[service] || service;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Checking system status...</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Unable to load health status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to retrieve system health information
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              System Health
              {getStatusIcon(health.overall)}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3" />
              Last checked: {new Date(health.lastChecked).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <Alert variant={health.overall === 'error' ? 'destructive' : 'default'}>
          {getStatusIcon(health.overall)}
          <AlertTitle>Overall Status: {getStatusBadge(health.overall)}</AlertTitle>
          <AlertDescription>
            {health.overall === 'healthy' && 'All systems operational'}
            {health.overall === 'warning' && 'Some systems require attention'}
            {health.overall === 'error' && 'Critical systems are down'}
          </AlertDescription>
        </Alert>

        {/* Individual Service Checks */}
        <div className="space-y-3">
          {Object.entries(health.checks).map(([service, check]) => (
            <div
              key={service}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getServiceIcon(service)}
                  <div>
                    <h4 className="font-semibold">{getServiceName(service)}</h4>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(check.status)}
                  {(check.troubleshooting || check.details) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(service)}
                    >
                      {expandedChecks.has(service) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {check.responseTime !== undefined && (
                <div className="text-xs text-muted-foreground">
                  Response time: {check.responseTime}ms
                </div>
              )}

              {expandedChecks.has(service) && (
                <div className="space-y-3 pt-3 border-t">
                  {check.details && (
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Details</h5>
                      <div className="space-y-1">
                        {Object.entries(check.details).map(([key, value]) => (
                          <div key={key} className="text-sm flex justify-between">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="font-mono">
                              {typeof value === 'boolean' 
                                ? (value ? 'Yes' : 'No')
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {check.troubleshooting && check.troubleshooting.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Troubleshooting</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {check.troubleshooting.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Auto-refresh every 30 seconds
          </span>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
