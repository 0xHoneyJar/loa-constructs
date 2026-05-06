/**
 * POST /v1/admin/refresh-registry route tests (T-1.11b integration).
 * Cycle: constructs-network-migration
 *
 * Tests the wired-up flow with mocked auth chain + loader.
 */
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createHmac, randomUUID } from 'node:crypto';
import { adminRefreshRouter } from '../../src/routes/admin-refresh';
import { buildCanonicalString } from '../../src/middleware/hmac-verify';
import type { RegistryLoader } from '../../src/lib/registry-loader';

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
const PATH = '/refresh-registry';

function fakeLoader(behavior: {
  entries?: number;
  commit_sha?: string | null;
  throws?: Error;
}): RegistryLoader {
  return {
    refresh: async (commit_sha?: string) => {
      if (behavior.throws) throw behavior.throws;
      return {
        entries: new Map(Array.from({ length: behavior.entries ?? 18 }, (_, i) => [`s-${i}`, {} as never])),
        source: 'fresh',
        fetched_at: new Date().toISOString(),
        commit_sha: behavior.commit_sha === undefined ? commit_sha ?? null : behavior.commit_sha,
        content_hash: 'abc',
        etag: null,
      };
    },
  } as unknown as RegistryLoader;
}

function signRequest(body: string, opts: { secret?: string; nonce?: string; timestamp?: string } = {}) {
  const nonce = opts.nonce ?? randomUUID();
  const timestamp = opts.timestamp ?? new Date().toISOString();
  const canonical = buildCanonicalString('POST', PATH, HOST, nonce, timestamp, body);
  const sig = 'sha256=' + createHmac('sha256', opts.secret ?? SECRET).update(canonical).digest('hex');
  return { signature: sig, nonce, timestamp };
}

function makeApp(loaderBehavior: Parameters<typeof fakeLoader>[0] = {}): Hono {
  const app = new Hono();
  app.route(
    '/',
    adminRefreshRouter({
      loader: fakeLoader(loaderBehavior),
      hmacOpts: { secret: SECRET, expectedHost: HOST },
      nonceOpts: { isReplayImpl: async () => false },
      rateLimitOpts: {
        checkAndConsumeImpl: async () => ({ allowed: true, retryAfterSeconds: 0 }),
      },
    }),
  );
  return app;
}

async function postSigned(
  app: Hono,
  body: string,
  signed: ReturnType<typeof signRequest>,
) {
  return app.request(PATH, {
    method: 'POST',
    headers: {
      Host: HOST,
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signed.signature,
      'X-Refresh-Nonce': signed.nonce,
      'X-Refresh-Timestamp': signed.timestamp,
    },
    body,
  });
}

describe('POST /v1/admin/refresh-registry', () => {
  it('200s with refreshed:true + entries_count when loader.refresh succeeds', async () => {
    const app = makeApp({ entries: 18, commit_sha: 'abc1234' });
    const body = JSON.stringify({ commit_sha: 'abc1234', ref: 'refs/heads/main' });
    const res = await postSigned(app, body, signRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      refreshed: true,
      entries_count: 18,
      commit_sha: 'abc1234',
    });
  });

  it('400s when body is not valid JSON', async () => {
    const app = makeApp();
    const body = 'not-json{{{';
    const res = await postSigned(app, body, signRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid JSON/i);
  });

  it('400s when commit_sha is missing from payload', async () => {
    const app = makeApp();
    const body = JSON.stringify({ ref: 'refs/heads/main' }); // no commit_sha
    const res = await postSigned(app, body, signRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/commit_sha/i);
  });

  it('400s when commit_sha is non-string', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 12345 });
    const res = await postSigned(app, body, signRequest(body));
    expect(res.status).toBe(400);
  });

  it('503s when loader.refresh throws (e.g. gh raw down)', async () => {
    const app = makeApp({ throws: new Error('ENOTFOUND raw.githubusercontent.com') });
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, body, signRequest(body));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/refresh failed/i);
  });

  it('401s when signature is wrong (auth chain runs before handler)', async () => {
    const app = makeApp();
    const body = JSON.stringify({ commit_sha: 'abc' });
    const res = await postSigned(app, body, signRequest(body, { secret: 'wrong' }));
    expect(res.status).toBe(401);
  });
});
