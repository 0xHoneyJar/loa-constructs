/**
 * Creator Service
 * @see prd-pack-submission.md §4.2.5
 * @see sdd-pack-submission.md §5.2
 */

import { db, packs, packVersions, users } from '../db/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface CreatorPack {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  downloads: number | null;
  tierRequired: string | null;
  pricingType: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  latestVersion: string | null;
}

export interface CreatorTotals {
  packCount: number;
  totalDownloads: number;
}

/**
 * Get all packs owned by creator with enriched data
 */
export async function getCreatorPacks(userId: string): Promise<CreatorPack[]> {
  try {
    // Get all packs owned by the user
    const creatorPacks = await db
      .select({
        id: packs.id,
        name: packs.name,
        slug: packs.slug,
        description: packs.description,
        status: packs.status,
        downloads: packs.downloads,
        tierRequired: packs.tierRequired,
        pricingType: packs.pricingType,
        createdAt: packs.createdAt,
        updatedAt: packs.updatedAt,
      })
      .from(packs)
      .where(eq(packs.ownerId, userId))
      .orderBy(desc(packs.updatedAt));

    // Enrich each pack with its latest version
    const enriched = await Promise.all(
      creatorPacks.map(async (pack) => {
        const [latestVersion] = await db
          .select({ version: packVersions.version })
          .from(packVersions)
          .where(eq(packVersions.packId, pack.id))
          .orderBy(desc(packVersions.publishedAt))
          .limit(1);

        return {
          ...pack,
          latestVersion: latestVersion?.version || null,
        };
      })
    );

    logger.debug({ userId, packCount: enriched.length }, 'Retrieved creator packs');

    return enriched;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get creator packs');
    throw error;
  }
}

/**
 * Get aggregated totals for a creator
 */
export async function getCreatorTotals(userId: string): Promise<CreatorTotals> {
  try {
    const [result] = await db
      .select({
        packCount: sql<number>`COUNT(*)::int`,
        totalDownloads: sql<number>`COALESCE(SUM(${packs.downloads}), 0)::int`,
      })
      .from(packs)
      .where(eq(packs.ownerId, userId));

    const totals = {
      packCount: result?.packCount ?? 0,
      totalDownloads: result?.totalDownloads ?? 0,
    };

    logger.debug({ userId, totals }, 'Retrieved creator totals');

    return totals;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get creator totals');
    throw error;
  }
}

// --- Public Creator Profile ---

export interface CreatorProfile {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  constructs: Array<{
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    downloads: number;
    ratingAvg: number | null;
    maturity: string | null;
    sourceType: string | null;
  }>;
  stats: {
    totalConstructs: number;
    totalDownloads: number;
    avgRating: number | null;
  };
}

/**
 * Get public creator profile by username (email prefix or name).
 * @see sprint.md T2.3: Creator Profile API
 */
export async function getCreatorProfile(username: string): Promise<CreatorProfile | null> {
  // Find user by name (case-insensitive)
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`lower(${users.name}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!user) return null;

  // Get published packs owned by this user
  const creatorPacks = await db
    .select({
      slug: packs.slug,
      name: packs.name,
      description: packs.description,
      icon: packs.icon,
      downloads: packs.downloads,
      ratingSum: packs.ratingSum,
      ratingCount: packs.ratingCount,
      maturity: packs.maturity,
      sourceType: packs.sourceType,
    })
    .from(packs)
    .where(
      and(
        eq(packs.ownerId, user.id),
        eq(packs.status, 'published')
      )
    )
    .orderBy(desc(packs.downloads));

  const totalDownloads = creatorPacks.reduce((sum, p) => sum + (p.downloads ?? 0), 0);
  const totalRatingSum = creatorPacks.reduce((sum, p) => sum + (p.ratingSum ?? 0), 0);
  const totalRatingCount = creatorPacks.reduce((sum, p) => sum + (p.ratingCount ?? 0), 0);

  return {
    username: user.name,
    displayName: user.name,
    avatarUrl: user.avatarUrl,
    joinedAt: user.createdAt?.toISOString() ?? null,
    constructs: creatorPacks.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      icon: p.icon,
      downloads: p.downloads ?? 0,
      ratingAvg:
        p.ratingCount && p.ratingCount > 0
          ? Math.round(((p.ratingSum ?? 0) / p.ratingCount) * 10) / 10
          : null,
      maturity: p.maturity,
      sourceType: p.sourceType,
    })),
    stats: {
      totalConstructs: creatorPacks.length,
      totalDownloads,
      avgRating:
        totalRatingCount > 0
          ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10
          : null,
    },
  };
}
