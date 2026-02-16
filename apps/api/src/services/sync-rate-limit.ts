/**
 * Sync Rate Limiting Service
 * @see sprint.md T1.8: Sync Rate Limiting Table
 *
 * DB-backed rate limiting for pack sync operations.
 * Shared between manual sync (T1.5) and webhook sync (T2.4).
 */

import { db, packSyncEvents } from '../db/index.js';
import { eq, and, gt, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

const MAX_SYNCS_PER_HOUR = 10;

/**
 * Check if a pack can be synced (rate limit check).
 * Returns true if under the limit, false if exceeded.
 */
export async function checkSyncRateLimit(packId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packSyncEvents)
    .where(
      and(
        eq(packSyncEvents.packId, packId),
        gt(packSyncEvents.createdAt, oneHourAgo)
      )
    );

  const count = result?.count ?? 0;

  if (count >= MAX_SYNCS_PER_HOUR) {
    logger.warn({ packId, count }, 'Sync rate limit exceeded');
    return false;
  }

  return true;
}

/**
 * Record a sync event for rate limiting.
 */
export async function recordSyncEvent(
  packId: string,
  triggerType: 'manual' | 'webhook'
): Promise<void> {
  await db.insert(packSyncEvents).values({
    packId,
    triggerType,
  });

  // Opportunistic cleanup: delete events older than 24 hours
  // Non-blocking, failure is non-critical
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db
    .delete(packSyncEvents)
    .where(
      and(
        eq(packSyncEvents.packId, packId),
        gt(sql`${oneDayAgo}`, packSyncEvents.createdAt)
      )
    )
    .catch((err) => {
      logger.warn({ err, packId }, 'Failed to cleanup old sync events');
    });
}
