/**
 * Creator Routes
 * @see prd-pack-submission.md §4.2.5
 * @see sdd-pack-submission.md §4.2
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { apiRateLimiter, stripeConnectRateLimiter } from '../middleware/rate-limiter.js';
import { getCreatorPacks, getCreatorTotals } from '../services/creator.js';
import {
  createConnectAccountLink,
  getConnectDashboardLink,
} from '../services/stripe-connect.js';
import {
  calculateCreatorEarnings,
  getLifetimeEarnings,
} from '../services/payouts.js';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// --- Route Instance ---

export const creatorRouter = new Hono();

// Apply authentication and rate limiting to all creator routes
creatorRouter.use('*', requireAuth());
creatorRouter.use('*', apiRateLimiter());

// --- Endpoints ---

/**
 * GET /v1/creator/packs
 * List creator's packs with stats
 * @see prd-pack-submission.md §4.2.5
 * @see sprint.md T24.3
 */
creatorRouter.get('/packs', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  try {
    const packs = await getCreatorPacks(userId);
    const totals = await getCreatorTotals(userId);

    logger.info({ userId, packCount: packs.length, requestId }, 'Creator packs retrieved');

    return c.json({
      data: {
        packs: packs.map((p) => ({
          slug: p.slug,
          name: p.name,
          status: p.status,
          downloads: p.downloads ?? 0,
          revenue: {
            // v1.0: Placeholder - manual payouts
            // v1.1: Calculate from attributions
            total: 0,
            pending: 0,
            currency: 'USD',
          },
          latest_version: p.latestVersion,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        })),
        totals: {
          packs_count: totals.packCount,
          total_downloads: totals.totalDownloads,
          total_revenue: 0, // v1.1: Calculate from attributions
          pending_payout: 0, // v1.1: Calculate from attributions
        },
      },
      request_id: requestId,
    });
  } catch (error) {
    logger.error({ error, userId, requestId }, 'Failed to get creator packs');
    throw error;
  }
});

/**
 * GET /v1/creator/earnings
 * Get creator earnings summary
 * @see prd-pack-submission.md §4.4.3
 * @see sprint.md T24.4
 */
creatorRouter.get('/earnings', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  logger.info({ userId, requestId }, 'Creator earnings retrieved');

  try {
    // Get user's Stripe Connect status
    const [user] = await db
      .select({
        stripeConnectAccountId: users.stripeConnectAccountId,
        stripeConnectOnboardingComplete: users.stripeConnectOnboardingComplete,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let stripeConnectStatus = 'not_connected';
    if (user?.stripeConnectOnboardingComplete) {
      stripeConnectStatus = 'connected';
    } else if (user?.stripeConnectAccountId) {
      stripeConnectStatus = 'pending';
    }

    // Calculate current month earnings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonth = await calculateCreatorEarnings(userId, monthStart, monthEnd);
    const lifetime = await getLifetimeEarnings(userId);

    // Calculate next payout date (1st of next month)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextPayoutDate = stripeConnectStatus === 'connected' ? nextMonth.toISOString() : null;

    return c.json({
      data: {
        lifetime: {
          gross: lifetime.totalNetCents / 100, // Convert to dollars
          platform_fee: 0, // Platform fee already deducted
          net: lifetime.totalNetCents / 100,
          paid_out: lifetime.paidOutCents / 100,
          pending: lifetime.pendingCents / 100,
        },
        this_month: {
          gross: thisMonth.grossCents / 100,
          platform_fee: thisMonth.platformFeeCents / 100,
          net: thisMonth.netCents / 100,
        },
        payout_schedule: stripeConnectStatus === 'connected' ? 'monthly' : 'manual',
        next_payout_date: nextPayoutDate,
        stripe_connect_status: stripeConnectStatus,
      },
      request_id: requestId,
    });
  } catch (error) {
    logger.error({ error, userId, requestId }, 'Failed to calculate earnings');
    throw error;
  }
});

// --- Schemas ---

const connectStripeSchema = z.object({
  return_url: z.string().url().optional(),
  refresh_url: z.string().url().optional(),
});

/**
 * POST /v1/creator/connect-stripe
 * Start Stripe Connect onboarding flow
 * @see prd-pack-submission.md §4.4.1
 * @see sprint.md T25.5
 * @see auditor-sprint-feedback.md CRITICAL-1 (strict rate limiting)
 */
creatorRouter.post(
  '/connect-stripe',
  stripeConnectRateLimiter(),
  zValidator('json', connectStripeSchema),
  async (c) => {
    const userId = c.get('userId');
    const user = c.get('user');
    const requestId = c.get('requestId');
    const body = c.req.valid('json');

    try {
      // Default return URLs
      const dashboardUrl = 'https://constructs.network';
      const returnUrl = body.return_url || `${dashboardUrl}/creator/earnings`;
      const refreshUrl = body.refresh_url || `${dashboardUrl}/creator/earnings?refresh=1`;

      const { url, accountId } = await createConnectAccountLink(
        userId,
        user.email,
        returnUrl,
        refreshUrl
      );

      logger.info(
        { userId, accountId, requestId },
        'Created Stripe Connect onboarding link'
      );

      return c.json({
        data: {
          url,
          account_id: accountId,
        },
        request_id: requestId,
      });
    } catch (error) {
      logger.error({ error, userId, requestId }, 'Failed to start Stripe Connect onboarding');
      throw Errors.InternalError('Failed to start Stripe Connect onboarding');
    }
  }
);

/**
 * GET /v1/creator/stripe-dashboard
 * Get Stripe Connect Express dashboard link
 * @see prd-pack-submission.md §4.4.1
 */
creatorRouter.get('/stripe-dashboard', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  try {
    // Get user's Connect account
    const [user] = await db
      .select({
        stripeConnectAccountId: users.stripeConnectAccountId,
        stripeConnectOnboardingComplete: users.stripeConnectOnboardingComplete,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.stripeConnectAccountId) {
      throw Errors.BadRequest('Stripe Connect not set up');
    }

    if (!user.stripeConnectOnboardingComplete) {
      throw Errors.BadRequest('Stripe Connect onboarding not complete');
    }

    const dashboardUrl = await getConnectDashboardLink(user.stripeConnectAccountId);

    logger.info(
      { userId, accountId: user.stripeConnectAccountId, requestId },
      'Generated Stripe Connect dashboard link'
    );

    return c.json({
      data: {
        url: dashboardUrl,
      },
      request_id: requestId,
    });
  } catch (error) {
    logger.error({ error, userId, requestId }, 'Failed to get Stripe Connect dashboard link');
    throw error;
  }
});
