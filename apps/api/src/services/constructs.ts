/**
 * Constructs Service
 * Unified aggregation layer for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §6 Service Layer Design
 */

import { eq, and, or, desc, sql, ilike, inArray } from 'drizzle-orm';
import {
  db,
  skills,
  packs,
  packVersions,
  skillVersions,
  users,
  teams,
} from '../db/index.js';
import { getRedis, isRedisConfigured, CACHE_KEYS, CACHE_TTL } from './redis.js';
import { logger } from '../lib/logger.js';
import type { ConstructManifest } from '../lib/manifest-validator.js';

// Re-export for consumers
export type { ConstructManifest };

// --- Types ---

export type ConstructType = 'skill' | 'pack' | 'bundle';

export type MaturityLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';

export interface Construct {
  id: string;
  type: ConstructType;
  name: string;
  slug: string;
  description: string | null;
  longDescription: string | null;
  version: string | null;
  tierRequired: string;
  category: string | null;
  downloads: number;
  rating: number | null;
  isFeatured: boolean;
  manifest: ConstructManifest | null;
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  documentationUrl: string | null;
  latestVersion: { version: string; changelog: string | null; publishedAt: Date | null } | null;
  maturity: MaturityLevel;
  graduatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Search metadata (populated when ?q= present)
  searchKeywords?: string[];
  searchUseCases?: string[];
  // Relevance fields (populated when ?q= present)
  relevanceScore?: number;
  matchReasons?: string[];
}

export interface ConstructSummary {
  slug: string;
  name: string;
  type: ConstructType;
  commands: string[];
  tier_required: string;
}

export interface ListConstructsOptions {
  query?: string;
  type?: ConstructType;
  tier?: string;
  category?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  page?: number;
  limit?: number;
}

