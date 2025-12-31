/**
 * Subscription Service
 * @see sprint.md T3.4: Subscription Service
 * @see sdd.md §3.2 Entity: Subscriptions
 */

import { db, subscriptions, teamMembers, users } from '../db/index.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { getRedis, isRedisConfigured } from './redis.js';
import { logger } from '../lib/logger.js';

// --- Types ---

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Subscription {
  id: string;
  userId: string | null;
  teamId: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  seats: number;
}

export interface EffectiveTier {
  tier: SubscriptionTier;
  source: 'personal' | 'team';
  subscriptionId: string | null;
  expiresAt: Date | null;
}

// --- Constants ---

/**
 * Cache TTL for tier lookups (5 minutes)
 * @see sdd.md §3.6 Caching Strategy
 */
const TIER_CACHE_TTL = 300;

/**
 * Cache key prefix for user tier lookups
 */
const TIER_CACHE_PREFIX = 'user:tier:';

/**
 * Tier hierarchy for access control
 * Higher number = higher tier
 */
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

// --- Helper Functions ---

/**
 * Get cache key for user tier
 */
function getTierCacheKey(userId: string): string {
  return `${TIER_CACHE_PREFIX}${userId}`;
}

// --- Core Functions ---

/**
 * Get user's personal subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trialing'),
          eq(subscriptions.status, 'past_due')
        )
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const sub = result[0];
  return {
    id: sub.id,
    userId: sub.userId,
    teamId: sub.teamId,
    tier: sub.tier as SubscriptionTier,
    status: sub.status as SubscriptionStatus,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripePriceId: sub.stripePriceId,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    seats: sub.seats ?? 1,
  };
}

/**
 * Get all team subscriptions for a user
 */
export async function getUserTeamSubscriptions(userId: string): Promise<Subscription[]> {
  // Find all teams the user is a member of
  const teamMemberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  if (teamMemberships.length === 0) {
    return [];
  }

  const teamIds = teamMemberships.map((tm) => tm.teamId);

  // Get active subscriptions for those teams
  const teamSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.teamId, teamIds),
        or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trialing'),
          eq(subscriptions.status, 'past_due')
        )
      )
    );

  return teamSubs.map((sub) => ({
    id: sub.id,
    userId: sub.userId,
    teamId: sub.teamId,
    tier: sub.tier as SubscriptionTier,
    status: sub.status as SubscriptionStatus,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripePriceId: sub.stripePriceId,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    seats: sub.seats ?? 1,
  }));
}

/**
 * Get a user's effective subscription tier
 * Considers both personal and team subscriptions, returns highest tier
 * @see sprint.md T3.4: "getEffectiveTier(userId) - considers personal + team"
 */
export async function getEffectiveTier(userId: string): Promise<EffectiveTier> {
  // Check cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<EffectiveTier>(getTierCacheKey(userId));
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, userId }, 'Failed to read tier from cache');
    }
  }

  // Default to free tier
  let effectiveTier: EffectiveTier = {
    tier: 'free',
    source: 'personal',
    subscriptionId: null,
    expiresAt: null,
  };

  // Check personal subscription
  const personalSub = await getUserSubscription(userId);
  if (personalSub && personalSub.status !== 'canceled') {
    effectiveTier = {
      tier: personalSub.tier,
      source: 'personal',
      subscriptionId: personalSub.id,
      expiresAt: personalSub.currentPeriodEnd,
    };
  }

  // Check team subscriptions (user might be on a team with higher tier)
  const teamSubs = await getUserTeamSubscriptions(userId);
  for (const teamSub of teamSubs) {
    if (teamSub.status === 'canceled') continue;

    // If team tier is higher than current effective tier, use it
    if (TIER_HIERARCHY[teamSub.tier] > TIER_HIERARCHY[effectiveTier.tier]) {
      effectiveTier = {
        tier: teamSub.tier,
        source: 'team',
        subscriptionId: teamSub.id,
        expiresAt: teamSub.currentPeriodEnd,
      };
    }
  }

  // Cache the result
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(getTierCacheKey(userId), JSON.stringify(effectiveTier), {
        ex: TIER_CACHE_TTL,
      });
    } catch (error) {
      logger.warn({ error, userId }, 'Failed to cache tier');
    }
  }

  return effectiveTier;
}

/**
 * Check if a user's tier allows access to a required tier
 * @see sprint.md T3.4: "canAccessTier(userTier, requiredTier) - tier hierarchy"
 */
export function canAccessTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Invalidate cached tier for a user
 * Call this when subscription changes
 */
export async function invalidateTierCache(userId: string): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.del(getTierCacheKey(userId));
    } catch (error) {
      logger.warn({ error, userId }, 'Failed to invalidate tier cache');
    }
  }
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const sub = result[0];
  return {
    id: sub.id,
    userId: sub.userId,
    teamId: sub.teamId,
    tier: sub.tier as SubscriptionTier,
    status: sub.status as SubscriptionStatus,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripePriceId: sub.stripePriceId,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    seats: sub.seats ?? 1,
  };
}

/**
 * Create a new subscription record
 */
export async function createSubscription(data: {
  userId?: string;
  teamId?: string;
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  seats?: number;
}): Promise<Subscription> {
  const result = await db
    .insert(subscriptions)
    .values({
      userId: data.userId ?? null,
      teamId: data.teamId ?? null,
      tier: data.tier,
      status: data.status ?? 'active',
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      stripePriceId: data.stripePriceId ?? null,
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      seats: data.seats ?? 1,
    })
    .returning();

  const sub = result[0];

  // Invalidate cache for the user
  if (data.userId) {
    await invalidateTierCache(data.userId);
  }

  return {
    id: sub.id,
    userId: sub.userId,
    teamId: sub.teamId,
    tier: sub.tier as SubscriptionTier,
    status: sub.status as SubscriptionStatus,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripePriceId: sub.stripePriceId,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    seats: sub.seats ?? 1,
  };
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  data: {
    tier?: SubscriptionTier;
    status?: SubscriptionStatus;
    stripePriceId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    seats?: number;
  }
): Promise<Subscription | null> {
  const result = await db
    .update(subscriptions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  if (result.length === 0) {
    return null;
  }

  const sub = result[0];

  // Invalidate cache for the user
  if (sub.userId) {
    await invalidateTierCache(sub.userId);
  }

  // If it's a team subscription, invalidate cache for all team members
  if (sub.teamId) {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, sub.teamId));

    for (const member of members) {
      await invalidateTierCache(member.userId);
    }
  }

  return {
    id: sub.id,
    userId: sub.userId,
    teamId: sub.teamId,
    tier: sub.tier as SubscriptionTier,
    status: sub.status as SubscriptionStatus,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripePriceId: sub.stripePriceId,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    seats: sub.seats ?? 1,
  };
}

/**
 * Get or create Stripe customer ID for a user
 */
export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length > 0 && user[0].stripeCustomerId) {
    return user[0].stripeCustomerId;
  }

  // Create a new Stripe customer
  const { getStripe } = await import('./stripe.js');
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Save the customer ID to the user record
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}
