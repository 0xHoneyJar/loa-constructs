/**
 * Skills Service
 * @see sprint.md T4.2, T4.4, T4.5: Skill Routes, Search, Usage Tracking
 * @see sdd.md §3.2 Entity: Skills, Skill Versions, Skill Files, Skill Usage
 */

import { db, skills, skillVersions, skillFiles, skillUsage, users, teams } from '../db/index.js';
import { eq, and, or, desc, asc, sql, ilike } from 'drizzle-orm';
import { getRedis, isRedisConfigured, CACHE_KEYS, CACHE_TTL } from './redis.js';
import { logger } from '../lib/logger.js';
import { type SubscriptionTier } from './subscription.js';

// --- Types ---

export type SkillCategory =
  | 'development'
  | 'devops'
  | 'marketing'
  | 'sales'
  | 'support'
  | 'analytics'
  | 'security'
  | 'other';

export type OwnerType = 'user' | 'team';

export type UsageAction = 'install' | 'update' | 'load' | 'uninstall';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  longDescription: string | null;
  category: SkillCategory;
  tags: string[];
  ownerId: string;
  ownerType: OwnerType;
  tierRequired: SubscriptionTier;
  isPublic: boolean;
  isDeprecated: boolean;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  downloads: number;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  version: string;
  changelog: string | null;
  minLoaVersion: string | null;
  isLatest: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface SkillFile {
  id: string;
  versionId: string;
  path: string;
  contentHash: string;
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface SkillListOptions {
  query?: string;
  category?: SkillCategory;
  tier?: SubscriptionTier;
  tags?: string[];
  sortBy?: 'downloads' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeDeprecated?: boolean;
}

export interface SkillListResult {
  skills: Skill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Constants ---

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// --- Helper Functions ---

/**
 * Calculate average rating
 */
function calculateRating(ratingSum: number, ratingCount: number): number {
  if (ratingCount === 0) return 0;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

/**
 * Map database skill to API skill type
 */
function mapSkill(row: typeof skills.$inferSelect): Skill {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    longDescription: row.longDescription,
    category: row.category as SkillCategory,
    tags: (row.tags ?? []) as string[],
    ownerId: row.ownerId,
    ownerType: row.ownerType as OwnerType,
    tierRequired: row.tierRequired as SubscriptionTier,
    isPublic: row.isPublic ?? true,
    isDeprecated: row.isDeprecated ?? false,
    repositoryUrl: row.repositoryUrl,
    documentationUrl: row.documentationUrl,
    downloads: row.downloads ?? 0,
    rating: calculateRating(row.ratingSum ?? 0, row.ratingCount ?? 0),
    ratingCount: row.ratingCount ?? 0,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

// --- Core Functions ---

/**
 * List skills with search, filter, and pagination
 * @see sprint.md T4.4: Search Implementation
 */
export async function listSkills(options: SkillListOptions = {}): Promise<SkillListResult> {
  const {
    query,
    category,
    tier,
    tags,
    sortBy = 'downloads',
    sortOrder = 'desc',
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    includeDeprecated = false,
  } = options;

  // Clamp page size
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const offset = (Math.max(1, page) - 1) * pageSize;

  // Check cache (only for common queries without text search)
  const cacheKey = !query
    ? CACHE_KEYS.skillList(`${category}:${tier}:${sortBy}:${sortOrder}:${page}:${pageSize}`)
    : null;

  if (cacheKey && isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<SkillListResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read skills from cache');
    }
  }

  // Build conditions
  const conditions = [eq(skills.isPublic, true)];

  if (!includeDeprecated) {
    conditions.push(eq(skills.isDeprecated, false));
  }

  if (category) {
    conditions.push(eq(skills.category, category));
  }

  if (tier) {
    conditions.push(eq(skills.tierRequired, tier));
  }

  if (tags && tags.length > 0) {
    // Check if skill has any of the specified tags
    conditions.push(sql`${skills.tags} && ${sql.raw(`ARRAY[${tags.map((t) => `'${t}'`).join(',')}]::text[]`)}`);
  }

  if (query) {
    // Full-text search on name and description
    const searchPattern = `%${query}%`;
    conditions.push(
      or(ilike(skills.name, searchPattern), ilike(skills.description, searchPattern)) ?? sql`true`
    );
  }

  // Build sort
  let orderBy;
  const direction = sortOrder === 'asc' ? asc : desc;
  switch (sortBy) {
    case 'downloads':
      orderBy = direction(skills.downloads);
      break;
    case 'rating':
      orderBy = direction(skills.ratingSum);
      break;
    case 'newest':
      orderBy = direction(skills.createdAt);
      break;
    case 'name':
      orderBy = direction(skills.name);
      break;
    default:
      orderBy = desc(skills.downloads);
  }

  // Execute query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [skillsResult, countResult] = await Promise.all([
    db
      .select()
      .from(skills)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(skills)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  const result: SkillListResult = {
    skills: skillsResult.map(mapSkill),
    total,
    page,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };

  // Cache result
  if (cacheKey && isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.skillList });
    } catch (error) {
      logger.warn({ error }, 'Failed to cache skills list');
    }
  }

  return result;
}

