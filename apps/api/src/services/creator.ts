/**
 * Creator Service
 * @see prd-pack-submission.md §4.2.5
 * @see sdd-pack-submission.md §5.2
 */

import { db, packs, packVersions, users, constructIdentities } from '../db/index.js';
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

export interface TrustSignal {
  maturityBadge: string;
  downloadCount: number;
  hasIdentity: boolean;
  hasRating: boolean;
  score: number; // 0-100, computed from signals
}

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
    trustSignals: TrustSignal;
  }>;
  stats: {
    totalConstructs: number;
    totalDownloads: number;
    avgRating: number | null;
    reputationScore: number; // 0-100
  };
}

/**
 * Compute trust score for a single construct (0-100).
 * Weighted: maturity (40), downloads (25), identity (20), rating (15).
 */
function computeTrustScore(opts: {
  maturity: string | null;
  downloads: number;
  hasIdentity: boolean;
  hasRating: boolean;
}): number {
  let score = 0;

  // Maturity (40 pts)
  switch (opts.maturity) {
    case 'stable': score += 40; break;
    case 'beta': score += 25; break;
    case 'experimental': score += 10; break;
    default: score += 5; break;
  }

  // Downloads (25 pts) — logarithmic scale, cap at 10k
  if (opts.downloads > 0) {
    const dlScore = Math.min(Math.log10(opts.downloads) / Math.log10(10000), 1);
    score += Math.round(dlScore * 25);
  }

  // Identity (20 pts)
  if (opts.hasIdentity) score += 20;

  // Rating (15 pts)
  if (opts.hasRating) score += 15;

  return Math.min(score, 100);
}

/**
 * Compute creator reputation score (0-100).
 * Weighted average of construct trust scores + tenure bonus.
 */
function computeReputationScore(
  trustScores: number[],
  joinedAt: Date | null
): number {
  if (trustScores.length === 0) return 0;

  // Average trust score across constructs (80% weight)
  const avgTrust = trustScores.reduce((a, b) => a + b, 0) / trustScores.length;

  // Tenure bonus: up to 20 pts for 1+ year (20% weight)
  let tenureBonus = 0;
  if (joinedAt) {
    const monthsActive = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    tenureBonus = Math.min(Math.round((monthsActive / 12) * 20), 20);
  }

  return Math.min(Math.round(avgTrust * 0.8 + tenureBonus), 100);
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

  // Check which packs have identity data
  const packIds = creatorPacks.map((p) => p.slug);
  let identityPackIds = new Set<string>();
  if (creatorPacks.length > 0) {
    try {
      // Query identity existence for all creator packs in one query
      const identityRows = await db
        .select({ slug: packs.slug })
        .from(constructIdentities)
        .innerJoin(packs, eq(packs.id, constructIdentities.packId))
        .where(and(eq(packs.ownerId, user.id), eq(packs.ownerType, 'user')));
      identityPackIds = new Set(identityRows.map((r) => r.slug));
    } catch {
      // Identity table might not exist yet
    }
  }

  const totalDownloads = creatorPacks.reduce((sum, p) => sum + (p.downloads ?? 0), 0);
  const totalRatingSum = creatorPacks.reduce((sum, p) => sum + (p.ratingSum ?? 0), 0);
  const totalRatingCount = creatorPacks.reduce((sum, p) => sum + (p.ratingCount ?? 0), 0);

  const trustScores: number[] = [];

  const constructs = creatorPacks.map((p) => {
    const downloads = p.downloads ?? 0;
    const hasIdentity = identityPackIds.has(p.slug);
    const hasRating = (p.ratingCount ?? 0) > 0;
    const score = computeTrustScore({
      maturity: p.maturity,
      downloads,
      hasIdentity,
      hasRating,
    });
    trustScores.push(score);

    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      icon: p.icon,
      downloads,
      ratingAvg:
        p.ratingCount && p.ratingCount > 0
          ? Math.round(((p.ratingSum ?? 0) / p.ratingCount) * 10) / 10
          : null,
      maturity: p.maturity,
      sourceType: p.sourceType,
      trustSignals: {
        maturityBadge: p.maturity ?? 'experimental',
        downloadCount: downloads,
        hasIdentity,
        hasRating,
        score,
      },
    };
  });

  return {
    username: user.name,
    displayName: user.name,
    avatarUrl: user.avatarUrl,
    joinedAt: user.createdAt?.toISOString() ?? null,
    constructs,
    stats: {
      totalConstructs: creatorPacks.length,
      totalDownloads,
      avgRating:
        totalRatingCount > 0
          ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10
          : null,
      reputationScore: computeReputationScore(trustScores, user.createdAt),
    },
  };
}
