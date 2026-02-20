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
  /** FR-2: Zod has this, TS was missing */
  long_description?: string;
  /** FR-2: Accept string shorthand or object (matches Zod union) */
  author?: string | {
    name: string;
    email?: string;
    url?: string;
  };
  /** FR-2: Zod has this, TS was missing */
  repository?: string;
  /** FR-2: Zod has this, TS was missing */
  homepage?: string;
  /** FR-2: Zod has this, TS was missing */
  documentation?: string;
  skills?: Array<{ slug: string; path: string }>;
  commands?: Array<{ name: string; path: string }>;
  protocols?: Array<{ name: string; path: string }>;
  dependencies?: {
    loa_version?: string;
    /** FR-2: Changed from string[] to Record<string, string> to match Zod */
    skills?: Record<string, string>;
    /** FR-2: Changed from string[] to Record<string, string> to match Zod */
    packs?: Record<string, string>;
  };
  pricing?: {
    type: string;
    tier: string;
  };
  tags?: string[];
  /** FR-2: Zod has this, TS was missing */
  keywords?: string[];
  /** FR-2: Zod has this, TS was missing */
  engines?: {
    loa?: string;
    node?: string;
  };
  license?: string;
  /**
   * Path to CLAUDE.md instruction fragment file.
   * Must end with .md. Max file size: 4KB.
   * @see prd.md §4.3 CLAUDE.md Fragments (Opportunity 3)
   */
  claude_instructions?: string;
  /** Manifest schema version */
  schema_version?: number;
  /** CLI tool dependencies */
  tools?: Record<string, {
    install?: string;
    required?: boolean;
    purpose: string;
    check: string;
    docs_url?: string;
  }>;
  /** MCP servers this pack consumes (server definitions live in .claude/mcp-registry.yaml) */
  mcp_dependencies?: Record<string, {
    required?: boolean;
    required_scopes?: string[];
    reason: string;
    fallback?: string;
  }>;
  /** Quick start hint for install summary */
  quick_start?: {
    command: string;
    description: string;
  };

  // === Bridgebuilder fields (FR-1, cycle-030) ===

  /** Domain tags for MoE routing (#119) */
  domain?: string[];
  /** Expertise declarations for intent matching (#119) */
  expertise?: string[];
  /** Golden path porcelain commands (#119, #127) */
  golden_path?: {
    commands: Array<{
      name: string;
      description: string;
      truename_map?: Record<string, string>;
    }>;
    detect_state?: string;
  };
  /** Workflow depth and gate declarations (#129) — consumed by construct-workflow-read.sh */
  workflow?: {
    depth: 'light' | 'standard' | 'deep' | 'full';
    app_zone_access?: boolean;
    gates: {
      prd?: 'skip' | 'condense' | 'full';
      sdd?: 'skip' | 'condense' | 'full';
      sprint?: 'skip' | 'condense' | 'full';
      implement?: 'required';
      review?: 'skip' | 'visual' | 'textual' | 'both';
      audit?: 'skip' | 'lightweight' | 'full';
    };
    verification?: {
      method: 'visual' | 'tsc' | 'build' | 'test' | 'manual';
    };
  };
  /** Methodology layer for knowledge separation (#118) */
  methodology?: {
    references?: string[];
    principles?: string[];
    knowledge_base?: string;
  };
  /** Construct capability tier (#128) */
  tier?: 'L1' | 'L2' | 'L3';

  // === Construct Lifecycle fields (FR-1, cycle-032) ===

  /** Construct archetype — determines scaffold template and validation rules */
  type?: 'skill-pack' | 'tool-pack' | 'codex' | 'template';
  /** Runtime environment requirements for tool-pack and codex types */
  runtime_requirements?: {
    runtime?: string;
    dependencies?: Record<string, string>;
    external_tools?: string[];
  };
  /** Configurable state/cache/output directory paths */
  paths?: {
    state?: string;
    cache?: string;
    output?: string;
  };
  /** Required credentials with metadata for setup guidance */
  credentials?: Array<{
    name: string;
    description: string;
    sensitive?: boolean;
    optional?: boolean;
  }>;
  /** Access layer configuration for codex-type constructs */
  access_layer?: {
    type: 'mcp' | 'file' | 'api';
    entrypoint?: string;
    transport?: 'stdio' | 'sse' | 'http';
  };
  /** Portability score (0.0–1.0) indicating environment independence */
  portability_score?: number;
  /** Expert identity layer — persona and expertise paths */
  identity?: {
    persona?: string;
    expertise?: string;
  };
  /** Lifecycle hooks — scripts to run after install/update */
  hooks?: {
    post_install?: string;
    post_update?: string;
  };
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
