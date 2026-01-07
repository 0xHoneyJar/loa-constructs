/**
 * Payouts Service
 * Calculates creator earnings and manages payouts.
 * @see sdd-pack-submission.md §8 Revenue Sharing Architecture
 * @see prd-pack-submission.md §4.4 Revenue Sharing
 */

import { db, packs, users, creatorPayouts } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import {
  getCreatorAttributions,
  getTotalAttributions,
} from './attributions.js';
import { logger } from '../lib/logger.js';

/**
 * Revenue sharing configuration
 */
const CREATOR_SHARE = 0.7; // 70%
const PLATFORM_SHARE = 0.3; // 30%

/**
 * Calculate earnings for a creator in a given period
 * Based on download attributions and subscription revenue
 */
export async function calculateCreatorEarnings(
  creatorId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  breakdown: Record<string, number>;
}> {
  try {
    // Get creator's attributions
    const attributions = await getCreatorAttributions(
      creatorId,
      periodStart,
      periodEnd
    );

    if (attributions.length === 0) {
      return {
        grossCents: 0,
        platformFeeCents: 0,
        netCents: 0,
        breakdown: {},
      };
    }

    // Get total attributions across all packs
    const totalAttributions = await getTotalAttributions(periodStart, periodEnd);

    if (totalAttributions === 0) {
      return {
        grossCents: 0,
        platformFeeCents: 0,
        netCents: 0,
        breakdown: {},
      };
    }

    // Get total subscription revenue for the period
    // SECURITY FIX (CRITICAL-2): Only count revenue from subscriptions that
    // actually downloaded packs. This prevents privacy leaks and ensures
    // correct revenue attribution.
    // @see auditor-sprint-feedback.md CRITICAL-2
    //
    // We use a subquery to get distinct subscriptions that have attributions,
    // then sum their tier values.
    const revenueQueryResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN s.tier = 'pro' THEN 2900
          WHEN s.tier = 'team' THEN 9900
          WHEN s.tier = 'enterprise' THEN 29900
          ELSE 0
        END
      ), 0)::int AS total_revenue_cents
      FROM subscriptions s
      WHERE s.status = 'active'
        AND s.id IN (
          SELECT DISTINCT subscription_id
          FROM pack_download_attributions
          WHERE subscription_id IS NOT NULL
            AND month >= ${periodStart}
            AND month <= ${periodEnd}
        )
    `);

    const revenueResult = revenueQueryResult.rows?.[0] as { total_revenue_cents: number } | undefined;
    const totalRevenueCents = revenueResult?.total_revenue_cents ?? 0;

    // Calculate creator's share based on their attribution percentage
    const breakdown: Record<string, number> = {};
    let totalGrossCents = 0;

    for (const attr of attributions) {
      const packSlug = attr.packSlug ?? 'unknown';
      const packAttributions = attr.attributions ?? 0;

      // Creator's share = (pack_downloads / total_downloads) * total_revenue * 70%
      const packSharePercent = packAttributions / totalAttributions;
      const packGrossCents = Math.floor(totalRevenueCents * packSharePercent);
      const packNetCents = Math.floor(packGrossCents * CREATOR_SHARE);

      breakdown[packSlug] = packNetCents;
      totalGrossCents += packGrossCents;
    }

    const platformFeeCents = Math.floor(totalGrossCents * PLATFORM_SHARE);
    const netCents = totalGrossCents - platformFeeCents;

    return {
      grossCents: totalGrossCents,
      platformFeeCents,
      netCents,
      breakdown,
    };
  } catch (error) {
    logger.error(
      { error, creatorId, periodStart, periodEnd },
      'Failed to calculate creator earnings'
    );
    throw error;
  }
}

/**
 * Get lifetime earnings for a creator
 */
export async function getLifetimeEarnings(creatorId: string) {
  try {
    const [result] = await db
      .select({
        totalNetCents: sql<number>`COALESCE(SUM(${creatorPayouts.amountCents}), 0)::int`,
        paidOutCents: sql<number>`
          COALESCE(
            SUM(CASE WHEN ${creatorPayouts.status} = 'completed' THEN ${creatorPayouts.amountCents} ELSE 0 END),
            0
          )::int
        `,
        pendingCents: sql<number>`
          COALESCE(
            SUM(CASE WHEN ${creatorPayouts.status} = 'pending' THEN ${creatorPayouts.amountCents} ELSE 0 END),
            0
          )::int
        `,
      })
      .from(creatorPayouts)
      .where(eq(creatorPayouts.userId, creatorId));

    return {
      totalNetCents: result?.totalNetCents ?? 0,
      paidOutCents: result?.paidOutCents ?? 0,
      pendingCents: result?.pendingCents ?? 0,
    };
  } catch (error) {
    logger.error(
      { error, creatorId },
      'Failed to get lifetime earnings'
    );
    throw error;
  }
}

/**
 * Create a payout record
 */
export async function createPayout(
  userId: string,
  amountCents: number,
  periodStart: Date,
  periodEnd: Date,
  breakdown: Record<string, number>,
  stripeTransferId?: string
) {
  try {
    const [payout] = await db
      .insert(creatorPayouts)
      .values({
        userId,
        amountCents,
        periodStart,
        periodEnd,
        breakdown,
        status: stripeTransferId ? 'completed' : 'pending',
        stripeTransferId,
        completedAt: stripeTransferId ? new Date() : null,
      })
      .returning();

    logger.info(
      {
        userId,
        payoutId: payout.id,
        amountCents,
        status: payout.status,
      },
      'Payout record created'
    );

    return payout;
  } catch (error) {
    logger.error(
      { error, userId, amountCents },
      'Failed to create payout record'
    );
    throw error;
  }
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  payoutId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  stripeTransferId?: string
) {
  try {
    await db
      .update(creatorPayouts)
      .set({
        status,
        stripeTransferId,
        completedAt: status === 'completed' ? new Date() : null,
      })
      .where(eq(creatorPayouts.id, payoutId));

    logger.info(
      { payoutId, status, stripeTransferId },
      'Payout status updated'
    );
  } catch (error) {
    logger.error(
      { error, payoutId, status },
      'Failed to update payout status'
    );
    throw error;
  }
}

/**
 * Get all creators with completed Stripe Connect onboarding
 */
export async function getCreatorsWithStripeConnect() {
  try {
    // Get all users with completed Stripe Connect who own at least one pack
    const creators = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        stripeConnectAccountId: users.stripeConnectAccountId,
        payoutThresholdCents: users.payoutThresholdCents,
      })
      .from(users)
      .innerJoin(packs, eq(packs.ownerId, users.id))
      .where(
        and(
          eq(users.stripeConnectOnboardingComplete, true),
          sql`${users.stripeConnectAccountId} IS NOT NULL`
        )
      )
      .groupBy(
        users.id,
        users.email,
        users.name,
        users.stripeConnectAccountId,
        users.payoutThresholdCents
      );

    return creators;
  } catch (error) {
    logger.error({ error }, 'Failed to get creators with Stripe Connect');
    throw error;
  }
}
