/**
 * Constructs Service
 * Unified aggregation layer for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §6 Service Layer Design
 */

import { eq, and, or, desc, sql, ilike, inArray } from 'drizzle-orm';
import semver from 'semver';
import {
  db,
  skills,
  packs,
  packVersions,
  skillVersions,
  users,
  teams,
  constructIdentities,
  constructVerifications,
} from '../db/index.js';
import { getRedis, isRedisConfigured, CACHE_KEYS, CACHE_TTL, getCacheVisibilityTier } from './redis.js';
import { normalizeCategory } from './category.js';
import { logger } from '../lib/logger.js';
import { getLatestPackVersion, canAccessPack, type PackAccessContext } from './packs.js';
import { getLatestVersion as getLatestSkillVersion } from './skills.js';
import type { ConstructManifest } from '../lib/manifest-validator.js';

// Re-export for consumers
export type { ConstructManifest };

// --- Types ---

export type ConstructType = 'skill' | 'pack' | 'bundle';

export type MaturityLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';

export type ConstructArchetype = 'skill-pack' | 'tool-pack' | 'codex' | 'template';

/** Canonical list of valid construct archetypes — single source of truth */
export const CONSTRUCT_ARCHETYPES: readonly ConstructArchetype[] = ['skill-pack', 'tool-pack', 'codex', 'template'] as const;

