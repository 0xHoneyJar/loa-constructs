/**
 * Shared TypeScript Types
 * @see sdd.md §3.2 Schema Design
 */

// --- Enums ---

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export type TeamRole = 'owner' | 'admin' | 'member';

export type SkillCategory =
  | 'development'
  | 'devops'
  | 'marketing'
  | 'sales'
  | 'support'
  | 'analytics'
  | 'security'
  | 'other';

export type UsageAction = 'install' | 'update' | 'load' | 'uninstall';

// --- API Response Types ---

export interface ApiResponse<T> {
  data: T;
  request_id: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    docs_url?: string;
  };
  request_id: string;
}

// --- User Types ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithSubscription extends User {
  tier: SubscriptionTier;
  subscription?: Subscription;
}

// --- Team Types ---

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  user: User;
  joined_at?: string;
}

// --- Subscription Types ---

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  seats?: number;
}

// --- Skill Types ---

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description?: string;
  long_description?: string;
  category: SkillCategory;
  tier_required: SubscriptionTier;
  tags: string[];
  downloads: number;
  rating: number;
  rating_count: number;
  latest_version?: string;
  owner: {
    name: string;
    type: 'user' | 'team';
  };
  created_at: string;
  updated_at: string;
}

export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  changelog?: string;
  min_loa_version?: string;
  is_latest: boolean;
  published_at?: string;
}

export interface SkillFile {
  path: string;
  content: string;
}

export interface SkillDownload {
  skill: {
    name: string;
    version: string;
    files: SkillFile[];
  };
  license: {
    type: 'subscription' | 'free';
    tier: SubscriptionTier;
    expires_at?: string;
    watermark: string;
  };
  cache_ttl: number;
}

// --- API Key Types ---

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

// --- Auth Types ---

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: SubscriptionTier;
}

// --- Pack Types ---

export interface Pack {
  id: string;
  name: string;
  slug: string;
  description?: string;
  long_description?: string;
  tier_required: SubscriptionTier;
  pricing_type: 'free' | 'one_time' | 'subscription';
  downloads: number;
  is_featured: boolean;
  rating: number | null;
  rating_count: number;
  latest_version?: PackVersionSummary;
  owner?: {
    name: string;
    type: 'user' | 'team';
  };
  created_at: string;
  updated_at: string;
}

export interface PackVersionSummary {
  version: string;
  changelog?: string;
  file_count: number;
  total_size_bytes: number;
  published_at?: string;
}

export interface PackFile {
  path: string;
  content: string;
}

export interface PackManifest {
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  skills?: Array<{ slug: string; path: string }>;
  commands?: Array<{ name: string; path: string }>;
  protocols?: Array<{ name: string; path: string }>;
  dependencies?: {
    loa_version?: string;
    skills?: string[];
    packs?: string[];
  };
  pricing?: {
    type: string;
    tier: string;
  };
  tags?: string[];
  license?: string;
  /**
   * Path to CLAUDE.md instruction fragment file.
   * Must end with .md. Max file size: 4KB.
   * @see prd.md §4.3 CLAUDE.md Fragments (Opportunity 3)
   */
  claude_instructions?: string;
}

export interface PackDownload {
  pack: {
    name: string;
    slug: string;
    version: string;
    manifest: PackManifest;
    files: PackFile[];
  };
  license: {
    token: string;
    expires_at: string;
    watermark: string;
  };
}

export interface PackLicense {
  pack: string;
  version: string;
  token: string;
  expires_at: string;
  watermark: string;
  installed_at: string;
}
