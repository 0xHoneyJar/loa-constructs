/**
 * Analytics Service
 * @see sprint.md T10.1, T10.3, T10.6: Usage API, Creator API, Usage Aggregation
 * @see prd.md FR-7: Analytics & Reporting
 */

import { db, skills, skillUsage, skillVersions, teamMembers } from '../db/index.js';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';
import { getRedis, isRedisConfigured, CACHE_TTL } from './redis.js';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface UserUsageStats {
  totalInstalls: number;
  totalLoads: number;
  skillsUsed: number;
  periodStart: Date;
  periodEnd: Date;
  usageBySkill: SkillUsageBreakdown[];
  usageTrend: UsageTrendPoint[];
}

export interface SkillUsageBreakdown {
  skillId: string;
  skillName: string;
  skillSlug: string;
  installs: number;
  loads: number;
  lastUsedAt: Date | null;
}

export interface UsageTrendPoint {
  date: string; // YYYY-MM-DD
  installs: number;
  loads: number;
}

export interface CreatorStats {
  totalSkills: number;
  totalDownloads: number;
  totalActiveInstalls: number;
  averageRating: number;
  totalRatings: number;
  skills: CreatorSkillStats[];
}

export interface CreatorSkillStats {
  id: string;
  name: string;
  slug: string;
  downloads: number;
  activeInstalls: number;
  rating: number;
  ratingCount: number;
  tierRequired: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillAnalytics {
  skillId: string;
  totalDownloads: number;
  activeInstalls: number;
  downloadsThisMonth: number;
  downloadsLastMonth: number;
  downloadsByVersion: VersionDownloads[];
  downloadsTrend: UsageTrendPoint[];
  topLocations: LocationStat[];
}

export interface VersionDownloads {
  version: string;
  downloads: number;
  percentage: number;
}

export interface LocationStat {
  country: string;
  downloads: number;
  percentage: number;
}

// --- Cache Keys ---

const ANALYTICS_CACHE_KEYS = {
  userUsage: (userId: string, period: string) => `analytics:user:${userId}:${period}`,
  creatorStats: (userId: string) => `analytics:creator:${userId}`,
  skillAnalytics: (skillId: string) => `analytics:skill:${skillId}`,
};

// --- Helper Functions ---

/**
 * Get start of current month
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get start of last month
 */
function getLastMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

/**
 * Get end of last month
 */
function getLastMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
}

/**
 * Get last N days dates for trend data
 */
