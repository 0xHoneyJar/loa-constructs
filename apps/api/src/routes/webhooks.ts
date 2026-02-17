/**
 * Webhook Routes
 * @see sprint.md T3.3: Adapt Existing Webhook Code
 * @see sdd.md §5.4 POST /v1/webhooks/stripe
 * @see sdd-infrastructure-migration.md §4.3 Dual Stripe Webhook Handler
 */

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import type Stripe from 'stripe';
import { verifyWebhookSignatureDual, getStripe, getTierFromPriceId } from '../services/stripe.js';
import {
  createSubscription,
  updateSubscription,
  getSubscriptionByStripeId,
  type SubscriptionTier,
  type SubscriptionStatus,
} from '../services/subscription.js';
import {
  updateConnectOnboardingStatus,
  isConnectAccountComplete,
} from '../services/stripe-connect.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getRedis, isRedisConfigured } from '../services/redis.js';

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
 * Handle account.updated event (Stripe Connect)
 * Updates user's Connect onboarding status
 * @see prd-pack-submission.md §4.4.1
 * @see sprint.md T25.6
 */
async function handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
  try {
    // Get user ID from account metadata
    const userId = account.metadata?.user_id;
    if (!userId) {
      logger.warn({ accountId: account.id }, 'Connect account missing user_id metadata');
      return;
    }

    // Check if onboarding is complete
    const isComplete = await isConnectAccountComplete(account.id);

    // Update user record
    await updateConnectOnboardingStatus(userId, isComplete);

    logger.info(
      { userId, accountId: account.id, isComplete },
      'Connect account status updated'
    );
  } catch (error) {
    logger.error(
      { error, accountId: account.id },
      'Failed to handle Connect account update'
    );
  }
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

// --- Idempotency ---

/**
 * Acquire idempotency lock for a Stripe event
 * Uses atomic SET NX EX to prevent duplicate processing
 * @see sdd-infrastructure-migration.md §4.3 Dual Stripe Webhook Handler
 *
 * @param eventId - Stripe event ID
 * @returns true if lock acquired (new event), false if already locked (duplicate)
 */
async function acquireEventLock(eventId: string): Promise<boolean> {
  if (!isRedisConfigured()) {
    // No Redis -> process without dedupe
    logger.warn({ eventId }, 'Redis not configured, skipping idempotency lock');
    return true;
  }

  try {
    const redis = getRedis();
    // Atomic SET with NX (only if not exists) + EX (expire in seconds)
    // Returns 'OK' if key was set (lock acquired), null if exists (duplicate)
    const result = await redis.set(`stripe:event:${eventId}`, '1', {
      ex: 86400, // 24 hour TTL
      nx: true, // Only set if not exists
    });

    return result === 'OK'; // true if lock acquired (new event)
  } catch (err) {
    // Log but don't block on Redis errors - fail open to allow processing
    logger.error({ eventId, error: err }, 'Redis idempotency lock failed');
    return true;
  }
}

/**
 * Release idempotency lock for a Stripe event (on processing failure)
 * Allows Stripe to retry the event if processing failed
 *
 * @param eventId - Stripe event ID
 */
async function releaseEventLock(eventId: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = getRedis();
    await redis.del(`stripe:event:${eventId}`);
  } catch (err) {
    logger.error({ eventId, error: err }, 'Failed to release Stripe idempotency lock');
  }
}

// --- Routes ---

/**
 * POST /v1/webhooks/stripe
 * Handle Stripe webhook events
 * @see sdd.md §5.4 POST /v1/webhooks/stripe
 * @see sdd-infrastructure-migration.md §4.3 Dual Stripe Webhook Handler
 *
 * Features:
 * - Dual-secret verification for migration period
 * - Idempotent handling with Redis deduplication
 */
