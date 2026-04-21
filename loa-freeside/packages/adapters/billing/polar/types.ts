/**
 * Polar Billing Adapter — Type Definitions
 * Scaffold only. No live Polar API calls this cycle.
 *
 * SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
 * Cycle: loa-constructs-cycle-001, Leg G
 */

export interface CreateConstructProductOpts {
  slug: string;
  name: string;
  description?: string;
  priceMonthly?: number;
  priceAnnual?: number;
  currency?: string;
}

export interface ConstructProduct {
  id: string;
  slug: string;
  name: string;
  polarProductId: string;
  createdAt: string;
}

export interface CheckEntitlementOpts {
  userId: string;
  productSlug: string;
}

export interface EntitlementResult {
  entitled: boolean;
  userId: string;
  productSlug: string;
  expiresAt?: string | null;
}

export interface PolarWebhookPayload {
  type: string;
  data: {
    id: string;
    customerId?: string;
    productId?: string;
    status?: string;
    [key: string]: unknown;
  };
}

export interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}