export interface ListConstructsResult {
  constructs: Construct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Constants ---

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
/**
 * Maximum items to fetch per source in mixed queries
 * Prevents excessive memory usage for large registries
 * @see sdd.md §7.4 Memory Cap Fix
 */
const MAX_MIXED_FETCH = 500;

// --- Helper Functions ---

function calculateRating(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount === 0) return null;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

/**
 * Relevance scoring weights
 * @see prd.md §4.3 Search Ranking Factors (cycle-007)
 * @see sdd.md §3.2 Scoring Algorithm (cycle-007)
 */
const RELEVANCE_WEIGHTS = {
  nameExact: 1.0,
  namePartial: 0.8,
  keywords: 0.9,
  useCases: 0.7,
  description: 0.6,
  downloads: 0.3,
  maturityStable: 0.2,
  maturityBeta: 0.15,
  maturityExperimental: 0.05,
  rating: 0.2,
};

const MAX_RELEVANCE_SCORE = 2.0;

/**
 * Calculate relevance score for a construct based on query terms
 * @see prd.md §4.3 Search Ranking Factors (cycle-007)
 * @see sdd.md §3.2 Scoring Algorithm (cycle-007)
 */
export function calculateRelevanceScore(
  construct: {
    name: string;
    description: string | null;
    searchKeywords?: string[] | null;
    searchUseCases?: string[] | null;
    downloads: number;
    maturity: MaturityLevel;
    rating: number | null;
  },
  queryTerms: string[]
): { score: number; matchReasons: string[] } {
  if (queryTerms.length === 0) {
    return { score: 0, matchReasons: [] };
  }

  let score = 0;
  const matchReasons: string[] = [];
  const lowerTerms = queryTerms.map(t => t.toLowerCase());
  const nameLower = construct.name.toLowerCase();
  const descLower = (construct.description || '').toLowerCase();
  const keywordsLower = (construct.searchKeywords || []).map(k => k.toLowerCase());
  const useCasesLower = (construct.searchUseCases || []).map(u => u.toLowerCase());

  // Name matching
  for (const term of lowerTerms) {
    if (nameLower === term) {
      score += RELEVANCE_WEIGHTS.nameExact;
      if (!matchReasons.includes('name')) matchReasons.push('name');
    } else if (nameLower.includes(term)) {
      score += RELEVANCE_WEIGHTS.namePartial;
      if (!matchReasons.includes('name')) matchReasons.push('name');
    }
  }

  // Keywords matching
  for (const term of lowerTerms) {
    const keywordMatch = keywordsLower.some(k => k.includes(term) || term.includes(k));
    if (keywordMatch) {
      score += RELEVANCE_WEIGHTS.keywords;
      if (!matchReasons.includes('keywords')) matchReasons.push('keywords');
    }
  }

  // Use cases matching
  for (const term of lowerTerms) {
    const useCaseMatch = useCasesLower.some(u => u.includes(term) || term.includes(u));
    if (useCaseMatch) {
      score += RELEVANCE_WEIGHTS.useCases;
      if (!matchReasons.includes('use_cases')) matchReasons.push('use_cases');
    }
  }

  // Description matching
  for (const term of lowerTerms) {
    if (descLower.includes(term)) {
      score += RELEVANCE_WEIGHTS.description;
      if (!matchReasons.includes('description')) matchReasons.push('description');
      break; // Only count once for description
    }
  }

  // Popularity boost (log scale to prevent high-download items from dominating)
  if (construct.downloads > 0) {
    const downloadBoost = Math.log10(construct.downloads + 1) / 5 * RELEVANCE_WEIGHTS.downloads;
    score += downloadBoost;
  }

  // Maturity boost
  switch (construct.maturity) {
    case 'stable':
      score += RELEVANCE_WEIGHTS.maturityStable;
      break;
    case 'beta':
      score += RELEVANCE_WEIGHTS.maturityBeta;
      break;
    case 'experimental':
      score += RELEVANCE_WEIGHTS.maturityExperimental;
      break;
  }

  // Rating boost
  if (construct.rating !== null && construct.rating > 0) {
    score += (construct.rating / 5) * RELEVANCE_WEIGHTS.rating;
  }

  // Cap the score
  return {
    score: Math.min(score, MAX_RELEVANCE_SCORE),
    matchReasons,
  };
}

/**
 * Convert skill to Construct format
 */
function skillToConstruct(
  skill: typeof skills.$inferSelect,
  version: typeof skillVersions.$inferSelect | null,
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null,
  queryTerms?: string[]
): Construct {
  // Create synthetic manifest for skills
  const syntheticManifest: ConstructManifest = {
    name: skill.slug,
    version: version?.version || '1.0.0',
    type: 'skill',
    description: skill.description || undefined,
    commands: [{ name: `/${skill.slug}`, description: skill.description || undefined }],
    tier_required: skill.tierRequired as 'free' | 'pro' | 'team' | 'enterprise',
  };

  const rating = calculateRating(skill.ratingSum || 0, skill.ratingCount || 0);
  const maturity = (skill.maturity || 'experimental') as MaturityLevel;

  // Calculate relevance if query terms provided
  let relevanceScore: number | undefined;
  let matchReasons: string[] | undefined;
  if (queryTerms && queryTerms.length > 0) {
    const relevance = calculateRelevanceScore(
      {
        name: skill.name,
        description: skill.description,
        searchKeywords: skill.searchKeywords,
        searchUseCases: skill.searchUseCases,
        downloads: skill.downloads || 0,
        maturity,
        rating,
      },
      queryTerms
    );
    relevanceScore = relevance.score;
    matchReasons = relevance.matchReasons;
  }

  return {
    id: skill.id,
    type: 'skill',
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    longDescription: skill.longDescription,
    version: version?.version || null,
    tierRequired: skill.tierRequired || 'free',
    category: skill.category || null,
    downloads: skill.downloads || 0,
    rating,
    isFeatured: false,
    manifest: syntheticManifest,
    owner,
    repositoryUrl: skill.repositoryUrl,
    homepageUrl: null, // Skills don't have homepage_url
    documentationUrl: skill.documentationUrl,
    latestVersion: version
      ? {
          version: version.version,
          changelog: version.changelog,
          publishedAt: version.publishedAt,
        }
      : null,
    maturity,
    graduatedAt: skill.graduatedAt || null,
    createdAt: skill.createdAt || new Date(),
    updatedAt: skill.updatedAt || new Date(),
    // Search metadata
    searchKeywords: skill.searchKeywords || undefined,
    searchUseCases: skill.searchUseCases || undefined,
    // Relevance data (only when searching)
    relevanceScore,
    matchReasons,
  };
}

/**
 * Convert pack to Construct format
 */
function packToConstruct(
  pack: typeof packs.$inferSelect,
  version: typeof packVersions.$inferSelect | null,
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null,
  queryTerms?: string[]
): Construct {
  const manifest = version?.manifest as ConstructManifest | null;
  const rating = calculateRating(pack.ratingSum || 0, pack.ratingCount || 0);
  const maturity = (pack.maturity || 'experimental') as MaturityLevel;

  // Calculate relevance if query terms provided
  let relevanceScore: number | undefined;
  let matchReasons: string[] | undefined;
  if (queryTerms && queryTerms.length > 0) {
    const relevance = calculateRelevanceScore(
      {
        name: pack.name,
        description: pack.description,
        searchKeywords: pack.searchKeywords,
        searchUseCases: pack.searchUseCases,
        downloads: pack.downloads || 0,
        maturity,
        rating,
      },
      queryTerms
    );
    relevanceScore = relevance.score;
    matchReasons = relevance.matchReasons;
  }

  return {
    id: pack.id,
    type: 'pack',
    name: pack.name,
    slug: pack.slug,
    description: pack.description,
    longDescription: pack.longDescription,
    version: version?.version || null,
    tierRequired: pack.tierRequired || 'free',
    category: null, // Packs don't have category
    downloads: pack.downloads || 0,
    rating,
    isFeatured: pack.isFeatured || false,
    manifest,
    owner,
    repositoryUrl: pack.repositoryUrl,
    homepageUrl: pack.homepageUrl,
    documentationUrl: pack.documentationUrl,
    latestVersion: version
      ? {
          version: version.version,
          changelog: version.changelog,
          publishedAt: version.publishedAt,
        }
      : null,
    maturity,
    graduatedAt: pack.graduatedAt || null,
    createdAt: pack.createdAt || new Date(),
    updatedAt: pack.updatedAt || new Date(),
    // Search metadata
    searchKeywords: pack.searchKeywords || undefined,
    searchUseCases: pack.searchUseCases || undefined,
    // Relevance data (only when searching)
    relevanceScore,
    matchReasons,
  };
}

// --- Core Functions ---

/**
 * List constructs (aggregates skills + packs)
 * @see prd-constructs-api.md FR-1.1: GET /v1/constructs
 */
export async function listConstructs(
  options: ListConstructsOptions = {}
): Promise<ListConstructsResult> {
  const { query, type, tier, category, featured, maturity, page = 1, limit = DEFAULT_PAGE_SIZE } = options;
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const offset = (Math.max(1, page) - 1) * pageSize;

  // Check cache for non-search queries
  const maturityKey = maturity ? maturity.sort().join(',') : '';
  const cacheKey = !query
    ? CACHE_KEYS.constructList(`${type}:${tier}:${category}:${featured}:${maturityKey}:${page}:${pageSize}`)
    : null;

  if (cacheKey && isRedisConfigured()) {
    try {
      const cached = await getRedis().get<ListConstructsResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read constructs from cache');
    }
  }

  // When type is specified, we can use direct pagination on that table
  // When type is NOT specified (mixed query), we must fetch enough from both
  // sources to correctly paginate the merged, sorted result
  const isMixedQuery = !type;

  // For mixed queries: fetch (page * pageSize) items from each source to ensure
  // correct global pagination after merge-sort. For filtered queries: use offset.
  // Apply MAX_MIXED_FETCH cap to prevent memory issues with large registries.
  const fetchLimit = isMixedQuery ? Math.min(page * pageSize, MAX_MIXED_FETCH) : pageSize;
  const fetchOffset = isMixedQuery ? 0 : offset;

  // Fetch skills (if type not specified or type === 'skill')
  const skillsPromise =
    !type || type === 'skill'
      ? fetchSkillsAsConstructs({ query, tier, category, featured, maturity, limit: fetchLimit, offset: fetchOffset })
      : Promise.resolve({ items: [], count: 0 });

  // Fetch packs (if type not specified or type === 'pack')
  const packsPromise =
    !type || type === 'pack'
      ? fetchPacksAsConstructs({ query, tier, featured, maturity, limit: fetchLimit, offset: fetchOffset })
      : Promise.resolve({ items: [], count: 0 });

  const [skillsResult, packsResult] = await Promise.all([skillsPromise, packsPromise]);

  // Merge and sort
  // When query is present, sort by relevance score (desc), then downloads
  // When no query, sort by downloads only
  // @see prd.md §4.1 Enhanced Search API (cycle-007)
  let allConstructs = [...skillsResult.items, ...packsResult.items];

  if (query) {
    // Sort by relevance score (desc), then downloads (desc) as tiebreaker
    allConstructs.sort((a, b) => {
      const scoreA = a.relevanceScore ?? 0;
      const scoreB = b.relevanceScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.downloads - a.downloads;
    });
  } else {
    // Sort by downloads only
    allConstructs.sort((a, b) => b.downloads - a.downloads);
  }

  // For mixed queries, apply pagination after global sort
  // For filtered queries, results are already correctly paginated
  if (isMixedQuery) {
    allConstructs = allConstructs.slice(offset, offset + pageSize);
  } else {
    allConstructs = allConstructs.slice(0, pageSize);
  }

  const total = skillsResult.count + packsResult.count;

  const result: ListConstructsResult = {
    constructs: allConstructs,
    total,
    page,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };

  // Cache result
  if (cacheKey && isRedisConfigured()) {
    try {
      await getRedis().set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.constructList });
    } catch (error) {
      logger.warn({ error }, 'Failed to cache constructs list');
    }
  }

  return result;
}