function getLastNDays(n: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// --- User Analytics ---

/**
 * Get user's skill usage statistics
 * @see sprint.md T10.1: Usage API
 */
export async function getUserUsageStats(
  userId: string,
  options: { periodDays?: number } = {}
): Promise<UserUsageStats> {
  const { periodDays = 30 } = options;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date();

  // Check cache
  const cacheKey = ANALYTICS_CACHE_KEYS.userUsage(userId, `${periodDays}d`);
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<UserUsageStats>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read user usage from cache');
    }
  }

  // Get usage counts by action
  const usageCounts = await db
    .select({
      action: skillUsage.action,
      count: sql<number>`count(*)::int`,
    })
    .from(skillUsage)
    .where(
      and(
        eq(skillUsage.userId, userId),
        gte(skillUsage.createdAt, periodStart),
        lte(skillUsage.createdAt, periodEnd)
      )
    )
    .groupBy(skillUsage.action);

  const totalInstalls = usageCounts.find((u) => u.action === 'install')?.count ?? 0;
  const totalLoads = usageCounts.find((u) => u.action === 'load')?.count ?? 0;

  // Get unique skills used
  const uniqueSkills = await db
    .select({ count: sql<number>`count(distinct ${skillUsage.skillId})::int` })
    .from(skillUsage)
    .where(
      and(
        eq(skillUsage.userId, userId),
        gte(skillUsage.createdAt, periodStart),
        lte(skillUsage.createdAt, periodEnd)
      )
    );

  // Get usage breakdown by skill
  const skillBreakdown = await db
    .select({
      skillId: skillUsage.skillId,
      skillName: skills.name,
      skillSlug: skills.slug,
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      loads: sql<number>`count(*) filter (where ${skillUsage.action} = 'load')::int`,
      lastUsedAt: sql<Date>`max(${skillUsage.createdAt})`,
    })
    .from(skillUsage)
    .innerJoin(skills, eq(skillUsage.skillId, skills.id))
    .where(
      and(
        eq(skillUsage.userId, userId),
        gte(skillUsage.createdAt, periodStart),
        lte(skillUsage.createdAt, periodEnd)
      )
    )
    .groupBy(skillUsage.skillId, skills.name, skills.slug)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Get usage trend (daily breakdown)
  const trendDays = Math.min(periodDays, 30);
  const dates = getLastNDays(trendDays);

  const trendData = await db
    .select({
      date: sql<string>`date_trunc('day', ${skillUsage.createdAt})::date::text`,
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      loads: sql<number>`count(*) filter (where ${skillUsage.action} = 'load')::int`,
    })
    .from(skillUsage)
    .where(
      and(
        eq(skillUsage.userId, userId),
        gte(skillUsage.createdAt, dates[0]),
        lte(skillUsage.createdAt, periodEnd)
      )
    )
    .groupBy(sql`date_trunc('day', ${skillUsage.createdAt})`)
    .orderBy(sql`date_trunc('day', ${skillUsage.createdAt})`);

  // Fill in missing dates with zeros
  const trendMap = new Map(trendData.map((t) => [t.date, t]));
  const usageTrend: UsageTrendPoint[] = dates.map((date) => {
    const dateStr = formatDate(date);
    const existing = trendMap.get(dateStr);
    return {
      date: dateStr,
      installs: existing?.installs ?? 0,
      loads: existing?.loads ?? 0,
    };
  });

  const result: UserUsageStats = {
    totalInstalls,
    totalLoads,
    skillsUsed: uniqueSkills[0]?.count ?? 0,
    periodStart,
    periodEnd,
    usageBySkill: skillBreakdown.map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      skillSlug: s.skillSlug,
      installs: s.installs,
      loads: s.loads,
      lastUsedAt: s.lastUsedAt,
    })),
    usageTrend,
  };

  // Cache result
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.skill }); // 5 min
    } catch (error) {
      logger.warn({ error }, 'Failed to cache user usage stats');
    }
  }

  return result;
}

// --- Creator Analytics ---

/**
 * Get creator's skills with stats
 * @see sprint.md T10.3: Creator API
 */
export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  // Check cache
  const cacheKey = ANALYTICS_CACHE_KEYS.creatorStats(userId);
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<CreatorStats>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read creator stats from cache');
    }
  }

  // Get user's skills (owned directly)
  const userSkills = await db
    .select()
    .from(skills)
    .where(and(eq(skills.ownerId, userId), eq(skills.ownerType, 'user')));

  // Get skills from teams user owns/admins
  const teamMemberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        sql`${teamMembers.role} in ('owner', 'admin')`
      )
    );

  const teamIds = teamMemberships.map((t) => t.teamId);

  let teamSkills: (typeof skills.$inferSelect)[] = [];
  if (teamIds.length > 0) {
    // SECURITY FIX (C-002): Use parameterized inArray instead of sql.raw()
    teamSkills = await db
      .select()
      .from(skills)
      .where(
        and(
          eq(skills.ownerType, 'team'),
          inArray(skills.ownerId, teamIds)
        )
      );
  }

  const allSkills = [...userSkills, ...teamSkills];

  if (allSkills.length === 0) {
    return {
      totalSkills: 0,
      totalDownloads: 0,
      totalActiveInstalls: 0,
      averageRating: 0,
      totalRatings: 0,
      skills: [],
    };
  }

  // Calculate aggregate stats
  let totalDownloads = 0;
  let totalRatingSum = 0;
  let totalRatingCount = 0;

  const skillIds = allSkills.map((s) => s.id);

  // Get active installs (installs - uninstalls) for each skill
  // SECURITY FIX (C-002): Use parameterized inArray instead of sql.raw()
  const installCounts = await db
    .select({
      skillId: skillUsage.skillId,
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      uninstalls: sql<number>`count(*) filter (where ${skillUsage.action} = 'uninstall')::int`,
    })
    .from(skillUsage)
    .where(inArray(skillUsage.skillId, skillIds))
    .groupBy(skillUsage.skillId);

  const installMap = new Map(installCounts.map((i) => [i.skillId, i]));

  const skillStats: CreatorSkillStats[] = allSkills.map((skill) => {
    const installs = installMap.get(skill.id);
    const activeInstalls = Math.max(0, (installs?.installs ?? 0) - (installs?.uninstalls ?? 0));

    totalDownloads += skill.downloads ?? 0;
    totalRatingSum += skill.ratingSum ?? 0;
    totalRatingCount += skill.ratingCount ?? 0;

    const rating =
      (skill.ratingCount ?? 0) > 0
        ? Math.round(((skill.ratingSum ?? 0) / (skill.ratingCount ?? 1)) * 10) / 10
        : 0;

    return {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      downloads: skill.downloads ?? 0,
      activeInstalls,
      rating,
      ratingCount: skill.ratingCount ?? 0,
      tierRequired: skill.tierRequired ?? 'free',
      createdAt: skill.createdAt ?? new Date(),
      updatedAt: skill.updatedAt ?? new Date(),
    };
  });

  // Sort by downloads
  skillStats.sort((a, b) => b.downloads - a.downloads);

  const totalActiveInstalls = skillStats.reduce((sum, s) => sum + s.activeInstalls, 0);
  const averageRating =
    totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : 0;

  const result: CreatorStats = {
    totalSkills: allSkills.length,
    totalDownloads,
    totalActiveInstalls,
    averageRating,
    totalRatings: totalRatingCount,
    skills: skillStats,
  };

  // Cache result
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.skill }); // 5 min
    } catch (error) {
      logger.warn({ error }, 'Failed to cache creator stats');
    }
  }

  return result;
}

