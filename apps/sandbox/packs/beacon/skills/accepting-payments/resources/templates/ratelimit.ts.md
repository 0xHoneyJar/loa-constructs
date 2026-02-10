# Template: x402 Rate Limiter

> Rate limiting for x402 payment endpoints with per-agent, per-IP, and subsidy budget enforcement.

## Template

```typescript
/**
 * x402 Rate Limiter
 *
 * Enforces rate limits per-agent, per-IP, and tracks subsidy budgets.
 * Uses in-memory storage by default; replace with Redis for production.
 *
 * Configuration (from PRD):
 * - Per-agent: 10 requests per hour
 * - Per-IP: 50 requests per hour
 * - Daily subsidy budget: 1000 {{DEFAULT_TOKEN}}
 * - Per-agent subsidy: 50 {{DEFAULT_TOKEN}} max
 */

// =============================================================================
// Configuration
// =============================================================================

export interface RateLimitConfig {
  perAgent: {
    max: number;
    windowMs: number;
  };
  perIP: {
    max: number;
    windowMs: number;
  };
  subsidyBudget: {
    dailyMax: number;
    perAgentMax: number;
  };
}

const DEFAULT_CONFIG: RateLimitConfig = {
  perAgent: {
    max: {{PER_AGENT_MAX}},
    windowMs: {{PER_AGENT_WINDOW_MS}}
  },
  perIP: {
    max: {{PER_IP_MAX}},
    windowMs: {{PER_IP_WINDOW_MS}}
  },
  subsidyBudget: {
    dailyMax: {{DAILY_SUBSIDY_MAX}},
    perAgentMax: {{PER_AGENT_SUBSIDY_MAX}}
  }
};

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  reason?: 'agent_limit' | 'ip_limit' | 'subsidy_exhausted';
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface SubsidyEntry {
  used: number;
  resetAt: number;
}

// =============================================================================
// In-Memory Store (Replace with Redis for production)
// =============================================================================

const agentLimits = new Map<string, RateLimitEntry>();
const ipLimits = new Map<string, RateLimitEntry>();
const agentSubsidy = new Map<string, SubsidyEntry>();

let dailySubsidyUsed = 0;
let dailySubsidyResetAt = getNextMidnight();

function getNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime();
}

// =============================================================================
// Rate Limit Check
// =============================================================================

/**
 * Check rate limits for a request.
 *
 * @param agentAddress - The verified agent address
 * @param clientIP - Client IP address
 * @param endpoint - API endpoint path
 * @param config - Optional custom configuration
 */
export async function checkRateLimit(
  agentAddress: string,
  clientIP: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const now = Date.now();

  // Check agent limit
  const agentResult = checkLimit(
    agentLimits,
    `${agentAddress}:${endpoint}`,
    config.perAgent.max,
    config.perAgent.windowMs,
    now
  );

  if (!agentResult.allowed) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: agentResult.retryAfter,
      reason: 'agent_limit'
    };
  }

  // Check IP limit
  const ipResult = checkLimit(
    ipLimits,
    `${clientIP}:${endpoint}`,
    config.perIP.max,
    config.perIP.windowMs,
    now
  );

  if (!ipResult.allowed) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: ipResult.retryAfter,
      reason: 'ip_limit'
    };
  }

  return {
    allowed: true,
    remaining: Math.min(agentResult.remaining, ipResult.remaining)
  };
}

function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  max: number,
  windowMs: number,
  now: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const entry = store.get(key);

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true, remaining: max - 1 };
  }

  // Check if limit exceeded
  if (entry.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return { allowed: true, remaining: max - entry.count };
}

// =============================================================================
// Subsidy Budget
// =============================================================================

/**
 * Check and consume subsidy budget for an agent.
 *
 * @param agentAddress - The agent requesting subsidy
 * @param amount - Subsidy amount in {{DEFAULT_TOKEN}}
 * @param config - Optional custom configuration
 */
export async function consumeSubsidy(
  agentAddress: string,
  amount: number,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  const now = Date.now();

  // Reset daily budget if needed
  if (now > dailySubsidyResetAt) {
    dailySubsidyUsed = 0;
    dailySubsidyResetAt = getNextMidnight();
    agentSubsidy.clear();
  }

  // Check daily budget
  if (dailySubsidyUsed + amount > config.subsidyBudget.dailyMax) {
    return {
      allowed: false,
      remaining: config.subsidyBudget.dailyMax - dailySubsidyUsed,
      reason: 'Daily subsidy budget exhausted'
    };
  }

  // Check per-agent budget
  const agentEntry = agentSubsidy.get(agentAddress) || { used: 0, resetAt: getNextMidnight() };

  if (agentEntry.used + amount > config.subsidyBudget.perAgentMax) {
    return {
      allowed: false,
      remaining: config.subsidyBudget.perAgentMax - agentEntry.used,
      reason: 'Per-agent subsidy limit reached'
    };
  }

  // Consume subsidy
  dailySubsidyUsed += amount;
  agentEntry.used += amount;
  agentSubsidy.set(agentAddress, agentEntry);

  return {
    allowed: true,
    remaining: Math.min(
      config.subsidyBudget.dailyMax - dailySubsidyUsed,
      config.subsidyBudget.perAgentMax - agentEntry.used
    )
  };
}

// =============================================================================
// Metrics
// =============================================================================

/**
 * Get current rate limit metrics for monitoring.
 */
export function getMetrics(): {
  activeAgents: number;
  activeIPs: number;
  dailySubsidyUsed: number;
  dailySubsidyRemaining: number;
} {
  const now = Date.now();

  // Clean expired entries
  for (const [key, entry] of agentLimits) {
    if (entry.resetAt < now) agentLimits.delete(key);
  }
  for (const [key, entry] of ipLimits) {
    if (entry.resetAt < now) ipLimits.delete(key);
  }

  return {
    activeAgents: agentLimits.size,
    activeIPs: ipLimits.size,
    dailySubsidyUsed,
    dailySubsidyRemaining: DEFAULT_CONFIG.subsidyBudget.dailyMax - dailySubsidyUsed
  };
}

// =============================================================================
// Redis Adapter (Production)
// =============================================================================

/**
 * Redis adapter for distributed rate limiting.
 * Uncomment and configure for production use.
 */
/*
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimitRedis(
  agentAddress: string,
  clientIP: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const agentKey = `ratelimit:agent:${agentAddress}:${endpoint}`;
  const ipKey = `ratelimit:ip:${clientIP}:${endpoint}`;

  const multi = redis.multi();
  multi.incr(agentKey);
  multi.pttl(agentKey);
  multi.incr(ipKey);
  multi.pttl(ipKey);

  const results = await multi.exec();

  // Set TTL on first request
  const agentCount = results[0][1] as number;
  const agentTTL = results[1][1] as number;
  const ipCount = results[2][1] as number;
  const ipTTL = results[3][1] as number;

  if (agentTTL === -1) {
    await redis.pexpire(agentKey, config.perAgent.windowMs);
  }
  if (ipTTL === -1) {
    await redis.pexpire(ipKey, config.perIP.windowMs);
  }

  if (agentCount > config.perAgent.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(agentTTL / 1000),
      reason: 'agent_limit'
    };
  }

  if (ipCount > config.perIP.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(ipTTL / 1000),
      reason: 'ip_limit'
    };
  }

  return {
    allowed: true,
    remaining: Math.min(
      config.perAgent.max - agentCount,
      config.perIP.max - ipCount
    )
  };
}
*/
```

