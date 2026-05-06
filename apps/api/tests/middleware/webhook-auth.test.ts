/**
 * Webhook auth chain tests (T-1.11b · FR-1.6.1-1.6.3 · ADR-006/007).
 * Cycle: constructs-network-migration
 *
 * Tests the chained middleware flow:
 *   hmacVerifyMiddleware → nonceStoreMiddleware → rateLimitStoreMiddleware
 *
 * Status table per SDD §5.3:
 *   200 — valid HMAC + first-seen nonce + within rate budget
 *   401 — invalid signature OR missing webhook headers OR no secret configured
 *   409 — replay nonce OR stale/future timestamp (>5min skew)
 *   429 — rate limit exceeded
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import {
  hmacVerifyMiddleware,
  buildCanonicalString,
  verifyCanonicalHmac,
} from '../../src/middleware/hmac-verify';
import { nonceStoreMiddleware } from '../../src/middleware/nonce-store';
import { rateLimitStoreMiddleware } from '../../src/middleware/rate-limit-store';

// Mock the logger so log assertions don't pollute the test output.
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const SECRET = 'test-shared-secret-must-be-long-enough-32chars!';
const HOST = 'api.constructs.0xhoneyjar.xyz';
const PATH = '/v1/admin/refresh-registry';

interface SignedRequest {
  body: string;
  signature: string;
  nonce: string;
  timestamp: string;
}

/**
 * Sign a request the same way the registry-refresh.yml workflow does:
 *   canonical = METHOD\nPATH\nHOST\nNONCE\nTIMESTAMP\nsha256(BODY)
 *   sig       = "sha256=" + hmac_sha256(secret, canonical)
 */
function signRequest(
  body: string,
  opts: {
    secret?: string;
    method?: string;
    path?: string;
    host?: string;
    nonce?: string;
    timestamp?: string;
  } = {},
): SignedRequest {
  const secret = opts.secret ?? SECRET;
  const method = opts.method ?? 'POST';
  const path = opts.path ?? PATH;
  const host = opts.host ?? HOST;
  const nonce = opts.nonce ?? randomUUID();
  const timestamp = opts.timestamp ?? new Date().toISOString();

  const canonical = buildCanonicalString(method, path, host, nonce, timestamp, body);
  const sig = createHmac('sha256', secret).update(canonical).digest('hex');

  return { body, signature: `sha256=${sig}`, nonce, timestamp };
}

function makeApp(opts: {
  hmacOpts?: Parameters<typeof hmacVerifyMiddleware>[0];
  nonceOpts?: Parameters<typeof nonceStoreMiddleware>[0];
  rateLimitOpts?: Parameters<typeof rateLimitStoreMiddleware>[0];
} = {}) {
  const app = new Hono();
  app.post(
    PATH,
    hmacVerifyMiddleware(opts.hmacOpts ?? { secret: SECRET, expectedHost: HOST }),
    nonceStoreMiddleware(opts.nonceOpts ?? { isReplayImpl: async () => false }),
    rateLimitStoreMiddleware(
      opts.rateLimitOpts ?? {
        checkAndConsumeImpl: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      },
    ),
    (c) => c.json({ refreshed: true }),
  );
  return app;
}

async function postSigned(
  app: Hono,
  signed: SignedRequest,
  extraHeaders: Record<string, string> = {},
) {
  return app.request(PATH, {
    method: 'POST',
    headers: {
      Host: HOST,
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signed.signature,
      'X-Refresh-Nonce': signed.nonce,
      'X-Refresh-Timestamp': signed.timestamp,
      ...extraHeaders,
    },
    body: signed.body,
  });
}

// ---------------------------------------------------------------------------
// HMAC layer
// ---------------------------------------------------------------------------

