/**
 * Stripe Client Configuration
 * @see sprint.md T3.1: Stripe Setup
 * @see sdd.md §1.6 External Integrations
 */

import Stripe from 'stripe';
import { env } from '../config/env.js';

// --- Constants ---

/**
 * Stripe API version - pinned for stability
 * @see sdd.md Risk Mitigation: "Pin API version (2023-10-16)"
 */
export const STRIPE_API_VERSION = '2025-12-15.clover' as const;

/**
 * Price ID mapping for subscription tiers
 * These are loaded from environment variables
 */
export const STRIPE_PRICE_IDS = {
  pro_monthly: env.STRIPE_PRO_PRICE_ID,
  pro_annual: env.STRIPE_PRO_ANNUAL_PRICE_ID,
  team_monthly: env.STRIPE_TEAM_PRICE_ID,
  team_annual: env.STRIPE_TEAM_ANNUAL_PRICE_ID,
  team_seat_addon: env.STRIPE_TEAM_SEAT_PRICE_ID,
} as const;

/**
 * Map Stripe Price IDs to subscription tiers
 */
export function getTierFromPriceId(priceId: string): 'pro' | 'team' | null {
  if (priceId === STRIPE_PRICE_IDS.pro_monthly || priceId === STRIPE_PRICE_IDS.pro_annual) {
    return 'pro';
  }
  if (
    priceId === STRIPE_PRICE_IDS.team_monthly ||
    priceId === STRIPE_PRICE_IDS.team_annual ||
    priceId === STRIPE_PRICE_IDS.team_seat_addon
  ) {
    return 'team';
  }
  return null;
}

// --- Stripe Client ---

let stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance (lazy initialization)
 * @throws Error if STRIPE_SECRET_KEY is not configured
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

/**
 * Verify Stripe webhook signature
 * @param payload - Raw request body
 * @param signature - Stripe-Signature header
 * @returns Verified Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Verify Stripe webhook signature against multiple secrets during migration
 * @see sdd-infrastructure-migration.md §4.3 Dual Stripe Webhook Handler
 *
 * During infrastructure migration, webhooks may come from either the old (Fly.io)
 * or new (Railway) endpoint. This function tries both secrets to verify the signature.
 *
 * @param payload - Raw request body
 * @param signature - Stripe-Signature header
 * @returns Verified Stripe event or null if neither secret works
 */
export function verifyWebhookSignatureDual(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe();

  // Collect all configured webhook secrets
  const secrets = [
    env.STRIPE_WEBHOOK_SECRET, // Original (Fly.io)
    env.STRIPE_WEBHOOK_SECRET_RAILWAY, // New (Railway)
  ].filter(Boolean) as string[];

  if (secrets.length === 0) {
    throw new Error('No STRIPE_WEBHOOK_SECRET configured');
  }

  // Try each secret in order
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      // Try next secret
    }
  }

  // No secret worked
  return null;
}