## Placeholders

| Placeholder | Description | Default |
|-------------|-------------|---------|
| `{{PER_AGENT_MAX}}` | Max requests per agent per window | `10` |
| `{{PER_AGENT_WINDOW_MS}}` | Agent rate limit window in ms | `3600000` (1 hour) |
| `{{PER_IP_MAX}}` | Max requests per IP per window | `50` |
| `{{PER_IP_WINDOW_MS}}` | IP rate limit window in ms | `3600000` (1 hour) |
| `{{DAILY_SUBSIDY_MAX}}` | Daily subsidy budget in {{DEFAULT_TOKEN}} | `1000` |
| `{{PER_AGENT_SUBSIDY_MAX}}` | Per-agent subsidy limit in {{DEFAULT_TOKEN}} | `50` |

## Default Configuration

From PRD specifications:

```typescript
const DEFAULT_CONFIG: RateLimitConfig = {
  perAgent: {
    max: 10,
    windowMs: 60 * 60 * 1000  // 1 hour
  },
  perIP: {
    max: 50,
    windowMs: 60 * 60 * 1000  // 1 hour
  },
  subsidyBudget: {
    dailyMax: 1000,           // 1000 {{DEFAULT_TOKEN}}/day
    perAgentMax: 50           // 50 {{DEFAULT_TOKEN}}/agent
  }
};
```

## Usage Example

```typescript
import { checkRateLimit, consumeSubsidy, getMetrics } from '@/lib/x402/ratelimit';

// In middleware
const result = await checkRateLimit(agentAddress, clientIP, '/api/generate-image');

if (!result.allowed) {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    reason: result.reason,
    retryAfter: result.retryAfter
  }), {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfter),
      'X-RateLimit-Remaining': '0'
    }
  });
}

// Consume subsidy if applicable
if (subsidyEnabled) {
  const subsidyResult = await consumeSubsidy(agentAddress, subsidyAmount);
  if (!subsidyResult.allowed) {
    // Fall back to full price
  }
}

// Monitoring endpoint
export function GET(req: Request) {
  const metrics = getMetrics();
  return Response.json(metrics);
}
```

## Output Location

`lib/x402/ratelimit.ts`
