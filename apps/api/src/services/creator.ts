/**
 * Creator Service
 * @see prd-pack-submission.md §4.2.5
 * @see sdd-pack-submission.md §5.2
 */

import { db, packs, packVersions } from '../db/index.js';
import { eq, desc, sql } from 'drizzle-orm';
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
