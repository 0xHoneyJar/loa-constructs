/**
 * Tests for cors-policy middleware (T-1.15 / FR-4.2 / ADR-009).
 * Cycle: constructs-network-migration
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  decideCors,
  corsMiddleware,
  previewMutationGuard,
  PREVIEW_PATTERN,
} from '../../src/middleware/cors-policy';

describe('cors-policy decision matrix', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ALLOW_PREVIEW;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows canonical operator-namespace origin with credentials', () => {
    const r = decideCors('https://constructs.0xhoneyjar.xyz');
    expect(r).toEqual({ allow: true, credentials: true });
  });

  it('allows .network transition aliases without credentials', () => {
    expect(decideCors('https://constructs.network')).toEqual({
      allow: true,
      credentials: false,
    });
    expect(decideCors('https://www.constructs.network')).toEqual({
      allow: true,
      credentials: false,
    });
  });

  it('rejects unrelated *.vercel.app origins (the catch-all bug we are closing)', () => {
    expect(decideCors('https://random-app.vercel.app')).toEqual({
      allow: false,
      credentials: false,
    });
    expect(decideCors('https://attacker-team-myapp.vercel.app')).toEqual({
      allow: false,
      credentials: false,
    });
  });

  it('rejects preview origins by default (CORS_ALLOW_PREVIEW unset)', () => {
    const preview =
      'https://constructs-network-feature-foo-0xhoneyjar-s-team.vercel.app';
    expect(decideCors(preview)).toEqual({ allow: false, credentials: false });
  });

  it('allows team-namespace preview origins only when CORS_ALLOW_PREVIEW=true', () => {
    process.env.CORS_ALLOW_PREVIEW = 'true';
    const branchPreview =
      'https://constructs-network-feature-bar-0xhoneyjar-s-team.vercel.app';
    const gitPreview =
      'https://constructs-network-git-feature-baz-0xhoneyjar-s-team.vercel.app';
    expect(decideCors(branchPreview)).toEqual({ allow: true, credentials: false });
    expect(decideCors(gitPreview)).toEqual({ allow: true, credentials: false });
  });

  it('rejects non-team-namespace preview shapes even with CORS_ALLOW_PREVIEW=true', () => {
    process.env.CORS_ALLOW_PREVIEW = 'true';
    const wrongTeam =
      'https://constructs-network-feature-foo-some-other-team.vercel.app';
    const wrongProject =
      'https://something-else-feature-foo-0xhoneyjar-s-team.vercel.app';
    expect(decideCors(wrongTeam).allow).toBe(false);
    expect(decideCors(wrongProject).allow).toBe(false);
  });

  it('allows localhost only in development', () => {
    process.env.NODE_ENV = 'development';
    expect(decideCors('http://localhost:3000')).toEqual({
      allow: true,
      credentials: true,
    });
    expect(decideCors('null')).toEqual({ allow: true, credentials: true });

    process.env.NODE_ENV = 'production';
    expect(decideCors('http://localhost:3000').allow).toBe(false);
  });
});

describe('PREVIEW_PATTERN regex', () => {
  it('matches branch-form preview URLs', () => {
    expect(
      PREVIEW_PATTERN.test(
        'https://constructs-network-feature-foo-0xhoneyjar-s-team.vercel.app',
      ),
    ).toBe(true);
  });

  it('matches git-prefixed preview URLs', () => {
    expect(
      PREVIEW_PATTERN.test(
        'https://constructs-network-git-feature-baz-0xhoneyjar-s-team.vercel.app',
      ),
    ).toBe(true);
  });

  it('rejects URLs from other team namespaces', () => {
    expect(
      PREVIEW_PATTERN.test(
        'https://constructs-network-feature-foo-other-team.vercel.app',
      ),
    ).toBe(false);
  });

  it('rejects URLs from other projects in same team', () => {
    expect(
      PREVIEW_PATTERN.test(
        'https://other-app-feature-foo-0xhoneyjar-s-team.vercel.app',
      ),
    ).toBe(false);
  });

  it('rejects http (must be https)', () => {
    expect(
      PREVIEW_PATTERN.test(
        'http://constructs-network-feature-foo-0xhoneyjar-s-team.vercel.app',
      ),
    ).toBe(false);
  });
});

describe('previewMutationGuard middleware', () => {
  const previewOrigin =
    'https://constructs-network-feature-foo-0xhoneyjar-s-team.vercel.app';

  it('allows GET on browse paths from preview origins', async () => {
    const app = new Hono();
    app.use('*', previewMutationGuard);
    app.get('/v1/constructs', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/constructs', {
      method: 'GET',
      headers: { Origin: previewOrigin },
    });
    expect(res.status).toBe(200);
  });

  it('blocks POST on non-browse paths from preview origins', async () => {
    const app = new Hono();
    app.use('*', previewMutationGuard);
    app.post('/v1/admin/refresh-registry', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/admin/refresh-registry', {
      method: 'POST',
      headers: { Origin: previewOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ commit_sha: 'abc' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows POST on browse paths from preview origins (rare but valid)', async () => {
    // /v1/constructs is browse — even POST passes through (no actual POST
    // handler exists, but the guard does not block).
    const app = new Hono();
    app.use('*', previewMutationGuard);
    app.post('/v1/constructs', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/constructs', {
      method: 'POST',
      headers: { Origin: previewOrigin, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });

  it('does not block requests without an Origin header', async () => {
    const app = new Hono();
    app.use('*', previewMutationGuard);
    app.post('/v1/admin/refresh-registry', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/admin/refresh-registry', {
      method: 'POST',
      // no Origin header — server-to-server / curl
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });

  it('does not block production origins', async () => {
    const app = new Hono();
    app.use('*', previewMutationGuard);
    app.post('/v1/admin/refresh-registry', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/admin/refresh-registry', {
      method: 'POST',
      headers: {
        Origin: 'https://constructs.0xhoneyjar.xyz',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});

describe('corsMiddleware integration', () => {
  it('rejects random *.vercel.app origins (closes ADR-009 hole)', async () => {
    const app = new Hono();
    app.use('*', corsMiddleware);
    app.get('/v1/health', (c) => c.json({ status: 'healthy' }));

    const res = await app.request('/v1/health', {
      method: 'GET',
      headers: { Origin: 'https://random-app.vercel.app' },
    });
    // hono/cors omits Access-Control-Allow-Origin when origin is denied
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('allows canonical origin and echoes it back', async () => {
    const app = new Hono();
    app.use('*', corsMiddleware);
    app.get('/v1/health', (c) => c.json({ status: 'healthy' }));

    const res = await app.request('/v1/health', {
      method: 'GET',
      headers: { Origin: 'https://constructs.0xhoneyjar.xyz' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://constructs.0xhoneyjar.xyz',
    );
  });
});
