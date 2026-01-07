/**
 * Download Attribution Service
 * Tracks pack downloads for revenue attribution.
 * @see sdd-pack-submission.md §8 Revenue Sharing Architecture
 * @see prd-pack-submission.md §4.4 Revenue Sharing
 */

import { db, packDownloadAttributions, packs, subscriptions } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

/**
 * Track a pack download for revenue attribution
 * Only tracks premium packs (not free)
 * Uses upsert to prevent duplicates (one attribution per user per pack per month)
 */
export async function trackDownloadAttribution(
  packId: string,
  userId: string,
  versionId: string,
  action: string = 'install'
): Promise<void> {
  try {
    // Check if pack is premium (requires subscription)
    const [pack] = await db
      .select({ tierRequired: packs.tierRequired })
      .from(packs)
      .where(eq(packs.id, packId))
      .limit(1);

    // Only track premium packs
    if (!pack || pack.tierRequired === 'free') {
      return;
    }

    // Get user's active subscription
    const [subscription] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);

    // Calculate month (first day of current month)
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    // Upsert attribution (prevents duplicates)
    await db
      .insert(packDownloadAttributions)
      .values({
        packId,
        userId,
        subscriptionId: subscription?.id,
        versionId,
        action,
        downloadedAt: now,
        month,
      })
      .onConflictDoUpdate({
        target: [
          packDownloadAttributions.packId,
          packDownloadAttributions.userId,
          packDownloadAttributions.month,
        ],
        set: {
          downloadedAt: now,
          versionId,
          action,
        },
      });

    logger.info(
      {
        packId,
        userId,
        month: month.toISOString(),
        action,
      },
      'Download attribution tracked'
    );
  } catch (error) {
    // Don't fail the download if attribution tracking fails
    logger.error(
      {
        error,
        packId,
        userId,
      },
      'Failed to track download attribution'
    );
  }
}

/**
 * Get download attributions for a pack in a given period
 */
export async function getPackAttributions(
  packId: string,
  startMonth: Date,
  endMonth: Date
) {
  return await db
    .select({
      id: packDownloadAttributions.id,
      userId: packDownloadAttributions.userId,
      subscriptionId: packDownloadAttributions.subscriptionId,
      month: packDownloadAttributions.month,
      downloadedAt: packDownloadAttributions.downloadedAt,
      action: packDownloadAttributions.action,
    })
    .from(packDownloadAttributions)
    .where(
      and(
        eq(packDownloadAttributions.packId, packId),
        sql`${packDownloadAttributions.month} >= ${startMonth}`,
        sql`${packDownloadAttributions.month} <= ${endMonth}`
      )
    );
}

/**
 * Get download attributions for a creator (all their packs) in a given period
 */
export async function getCreatorAttributions(
  creatorId: string,
  startMonth: Date,
  endMonth: Date
) {
  return await db
    .select({
      packId: packDownloadAttributions.packId,
      packName: packs.name,
      packSlug: packs.slug,
      attributions: sql<number>`COUNT(*)::int`,
      month: packDownloadAttributions.month,
    })
    .from(packDownloadAttributions)
    .innerJoin(packs, eq(packs.id, packDownloadAttributions.packId))
    .where(
      and(
        eq(packs.ownerId, creatorId),
        sql`${packDownloadAttributions.month} >= ${startMonth}`,
        sql`${packDownloadAttributions.month} <= ${endMonth}`
      )
    )
    .groupBy(
      packDownloadAttributions.packId,
      packs.name,
      packs.slug,
      packDownloadAttributions.month
    );
}

/**
 * Get total attributions across all packs in a given period
 * Used to calculate revenue share percentage
 */
export async function getTotalAttributions(startMonth: Date, endMonth: Date) {
  const [result] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
    })
    .from(packDownloadAttributions)
    .where(
      and(
        sql`${packDownloadAttributions.month} >= ${startMonth}`,
        sql`${packDownloadAttributions.month} <= ${endMonth}`
      )
    );

  return result?.total ?? 0;
}
