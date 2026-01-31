/**
 * Constructs Service
 * Unified aggregation layer for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §6 Service Layer Design
 */

import { eq, and, or, desc, sql, ilike } from 'drizzle-orm';
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
  createdAt: Date;
  updatedAt: Date;
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

// --- Helper Functions ---

function calculateRating(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount === 0) return null;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

/**
 * Convert skill to Construct format
 */
function skillToConstruct(
  skill: typeof skills.$inferSelect,
  version: typeof skillVersions.$inferSelect | null,
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null
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
    rating: calculateRating(skill.ratingSum || 0, skill.ratingCount || 0),
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
    createdAt: skill.createdAt || new Date(),
    updatedAt: skill.updatedAt || new Date(),
  };
}

/**
 * Convert pack to Construct format
 */
function packToConstruct(
  pack: typeof packs.$inferSelect,
  version: typeof packVersions.$inferSelect | null,
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null
): Construct {
  const manifest = version?.manifest as ConstructManifest | null;

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
    rating: calculateRating(pack.ratingSum || 0, pack.ratingCount || 0),
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
    createdAt: pack.createdAt || new Date(),
    updatedAt: pack.updatedAt || new Date(),
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
  const { query, type, tier, category, featured, page = 1, limit = DEFAULT_PAGE_SIZE } = options;
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const offset = (Math.max(1, page) - 1) * pageSize;

  // Check cache for non-search queries
  const cacheKey = !query
    ? CACHE_KEYS.constructList(`${type}:${tier}:${category}:${featured}:${page}:${pageSize}`)
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
  const fetchLimit = isMixedQuery ? page * pageSize : pageSize;
  const fetchOffset = isMixedQuery ? 0 : offset;

  // Fetch skills (if type not specified or type === 'skill')
  const skillsPromise =
    !type || type === 'skill'
      ? fetchSkillsAsConstructs({ query, tier, category, featured, limit: fetchLimit, offset: fetchOffset })
      : Promise.resolve({ items: [], count: 0 });

  // Fetch packs (if type not specified or type === 'pack')
  const packsPromise =
    !type || type === 'pack'
      ? fetchPacksAsConstructs({ query, tier, featured, limit: fetchLimit, offset: fetchOffset })
      : Promise.resolve({ items: [], count: 0 });

  const [skillsResult, packsResult] = await Promise.all([skillsPromise, packsPromise]);

  // Merge and sort by downloads
  let allConstructs = [...skillsResult.items, ...packsResult.items]
    .sort((a, b) => b.downloads - a.downloads);

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
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number }> {
  const conditions = [eq(skills.isPublic, true), eq(skills.isDeprecated, false)];

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

  if (options.query) {
    const searchPattern = `%${options.query}%`;
    conditions.push(
      or(ilike(skills.name, searchPattern), ilike(skills.description, searchPattern)) ?? sql`true`
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
    items.push(skillToConstruct(skill, version, owner));
  }

  return {
    items,
    count: countResult[0]?.count ?? 0,
  };
}

async function fetchPacksAsConstructs(options: {
  query?: string;
  tier?: string;
  featured?: boolean;
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number }> {
  const conditions = [eq(packs.status, 'published')];

  if (options.tier) {
    conditions.push(eq(packs.tierRequired, options.tier as 'free' | 'pro' | 'team' | 'enterprise'));
  }

  if (options.featured) {
    conditions.push(eq(packs.isFeatured, true));
  }

  if (options.query) {
    const searchPattern = `%${options.query}%`;
    conditions.push(
      or(ilike(packs.name, searchPattern), ilike(packs.description, searchPattern)) ?? sql`true`
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
    items.push(packToConstruct(pack, version, owner));
  }

  return {
    items,
    count: countResult[0]?.count ?? 0,
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
  ownerId: string,
  ownerType: 'user' | 'team'
): Promise<{ name: string; type: 'user' | 'team'; avatarUrl: string | null } | null> {
  if (ownerType === 'user') {
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
