# Template: x402 Lifecycle Hooks

> Lifecycle hooks for x402 payment flow events.

## Template

```typescript
/**
 * x402 Lifecycle Hooks
 *
 * Four hooks for the payment lifecycle:
 * 1. onPaymentRequired - Before 402 response
 * 2. onPaymentVerified - Signature valid
 * 3. onSettlementComplete - Payment settled
 * 4. onSettlementFailed - Settlement error
 *
 * Customize these hooks for:
 * - Analytics and metrics
 * - Audit logging
 * - Agent reputation tracking
 * - Custom business logic
 */

// =============================================================================
// Types
// =============================================================================

export interface PaymentRequiredContext {
  endpoint: string;
  requirement: {
    version: string;
    network: string;
    token: string;
    amount: string;
    recipient: string;
    validUntil: number;
    subsidyAvailable?: boolean;
    subsidyPercent?: number;
  };
  clientIP: string;
}

export interface PaymentVerifiedContext {
  agentAddress: string;
  amount: string;
  endpoint: string;
}

export interface SettlementCompleteContext {
  agentAddress: string;
  receipt: {
    id: string;
    signature: string;
    settledAt: string;
  };
  endpoint: string;
}

export interface SettlementFailedContext {
  agentAddress: string;
  error: string;
}

// =============================================================================
// Hook Definitions
// =============================================================================

export const hooks = {
  /**
   * Called before returning a 402 Payment Required response.
   *
   * Use for:
   * - Logging payment request attempts
   * - Custom header injection
   * - Rate limiting announcements
   * - Analytics
   */
  async onPaymentRequired(ctx: PaymentRequiredContext): Promise<void> {
    console.log('[x402] Payment required', {
      endpoint: ctx.endpoint,
      token: ctx.requirement.token,
      amount: ctx.requirement.amount,
      clientIP: ctx.clientIP,
      timestamp: new Date().toISOString()
    });

    // TODO: Add your custom logic here
    // Examples:
    // - await analytics.track('payment_required', ctx);
    // - await metrics.increment('x402.402_responses');
  },

  /**
   * Called when a payment signature is verified as valid.
   *
   * Use for:
   * - Agent reputation scoring
   * - Audit trail creation
   * - Pre-execution validation
   * - Agent allowlist/blocklist checks
   */
  async onPaymentVerified(ctx: PaymentVerifiedContext): Promise<void> {
    console.log('[x402] Payment verified', {
      agent: ctx.agentAddress,
      amount: ctx.amount,
      endpoint: ctx.endpoint,
      timestamp: new Date().toISOString()
    });

    // TODO: Add your custom logic here
    // Examples:
    // - await auditLog.create({ type: 'payment_verified', ...ctx });
    // - await agentReputation.recordPayment(ctx.agentAddress);
    // - if (isBlockedAgent(ctx.agentAddress)) throw new Error('Agent blocked');
  },

  /**
   * Called when payment settlement completes successfully.
   *
   * Use for:
   * - Transaction recording
   * - Receipt archival
   * - Post-payment business logic
   * - Success notifications
   */
  async onSettlementComplete(ctx: SettlementCompleteContext): Promise<void> {
    console.log('[x402] Settlement complete', {
      agent: ctx.agentAddress,
      receiptId: ctx.receipt.id,
      endpoint: ctx.endpoint,
      settledAt: ctx.receipt.settledAt,
      timestamp: new Date().toISOString()
    });

    // TODO: Add your custom logic here
    // Examples:
    // - await db.transactions.create({
    //     agentAddress: ctx.agentAddress,
    //     receiptId: ctx.receipt.id,
    //     endpoint: ctx.endpoint,
    //     signature: ctx.receipt.signature,
    //     settledAt: ctx.receipt.settledAt
    //   });
    // - await metrics.increment('x402.settlements.success');
    // - await webhooks.notify('payment_settled', ctx);
  },

  /**
   * Called when payment settlement fails.
   *
   * Use for:
   * - Error logging
   * - Rollback operations
   * - Failure notifications
   * - Agent flagging
   */
  async onSettlementFailed(ctx: SettlementFailedContext): Promise<void> {
    console.error('[x402] Settlement failed', {
      agent: ctx.agentAddress,
      error: ctx.error,
      timestamp: new Date().toISOString()
    });

    // TODO: Add your custom logic here
    // Examples:
    // - await errorLog.create({ type: 'settlement_failed', ...ctx });
    // - await metrics.increment('x402.settlements.failed');
    // - await alerts.send('settlement_failed', ctx);
    // - await agentReputation.recordFailure(ctx.agentAddress);
  }
};

// =============================================================================
// Hook Utilities
// =============================================================================

/**
 * Wrap a hook with error handling.
 * Ensures hook errors don't break the payment flow.
 */
export function safeHook<T>(
  hookFn: (ctx: T) => Promise<void>
): (ctx: T) => Promise<void> {
  return async (ctx: T) => {
    try {
      await hookFn(ctx);
    } catch (error) {
      console.error('[x402] Hook error:', error);
      // Don't throw - hooks shouldn't break the payment flow
    }
  };
}

/**
 * Compose multiple hooks into one.
 * Runs hooks in sequence.
 */
export function composeHooks<T>(
  ...hookFns: Array<(ctx: T) => Promise<void>>
): (ctx: T) => Promise<void> {
  return async (ctx: T) => {
    for (const hookFn of hookFns) {
      await safeHook(hookFn)(ctx);
    }
  };
}

// =============================================================================
// Pre-built Hook Extensions
// =============================================================================

/**
 * Analytics hook - sends events to your analytics provider.
 */
export function createAnalyticsHook(analyticsClient: {
  track: (event: string, properties: Record<string, unknown>) => Promise<void>;
}) {
  return {
    onPaymentRequired: async (ctx: PaymentRequiredContext) => {
      await analyticsClient.track('x402_payment_required', {
        endpoint: ctx.endpoint,
        token: ctx.requirement.token,
        amount: ctx.requirement.amount
      });
    },
    onPaymentVerified: async (ctx: PaymentVerifiedContext) => {
      await analyticsClient.track('x402_payment_verified', {
        agent: ctx.agentAddress,
        endpoint: ctx.endpoint,
        amount: ctx.amount
      });
    },
    onSettlementComplete: async (ctx: SettlementCompleteContext) => {
      await analyticsClient.track('x402_settlement_complete', {
        agent: ctx.agentAddress,
        endpoint: ctx.endpoint,
        receiptId: ctx.receipt.id
      });
    },
    onSettlementFailed: async (ctx: SettlementFailedContext) => {
      await analyticsClient.track('x402_settlement_failed', {
        agent: ctx.agentAddress,
        error: ctx.error
      });
    }
  };
}

/**
 * Metrics hook - increments counters for monitoring.
 */
export function createMetricsHook(metricsClient: {
  increment: (metric: string, tags?: Record<string, string>) => void;
  timing: (metric: string, value: number, tags?: Record<string, string>) => void;
}) {
  return {
    onPaymentRequired: async (ctx: PaymentRequiredContext) => {
      metricsClient.increment('x402.payment_required', {
        endpoint: ctx.endpoint,
        token: ctx.requirement.token
      });
    },
    onPaymentVerified: async (ctx: PaymentVerifiedContext) => {
      metricsClient.increment('x402.payment_verified', {
        endpoint: ctx.endpoint
      });
    },
    onSettlementComplete: async (ctx: SettlementCompleteContext) => {
      metricsClient.increment('x402.settlement.success', {
        endpoint: ctx.endpoint
      });
    },
    onSettlementFailed: async (ctx: SettlementFailedContext) => {
      metricsClient.increment('x402.settlement.failed');
    }
  };
}

/**
 * Webhook hook - sends HTTP notifications on events.
 */
export function createWebhookHook(webhookUrl: string) {
  const notify = async (event: string, data: unknown) => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      });
    } catch (error) {
      console.error('[x402] Webhook error:', error);
    }
  };

  return {
    onPaymentRequired: async (ctx: PaymentRequiredContext) => {
      await notify('payment_required', ctx);
    },
    onPaymentVerified: async (ctx: PaymentVerifiedContext) => {
      await notify('payment_verified', ctx);
    },
    onSettlementComplete: async (ctx: SettlementCompleteContext) => {
      await notify('settlement_complete', ctx);
    },
    onSettlementFailed: async (ctx: SettlementFailedContext) => {
      await notify('settlement_failed', ctx);
    }
  };
}
```