/**
 * Get detailed analytics for a specific skill
 * @see sprint.md T10.3: Creator API
 */
export async function getSkillAnalytics(skillId: string): Promise<SkillAnalytics | null> {
  // Check cache
  const cacheKey = ANALYTICS_CACHE_KEYS.skillAnalytics(skillId);
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<SkillAnalytics>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read skill analytics from cache');
    }
  }

  // Verify skill exists
  const skill = await db
    .select()
    .from(skills)
    .where(eq(skills.id, skillId))
    .limit(1);

  if (skill.length === 0) {
    return null;
  }

  const monthStart = getMonthStart();
  const lastMonthStart = getLastMonthStart();
  const lastMonthEnd = getLastMonthEnd();

  // Get total downloads
  const totalDownloads = skill[0].downloads ?? 0;

  // Get active installs
  const installCounts = await db
    .select({
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      uninstalls: sql<number>`count(*) filter (where ${skillUsage.action} = 'uninstall')::int`,
    })
    .from(skillUsage)
    .where(eq(skillUsage.skillId, skillId));

  const activeInstalls = Math.max(
    0,
    (installCounts[0]?.installs ?? 0) - (installCounts[0]?.uninstalls ?? 0)
  );

  // Get downloads this month
  const thisMonthDownloads = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillUsage)
    .where(
      and(
        eq(skillUsage.skillId, skillId),
        eq(skillUsage.action, 'install'),
        gte(skillUsage.createdAt, monthStart)
      )
    );

  // Get downloads last month
  const lastMonthDownloads = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillUsage)
    .where(
      and(
        eq(skillUsage.skillId, skillId),
        eq(skillUsage.action, 'install'),
        gte(skillUsage.createdAt, lastMonthStart),
        lte(skillUsage.createdAt, lastMonthEnd)
      )
    );

  // Get downloads by version
  const versionDownloads = await db
    .select({
      versionId: skillUsage.versionId,
      version: skillVersions.version,
      downloads: sql<number>`count(*)::int`,
    })
    .from(skillUsage)
    .innerJoin(skillVersions, eq(skillUsage.versionId, skillVersions.id))
    .where(and(eq(skillUsage.skillId, skillId), eq(skillUsage.action, 'install')))
    .groupBy(skillUsage.versionId, skillVersions.version)
    .orderBy(desc(sql`count(*)`));

  const totalVersionDownloads = versionDownloads.reduce((sum, v) => sum + v.downloads, 0);
  const downloadsByVersion: VersionDownloads[] = versionDownloads.map((v) => ({
    version: v.version,
    downloads: v.downloads,
    percentage:
      totalVersionDownloads > 0 ? Math.round((v.downloads / totalVersionDownloads) * 1000) / 10 : 0,
  }));

  // Get downloads trend (last 30 days)
  const dates = getLastNDays(30);
  const trendData = await db
    .select({
      date: sql<string>`date_trunc('day', ${skillUsage.createdAt})::date::text`,
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      loads: sql<number>`count(*) filter (where ${skillUsage.action} = 'load')::int`,
    })
    .from(skillUsage)
    .where(and(eq(skillUsage.skillId, skillId), gte(skillUsage.createdAt, dates[0])))
    .groupBy(sql`date_trunc('day', ${skillUsage.createdAt})`)
    .orderBy(sql`date_trunc('day', ${skillUsage.createdAt})`);

  const trendMap = new Map(trendData.map((t) => [t.date, t]));
  const downloadsTrend: UsageTrendPoint[] = dates.map((date) => {
    const dateStr = formatDate(date);
    const existing = trendMap.get(dateStr);
    return {
      date: dateStr,
      installs: existing?.installs ?? 0,
      loads: existing?.loads ?? 0,
    };
  });

  // Top locations (placeholder - would need GeoIP data)
  // For now, return empty array
  const topLocations: LocationStat[] = [];

  const result: SkillAnalytics = {
    skillId,
    totalDownloads,
    activeInstalls,
    downloadsThisMonth: thisMonthDownloads[0]?.count ?? 0,
    downloadsLastMonth: lastMonthDownloads[0]?.count ?? 0,
    downloadsByVersion,
    downloadsTrend,
    topLocations,
  };

  // Cache result
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.skill }); // 5 min
    } catch (error) {
      logger.warn({ error }, 'Failed to cache skill analytics');
    }
  }

  return result;
}

