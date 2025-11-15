/**
 * GitHub Settings Management Service
 * 
 * Handles secure storage and retrieval of GitHub integration settings
 * including repository details and API tokens with encryption.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { systemSettings } from "../drizzle/schema";
import crypto from "crypto";

// Encryption key from environment or generate a secure one
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * GitHub Settings Interface
 */
export interface GitHubSettings {
  token?: string;
  owner?: string;
  repo?: string;
}

/**
 * Get a system setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (results.length === 0) return null;

  const setting = results[0];
  
  if (setting.encrypted && setting.value) {
    try {
      return decrypt(setting.value);
    } catch (error) {
      console.error('Failed to decrypt setting:', key, error);
      return null;
    }
  }

  return setting.value;
}

/**
 * Set a system setting
 */
export async function setSetting(
  key: string,
  value: string,
  encrypted: boolean = false,
  description?: string,
  updatedBy?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const finalValue = encrypted ? encrypt(value) : value;

  // Try to update existing setting
  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({
        value: finalValue,
        encrypted,
        description,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({
      key,
      value: finalValue,
      encrypted,
      description,
      updatedBy,
    });
  }
}

/**
 * Get GitHub settings
 */
export async function getGitHubSettings(): Promise<GitHubSettings> {
  const [token, owner, repo] = await Promise.all([
    getSetting('github_token'),
    getSetting('github_owner'),
    getSetting('github_repo'),
  ]);

  return {
    token: token || undefined,
    owner: owner || undefined,
    repo: repo || undefined,
  };
}

/**
 * Save GitHub settings
 */
export async function saveGitHubSettings(
  settings: GitHubSettings,
  updatedBy: number
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (settings.token !== undefined) {
    promises.push(
      setSetting(
        'github_token',
        settings.token,
        true, // encrypted
        'GitHub Personal Access Token for API access',
        updatedBy
      )
    );
  }

  if (settings.owner !== undefined) {
    promises.push(
      setSetting(
        'github_owner',
        settings.owner,
        false,
        'GitHub repository owner/organization name',
        updatedBy
      )
    );
  }

  if (settings.repo !== undefined) {
    promises.push(
      setSetting(
        'github_repo',
        settings.repo,
        false,
        'GitHub repository name',
        updatedBy
      )
    );
  }

  await Promise.all(promises);
}

/**
 * Test GitHub connection with provided settings
 */
export async function testGitHubConnection(
  token: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Successfully connected to ${data.full_name}`,
      };
    } else if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid GitHub token. Please check your Personal Access Token.',
      };
    } else if (response.status === 404) {
      return {
        success: false,
        message: 'Repository not found. Please check the owner and repository name.',
      };
    } else {
      return {
        success: false,
        message: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check if GitHub is configured (either via env vars or database)
 */
export async function isGitHubConfigured(): Promise<boolean> {
  // Check environment variables first
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    return true;
  }

  // Check database settings
  const settings = await getGitHubSettings();
  return !!(settings.token && settings.owner && settings.repo);
}

/**
 * Get effective GitHub settings (env vars take precedence over database)
 */
export async function getEffectiveGitHubSettings(): Promise<GitHubSettings> {
  // Environment variables take precedence
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
    return {
      token: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
    };
  }

  // Fall back to database settings
  return await getGitHubSettings();
}
