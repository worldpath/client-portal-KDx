/**
 * GitHub Security API Service
 * 
 * Fetches security metrics from GitHub Advanced Security:
 * - CodeQL code scanning alerts
 * - Dependabot vulnerability alerts
 * - CI/CD workflow runs
 * 
 * Requires GITHUB_TOKEN environment variable with permissions:
 * - repo (full control)
 * - security_events (read)
 */

import { ENV } from './_core/env';

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';

// Repository information (update these with your actual values)
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-github-username';
const GITHUB_REPO = process.env.GITHUB_REPO || 'kdx-secure-portal';

/**
 * Make authenticated request to GitHub API
 */
async function githubRequest(endpoint: string) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * CodeQL Alert Severity
 */
export type CodeQLSeverity = 'critical' | 'high' | 'medium' | 'low' | 'note' | 'warning' | 'error';

/**
 * CodeQL Alert State
 */
export type CodeQLState = 'open' | 'dismissed' | 'fixed';

/**
 * CodeQL Alert
 */
export interface CodeQLAlert {
  number: number;
  state: CodeQLState;
  dismissed_reason: string | null;
  rule: {
    id: string;
    severity: CodeQLSeverity;
    description: string;
    name: string;
    security_severity_level: CodeQLSeverity;
  };
  tool: {
    name: string;
    version: string;
  };
  most_recent_instance: {
    location: {
      path: string;
      start_line: number;
      end_line: number;
    };
  };
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
}

/**
 * Dependabot Alert Severity
 */
export type DependabotSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Dependabot Alert State
 */
export type DependabotState = 'auto_dismissed' | 'dismissed' | 'fixed' | 'open';

/**
 * Dependabot Alert
 */
export interface DependabotAlert {
  number: number;
  state: DependabotState;
  dependency: {
    package: {
      name: string;
      ecosystem: string;
    };
    manifest_path: string;
  };
  security_advisory: {
    ghsa_id: string;
    cve_id: string | null;
    summary: string;
    description: string;
    severity: DependabotSeverity;
    cvss: {
      score: number;
      vector_string: string;
    };
  };
  security_vulnerability: {
    package: {
      name: string;
      ecosystem: string;
    };
    severity: DependabotSeverity;
    vulnerable_version_range: string;
    first_patched_version: {
      identifier: string;
    } | null;
  };
  created_at: string;
  updated_at: string;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  url: string;
  html_url: string;
}

/**
 * Workflow Run Status
 */
export type WorkflowStatus = 'completed' | 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'in_progress' | 'queued' | 'requested' | 'waiting' | 'pending';

/**
 * Workflow Run Conclusion
 */
export type WorkflowConclusion = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;

/**
 * Workflow Run
 */
export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: WorkflowStatus;
  conclusion: WorkflowConclusion;
  workflow_id: number;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
}

/**
 * Security Metrics Summary
 */
export interface SecurityMetrics {
  codeql: {
    total: number;
    by_severity: Record<CodeQLSeverity, number>;
    by_state: Record<CodeQLState, number>;
    recent_alerts: CodeQLAlert[];
  };
  dependabot: {
    total: number;
    by_severity: Record<DependabotSeverity, number>;
    by_state: Record<DependabotState, number>;
    recent_alerts: DependabotAlert[];
  };
  ci_cd: {
    latest_runs: WorkflowRun[];
    success_rate: number;
    last_scan_date: string | null;
  };
  last_updated: string;
}

/**
 * Fetch CodeQL code scanning alerts
 */
export async function getCodeQLAlerts(): Promise<CodeQLAlert[]> {
  try {
    const alerts = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/code-scanning/alerts?state=open&per_page=100`
    );
    return alerts;
  } catch (error) {
    console.error('Error fetching CodeQL alerts:', error);
    return [];
  }
}

/**
 * Fetch Dependabot vulnerability alerts
 */
export async function getDependabotAlerts(): Promise<DependabotAlert[]> {
  try {
    const alerts = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dependabot/alerts?state=open&per_page=100`
    );
    return alerts;
  } catch (error) {
    console.error('Error fetching Dependabot alerts:', error);
    return [];
  }
}

/**
 * Fetch recent workflow runs
 */
export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  try {
    const response = await githubRequest(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=20`
    );
    return response.workflow_runs || [];
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return [];
  }
}

/**
 * Get comprehensive security metrics
 */
export async function getSecurityMetrics(): Promise<SecurityMetrics> {
  const [codeqlAlerts, dependabotAlerts, workflowRuns] = await Promise.all([
    getCodeQLAlerts(),
    getDependabotAlerts(),
    getWorkflowRuns(),
  ]);

  // Aggregate CodeQL metrics
  const codeqlBySeverity: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    note: 0,
    warning: 0,
    error: 0,
  };
  const codeqlByState: Record<string, number> = {
    open: 0,
    dismissed: 0,
    fixed: 0,
  };

  codeqlAlerts.forEach((alert) => {
    const severity = alert.rule.security_severity_level || alert.rule.severity;
    codeqlBySeverity[severity] = (codeqlBySeverity[severity] || 0) + 1;
    codeqlByState[alert.state] = (codeqlByState[alert.state] || 0) + 1;
  });

  // Aggregate Dependabot metrics
  const dependabotBySeverity: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const dependabotByState: Record<string, number> = {
    open: 0,
    dismissed: 0,
    fixed: 0,
    auto_dismissed: 0,
  };

  dependabotAlerts.forEach((alert) => {
    const severity = alert.security_advisory.severity;
    dependabotBySeverity[severity] = (dependabotBySeverity[severity] || 0) + 1;
    dependabotByState[alert.state] = (dependabotByState[alert.state] || 0) + 1;
  });

  // Calculate CI/CD metrics
  const completedRuns = workflowRuns.filter((run) => run.status === 'completed');
  const successfulRuns = completedRuns.filter((run) => run.conclusion === 'success');
  const successRate = completedRuns.length > 0 
    ? (successfulRuns.length / completedRuns.length) * 100 
    : 0;

  // Find last CodeQL scan
  const codeqlRuns = workflowRuns.filter(
    (run) => run.name.toLowerCase().includes('codeql') || run.name.toLowerCase().includes('security')
  );
  const lastScanDate = codeqlRuns.length > 0 ? codeqlRuns[0].created_at : null;

  return {
    codeql: {
      total: codeqlAlerts.length,
      by_severity: codeqlBySeverity as Record<CodeQLSeverity, number>,
      by_state: codeqlByState as Record<CodeQLState, number>,
      recent_alerts: codeqlAlerts.slice(0, 10),
    },
    dependabot: {
      total: dependabotAlerts.length,
      by_severity: dependabotBySeverity as Record<DependabotSeverity, number>,
      by_state: dependabotByState as Record<DependabotState, number>,
      recent_alerts: dependabotAlerts.slice(0, 10),
    },
    ci_cd: {
      latest_runs: workflowRuns.slice(0, 10),
      success_rate: Math.round(successRate),
      last_scan_date: lastScanDate,
    },
    last_updated: new Date().toISOString(),
  };
}

/**
 * Check if GitHub integration is configured
 */
export function isGitHubConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}