/**
 * Get construct by slug (checks both packs and skills)
 * @see prd-constructs-api.md FR-1.2: GET /v1/constructs/:slug
 */
export async function getConstructBySlug(slug: string): Promise<Construct | null> {
  // Check cache
  const cacheKey = CACHE_KEYS.constructDetail(slug);
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<Construct>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to read construct from cache');
    }
  }

  // Try packs first (more likely for constructs)
  const pack = await fetchPackAsConstruct(slug);
  if (pack) {
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(pack), { ex: CACHE_TTL.constructDetail });
      } catch (error) {
        logger.warn({ error, slug }, 'Failed to cache construct');
      }
    }
    return pack;
  }

  // Then try skills
  const skill = await fetchSkillAsConstruct(slug);
  if (skill) {
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(skill), { ex: CACHE_TTL.constructDetail });
      } catch (error) {
        logger.warn({ error, slug }, 'Failed to cache construct');
      }
    }
    return skill;
  }

  return null;
}

/**
 * Get summary (agent-optimized, minimal tokens)
 * @see prd-constructs-api.md FR-5.1: GET /v1/constructs/summary
 */
export async function getConstructsSummary(): Promise<{
  constructs: ConstructSummary[];
  total: number;
  last_updated: string;
}> {
  const cacheKey = CACHE_KEYS.constructSummary();
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<{
        constructs: ConstructSummary[];
        total: number;
        last_updated: string;
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read constructs summary from cache');
    }
  }

  // Fetch all published packs with manifests
  const packsData = await db
    .select({
      slug: packs.slug,
      name: packs.name,
      tierRequired: packs.tierRequired,
      manifest: packVersions.manifest,
    })
    .from(packs)
    .leftJoin(
      packVersions,
      and(eq(packVersions.packId, packs.id), eq(packVersions.isLatest, true))
    )
    .where(eq(packs.status, 'published'));

  const constructs: ConstructSummary[] = packsData.map((p) => {
    const manifest = p.manifest as ConstructManifest | null;
    return {
      slug: p.slug,
      name: p.name,
      type: 'pack' as ConstructType,
      commands: manifest?.commands?.map((c) => c.name).filter(Boolean) as string[] || [],
      tier_required: p.tierRequired || 'free',
    };
  });

  const result = {
    constructs,
    total: constructs.length,
    last_updated: new Date().toISOString(),
  };

  if (isRedisConfigured()) {
    try {
      await getRedis().set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.constructSummary });
    } catch (error) {
      logger.warn({ error }, 'Failed to cache constructs summary');
    }
  }

  return result;
}

