/**
 * Webhook Routes
 * @see sprint.md T3.3: Adapt Existing Webhook Code
 * @see sdd.md §5.4 POST /v1/webhooks/stripe
 */

import { Hono } from 'hono';
import type Stripe from 'stripe';
import { verifyWebhookSignature, getStripe, getTierFromPriceId } from '../services/stripe.js';
import {
  createSubscription,
  updateSubscription,
  getSubscriptionByStripeId,
  type SubscriptionTier,
  type SubscriptionStatus,
} from '../services/subscription.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// --- Route Instance ---

export const webhooksRouter = new Hono();

// --- Types ---

interface WebhookMetadata {
  user_id?: string;
  tier?: string;
}

// --- Handler Functions ---

/**
 * Handle checkout.session.completed event
 * Creates subscription after successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata as WebhookMetadata;
  const userId = metadata?.user_id;

  if (!userId) {
    logger.warn({ sessionId: session.id }, 'Checkout session missing user_id metadata');
    return;
  }

  // Get the subscription from Stripe
  if (!session.subscription) {
    logger.warn({ sessionId: session.id }, 'Checkout session has no subscription');
    return;
  }

  const stripe = getStripe();
  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // Get tier from price
  const priceId = stripeSubscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  if (!tier) {
    logger.warn({ sessionId: session.id, priceId }, 'Could not determine tier from price');
    return;
  }

  // Check if subscription already exists (idempotency)
  const existingSub = await getSubscriptionByStripeId(stripeSubscription.id);
  if (existingSub) {
    logger.info({ subscriptionId: existingSub.id }, 'Subscription already exists, skipping');
    return;
  }

  // Create subscription record
  // @ts-expect-error Stripe types use snake_case but SDK may return camelCase
  const periodStart = stripeSubscription.current_period_start ?? stripeSubscription.currentPeriodStart;
  // @ts-expect-error Stripe types use snake_case but SDK may return camelCase
  const periodEnd = stripeSubscription.current_period_end ?? stripeSubscription.currentPeriodEnd;

  await createSubscription({
    userId,
    tier: tier as SubscriptionTier,
    status: mapStripeStatus(stripeSubscription.status),
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
  });

  logger.info(
    { userId, tier, stripeSubscriptionId: stripeSubscription.id },
    'Subscription created from checkout'
  );
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription when it changes (upgrade, downgrade, renewal)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const existingSub = await getSubscriptionByStripeId(subscription.id);

  if (!existingSub) {
    logger.warn({ stripeSubscriptionId: subscription.id }, 'Subscription not found for update');
    return;
  }

  // Get tier from price
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  // @ts-expect-error Stripe types use snake_case but SDK may return camelCase
  const periodStart = subscription.current_period_start ?? subscription.currentPeriodStart;
  // @ts-expect-error Stripe types use snake_case but SDK may return camelCase
  const periodEnd = subscription.current_period_end ?? subscription.currentPeriodEnd;

  await updateSubscription(existingSub.id, {
    tier: tier as SubscriptionTier | undefined,
    status: mapStripeStatus(subscription.status),
    stripePriceId: priceId,
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  logger.info(
    { subscriptionId: existingSub.id, status: subscription.status },
    'Subscription updated'
  );
}

/**
 * Handle customer.subscription.deleted event
 * Updates subscription status when canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const existingSub = await getSubscriptionByStripeId(subscription.id);

  if (!existingSub) {
    logger.warn({ stripeSubscriptionId: subscription.id }, 'Subscription not found for deletion');
    return;
  }

  await updateSubscription(existingSub.id, {
    status: 'canceled',
  });

  logger.info({ subscriptionId: existingSub.id }, 'Subscription canceled');
}

/**
 * Handle invoice.payment_failed event
 * Updates subscription status to past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Get subscription ID from invoice parent
  const parent = invoice.parent as { subscription_details?: { subscription?: string | { id: string } } } | null;
  const subDetails = parent?.subscription_details?.subscription;
  if (!subDetails) {
    return;
  }

  const subscriptionId = typeof subDetails === 'string' ? subDetails : subDetails.id;
  const existingSub = await getSubscriptionByStripeId(subscriptionId);

  if (!existingSub) {
    logger.warn({ stripeSubscriptionId: subscriptionId }, 'Subscription not found for payment failure');
    return;
  }

  // Only update if not already in a terminal state
  if (existingSub.status !== 'canceled') {
    await updateSubscription(existingSub.id, {
      status: 'past_due',
    });

    logger.info({ subscriptionId: existingSub.id }, 'Subscription marked as past_due');
  }
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'active';
  }
}

// --- Routes ---

/**
 * POST /v1/webhooks/stripe
 * Handle Stripe webhook events
 * @see sdd.md §5.4 POST /v1/webhooks/stripe
 */
webhooksRouter.post('/stripe', async (c) => {
  const requestId = c.get('requestId');
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    throw Errors.BadRequest('Missing Stripe signature');
  }

  // Get raw body for signature verification
  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    logger.warn({ request_id: requestId, error: err }, 'Webhook signature verification failed');
    throw Errors.BadRequest('Invalid webhook signature');
  }

  logger.info({ request_id: requestId, eventType: event.type, eventId: event.id }, 'Webhook received');

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
    }
  } catch (err) {
    logger.error({ request_id: requestId, eventType: event.type, error: err }, 'Webhook handler error');
    // Return 200 to prevent Stripe from retrying, but log the error
    // In production, you might want to queue for retry or alert
  }

  return c.json({ received: true });
});
