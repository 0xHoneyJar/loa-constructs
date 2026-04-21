/**
 * Polar Billing Adapter — Stub Implementations
 * Scaffold only. Zero network calls. No live Polar API.
 *
 * All stubs throw NotImplementedError. Wire live Polar SDK in a future cycle.
 * Use Paddle (existing) for current billing.
 *
 * SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
 * Cycle: loa-constructs-cycle-001, Leg G
 * Prior art: STAMETS §2 (Polar.sh GitHub-access-as-fulfillment model)
 */

import type {
  CreateConstructProductOpts,
  ConstructProduct,
  CheckEntitlementOpts,
  EntitlementResult,
  PolarWebhookPayload,
  Logger,
} from './types.js';

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export async function createConstructProduct(
  _opts: CreateConstructProductOpts,
  logger?: Logger,
): Promise<ConstructProduct> {
  logger?.info('[polar] createConstructProduct — scaffold stub, not yet wired');
  throw new NotImplementedError(
    'createConstructProduct is a scaffold stub. Wire live Polar SDK in a future cycle. ' +
    'Use Paddle (existing) for current billing.',
  );
}

export async function checkEntitlement(
  _opts: CheckEntitlementOpts,
  logger?: Logger,
): Promise<EntitlementResult> {
  logger?.info('[polar] checkEntitlement — scaffold stub, not yet wired');
  throw new NotImplementedError(
    'checkEntitlement is a scaffold stub. Wire live Polar SDK in a future cycle. ' +
    'Use Paddle (existing) for current billing.',
  );
}

export async function onPurchaseWebhook(
  _payload: PolarWebhookPayload,
  logger?: Logger,
): Promise<void> {
  logger?.info('[polar] onPurchaseWebhook — scaffold stub, not yet wired');
  throw new NotImplementedError(
    'onPurchaseWebhook is a scaffold stub. Wire live Polar SDK in a future cycle. ' +
    'Use Paddle (existing) for current billing.',
  );
}