webhooksRouter.post('/stripe', async (c) => {
  const requestId = c.get('requestId');
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    throw Errors.BadRequest('Missing Stripe signature');
  }

  // Get raw body for signature verification
  const rawBody = await c.req.text();

  // Verify against both secrets during migration
  const event = verifyWebhookSignatureDual(rawBody, signature);
  if (!event) {
    logger.warn({ request_id: requestId }, 'Webhook signature verification failed with all secrets');
    throw Errors.BadRequest('Invalid webhook signature');
  }

  logger.info({ request_id: requestId, eventType: event.type, eventId: event.id }, 'Webhook received');

  // Acquire idempotency lock - skip if already processing/processed
  const lockAcquired = await acquireEventLock(event.id);
  if (!lockAcquired) {
    logger.info({ eventId: event.id }, 'Duplicate webhook event, skipping');
    return c.json({ received: true, duplicate: true });
  }

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

      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
    }
  } catch (err) {
    // Release lock on failure to allow Stripe retries
    await releaseEventLock(event.id);
    logger.error({ request_id: requestId, eventType: event.type, error: err }, 'Webhook handler error');
    // Re-throw to return 500 and allow Stripe to retry
    throw err;
  }

  return c.json({ received: true });
});

// --- GitHub Webhook ---

/**
 * POST /v1/webhooks/github
 * Auto-sync on push/tag via GitHub webhooks.
 * @see sprint.md T2.4: GitHub Webhook Endpoint
 *
 * Verifies X-Hub-Signature-256, matches pack by github_repo_id or git_url,
 * triggers sync on push to default branch or tag creation.
 */
