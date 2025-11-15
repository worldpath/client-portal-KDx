/**
 * System Health Check Service
 * 
 * Validates connectivity and status of all critical system integrations
 * including GitHub, S3, Database, and OAuth.
 */

import { getDb } from "./db";
import { getEffectiveGitHubSettings } from "./githubSettings";
import { storagePut } from "./storage";

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  responseTime?: number;
  details?: Record<string, any>;
  troubleshooting?: string[];
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  checks: {
    database: HealthCheckResult;
    storage: HealthCheckResult;
    github: HealthCheckResult;
    oauth: HealthCheckResult;
  };
  lastChecked: string;
}

/**
 * Check database connectivity and health
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const db = await getDb();
    
    if (!db) {
      return {
        status: 'error',
        message: 'Database connection not available',
        responseTime: Date.now() - startTime,
        troubleshooting: [
          'Check DATABASE_URL environment variable',
          'Verify database server is running',
          'Check network connectivity to database',
          'Review database credentials',
        ],
      };
    }

    // Try a simple query
    await db.execute('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? 'healthy' : 'warning',
      message: responseTime < 100 
        ? 'Database connection healthy' 
        : 'Database responding slowly',
      responseTime,
      details: {
        url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'Not configured',
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      troubleshooting: [
        'Verify database server is running',
        'Check database credentials',
        'Review database firewall rules',
        'Check SSL/TLS configuration',
      ],
    };
  }
}

/**
 * Check S3 storage connectivity
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Try to upload a small test file
    const testContent = `health-check-${Date.now()}`;
    const testKey = `health-checks/test-${Date.now()}.txt`;
    
    await storagePut(testKey, testContent, 'text/plain');
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'warning',
      message: responseTime < 1000 
        ? 'S3 storage connection healthy' 
        : 'S3 storage responding slowly',
      responseTime,
      details: {
        configured: true,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `S3 storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      troubleshooting: [
        'Check S3 credentials in environment variables',
        'Verify S3 bucket exists and is accessible',
        'Review S3 bucket permissions',
        'Check network connectivity to S3',
      ],
    };
  }
}

/**
 * Check GitHub integration
 */
async function checkGitHub(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const settings = await getEffectiveGitHubSettings();
    
    if (!settings.token || !settings.owner || !settings.repo) {
      return {
        status: 'warning',
        message: 'GitHub integration not configured',
        responseTime: Date.now() - startTime,
        details: {
          configured: false,
          hasToken: !!settings.token,
          hasOwner: !!settings.owner,
          hasRepo: !!settings.repo,
        },
        troubleshooting: [
          'Configure GitHub settings in Admin Settings',
          'Provide GitHub Personal Access Token',
          'Set repository owner and name',
        ],
      };
    }

    // Test GitHub API connectivity
    const response = await fetch(
      `https://api.github.com/repos/${settings.owner}/${settings.repo}`,
      {
        headers: {
          'Authorization': `Bearer ${settings.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'healthy',
        message: 'GitHub integration healthy',
        responseTime,
        details: {
          repository: data.full_name,
          private: data.private,
          configured: true,
        },
      };
    } else if (response.status === 401) {
      return {
        status: 'error',
        message: 'GitHub authentication failed',
        responseTime,
        troubleshooting: [
          'Verify GitHub Personal Access Token is valid',
          'Check token has required permissions (repo, security_events)',
          'Regenerate token if expired',
        ],
      };
    } else if (response.status === 404) {
      return {
        status: 'error',
        message: 'GitHub repository not found',
        responseTime,
        troubleshooting: [
          'Verify repository owner and name are correct',
          'Check repository exists and is accessible',
          'Ensure token has access to the repository',
        ],
      };
    } else {
      return {
        status: 'error',
        message: `GitHub API error: ${response.status}`,
        responseTime,
        troubleshooting: [
          'Check GitHub API status at status.github.com',
          'Verify API rate limits',
          'Review GitHub API error response',
        ],
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `GitHub connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      troubleshooting: [
        'Check network connectivity',
        'Verify firewall allows GitHub API access',
        'Check DNS resolution for api.github.com',
      ],
    };
  }
}

/**
 * Check OAuth integration
 */
async function checkOAuth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const oauthServerUrl = process.env.OAUTH_SERVER_URL;
    const appId = process.env.VITE_APP_ID;
    
    if (!oauthServerUrl || !appId) {
      return {
        status: 'error',
        message: 'OAuth not configured',
        responseTime: Date.now() - startTime,
        details: {
          hasServerUrl: !!oauthServerUrl,
          hasAppId: !!appId,
        },
        troubleshooting: [
          'Check OAUTH_SERVER_URL environment variable',
          'Check VITE_APP_ID environment variable',
          'Verify OAuth application is registered',
        ],
      };
    }

    // Test OAuth server connectivity
    const response = await fetch(`${oauthServerUrl}/.well-known/openid-configuration`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'OAuth integration healthy',
        responseTime,
        details: {
          serverUrl: oauthServerUrl,
          configured: true,
        },
      };
    } else {
      return {
        status: 'error',
        message: `OAuth server error: ${response.status}`,
        responseTime,
        troubleshooting: [
          'Check OAuth server is running',
          'Verify OAUTH_SERVER_URL is correct',
          'Check network connectivity to OAuth server',
        ],
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `OAuth connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
      troubleshooting: [
        'Check network connectivity to OAuth server',
        'Verify firewall allows OAuth server access',
        'Check DNS resolution for OAuth server',
      ],
    };
  }
}

/**
 * Run all health checks and return comprehensive system health
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const [database, storage, github, oauth] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkGitHub(),
    checkOAuth(),
  ]);

  // Determine overall status
  const checks = { database, storage, github, oauth };
  const statuses = Object.values(checks).map(check => check.status);
  
  let overall: 'healthy' | 'warning' | 'error';
  if (statuses.includes('error')) {
    overall = 'error';
  } else if (statuses.includes('warning')) {
    overall = 'warning';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    checks,
    lastChecked: new Date().toISOString(),
  };
}