// --- Aggregation ---

/**
 * Aggregate daily usage stats (for background job)
 * @see sprint.md T10.6: Usage Aggregation
 */
export async function aggregateDailyUsage(date: Date = new Date()): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  logger.info({ date: formatDate(dayStart) }, 'Starting daily usage aggregation');

  // Get aggregated stats for the day
  const dailyStats = await db
    .select({
      skillId: skillUsage.skillId,
      installs: sql<number>`count(*) filter (where ${skillUsage.action} = 'install')::int`,
      loads: sql<number>`count(*) filter (where ${skillUsage.action} = 'load')::int`,
      updates: sql<number>`count(*) filter (where ${skillUsage.action} = 'update')::int`,
      uninstalls: sql<number>`count(*) filter (where ${skillUsage.action} = 'uninstall')::int`,
      uniqueUsers: sql<number>`count(distinct ${skillUsage.userId})::int`,
    })
    .from(skillUsage)
    .where(and(gte(skillUsage.createdAt, dayStart), lte(skillUsage.createdAt, dayEnd)))
    .groupBy(skillUsage.skillId);

  logger.info(
    { date: formatDate(dayStart), skillsProcessed: dailyStats.length },
    'Daily usage aggregation complete'
  );

  // In a full implementation, we would store these in a daily_usage_stats table
  // For now, we just log the aggregation
}

/**
 * Invalidate analytics cache for a user
 */
export async function invalidateUserAnalyticsCache(userId: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = getRedis();
    const keys = [
      ANALYTICS_CACHE_KEYS.userUsage(userId, '7d'),
      ANALYTICS_CACHE_KEYS.userUsage(userId, '30d'),
      ANALYTICS_CACHE_KEYS.userUsage(userId, '90d'),
      ANALYTICS_CACHE_KEYS.creatorStats(userId),
    ];
    await Promise.all(keys.map((key) => redis.del(key)));
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to invalidate user analytics cache');
  }
}

/**
 * Invalidate analytics cache for a skill
 */
export async function invalidateSkillAnalyticsCache(skillId: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = getRedis();
    await redis.del(ANALYTICS_CACHE_KEYS.skillAnalytics(skillId));
  } catch (error) {
    logger.warn({ error, skillId }, 'Failed to invalidate skill analytics cache');
  }
}