webhooksRouter.post('/github', async (c) => {
  const requestId = c.get('requestId');
  const signature = c.req.header('x-hub-signature-256');
  const event = c.req.header('x-github-event');
  const deliveryId = c.req.header('x-github-delivery');

  if (!signature || !event || !deliveryId) {
    return c.json({ error: 'Missing signature, event, or delivery header' }, 400);
  }

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('GITHUB_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  // Verify signature using raw bytes
  const rawBodyBuffer = Buffer.from(await c.req.arrayBuffer());
  const rawBody = rawBodyBuffer.toString('utf8');

  const expectedSigHex = createHmac('sha256', webhookSecret).update(rawBodyBuffer).digest('hex');
  const sigHex = signature.startsWith('sha256=') ? signature.slice(7) : '';

  // Constant-time comparison on hex-decoded bytes to prevent timing attacks
  const sigBuffer = Buffer.from(sigHex, 'hex');
  const expectedBuffer = Buffer.from(expectedSigHex, 'hex');

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    logger.warn({ requestId }, 'GitHub webhook signature verification failed');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  // Replay protection: record delivery ID
  const { db, packs, githubWebhookDeliveries } = await import('../db/index.js');
  const { eq, or, sql } = await import('drizzle-orm');

  const [deliveryInsert] = await db
    .insert(githubWebhookDeliveries)
    .values({ deliveryId })
    .onConflictDoNothing({ target: [githubWebhookDeliveries.deliveryId] })
    .returning({ id: githubWebhookDeliveries.id });

  if (!deliveryInsert) {
    logger.warn({ requestId, deliveryId }, 'GitHub webhook replay detected');
    return c.json({ received: true, action: 'ignored', reason: 'Replay' });
  }

  // Only handle push and create (tag) events
  if (event !== 'push' && event !== 'create') {
    return c.json({ received: true, action: 'ignored', reason: `Unhandled event: ${event}` });
  }

  let payload: {
    repository?: { id: number; clone_url?: string; default_branch?: string };
    ref?: string;
    ref_type?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  if (!payload.repository) {
    return c.json({ received: true, action: 'ignored', reason: 'No repository in payload' });
  }

  const repoId = payload.repository.id;
  const cloneUrl = payload.repository.clone_url?.toLowerCase().replace(/\.git$/, '') || '';

  // Determine the ref to sync
  let syncRef: string | null = null;

  if (event === 'push') {
    // Only sync pushes to default branch
    const defaultBranch = payload.repository.default_branch || 'main';
    const pushRef = payload.ref || '';
    if (pushRef === `refs/heads/${defaultBranch}`) {
      syncRef = defaultBranch;
    }
  } else if (event === 'create' && payload.ref_type === 'tag') {
    syncRef = payload.ref || null;
  }

  if (!syncRef) {
    return c.json({ received: true, action: 'ignored', reason: 'Not a default branch push or tag' });
  }

  // Match pack by github_repo_id (primary) or normalized git_url (fallback)
  const matchedPacks = await db
    .select({ id: packs.id, slug: packs.slug, gitUrl: packs.gitUrl })
    .from(packs)
    .where(
      or(
        eq(packs.githubRepoId, repoId),
        sql`lower(replace(${packs.gitUrl}, '.git', '')) = ${cloneUrl}`
      )
    );

  if (matchedPacks.length === 0) {
    // Return 200 to acknowledge — don't leak which packs are registered
    return c.json({ received: true });
  }

  // Rate limit + sync each matched pack
  const { checkSyncRateLimit, recordSyncEvent } = await import('../services/sync-rate-limit.js');
  const { syncFromRepo, GitSyncError } = await import('../services/git-sync.js');
  const { packVersions, packFiles } = await import('../db/index.js');
  const { and } = await import('drizzle-orm');

  const results: Array<{ slug: string; status: string }> = [];

  for (const pack of matchedPacks) {
    // Rate limit check
    const allowed = await checkSyncRateLimit(pack.id);
    if (!allowed) {
      results.push({ slug: pack.slug, status: 'rate_limited' });
      continue;
    }

    if (!pack.gitUrl) {
      results.push({ slug: pack.slug, status: 'no_git_url' });
      continue;
    }

    try {
      const syncResult = await syncFromRepo(pack.gitUrl, syncRef);

      // Single DB transaction: version + files + pack metadata
      await db.transaction(async (tx) => {
        await tx
          .update(packVersions)
          .set({ isLatest: false })
          .where(
            and(
              eq(packVersions.packId, pack.id),
              eq(packVersions.isLatest, true)
            )
          );

        const [version] = await tx
          .insert(packVersions)
          .values({
            packId: pack.id,
            version: syncResult.version,
            manifest: syncResult.manifest,
            isLatest: true,
            publishedAt: new Date(),
            totalSizeBytes: syncResult.totalSizeBytes,
            fileCount: syncResult.files.length,
          })
          .onConflictDoUpdate({
            target: [packVersions.packId, packVersions.version],
            set: {
              manifest: syncResult.manifest,
              isLatest: true,
              publishedAt: new Date(),
              totalSizeBytes: syncResult.totalSizeBytes,
              fileCount: syncResult.files.length,
            },
          })
          .returning();

        await tx
          .delete(packFiles)
          .where(eq(packFiles.versionId, version.id));

        for (const file of syncResult.files) {
          await tx.insert(packFiles).values({
            versionId: version.id,
            path: file.path,
            contentHash: file.contentHash,
            storageKey: `packs/${pack.slug}/${syncResult.version}/${file.path}`,
            sizeBytes: file.sizeBytes,
            mimeType: file.mimeType,
            content: file.content,
          });
        }

        await tx
          .update(packs)
          .set({
            gitRef: syncRef,
            lastSyncCommit: syncResult.commit,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(packs.id, pack.id));

        // Upsert identity if present
        if (syncResult.identity) {
          const { constructIdentities } = await import('../db/index.js');
          await tx
            .insert(constructIdentities)
            .values({
              packId: pack.id,
              personaYaml: syncResult.identity.personaYaml,
              expertiseYaml: syncResult.identity.expertiseYaml,
              cognitiveFrame: syncResult.identity.cognitiveFrame,
              expertiseDomains: syncResult.identity.expertiseDomains,
              voiceConfig: syncResult.identity.voiceConfig,
              modelPreferences: syncResult.identity.modelPreferences,
            })
            .onConflictDoUpdate({
              target: [constructIdentities.packId],
              set: {
                personaYaml: syncResult.identity.personaYaml,
                expertiseYaml: syncResult.identity.expertiseYaml,
                cognitiveFrame: syncResult.identity.cognitiveFrame,
                expertiseDomains: syncResult.identity.expertiseDomains,
                voiceConfig: syncResult.identity.voiceConfig,
                modelPreferences: syncResult.identity.modelPreferences,
                updatedAt: new Date(),
              },
            });
        }
      });

      await recordSyncEvent(pack.id, 'webhook').catch(() => {});

      logger.info(
        { packId: pack.id, slug: pack.slug, version: syncResult.version, commit: syncResult.commit, requestId },
        'Pack synced via GitHub webhook'
      );

      results.push({ slug: pack.slug, status: 'synced' });
    } catch (err) {
      const message = err instanceof GitSyncError ? err.message : 'Unknown error';
      logger.error({ packId: pack.id, slug: pack.slug, error: message, requestId }, 'Webhook sync failed');
      results.push({ slug: pack.slug, status: 'error' });
    }
  }

  return c.json({ received: true, results });
});
