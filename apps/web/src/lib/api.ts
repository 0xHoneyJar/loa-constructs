/**
 * API Client for Loa Constructs Registry
 * Fetches packs and skills from the registry API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network';

// --- Error Classes ---

export class PackNotFoundError extends Error {
  constructor(slug: string) {
    super(`Pack not found: ${slug}`);
    this.name = 'PackNotFoundError';
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// --- Types ---

export interface Pack {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description?: string | null;
  tier_required: 'free' | 'pro' | 'team' | 'enterprise';
  pricing_type: 'free' | 'one_time' | 'subscription';
  downloads: number;
  is_featured: boolean;
  rating: number | null;
  rating_count?: number;
  status?: string;
  latest_version?: {
    version: string;
    changelog?: string;
    file_count: number;
    total_size_bytes: number;
    published_at: string;
  } | null;
  repository_url?: string | null;
  homepage_url?: string | null;
  documentation_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PacksResponse {
  data: Pack[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
  request_id: string;
}

export interface PackDetailResponse {
  data: Pack;
  request_id: string;
}

export interface PackVersionsResponse {
  data: Array<{
    id: string;
    version: string;
    changelog?: string;
    is_latest: boolean;
    file_count: number;
    total_size_bytes: number;
    min_loa_version?: string;
    max_loa_version?: string;
    published_at: string;
    created_at: string;
  }>;
  request_id: string;
}

// --- API Functions ---

/**
 * Fetch all published packs
 */
export async function fetchPacks(options?: {
  query?: string;
  tag?: string;
  featured?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PacksResponse> {
  const params = new URLSearchParams();
  if (options?.query) params.set('q', options.query);
  if (options?.tag) params.set('tag', options.tag);
  if (options?.featured !== undefined) params.set('featured', String(options.featured));
  if (options?.page) params.set('page', String(options.page));
  if (options?.per_page) params.set('per_page', String(options.per_page));

  const url = `${API_URL}/v1/packs${params.toString() ? `?${params}` : ''}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch packs: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single pack by slug
 * @throws {PackNotFoundError} if pack doesn't exist (404)
 * @throws {ApiError} for other API errors (5xx, network issues)
 */
export async function fetchPack(slug: string): Promise<PackDetailResponse> {
  const url = `${API_URL}/v1/packs/${slug}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new PackNotFoundError(slug);
    }
    throw new ApiError(`Failed to fetch pack: ${res.status}`, res.status);
  }

  return res.json();
}

/**
 * Fetch pack versions
 */
export async function fetchPackVersions(slug: string): Promise<PackVersionsResponse> {
  const url = `${API_URL}/v1/packs/${slug}/versions`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pack versions: ${res.status}`);
  }

  return res.json();
}

// --- Construct Types ---

export class ConstructNotFoundError extends Error {
  constructor(slug: string) {
    super(`Construct not found: ${slug}`);
    this.name = 'ConstructNotFoundError';
  }
}

export type ConstructType = 'skill' | 'pack' | 'bundle';

export interface ConstructManifest {
  name: string;
  version: string;
  type: ConstructType;
  description?: string;
  skills?: Array<{ name: string; description?: string }>;
  commands?: Array<{ name: string; description?: string }>;
  dependencies?: Record<string, string>;
  pack_dependencies?: Record<string, string>;
  events?: {
    emits?: string[];
    consumes?: string[];
  };
  tier_required?: 'free' | 'pro' | 'team' | 'enterprise';
  unix?: {
    composes_with?: string[];
    stdin?: boolean;
    stdout?: boolean;
    stderr?: boolean;
  };
}

export interface Construct {
  id: string;
  type: ConstructType;
  name: string;
  slug: string;
  description: string | null;
  long_description?: string | null;
  version: string | null;
  tier_required: 'free' | 'pro' | 'team' | 'enterprise';
  category: string | null;
  downloads: number;
  rating: number | null;
  is_featured: boolean;
  maturity: 'experimental' | 'beta' | 'stable' | null;
  source_type: 'registry' | 'git' | null;
  manifest: {
    skills?: string[];
    commands?: string[];
    dependencies?: Record<string, string>;
  } | null;
  latest_version: {
    version: string;
    changelog: string | null;
    published_at: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ConstructIdentity {
  cognitive_frame: {
    archetype?: string;
    disposition?: string;
    thinking_style?: string;
    decision_making?: string;
  } | null;
  expertise_domains: Array<{
    name: string;
    depth?: string;
  }> | null;
  voice_config: {
    tone?: string;
    register?: string;
    vocabulary?: string;
  } | null;
  model_preferences: Record<string, unknown> | null;
}

export interface ConstructDetail extends Omit<Construct, 'manifest'> {
  manifest: ConstructManifest | null;
  owner: {
    name: string;
    type: 'user' | 'team';
    avatar_url: string | null;
  } | null;
  repository_url: string | null;
  homepage_url: string | null;
  documentation_url: string | null;
  git_url: string | null;
  has_identity: boolean;
  identity: ConstructIdentity | null;
  latest_version: {
    version: string;
    changelog: string | null;
    published_at: string | null;
  } | null;
}

export interface ConstructsResponse {
  data: Construct[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  request_id: string;
}

export interface ConstructDetailResponse {
  data: ConstructDetail;
  request_id: string;
}

// --- Construct API Functions ---

/**
 * Fetch all constructs (skills + packs)
 */
export async function fetchConstructs(options?: {
  query?: string;
  type?: ConstructType;
  tier?: string;
  category?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
}): Promise<ConstructsResponse> {
  const params = new URLSearchParams();
  if (options?.query) params.set('q', options.query);
  if (options?.type) params.set('type', options.type);
  if (options?.tier) params.set('tier', options.tier);
  if (options?.category) params.set('category', options.category);
  if (options?.featured !== undefined) params.set('featured', String(options.featured));
  if (options?.sort) params.set('sort', options.sort);
  if (options?.page) params.set('page', String(options.page));
  if (options?.per_page) params.set('per_page', String(options.per_page));

  const url = `${API_URL}/v1/constructs${params.toString() ? `?${params}` : ''}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch constructs: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single construct by slug
 * @throws {ConstructNotFoundError} if construct doesn't exist (404)
 * @throws {ApiError} for other API errors (5xx, network issues)
 */
export async function fetchConstruct(slug: string): Promise<ConstructDetailResponse> {
  const url = `${API_URL}/v1/constructs/${slug}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new ConstructNotFoundError(slug);
    }
    throw new ApiError(`Failed to fetch construct: ${res.status}`, res.status);
  }

  return res.json();
}