/**
 * Get skill by slug
 */
export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  // Check cache
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<Skill>(CACHE_KEYS.skill(slug));
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to read skill from cache');
    }
  }

  const result = await db
    .select()
    .from(skills)
    .where(eq(skills.slug, slug))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const skill = mapSkill(result[0]);

  // Cache result
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(CACHE_KEYS.skill(slug), JSON.stringify(skill), { ex: CACHE_TTL.skill });
    } catch (error) {
      logger.warn({ error, slug }, 'Failed to cache skill');
    }
  }

  return skill;
}

/**
 * Get skill by ID
 */
export async function getSkillById(id: string): Promise<Skill | null> {
  const result = await db
    .select()
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapSkill(result[0]);
}

/**
 * Create a new skill
 */
export async function createSkill(data: {
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  category?: SkillCategory;
  tags?: string[];
  ownerId: string;
  ownerType: OwnerType;
  tierRequired?: SubscriptionTier;
  isPublic?: boolean;
  repositoryUrl?: string;
  documentationUrl?: string;
}): Promise<Skill> {
  const result = await db
    .insert(skills)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      longDescription: data.longDescription ?? null,
      category: data.category ?? 'other',
      tags: data.tags ?? [],
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      tierRequired: data.tierRequired ?? 'free',
      isPublic: data.isPublic ?? true,
      repositoryUrl: data.repositoryUrl ?? null,
      documentationUrl: data.documentationUrl ?? null,
    })
    .returning();

  logger.info({ skillId: result[0].id, slug: data.slug }, 'Skill created');
  return mapSkill(result[0]);
}

/**
 * Update a skill
 */
export async function updateSkill(
  id: string,
  data: {
    name?: string;
    description?: string;
    longDescription?: string;
    category?: SkillCategory;
    tags?: string[];
    tierRequired?: SubscriptionTier;
    isPublic?: boolean;
    isDeprecated?: boolean;
    repositoryUrl?: string;
    documentationUrl?: string;
  }
): Promise<Skill | null> {
  const result = await db
    .update(skills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, id))
    .returning();

  if (result.length === 0) {
    return null;
  }

  // Invalidate cache
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.del(CACHE_KEYS.skill(result[0].slug));
    } catch (error) {
      logger.warn({ error, id }, 'Failed to invalidate skill cache');
    }
  }

  logger.info({ skillId: id }, 'Skill updated');
  return mapSkill(result[0]);
}

/**
 * Get skill versions
 */
export async function getSkillVersions(skillId: string): Promise<SkillVersion[]> {
  const result = await db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .orderBy(desc(skillVersions.createdAt));

  return result.map((v) => ({
    id: v.id,
    skillId: v.skillId,
    version: v.version,
    changelog: v.changelog,
    minLoaVersion: v.minLoaVersion,
    isLatest: v.isLatest ?? false,
    publishedAt: v.publishedAt,
    createdAt: v.createdAt ?? new Date(),
  }));
}

/**
 * Get latest version of a skill
 */
export async function getLatestVersion(skillId: string): Promise<SkillVersion | null> {
  const result = await db
    .select()
    .from(skillVersions)
    .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.isLatest, true)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const v = result[0];
  return {
    id: v.id,
    skillId: v.skillId,
    version: v.version,
    changelog: v.changelog,
    minLoaVersion: v.minLoaVersion,
    isLatest: v.isLatest ?? false,
    publishedAt: v.publishedAt,
    createdAt: v.createdAt ?? new Date(),
  };
}

/**
 * Get specific version of a skill
 */
export async function getSkillVersion(skillId: string, version: string): Promise<SkillVersion | null> {
  const result = await db
    .select()
    .from(skillVersions)
    .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.version, version)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const v = result[0];
  return {
    id: v.id,
    skillId: v.skillId,
    version: v.version,
    changelog: v.changelog,
    minLoaVersion: v.minLoaVersion,
    isLatest: v.isLatest ?? false,
    publishedAt: v.publishedAt,
    createdAt: v.createdAt ?? new Date(),
  };
}

/**
 * Create a new skill version
 */
