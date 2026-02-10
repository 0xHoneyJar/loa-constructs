# Template: x402 Payment Middleware

> Next.js middleware for x402 v2 payment verification.

## Template

```typescript
/**
 * x402 v2 Payment Middleware
 *
 * Wraps API route handlers with payment verification.
 * Generates 402 responses for unpaid requests.
 *
 * @see https://www.x402.org/writing/x402-v2-launch
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitResult } from './ratelimit';
import { hooks } from './hooks';

// =============================================================================
// Configuration
// =============================================================================

const FACILITATOR_URL = process.env.FACILITATOR_URL || '{{FACILITATOR_URL}}';
const NETWORK_ID = '{{NETWORK_ID}}';
const DEFAULT_TOKEN = '{{DEFAULT_TOKEN}}';
const RECIPIENT_ADDRESS = process.env.PAYMENT_RECIPIENT || '{{RECIPIENT_ADDRESS}}';

// =============================================================================
// Types
// =============================================================================

export interface PaymentConfig {
  price: string;
  token?: string;
  subsidyPercent?: number;
}

export interface PaymentContext {
  verified: boolean;
  agentAddress?: string;
  amount?: string;
  receipt?: PaymentReceipt;
}

export interface PaymentReceipt {
  id: string;
  signature: string;
  settledAt: string;
}

interface PaymentRequirement {
  version: '2.0';
  network: string;
  token: string;
  amount: string;
  recipient: string;
  validUntil: number;
  subsidyAvailable?: boolean;
  subsidyPercent?: number;
}

interface PaymentPayload {
  version: '2.0';
  signature: string;
  payload: {
    network: string;
    token: string;
    amount: string;
    recipient: string;
    nonce: string;
    validUntil: number;
  };
}

// =============================================================================
// Middleware
// =============================================================================

type RouteHandler = (
  req: NextRequest,
  context: { payment: PaymentContext }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a route handler with x402 payment verification.
 *
 * @example
 * ```typescript
 * export const POST = withX402(
 *   async (req, { payment }) => {
 *     console.log('Paid by:', payment.agentAddress);
 *     return NextResponse.json({ success: true });
 *   },
 *   { price: '1', token: '{{DEFAULT_TOKEN}}' }
 * );
 * ```
 */
export function withX402(handler: RouteHandler, config: PaymentConfig) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const paymentHeader = req.headers.get('X-Payment');

    // No payment header - return 402
    if (!paymentHeader) {
      return generate402Response(config, req);
    }

    // Parse and verify payment
    const verification = await verifyPayment(paymentHeader, config, req);

    if (!verification.verified) {
      return generate402Response(config, req, verification.error);
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(
      verification.agentAddress!,
      getClientIP(req),
      req.nextUrl.pathname
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter) }
        }
      );
    }

    // Execute handler with payment context
    const response = await handler(req, { payment: verification });

    // Add receipt header if available
    if (verification.receipt) {
      response.headers.set(
        'X-Payment-Receipt',
        Buffer.from(JSON.stringify(verification.receipt)).toString('base64')
      );
    }

    return response;
  };
}

// =============================================================================
// 402 Response Generation
// =============================================================================

async function generate402Response(
  config: PaymentConfig,
  req: NextRequest,
  error?: string
): Promise<NextResponse> {
  const requirement = await buildPaymentRequirement(config, req);

  // Execute pre-402 hook
  await hooks.onPaymentRequired({
    endpoint: req.nextUrl.pathname,
    requirement,
    clientIP: getClientIP(req)
  });

  const requirementBase64 = Buffer.from(JSON.stringify(requirement)).toString('base64');

  return NextResponse.json(
    {
      error: error || 'Payment required',
      paymentRequired: requirement
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': requirementBase64,
        'X-Payment-Version': '2',
        'X-Payment-Token': config.token || DEFAULT_TOKEN,
        'Access-Control-Expose-Headers': 'X-Payment-Required, X-Payment-Version, X-Payment-Token'
      }
    }
  );
}

async function buildPaymentRequirement(
  config: PaymentConfig,
  req: NextRequest
): Promise<PaymentRequirement> {
  const token = config.token || DEFAULT_TOKEN;
  const amount = parseUnits(config.price, 18); // {{DEFAULT_TOKEN}} has 18 decimals

  const requirement: PaymentRequirement = {
    version: '2.0',
    network: NETWORK_ID,
    token,
    amount: amount.toString(),
    recipient: RECIPIENT_ADDRESS,
    validUntil: Math.floor(Date.now() / 1000) + 300 // 5 minutes
  };

  // Add subsidy info if configured
  if (config.subsidyPercent && config.subsidyPercent > 0) {
    requirement.subsidyAvailable = true;
    requirement.subsidyPercent = config.subsidyPercent;
  }

  return requirement;
}

// =============================================================================
// Payment Verification
// =============================================================================

async function verifyPayment(
  paymentHeader: string,
  config: PaymentConfig,
  req: NextRequest
): Promise<PaymentContext> {
  try {
    // Decode payment payload
    const paymentJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
    const payment: PaymentPayload = JSON.parse(paymentJson);

    // Validate version
    if (payment.version !== '2.0') {
      return { verified: false, error: 'Invalid payment version' } as PaymentContext & { error: string };
    }

    // Validate network
    if (payment.payload.network !== NETWORK_ID) {
      return { verified: false, error: 'Invalid network' } as PaymentContext & { error: string };
    }

    // Validate amount
    const expectedAmount = parseUnits(config.price, 18);
    const paidAmount = BigInt(payment.payload.amount);
    if (paidAmount < expectedAmount) {
      return { verified: false, error: 'Insufficient payment' } as PaymentContext & { error: string };
    }

    // Validate expiry
    if (payment.payload.validUntil < Math.floor(Date.now() / 1000)) {
      return { verified: false, error: 'Payment expired' } as PaymentContext & { error: string };
    }

    // Verify signature with facilitator
    const verification = await verifyWithFacilitator(payment);

    if (!verification.valid) {
      return { verified: false, error: verification.error } as PaymentContext & { error: string };
    }

    // Execute verification hook
    await hooks.onPaymentVerified({
      agentAddress: verification.agentAddress,
      amount: payment.payload.amount,
      endpoint: req.nextUrl.pathname
    });

    // Settle payment
    const receipt = await settlePayment(payment, verification.agentAddress);

    if (receipt) {
      // Execute settlement hook
      await hooks.onSettlementComplete({
        agentAddress: verification.agentAddress,
        receipt,
        endpoint: req.nextUrl.pathname
      });
    }

    return {
      verified: true,
      agentAddress: verification.agentAddress,
      amount: payment.payload.amount,
      receipt
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return { verified: false, error: 'Invalid payment format' } as PaymentContext & { error: string };
  }
}

async function verifyWithFacilitator(
  payment: PaymentPayload
): Promise<{ valid: boolean; agentAddress?: string; error?: string }> {
  try {
    const response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });

    if (!response.ok) {
      const error = await response.text();
      return { valid: false, error };
    }

    const result = await response.json();
    return {
      valid: true,
      agentAddress: result.agentAddress
    };
  } catch (error) {
    console.error('Facilitator verification error:', error);
    return { valid: false, error: 'Facilitator unavailable' };
  }
}

async function settlePayment(
  payment: PaymentPayload,
  agentAddress: string
): Promise<PaymentReceipt | undefined> {
  try {
    const response = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment,
        agentAddress
      })
    });

    if (!response.ok) {
      await hooks.onSettlementFailed({
        agentAddress,
        error: await response.text()
      });
      return undefined;
    }

    const receipt = await response.json();
    return receipt;
  } catch (error) {
    await hooks.onSettlementFailed({
      agentAddress,
      error: String(error)
    });
    return undefined;
  }
}

// =============================================================================
// Utilities
// =============================================================================

function parseUnits(value: string, decimals: number): bigint {
  const [integer, fraction = ''] = value.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// =============================================================================
// Exports
// =============================================================================

export { checkRateLimit } from './ratelimit';
export { hooks } from './hooks';
```

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{RECIPIENT_ADDRESS}}` | Payment recipient wallet | `0x1234...abcd` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FACILITATOR_URL` | x402 facilitator endpoint | `https://x402.org/facilitator` |
| `PAYMENT_RECIPIENT` | Wallet address for payments | Required |

## Usage Example

```typescript
// app/api/generate-image/route.ts
import { withX402 } from '@/lib/x402/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withX402(
  async (req: NextRequest, { payment }) => {
    const body = await req.json();

    // payment.agentAddress is the verified payer
    console.log(`Request from agent: ${payment.agentAddress}`);

    // Your business logic here
    const result = await generateImage(body.prompt);

    return NextResponse.json({
      image: result.url,
      paidBy: payment.agentAddress
    });
  },
  {
    price: '1',           // 1 {{DEFAULT_TOKEN}}
    token: '{{DEFAULT_TOKEN}}',
    subsidyPercent: 50    // 50% subsidized
  }
);
```

## Output Location

`lib/x402/middleware.ts`
