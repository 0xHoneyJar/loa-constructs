/**
 * CLI Plugin Types
 * @see sprint.md T7.1: Plugin Structure
 */

import type { SubscriptionTier, SkillVersion, SkillDownload } from '@loa-registry/shared';

// --- Registry Configuration ---

export interface RegistryConfig {
  name: string;
  url: string;
  default?: boolean;
}

export interface PluginConfig {
  registries: RegistryConfig[];
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: string;
  };
  autoUpdate: {
    enabled: boolean;
    checkInterval: number;
  };
}

// --- Credentials ---

export interface ApiKeyCredentials {
  type: 'api_key';
  key: string;
  userId: string;
  tier: SubscriptionTier;
  expiresAt: string | null;
}

export interface OAuthCredentials {
  type: 'oauth';
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  tier: SubscriptionTier;
}

export type Credentials = ApiKeyCredentials | OAuthCredentials;

export interface CredentialsStore {
  [registry: string]: Credentials;
}

// --- Client Types ---

export interface RegistryClientConfig {
  url: string;
  apiKey?: string;
  accessToken?: string;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface SkillListOptions {
  query?: string;
  category?: string;
  tier?: string;
  page?: number;
  perPage?: number;
}

export interface SkillListResponse {
  data: SkillSummary[];
  pagination: Pagination;
}

export interface SkillSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  tier_required: SubscriptionTier;
  downloads: number;
  rating: number | null;
  rating_count: number;
  tags: string[];
  latest_version: string;
  owner: {
    name: string;
    type: 'user' | 'team';
  };
}

export interface SkillDetail extends SkillSummary {
  long_description?: string;
  repository_url?: string;
  documentation_url?: string;
  versions: SkillVersion[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  effective_tier: SubscriptionTier;
  subscription?: {
    tier: SubscriptionTier;
    status: string;
    current_period_end?: string;
  };
}

export interface LicenseValidation {
  valid: boolean;
  expires_at: string;
  tier: SubscriptionTier;
}

export interface SkillInstallRecord {
  skill: SkillSummary;
  version: string;
  installed_at: string;
  updated_at: string;
}

// --- Cache Types ---

export interface CachedSkill {
  slug: string;
  version: string;
  download: SkillDownload;
  cachedAt: string;
}

export interface InstalledSkill {
  name: string;
  slug: string;
  version: string;
  licenseValid: boolean;
  expiresAt?: string;
}

// --- Command Context ---

export interface CommandContext {
  args: Record<string, string | boolean | undefined>;
  cwd: string;
}

export interface Command {
  name: string;
  description: string;
  args?: Record<string, {
    type: 'string' | 'boolean';
    required?: boolean;
    description?: string;
  }>;
  execute: (context: CommandContext) => Promise<void>;
}

// --- Plugin ---

export interface LoaPlugin {
  name: string;
  version: string;
  description: string;
  commands: Command[];
}
