/**
 * Subscription Routes
 * @see sprint.md T3.2: Adapt Existing Checkout Code
 * @see sprint.md T3.5: Billing Portal
 * @see sdd.md §5.4 Subscription Endpoints
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { getStripe, isStripeConfigured, STRIPE_PRICE_IDS, getTierFromPriceId } from '../services/stripe.js';
import {
  getUserSubscription,
  getEffectiveTier,
  getOrCreateStripeCustomerId,
} from '../services/subscription.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

// --- Route Instance ---

export const subscriptionsRouter = new Hono();

// --- Schemas ---

const checkoutSchema = z.object({
  price_id: z.string().min(1, 'Price ID is required'),
  success_url: z.string().url('Valid success URL required'),
  cancel_url: z.string().url('Valid cancel URL required'),
});

// --- Helper Functions ---

/**
 * Get dashboard URL based on environment
 */
function getDashboardUrl(): string {
  return env.NODE_ENV === 'production' ? 'https://constructs.network' : 'http://localhost:3001';
}

// --- Routes ---

/**
 * GET /v1/subscriptions/current
 * Get user's current subscription status
 */
subscriptionsRouter.get('/current', requireAuth(), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');

  const effectiveTier = await getEffectiveTier(user.id);
  const personalSub = await getUserSubscription(user.id);

  logger.info({ request_id: requestId, userId: user.id, tier: effectiveTier.tier }, 'Subscription status retrieved');

  return c.json({
    effective_tier: effectiveTier.tier,
    tier_source: effectiveTier.source,
    expires_at: effectiveTier.expiresAt?.toISOString() ?? null,
    personal_subscription: personalSub
      ? {
          id: personalSub.id,
          tier: personalSub.tier,
          status: personalSub.status,
          current_period_end: personalSub.currentPeriodEnd?.toISOString() ?? null,
          cancel_at_period_end: personalSub.cancelAtPeriodEnd,
        }
      : null,
  });
});

/**
 * POST /v1/subscriptions/checkout
 * Create Stripe checkout session
 * @see sdd.md §5.4 POST /v1/subscriptions/checkout
 */
subscriptionsRouter.post('/checkout', requireAuth(), zValidator('json', checkoutSchema), async (c) => {
  if (!isStripeConfigured()) {
    throw Errors.ServiceUnavailable('Payment processing is not configured');
  }

  const user = c.get('user');
  const requestId = c.get('requestId');
  const { price_id, success_url, cancel_url } = c.req.valid('json');

  // Validate price ID is one of our known prices
  const tier = getTierFromPriceId(price_id);
  if (!tier) {
    throw Errors.BadRequest('Invalid price ID');
  }

  // Get user's email and name from database
  const userRecord = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (userRecord.length === 0) {
    throw Errors.NotFound('User not found');
  }

  const { email, name } = userRecord[0];

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomerId(user.id, email, name);

  // Create Stripe checkout session
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: price_id,
        quantity: 1,
      },
    ],
    success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url,
    metadata: {
      user_id: user.id,
      tier,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        tier,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  logger.info(
    { request_id: requestId, userId: user.id, tier, sessionId: session.id },
    'Checkout session created'
  );

  return c.json({
    checkout_url: session.url,
    session_id: session.id,
  });
});

/**
 * POST /v1/subscriptions/portal
 * Create Stripe billing portal session
 * @see sprint.md T3.5: Billing Portal
 */
subscriptionsRouter.post('/portal', requireAuth(), async (c) => {
  if (!isStripeConfigured()) {
    throw Errors.ServiceUnavailable('Payment processing is not configured');
  }

  const user = c.get('user');
  const requestId = c.get('requestId');

  // Get user's Stripe customer ID
  const userRecord = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (userRecord.length === 0 || !userRecord[0].stripeCustomerId) {
    throw Errors.BadRequest('No billing account found. Please subscribe first.');
  }

  const customerId = userRecord[0].stripeCustomerId;

  // Create portal session
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getDashboardUrl()}/billing`,
  });

  logger.info({ request_id: requestId, userId: user.id }, 'Billing portal session created');

  return c.json({
    portal_url: session.url,
  });
});

/**
 * GET /v1/subscriptions/prices
 * Get available subscription prices
 */
subscriptionsRouter.get('/prices', async (c) => {
  if (!isStripeConfigured()) {
    throw Errors.ServiceUnavailable('Payment processing is not configured');
  }

  const stripe = getStripe();

  // Get price details from Stripe
  const prices: Array<{
    id: string;
    tier: string;
    interval: string;
    amount: number | null;
    currency: string;
  }> = [];

  const priceIds = Object.entries(STRIPE_PRICE_IDS).filter(([_, id]) => id);

  for (const [key, priceId] of priceIds) {
    if (!priceId) continue;

    try {
      const price = await stripe.prices.retrieve(priceId);
      const tier = getTierFromPriceId(priceId) ?? 'unknown';
      const interval = key.includes('annual') ? 'year' : 'month';

      prices.push({
        id: priceId,
        tier,
        interval,
        amount: price.unit_amount,
        currency: price.currency,
      });
    } catch {
      logger.warn({ priceId, key }, 'Failed to retrieve price from Stripe');
    }
  }

  return c.json({ prices });
});