/**
 * Check if construct exists
 * @see prd-constructs-api.md FR-5.2: HEAD /v1/constructs/:slug
 */
export async function constructExists(slug: string): Promise<boolean> {
  // Check cache
  const cacheKey = CACHE_KEYS.constructExists(slug);
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<boolean>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to read construct exists from cache');
    }
  }

  // Check packs first
  const [pack] = await db
    .select({ id: packs.id })
    .from(packs)
    .where(and(eq(packs.slug, slug), eq(packs.status, 'published')))
    .limit(1);

  if (pack) {
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(true), { ex: CACHE_TTL.constructExists });
      } catch (error) {
        logger.warn({ error, slug }, 'Failed to cache construct exists');
      }
    }
    return true;
  }

  // Check skills
  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(and(eq(skills.slug, slug), eq(skills.isPublic, true)))
    .limit(1);

  const exists = !!skill;

  if (isRedisConfigured()) {
    try {
      await getRedis().set(cacheKey, JSON.stringify(exists), { ex: CACHE_TTL.constructExists });
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to cache construct exists');
    }
  }

  return exists;
}

// --- Helper Functions ---

async function fetchSkillsAsConstructs(options: {
  query?: string;
  tier?: string;
  category?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number; queryTerms?: string[] }> {
  const conditions = [eq(skills.isPublic, true), eq(skills.isDeprecated, false)];

  if (options.maturity && options.maturity.length > 0) {
    conditions.push(inArray(skills.maturity, options.maturity));
  }

  if (options.tier) {
    conditions.push(eq(skills.tierRequired, options.tier as 'free' | 'pro' | 'team' | 'enterprise'));
  }

  if (options.category) {
    conditions.push(
      eq(
        skills.category,
        options.category as
          | 'development'
          | 'devops'
          | 'marketing'
          | 'sales'
          | 'support'
          | 'analytics'
          | 'security'
          | 'other'
      )
    );
  }

  // Extract query terms for relevance scoring
  const queryTerms = options.query
    ? options.query.split(/\s+/).filter(t => t.length > 0)
    : [];

  if (options.query) {
    const searchPattern = `%${options.query}%`;
    // Multi-field search: name, description, search_keywords, search_use_cases
    // @see prd.md §4.1 Enhanced Search API (cycle-007)
    // Use COALESCE to handle null arrays safely
    conditions.push(
      or(
        ilike(skills.name, searchPattern),
        ilike(skills.description, searchPattern),
        // Array overlap for keywords - use COALESCE to handle null arrays
        sql`EXISTS (SELECT 1 FROM unnest(COALESCE(${skills.searchKeywords}, '{}')) AS kw WHERE kw ILIKE ${searchPattern})`,
        // Array overlap for use cases - use COALESCE to handle null arrays
        sql`EXISTS (SELECT 1 FROM unnest(COALESCE(${skills.searchUseCases}, '{}')) AS uc WHERE uc ILIKE ${searchPattern})`
      ) ?? sql`true`
    );
  }

  // Featured filter - skills don't have featured flag, so return empty if featured=true
  if (options.featured) {
    return { items: [], count: 0 };
  }

  const whereClause = and(...conditions);

  const [skillsResult, countResult] = await Promise.all([
    db
      .select()
      .from(skills)
      .leftJoin(
        skillVersions,
        and(eq(skillVersions.skillId, skills.id), eq(skillVersions.isLatest, true))
      )
      .where(whereClause)
      .orderBy(desc(skills.downloads))
      .limit(options.limit)
      .offset(options.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(skills)
      .where(whereClause),
  ]);

  // Get owner info for each skill
  const items: Construct[] = [];
  for (const row of skillsResult) {
    const skill = row.skills;
    const version = row.skill_versions;
    const owner = await getOwnerInfo(skill.ownerId, skill.ownerType as 'user' | 'team');
    items.push(skillToConstruct(skill, version, owner, queryTerms.length > 0 ? queryTerms : undefined));
  }

  return {
    items,
    count: countResult[0]?.count ?? 0,
    queryTerms: queryTerms.length > 0 ? queryTerms : undefined,
  };
}

async function fetchPacksAsConstructs(options: {
  query?: string;
  tier?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number; queryTerms?: string[] }> {
  const conditions = [eq(packs.status, 'published')];

  if (options.maturity && options.maturity.length > 0) {
    conditions.push(inArray(packs.maturity, options.maturity));
  }

  if (options.tier) {
    conditions.push(eq(packs.tierRequired, options.tier as 'free' | 'pro' | 'team' | 'enterprise'));
  }

  if (options.featured) {
    conditions.push(eq(packs.isFeatured, true));
  }

  // Extract query terms for relevance scoring
  const queryTerms = options.query
    ? options.query.split(/\s+/).filter(t => t.length > 0)
    : [];

  if (options.query) {
    const searchPattern = `%${options.query}%`;
    // Multi-field search: name, description, search_keywords, search_use_cases
    // @see prd.md §4.1 Enhanced Search API (cycle-007)
    // Use COALESCE to handle null arrays safely
    conditions.push(
      or(
        ilike(packs.name, searchPattern),
        ilike(packs.description, searchPattern),
        // Array overlap for keywords - use COALESCE to handle null arrays
        sql`EXISTS (SELECT 1 FROM unnest(COALESCE(${packs.searchKeywords}, '{}')) AS kw WHERE kw ILIKE ${searchPattern})`,
        // Array overlap for use cases - use COALESCE to handle null arrays
        sql`EXISTS (SELECT 1 FROM unnest(COALESCE(${packs.searchUseCases}, '{}')) AS uc WHERE uc ILIKE ${searchPattern})`
      ) ?? sql`true`
    );
  }

  const whereClause = and(...conditions);

  const [packsResult, countResult] = await Promise.all([
    db
      .select()
      .from(packs)
      .leftJoin(
        packVersions,
        and(eq(packVersions.packId, packs.id), eq(packVersions.isLatest, true))
      )
      .where(whereClause)
      .orderBy(desc(packs.downloads))
      .limit(options.limit)
      .offset(options.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(packs)
      .where(whereClause),
  ]);

  // Get owner info for each pack
  const items: Construct[] = [];
  for (const row of packsResult) {
    const pack = row.packs;
    const version = row.pack_versions;
    const owner = await getOwnerInfo(pack.ownerId, pack.ownerType as 'user' | 'team');
    items.push(packToConstruct(pack, version, owner, queryTerms.length > 0 ? queryTerms : undefined));
  }

  return {
    items,
    count: countResult[0]?.count ?? 0,
    queryTerms: queryTerms.length > 0 ? queryTerms : undefined,
  };
}

async function fetchPackAsConstruct(slug: string): Promise<Construct | null> {
  const [result] = await db
    .select()
    .from(packs)
    .leftJoin(
      packVersions,
      and(eq(packVersions.packId, packs.id), eq(packVersions.isLatest, true))
    )
    .where(and(eq(packs.slug, slug), eq(packs.status, 'published')))
    .limit(1);

  if (!result) return null;

  const pack = result.packs;
  const version = result.pack_versions;
  const owner = await getOwnerInfo(pack.ownerId, pack.ownerType as 'user' | 'team');

  return packToConstruct(pack, version, owner);
}

async function fetchSkillAsConstruct(slug: string): Promise<Construct | null> {
  const [result] = await db
    .select()
    .from(skills)
    .leftJoin(
      skillVersions,
      and(eq(skillVersions.skillId, skills.id), eq(skillVersions.isLatest, true))
    )
    .where(and(eq(skills.slug, slug), eq(skills.isPublic, true)))
    .limit(1);

  if (!result) return null;

  const skill = result.skills;
  const version = result.skill_versions;
  const owner = await getOwnerInfo(skill.ownerId, skill.ownerType as 'user' | 'team');

  return skillToConstruct(skill, version, owner);
}

async function getOwnerInfo(
  ownerId: string | null | undefined,
  ownerType: 'user' | 'team' | null | undefined
): Promise<{ name: string; type: 'user' | 'team'; avatarUrl: string | null } | null> {
  // Handle null/undefined ownerId - can't look up owner without ID
  if (!ownerId) {
    return null;
  }

  // Handle null/undefined ownerType by defaulting to 'user'
  const effectiveOwnerType = ownerType || 'user';

  if (effectiveOwnerType === 'user') {
    const [user] = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);

    return user ? { name: user.name, type: 'user', avatarUrl: user.avatarUrl } : null;
  }

  const [team] = await db
    .select({ name: teams.name, avatarUrl: teams.avatarUrl })
    .from(teams)
    .where(eq(teams.id, ownerId))
    .limit(1);

  return team ? { name: team.name, type: 'team', avatarUrl: team.avatarUrl } : null;
}
