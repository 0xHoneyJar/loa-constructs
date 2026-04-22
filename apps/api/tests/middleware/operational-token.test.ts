/**
 * Operational Admin Token — cycle-002 L0
 * @see apps/api/src/middleware/operational-token.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import {
  requireAdminAccess,
  OPERATIONAL_TOKEN_USER_ID,
} from '../../src/middleware/operational-token';

const ENV_KEY = 'CONSTRUCTS_ADMIN_TOKEN';
const VALID_TOKEN = 'cto_' + 'a'.repeat(64);

describe('requireAdminAccess — operational token bypass', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalEnv !== undefined) process.env[ENV_KEY] = originalEnv;
    else delete process.env[ENV_KEY];
    vi.restoreAllMocks();
  });

  /**
   * Build an app that responds with the context variables operational mode sets,
   * so assertions can verify the bypass populated the admin context correctly.
   */
  const buildApp = () => {
    const app = new Hono();
    // Convert thrown AppError -> HTTP status so tests can assert on auth rejection.
    app.onError((err, c) => {
      const status = (err as { status?: number }).status ?? 500;
      return c.json({ error: err.message }, status as 400 | 401 | 403 | 404 | 500);
    });
    app.use('*', requireAdminAccess());
    app.get('/probe', (c) => {
      return c.json({
        userId: c.get('userId'),
        isOps: c.get('isOperationalToken'),
        role: c.get('user')?.role,
      });
    });
    return app;
  };

  it('bypass is disabled when env var is unset (falls through to user auth → 401 without JWT)', async () => {
    const app = buildApp();
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });
    // Falls through → requireAuth rejects because no real JWT.
    expect(res.status).toBe(401);
  });

  it('accepts a matching Bearer cto_ token and synthesizes operational admin context', async () => {
    process.env[ENV_KEY] = VALID_TOKEN;
    const app = buildApp();
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      userId: string;
      isOps: boolean;
      role: string;
    };
    expect(body.userId).toBe(OPERATIONAL_TOKEN_USER_ID);
    expect(body.isOps).toBe(true);
    expect(body.role).toBe('admin');
  });

  it('rejects a mismatched Bearer token (falls through → 401)', async () => {
    process.env[ENV_KEY] = VALID_TOKEN;
    const app = buildApp();
    const wrong = 'cto_' + 'b'.repeat(64);
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${wrong}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects tokens without cto_ prefix even if env matches by coincidence', async () => {
    const noPrefix = 'x'.repeat(68); // same length as VALID_TOKEN but no prefix
    process.env[ENV_KEY] = noPrefix;
    const app = buildApp();
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${noPrefix}` },
    });
    // env format invalid → bypass path not even considered → falls through
    expect(res.status).toBe(401);
  });

  it('rejects too-short tokens (< prefix + 32 chars) even if env matches exactly', async () => {
    const tooShort = 'cto_short';
    process.env[ENV_KEY] = tooShort;
    const app = buildApp();
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${tooShort}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects Authorization without Bearer scheme', async () => {
    process.env[ENV_KEY] = VALID_TOKEN;
    const app = buildApp();
    const res = await app.request('/probe', {
      headers: { Authorization: VALID_TOKEN }, // no "Bearer " prefix
    });
    expect(res.status).toBe(401);
  });

  it('rejects missing Authorization header', async () => {
    process.env[ENV_KEY] = VALID_TOKEN;
    const app = buildApp();
    const res = await app.request('/probe');
    expect(res.status).toBe(401);
  });

  it('tokens with matching length but different content are rejected (constant-time guard)', async () => {
    process.env[ENV_KEY] = VALID_TOKEN;
    const app = buildApp();
    const diff = 'cto_' + 'a'.repeat(63) + 'b'; // differs in final char only
    const res = await app.request('/probe', {
      headers: { Authorization: `Bearer ${diff}` },
    });
    expect(res.status).toBe(401);
  });
});