describe('hmacVerifyMiddleware', () => {
  it('200s a valid signed request', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc123', ref: 'refs/heads/main' });
    const signed = signRequest(body);
    const res = await postSigned(app, signed);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ refreshed: true });
  });

  it('401s when X-Hub-Signature-256 is absent', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body);
    const res = await app.request(PATH, {
      method: 'POST',
      headers: {
        Host: HOST,
        'X-Refresh-Nonce': signed.nonce,
        'X-Refresh-Timestamp': signed.timestamp,
      },
      body,
    });
    expect(res.status).toBe(401);
  });

  it('401s when nonce or timestamp header is absent', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body);
    const res = await app.request(PATH, {
      method: 'POST',
      headers: {
        Host: HOST,
        'X-Hub-Signature-256': signed.signature,
        // missing nonce + timestamp
      },
      body,
    });
    expect(res.status).toBe(401);
  });

  it('401s when signature uses the wrong secret', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body, { secret: 'wrong-secret-not-the-real-one' });
    const res = await postSigned(app, signed);
    expect(res.status).toBe(401);
  });

  it('401s when body is tampered with after signing', async () => {
    const app = makeApp();
    const original = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(original);
    // Send a different body but with the original signature.
    const res = await app.request(PATH, {
      method: 'POST',
      headers: {
        Host: HOST,
        'X-Hub-Signature-256': signed.signature,
        'X-Refresh-Nonce': signed.nonce,
        'X-Refresh-Timestamp': signed.timestamp,
      },
      body: JSON.stringify({ commit_sha: 'tampered' }),
    });
    expect(res.status).toBe(401);
  });

  it('401s when the nonce is tampered with after signing', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body);
    const res = await postSigned(app, { ...signed, nonce: randomUUID() });
    expect(res.status).toBe(401);
  });

  it('401s when REGISTRY_REFRESH_HMAC_SECRET is unset and no opts.secret', async () => {
    const app = new Hono();
    app.post(
      PATH,
      hmacVerifyMiddleware(), // no opts → reads env; we'll clear it below
      (c) => c.json({ ok: true }),
    );
    const prev = process.env.REGISTRY_REFRESH_HMAC_SECRET;
    delete process.env.REGISTRY_REFRESH_HMAC_SECRET;
    try {
      const body = JSON.stringify({});
      const signed = signRequest(body);
      const res = await postSigned(app, signed);
      expect(res.status).toBe(401);
    } finally {
      if (prev !== undefined) process.env.REGISTRY_REFRESH_HMAC_SECRET = prev;
    }
  });

  // Direct unit tests for the helpers — useful when debugging signature
  // mismatches between the bash workflow and TS verifier.
  it('canonical-string format matches the workflow caller (plain SHA-256 body hash)', () => {
    const body = JSON.stringify({ commit_sha: 'abc' });
    const expectedBodyHash = createHash('sha256').update(body).digest('hex');
    const canonical = buildCanonicalString(
      'POST',
      PATH,
      HOST,
      'nonce-1',
      '2026-05-06T00:00:00Z',
      body,
    );
    expect(canonical).toBe(
      ['POST', PATH, HOST, 'nonce-1', '2026-05-06T00:00:00Z', expectedBodyHash].join('\n'),
    );
  });

  it('verifyCanonicalHmac uses timing-safe comparison', () => {
    const canonical = 'GET\n/x\n/y\nn\nt\nh';
    const sig =
      'sha256=' + createHmac('sha256', SECRET).update(canonical).digest('hex');
    expect(verifyCanonicalHmac(canonical, sig, SECRET)).toBe(true);
    expect(verifyCanonicalHmac(canonical, sig, 'wrong')).toBe(false);
    expect(
      verifyCanonicalHmac(canonical, 'sha256=00', SECRET),
    ).toBe(false); // length mismatch returns false (no throw)
    expect(verifyCanonicalHmac(canonical, 'no-prefix', SECRET)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Nonce-store layer
// ---------------------------------------------------------------------------

describe('nonceStoreMiddleware', () => {
  it('409s on replay (isReplay returns true)', async () => {
    const app = makeApp({ nonceOpts: { isReplayImpl: async () => true } });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body);
    const res = await postSigned(app, signed);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/replay|stale/);
  });

  it('200s on first-seen nonce', async () => {
    const seen = new Set<string>();
    const app = makeApp({
      nonceOpts: {
        isReplayImpl: async (n) => {
          if (seen.has(n)) return true;
          seen.add(n);
          return false;
        },
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(200);
  });

  it('409s on the second call with the same nonce (full replay round-trip)', async () => {
    const seen = new Set<string>();
    const app = makeApp({
      nonceOpts: {
        isReplayImpl: async (n) => {
          if (seen.has(n)) return true;
          seen.add(n);
          return false;
        },
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body);
    expect((await postSigned(app, signed)).status).toBe(200);
    expect((await postSigned(app, signed)).status).toBe(409);
  });

  it('503s when nonce store throws', async () => {
    const app = makeApp({
      nonceOpts: {
        isReplayImpl: async () => {
          throw new Error('connection terminated');
        },
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Rate-limit layer
// ---------------------------------------------------------------------------

describe('rateLimitStoreMiddleware', () => {
  it('429s with Retry-After when bucket is exhausted', async () => {
    const app = makeApp({
      rateLimitOpts: {
        checkAndConsumeImpl: async () => ({ allowed: false, retryAfterSeconds: 3600 }),
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    const json = await res.json();
    expect(json.retry_after_seconds).toBe(3600);
  });

  it('200s when bucket has tokens', async () => {
    const app = makeApp({
      rateLimitOpts: {
        checkAndConsumeImpl: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(200);
  });

  it('fails open on store error (lets request through)', async () => {
    const app = makeApp({
      rateLimitOpts: {
        checkAndConsumeImpl: async () => {
          throw new Error('connection terminated');
        },
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    // Documented behavior: rate limiter fails open (HMAC+nonce still gate
    // the path; rate limit is defense-in-depth).
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// End-to-end chain
// ---------------------------------------------------------------------------

describe('webhook auth chain (HMAC → nonce → rate-limit)', () => {
  it('full chain: 200 with valid signature + first-seen nonce + tokens available', async () => {
    const seenNonces = new Set<string>();
    const app = makeApp({
      nonceOpts: {
        isReplayImpl: async (n) => {
          if (seenNonces.has(n)) return true;
          seenNonces.add(n);
          return false;
        },
      },
      rateLimitOpts: {
        checkAndConsumeImpl: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(200);
  });

  it('chain order: HMAC failure shadows nonce + rate-limit (no DB calls on bad sig)', async () => {
    const nonceFn = vi.fn(async () => false);
    const rateLimitFn = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const app = makeApp({
      nonceOpts: { isReplayImpl: nonceFn },
      rateLimitOpts: { checkAndConsumeImpl: rateLimitFn },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const signed = signRequest(body, { secret: 'wrong' });
    const res = await postSigned(app, signed);
    expect(res.status).toBe(401);
    // Critical: bad-sig requests must not consume nonce slots or rate-limit
    // budget. Verifies the middleware order is HMAC first.
    expect(nonceFn).not.toHaveBeenCalled();
    expect(rateLimitFn).not.toHaveBeenCalled();
  });

  it('chain order: replay-nonce response prevents rate-limit consumption', async () => {
    const rateLimitFn = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 }));
    const app = makeApp({
      nonceOpts: { isReplayImpl: async () => true },
      rateLimitOpts: { checkAndConsumeImpl: rateLimitFn },
    });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, signRequest(body));
    expect(res.status).toBe(409);
    expect(rateLimitFn).not.toHaveBeenCalled();
  });
});