## Hook Lifecycle

```
Request (no payment)
       │
       ▼
┌──────────────────┐
│ onPaymentRequired│ ─────► 402 Response
└──────────────────┘

Request (with payment)
       │
       ▼
┌──────────────────┐
│ onPaymentVerified│ ─────► Payment valid
└──────────────────┘
       │
       ▼
┌────────────────────────┐
│ Settlement via         │
│ Facilitator            │
└────────────────────────┘
       │
    ┌──┴──┐
    ▼     ▼
┌──────┐ ┌──────┐
│Success│ │Failed│
└──────┘ └──────┘
    │         │
    ▼         ▼
┌──────────────────────┐  ┌────────────────────┐
│ onSettlementComplete │  │ onSettlementFailed │
└──────────────────────┘  └────────────────────┘
```

## Usage Example

```typescript
// lib/x402/hooks.ts - Customize with your logic

import { hooks, createAnalyticsHook, composeHooks } from './hooks';
import { analytics } from '@/lib/analytics';

// Extend the base hooks with analytics
const analyticsHooks = createAnalyticsHook(analytics);

// Compose hooks
hooks.onSettlementComplete = composeHooks(
  hooks.onSettlementComplete,
  analyticsHooks.onSettlementComplete,
  async (ctx) => {
    // Custom logic: notify admin on large payments
    if (BigInt(ctx.receipt.amount) > BigInt('10000000000000000000')) {
      await notifyAdmin('Large payment received', ctx);
    }
  }
);
```

## Output Location

`lib/x402/hooks.ts`
