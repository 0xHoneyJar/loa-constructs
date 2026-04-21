/**
 * Polar Billing Adapter — Exports
 * Scaffold only. See polar.ts for stub implementations.
 *
 * Cycle: loa-constructs-cycle-001, Leg G
 */

export { createConstructProduct, checkEntitlement, onPurchaseWebhook, NotImplementedError } from './polar.js';
export type {
  CreateConstructProductOpts,
  ConstructProduct,
  CheckEntitlementOpts,
  EntitlementResult,
  PolarWebhookPayload,
  Logger,
} from './types.js';
