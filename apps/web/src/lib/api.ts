/**
 * API Client for Loa Constructs Registry
 * Fetches packs and skills from the registry API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://loa-constructs-api.fly.dev';

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
 */
export async function fetchPack(slug: string): Promise<PackDetailResponse> {
  const url = `${API_URL}/v1/packs/${slug}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Pack not found');
    }
    throw new Error(`Failed to fetch pack: ${res.status}`);
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