export async function createSkillVersion(data: {
  skillId: string;
  version: string;
  changelog?: string;
  minLoaVersion?: string;
}): Promise<SkillVersion> {
  // Mark all existing versions as not latest
  await db
    .update(skillVersions)
    .set({ isLatest: false })
    .where(eq(skillVersions.skillId, data.skillId));

  // Create new version
  const result = await db
    .insert(skillVersions)
    .values({
      skillId: data.skillId,
      version: data.version,
      changelog: data.changelog ?? null,
      minLoaVersion: data.minLoaVersion ?? null,
      isLatest: true,
      publishedAt: new Date(),
    })
    .returning();

  logger.info({ skillId: data.skillId, version: data.version }, 'Skill version created');

  const v = result[0];
  return {
    id: v.id,
    skillId: v.skillId,
    version: v.version,
    changelog: v.changelog,
    minLoaVersion: v.minLoaVersion,
    isLatest: v.isLatest ?? false,
    publishedAt: v.publishedAt,
    createdAt: v.createdAt ?? new Date(),
  };
}

/**
 * Get files for a skill version
 */
export async function getVersionFiles(versionId: string): Promise<SkillFile[]> {
  const result = await db
    .select()
    .from(skillFiles)
    .where(eq(skillFiles.versionId, versionId));

  return result.map((f) => ({
    id: f.id,
    versionId: f.versionId,
    path: f.path,
    contentHash: f.contentHash,
    storageKey: f.storageKey,
    sizeBytes: f.sizeBytes,
    mimeType: f.mimeType ?? 'text/plain',
  }));
}

/**
 * Add file to skill version
 */
export async function addVersionFile(data: {
  versionId: string;
  path: string;
  contentHash: string;
  storageKey: string;
  sizeBytes: number;
  mimeType?: string;
}): Promise<SkillFile> {
  const result = await db
    .insert(skillFiles)
    .values({
      versionId: data.versionId,
      path: data.path,
      contentHash: data.contentHash,
      storageKey: data.storageKey,
      sizeBytes: data.sizeBytes,
      mimeType: data.mimeType ?? 'text/plain',
    })
    .returning();

  const f = result[0];
  return {
    id: f.id,
    versionId: f.versionId,
    path: f.path,
    contentHash: f.contentHash,
    storageKey: f.storageKey,
    sizeBytes: f.sizeBytes,
    mimeType: f.mimeType ?? 'text/plain',
  };
}

/**
 * Record skill usage
 * @see sprint.md T4.5: Usage Tracking
 */
export async function trackUsage(data: {
  skillId: string;
  userId?: string;
  teamId?: string;
  versionId?: string;
  action: UsageAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(skillUsage).values({
    skillId: data.skillId,
    userId: data.userId ?? null,
    teamId: data.teamId ?? null,
    versionId: data.versionId ?? null,
    action: data.action,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
    metadata: data.metadata ?? {},
  });

  // Increment download counter if action is install
  if (data.action === 'install') {
    await db
      .update(skills)
      .set({
        downloads: sql`${skills.downloads} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, data.skillId));

    // Invalidate cache
    const skill = await getSkillById(data.skillId);
    if (skill && isRedisConfigured()) {
      try {
        const redis = getRedis();
        await redis.del(CACHE_KEYS.skill(skill.slug));
      } catch (error) {
        logger.warn({ error, skillId: data.skillId }, 'Failed to invalidate skill cache after download');
      }
    }
  }

  logger.debug({ skillId: data.skillId, action: data.action, userId: data.userId }, 'Usage tracked');
}

/**
 * Check if user owns a skill
 */
export async function isSkillOwner(skillId: string, userId: string): Promise<boolean> {
  const skill = await getSkillById(skillId);
  if (!skill) return false;

  if (skill.ownerType === 'user') {
    return skill.ownerId === userId;
  }

  // Check if user is team owner or admin
  const teamMember = await db.query.teamMembers.findFirst({
    where: (tm, { eq, and }) =>
      and(eq(tm.teamId, skill.ownerId), eq(tm.userId, userId)),
  });

  if (!teamMember) return false;

  return ['owner', 'admin'].includes(teamMember.role ?? '');
}

/**
 * Get owner info for a skill
 */
export async function getSkillOwner(skill: Skill): Promise<{ name: string; avatarUrl: string | null } | null> {
  if (skill.ownerType === 'user') {
    const user = await db
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, skill.ownerId))
      .limit(1);

    return user.length > 0 ? user[0] : null;
  }

  const team = await db
    .select({ name: teams.name, avatarUrl: teams.avatarUrl })
    .from(teams)
    .where(eq(teams.id, skill.ownerId))
    .limit(1);

  return team.length > 0 ? team[0] : null;
}