export interface Construct {
  id: string;
  type: ConstructType;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  shortDescription: string | null;
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
  sourceType: string | null;
  gitUrl: string | null;
  hasIdentity: boolean;
  identity: {
    cognitiveFrame: unknown;
    expertiseDomains: unknown;
    voiceConfig: unknown;
    modelPreferences: unknown;
  } | null;
  constructType: string;
  verificationTier: string;
  verifiedAt: Date | null;
  // Visibility (cycle-038)
  visibility: 'public' | 'internal' | 'unlisted';
  // Fork provenance (cycle-035)
  forkedFrom: { slug: string; name: string } | null;
  forkCount: number;
  // SKILL.md prose (cycle-035)
  skillProse: string | null;
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
  type?: ConstructType | ConstructArchetype;
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
  downloads: 0.1, // Reduced from 0.3 — download counts are gameable (cycle-035)
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
    icon: null, // Skills don't have icons
    description: skill.description,
    shortDescription: null, // Skills derive shortDescription from description in the frontend fallback chain
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
    sourceType: null,
    gitUrl: null,
    hasIdentity: false,
    identity: null,
    constructType: 'skill-pack',
    verificationTier: 'UNVERIFIED',
    verifiedAt: null,
    visibility: 'public',
    forkedFrom: null,
    forkCount: 0,
    skillProse: null,
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
  queryTerms?: string[],
  identityRow?: { cognitiveFrame: unknown; expertiseDomains: unknown; voiceConfig: unknown; modelPreferences: unknown } | null,
  verification?: { tier: string; verifiedAt: Date | null } | null
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
    icon: pack.icon || null,
    description: pack.description,
    shortDescription: pack.shortDescription || null,
    longDescription: pack.longDescription,
    version: version?.version || null,
    tierRequired: pack.tierRequired || 'free',
    category: pack.category || null,
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
    sourceType: pack.sourceType || null,
    gitUrl: pack.gitUrl || null,
    hasIdentity: !!identityRow,
    identity: identityRow
      ? {
          cognitiveFrame: identityRow.cognitiveFrame,
          expertiseDomains: identityRow.expertiseDomains,
          voiceConfig: identityRow.voiceConfig,
          modelPreferences: identityRow.modelPreferences,
        }
      : null,
    constructType: pack.constructType || 'skill-pack',
    verificationTier: verification?.tier ?? 'UNVERIFIED',
    verifiedAt: verification?.verifiedAt ?? null,
    visibility: (pack.visibility as 'public' | 'internal' | 'unlisted') ?? 'internal',
    // Fork provenance — populated by detail query, defaults for list
    forkedFrom: null,
    forkCount: 0,
    // SKILL.md prose
    skillProse: pack.skillProse ?? null,
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

/**
 * Build SQL visibility conditions for pack LIST/SEARCH queries (cycle-038)
 * Unlisted packs are EXCLUDED from listings — they're accessible via direct slug only.
 * - Anonymous: only 'public'
 * - Org member / admin: 'public' + 'internal'
 * - Authenticated non-member: 'public' only
 * (GPT review F2: unlisted must not appear in listings)
 */
function getVisibilityConditions(access?: PackAccessContext) {
  if (!access) {
    // Anonymous: public only
    return [eq(packs.visibility, 'public')];
  }
  if (access.isAdmin || access.isOrgMember) {
    // Org members and admins: public + internal (unlisted excluded from listings)
    return [or(eq(packs.visibility, 'public'), eq(packs.visibility, 'internal')) ?? sql`true`];
  }
  // Authenticated but not org member: public only
  return [eq(packs.visibility, 'public')];
}

// --- Core Functions ---

/**
 * List constructs (aggregates skills + packs)
 * @see prd-constructs-api.md FR-1.1: GET /v1/constructs
 */
export async function listConstructs(
  options: ListConstructsOptions = {},
  access?: PackAccessContext
): Promise<ListConstructsResult> {
  const { query, type, tier, category, featured, maturity, page = 1, limit = DEFAULT_PAGE_SIZE } = options;
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const offset = (Math.max(1, page) - 1) * pageSize;

  // Check cache for non-search queries — tier-segmented (cycle-038)
  const visTier = getCacheVisibilityTier(access);
  const maturityKey = maturity ? maturity.sort().join(',') : '';
  const cacheKey = !query
    ? CACHE_KEYS.constructList(`${visTier}:${type}:${tier}:${category}:${featured}:${maturityKey}:${page}:${pageSize}`)
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

  // Determine if this is an archetype filter (skill-pack, tool-pack, codex, template)
  const isArchetypeFilter = type && (CONSTRUCT_ARCHETYPES as readonly string[]).includes(type);

  // When type is specified, we can use direct pagination on that table
  // When type is NOT specified (mixed query), we must fetch enough from both
  // sources to correctly paginate the merged, sorted result
  const isMixedQuery = !type;

  // For mixed queries: fetch (page * pageSize) items from each source to ensure
  // correct global pagination after merge-sort. For filtered queries: use offset.
  // Apply MAX_MIXED_FETCH cap to prevent memory issues with large registries.
  const fetchLimit = isMixedQuery ? Math.min(page * pageSize, MAX_MIXED_FETCH) : pageSize;
  const fetchOffset = isMixedQuery ? 0 : offset;

  let skillsResult: { items: Construct[]; count: number; queryTerms?: string[] };
  let packsResult: { items: Construct[]; count: number; queryTerms?: string[] };

  if (isArchetypeFilter) {
    // Archetype filter: only query packs with matching construct_type
    skillsResult = { items: [], count: 0 };
    packsResult = await fetchPacksAsConstructs({
      query, tier, featured, maturity, constructType: type,
      limit: fetchLimit, offset: fetchOffset,
    }, access);
  } else {
    // Legacy behavior: skill/pack/bundle routing
    const skillsPromise =
      !type || type === 'skill'
        ? fetchSkillsAsConstructs({ query, tier, category, featured, maturity, limit: fetchLimit, offset: fetchOffset })
        : Promise.resolve({ items: [], count: 0 });

    const packsPromise =
      !type || type === 'pack'
        ? fetchPacksAsConstructs({ query, tier, featured, maturity, limit: fetchLimit, offset: fetchOffset }, access)
        : Promise.resolve({ items: [], count: 0 });

    [skillsResult, packsResult] = await Promise.all([skillsPromise, packsPromise]);
  }

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
export async function getConstructBySlug(slug: string, access?: PackAccessContext): Promise<Construct | null> {
  // Check cache — tier-segmented (cycle-038)
  // Skip cache for 'auth' tier: owner-specific internal access is too user-specific
  // to safely share. Caching under 'auth' would let non-owner authenticated users
  // see cached internal packs via cache poisoning. Only 'anon' and 'member' are safe
  // shared tiers. (GPT review FINDING-1)
  const visTier = getCacheVisibilityTier(access);
  const useCache = visTier !== 'auth';
  const cacheKey = CACHE_KEYS.constructDetail(`${visTier}:${slug}`);
  if (useCache && isRedisConfigured()) {
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
  const pack = await fetchPackAsConstruct(slug, access);
  if (pack) {
    if (useCache && isRedisConfigured()) {
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
    if (useCache && isRedisConfigured()) {
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
export async function getConstructsSummary(access?: PackAccessContext): Promise<{
  constructs: ConstructSummary[];
  total: number;
  last_updated: string;
}> {
  const visTier = getCacheVisibilityTier(access);
  const cacheKey = CACHE_KEYS.constructSummary(visTier);
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

  // Step 1: Fetch all published packs with visibility filtering (cycle-038)
  // @see sdd.md §3.1 Batch Optimization - avoids N+1 queries
  const visConditions = getVisibilityConditions(access);
  const packsData = await db
    .select({
      id: packs.id,
      slug: packs.slug,
      name: packs.name,
      tierRequired: packs.tierRequired,
    })
    .from(packs)
    .where(and(eq(packs.status, 'published'), ...visConditions));

  if (packsData.length === 0) {
    const emptyResult = {
      constructs: [],
      total: 0,
      last_updated: new Date().toISOString(),
    };
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(emptyResult), { ex: CACHE_TTL.constructSummary });
      } catch (error) {
        logger.warn({ error }, 'Failed to cache empty constructs summary');
      }
    }
    return emptyResult;
  }

  // Step 2: Batch fetch ALL versions for these packs (single query)
  const packIds = packsData.map(p => p.id);
  const allVersions = await db
    .select()
    .from(packVersions)
    .where(inArray(packVersions.packId, packIds));

  // Step 3: Group by packId, pick highest semver for each
  const latestByPack = new Map<string, typeof packVersions.$inferSelect>();
  for (const version of allVersions) {
    const current = latestByPack.get(version.packId);
    if (!current) {
      latestByPack.set(version.packId, version);
    } else {
      const currentSemver = semver.valid(current.version) || '0.0.0';
      const newSemver = semver.valid(version.version) || '0.0.0';
      if (semver.gt(newSemver, currentSemver)) {
        latestByPack.set(version.packId, version);
      }
    }
  }

  // Step 4: Build response
  const constructs: ConstructSummary[] = packsData.map((p) => {
    const latestVersion = latestByPack.get(p.id);
    const manifest = latestVersion?.manifest as ConstructManifest | null;
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
export async function constructExists(slug: string, access?: PackAccessContext): Promise<boolean> {
  // Check cache — tier-segmented (cycle-038)
  // Skip cache for 'auth' tier (same reasoning as getConstructBySlug)
  const visTier = getCacheVisibilityTier(access);
  const useCache = visTier !== 'auth';
  const cacheKey = CACHE_KEYS.constructExists(`${visTier}:${slug}`);
  if (useCache && isRedisConfigured()) {
    try {
      const cached = await getRedis().get<boolean>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to read construct exists from cache');
    }
  }

  // Check packs first — direct slug access uses canAccessPack (allows unlisted)
  // instead of getVisibilityConditions (which excludes unlisted from listings).
  // (GPT review F3)
  const [pack] = await db
    .select({
      id: packs.id,
      visibility: packs.visibility,
      ownerId: packs.ownerId,
      ownerType: packs.ownerType,
      status: packs.status,
    })
    .from(packs)
    .where(and(eq(packs.slug, slug), eq(packs.status, 'published')))
    .limit(1);

  if (pack && canAccessPack(pack, access)) {
    if (useCache && isRedisConfigured()) {
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

  if (useCache && isRedisConfigured()) {
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
    // Normalize legacy category slugs (e.g., gtm -> marketing)
    const normalizedCategory = normalizeCategory(options.category);
    conditions.push(
      eq(
        skills.category,
        normalizedCategory as
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

  try {
    // Remove isLatest JOIN - latest version resolved via batch semver comparison
    // @see sdd.md §3.2 - isLatest JOIN removal
    const [skillsResult, countResult] = await Promise.all([
      db
        .select()
        .from(skills)
        .where(whereClause)
        .orderBy(desc(skills.downloads))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(skills)
        .where(whereClause),
    ]);

    // No deduplication needed - query returns unique skills without version JOIN
    // Batch-fetch all related data to avoid N+1 queries (DATA-001)
    const skillIds = skillsResult.map(s => s.id);

    // Batch-fetch latest versions
    let skillVersionMap = new Map<string, typeof skillVersions.$inferSelect>();
    if (skillIds.length > 0) {
      try {
        const allVersions = await db
          .select()
          .from(skillVersions)
          .where(inArray(skillVersions.skillId, skillIds));
        for (const version of allVersions) {
          const current = skillVersionMap.get(version.skillId);
          if (!current) {
            skillVersionMap.set(version.skillId, version);
          } else {
            const currentSemver = semver.valid(current.version) || '0.0.0';
            const newSemver = semver.valid(version.version) || '0.0.0';
            if (semver.gt(newSemver, currentSemver)) {
              skillVersionMap.set(version.skillId, version);
            }
          }
        }
      } catch {
        // skillVersions query failed — fall back to empty map
      }
    }

    // Batch-fetch owner info
    const userOwnerIds = [...new Set(skillsResult.filter(s => (s.ownerType || 'user') === 'user' && s.ownerId).map(s => s.ownerId!))];
    const teamOwnerIds = [...new Set(skillsResult.filter(s => s.ownerType === 'team' && s.ownerId).map(s => s.ownerId!))];
    let skillOwnerMap = new Map<string, { name: string; type: 'user' | 'team'; avatarUrl: string | null }>();
    try {
      if (userOwnerIds.length > 0) {
        const userRows = await db
          .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.id, userOwnerIds));
        for (const u of userRows) {
          skillOwnerMap.set(u.id, { name: u.name, type: 'user', avatarUrl: u.avatarUrl });
        }
      }
      if (teamOwnerIds.length > 0) {
        const teamRows = await db
          .select({ id: teams.id, name: teams.name, avatarUrl: teams.avatarUrl })
          .from(teams)
          .where(inArray(teams.id, teamOwnerIds));
        for (const t of teamRows) {
          skillOwnerMap.set(t.id, { name: t.name, type: 'team', avatarUrl: t.avatarUrl });
        }
      }
    } catch {
      // owner query failed — fall back to null owners
    }

    const items: Construct[] = [];
    for (const skill of skillsResult) {
      const version = skillVersionMap.get(skill.id) ?? null;
      const owner = skill.ownerId ? (skillOwnerMap.get(skill.ownerId) ?? null) : null;
      items.push(skillToConstruct(skill, version, owner, queryTerms.length > 0 ? queryTerms : undefined));
    }

    return {
      items,
      count: countResult[0]?.count ?? 0,
      queryTerms: queryTerms.length > 0 ? queryTerms : undefined,
    };
  } catch (error) {
    logger.error({ error, context: 'fetchSkillsAsConstructs' }, 'Failed to fetch skills');
    // Return empty result on error instead of throwing
    return { items: [], count: 0 };
  }
}

async function fetchPacksAsConstructs(options: {
  query?: string;
  tier?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  constructType?: string;
  limit: number;
  offset: number;
}, access?: PackAccessContext): Promise<{ items: Construct[]; count: number; queryTerms?: string[] }> {
  const visConditions = getVisibilityConditions(access);
  const conditions = [eq(packs.status, 'published'), ...visConditions];

  if (options.constructType) {
    conditions.push(eq(packs.constructType, options.constructType));
  }

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

  try {
    // Remove isLatest JOIN - latest version resolved via batch semver comparison
    // @see sdd.md §3.3 - isLatest JOIN removal
    const [packsResult, countResult] = await Promise.all([
      db
        .select()
        .from(packs)
        .where(whereClause)
        .orderBy(desc(packs.downloads))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(packs)
        .where(whereClause),
    ]);

    // No deduplication needed - query returns unique packs without version JOIN
    // Batch-fetch all related data to avoid N+1 queries (DATA-001)
    const packIds = packsResult.map(p => p.id);

    // Batch-fetch identity rows
    let identityMap = new Map<string, { cognitiveFrame: unknown; expertiseDomains: unknown; voiceConfig: unknown; modelPreferences: unknown }>();
    if (packIds.length > 0) {
      try {
        const identityRows = await db
          .select({
            packId: constructIdentities.packId,
            cognitiveFrame: constructIdentities.cognitiveFrame,
            expertiseDomains: constructIdentities.expertiseDomains,
            voiceConfig: constructIdentities.voiceConfig,
            modelPreferences: constructIdentities.modelPreferences,
          })
          .from(constructIdentities)
          .where(inArray(constructIdentities.packId, packIds));
        for (const row of identityRows) {
          identityMap.set(row.packId, row);
        }
      } catch {
        // construct_identities table might not exist yet — fail gracefully
      }
    }

    // Batch-fetch verification tiers (DATA-002)
    let verificationMap = new Map<string, { tier: string; verifiedAt: Date | null }>();
    if (packIds.length > 0) {
      try {
        const verificationRows = await db
          .select({
            packId: constructVerifications.packId,
            verificationTier: constructVerifications.verificationTier,
            expiresAt: constructVerifications.expiresAt,
            createdAt: constructVerifications.createdAt,
          })
          .from(constructVerifications)
          .where(inArray(constructVerifications.packId, packIds))
          .orderBy(desc(constructVerifications.createdAt));
        // Keep only the latest non-expired verification per pack
        for (const row of verificationRows) {
          if (verificationMap.has(row.packId)) continue; // already have latest
          const expired = row.expiresAt ? new Date(row.expiresAt) < new Date() : false;
          verificationMap.set(row.packId, {
            tier: expired ? 'UNVERIFIED' : row.verificationTier,
            verifiedAt: expired ? null : row.createdAt,
          });
        }
      } catch {
        // construct_verifications table might not exist yet — fail gracefully
      }
    }

    // Batch-fetch latest versions (resolves N+1 on getLatestPackVersion)
    let versionMap = new Map<string, typeof packVersions.$inferSelect>();
    if (packIds.length > 0) {
      try {
        const allVersions = await db
          .select()
          .from(packVersions)
          .where(inArray(packVersions.packId, packIds));
        for (const version of allVersions) {
          const current = versionMap.get(version.packId);
          if (!current) {
            versionMap.set(version.packId, version);
          } else {
            const currentSemver = semver.valid(current.version) || '0.0.0';
            const newSemver = semver.valid(version.version) || '0.0.0';
            if (semver.gt(newSemver, currentSemver)) {
              versionMap.set(version.packId, version);
            }
          }
        }
      } catch {
        // packVersions query failed — fall back to empty map
      }
    }

    // Batch-fetch owner info (resolves N+1 on getOwnerInfo)
    const userOwnerIds = [...new Set(packsResult.filter(p => (p.ownerType || 'user') === 'user' && p.ownerId).map(p => p.ownerId!))];
    const teamOwnerIds = [...new Set(packsResult.filter(p => p.ownerType === 'team' && p.ownerId).map(p => p.ownerId!))];
    let ownerMap = new Map<string, { name: string; type: 'user' | 'team'; avatarUrl: string | null }>();
    try {
      if (userOwnerIds.length > 0) {
        const userRows = await db
          .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.id, userOwnerIds));
        for (const u of userRows) {
          ownerMap.set(u.id, { name: u.name, type: 'user', avatarUrl: u.avatarUrl });
        }
      }
      if (teamOwnerIds.length > 0) {
        const teamRows = await db
          .select({ id: teams.id, name: teams.name, avatarUrl: teams.avatarUrl })
          .from(teams)
          .where(inArray(teams.id, teamOwnerIds));
        for (const t of teamRows) {
          ownerMap.set(t.id, { name: t.name, type: 'team', avatarUrl: t.avatarUrl });
        }
      }
    } catch {
      // owner query failed — fall back to null owners
    }

    const items: Construct[] = [];
    for (const pack of packsResult) {
      const version = versionMap.get(pack.id) ?? null;
      const owner = pack.ownerId ? (ownerMap.get(pack.ownerId) ?? null) : null;
      const identityRow = identityMap.get(pack.id) ?? null;
      const verification = verificationMap.get(pack.id) ?? null;
      items.push(packToConstruct(pack, version, owner, queryTerms.length > 0 ? queryTerms : undefined, identityRow, verification));
    }

    return {
      items,
      count: countResult[0]?.count ?? 0,
      queryTerms: queryTerms.length > 0 ? queryTerms : undefined,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Re-throw structural DB errors (missing columns/tables) — these indicate
    // a schema migration gap, not a transient failure. Silent swallowing here
    // caused the registry to appear empty instead of surfacing the real error.
    if (errMsg.includes('column') || errMsg.includes('does not exist') || errMsg.includes('relation')) {
      logger.error({ error, context: 'fetchPacksAsConstructs' }, 'Schema error — missing migration?');
      // Re-throw as a generic error to avoid leaking schema details to the client
      throw new Error('Internal database configuration error');
    }
    logger.error({ error, context: 'fetchPacksAsConstructs' }, 'Failed to fetch packs');
    // Return empty result on transient errors (timeouts, connection issues)
    return { items: [], count: 0 };
  }
}

async function fetchPackAsConstruct(slug: string, access?: PackAccessContext): Promise<Construct | null> {
  try {
    const [pack] = await db
      .select()
      .from(packs)
      .where(and(eq(packs.slug, slug), eq(packs.status, 'published')))
      .limit(1);

    if (!pack) return null;

    // Visibility enforcement (cycle-038)
    if (!canAccessPack(pack, access)) return null;

    // Get the correct latest version using semver comparison
    const version = await getLatestPackVersion(pack.id);
    const owner = await getOwnerInfo(pack.ownerId, pack.ownerType as 'user' | 'team');

    // Fetch identity data if exists
    let identityRow: { cognitiveFrame: unknown; expertiseDomains: unknown; voiceConfig: unknown; modelPreferences: unknown } | null = null;
    try {
      const [identity] = await db
        .select({
          cognitiveFrame: constructIdentities.cognitiveFrame,
          expertiseDomains: constructIdentities.expertiseDomains,
          voiceConfig: constructIdentities.voiceConfig,
          modelPreferences: constructIdentities.modelPreferences,
        })
        .from(constructIdentities)
        .where(eq(constructIdentities.packId, pack.id))
        .limit(1);
      identityRow = identity || null;
    } catch {
      // Identity table might not exist yet — fail gracefully
    }

    // Fetch latest verification tier
    let verificationTier: string = 'UNVERIFIED';
    let verifiedAt: Date | null = null;
    try {
      const [latestVerification] = await db
        .select({
          verificationTier: constructVerifications.verificationTier,
          expiresAt: constructVerifications.expiresAt,
          createdAt: constructVerifications.createdAt,
        })
        .from(constructVerifications)
        .where(eq(constructVerifications.packId, pack.id))
        .orderBy(desc(constructVerifications.createdAt))
        .limit(1);
      if (latestVerification) {
        const expired = latestVerification.expiresAt
          ? new Date(latestVerification.expiresAt) < new Date()
          : false;
        verificationTier = expired ? 'UNVERIFIED' : latestVerification.verificationTier;
        verifiedAt = expired ? null : latestVerification.createdAt;
      }
    } catch {
      // construct_verifications table might not exist yet — fail gracefully
    }

    const construct = packToConstruct(pack, version, owner, undefined, identityRow);
    construct.verificationTier = verificationTier;
    construct.verifiedAt = verifiedAt;

    // Fork provenance — detail query only, with visibility redaction (cycle-038)
    if (pack.forkedFrom) {
      try {
        const [parent] = await db
          .select({ slug: packs.slug, name: packs.name, visibility: packs.visibility, ownerId: packs.ownerId, ownerType: packs.ownerType, status: packs.status })
          .from(packs)
          .where(eq(packs.id, pack.forkedFrom))
          .limit(1);
        if (parent && canAccessPack(parent, access)) {
          construct.forkedFrom = { slug: parent.slug, name: parent.name };
        }
      } catch {
        // forked_from column might not exist yet
      }
    }
    try {
      const [forkResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(packs)
        .where(eq(packs.forkedFrom, pack.id));
      construct.forkCount = forkResult?.count ?? 0;
    } catch {
      // forked_from column might not exist yet
    }

    return construct;
  } catch (error) {
    logger.error({ error, slug, context: 'fetchPackAsConstruct' }, 'Failed to fetch pack');
    return null;
  }
}

async function fetchSkillAsConstruct(slug: string): Promise<Construct | null> {
  try {
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.slug, slug), eq(skills.isPublic, true)))
      .limit(1);

    if (!skill) return null;

    // Get the correct latest version using semver comparison
    const version = await getLatestSkillVersion(skill.id);
    const owner = await getOwnerInfo(skill.ownerId, skill.ownerType as 'user' | 'team');

    return skillToConstruct(skill, version, owner);
  } catch (error) {
    logger.error({ error, slug, context: 'fetchSkillAsConstruct' }, 'Failed to fetch skill');
    return null;
  }
}

async function getOwnerInfo(
  ownerId: string | null | undefined,
  ownerType: 'user' | 'team' | null | undefined
): Promise<{ name: string; type: 'user' | 'team'; avatarUrl: string | null } | null> {
  // Handle null/undefined ownerId - can't look up owner without ID
  if (!ownerId) {
    return null;
  }

  try {
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
  } catch (error) {
    logger.error({ error, ownerId, ownerType, context: 'getOwnerInfo' }, 'Failed to fetch owner info');
    return null;
  }
}
