/**
 * Tests for registry-cache-state middleware (T-1.11d / FR-1.6.7).
 * Cycle: constructs-network-migration
 */
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { registryCacheStateMiddleware } from '../../src/middleware/registry-cache-state';
import type { RegistryLoader } from '../../src/lib/registry-loader';

function fakeLoader(state: { source: string; last_updated: string; entries_count: number } | 'throw'): RegistryLoader {
  return {
    health: () => {
      if (state === 'throw') throw new Error('not booted');
      return state;
    },
  } as unknown as RegistryLoader;
}

describe('registry-cache-state middleware', () => {
  it('stamps X-Registry-Source + X-Registry-Last-Updated when loader is booted', async () => {
    const app = new Hono();
    const loader = fakeLoader({
      source: 'fresh',
      last_updated: '2026-05-06T00:00:00Z',
      entries_count: 18,
    });
    app.use('*', registryCacheStateMiddleware({ loader }));
    app.get('/v1/constructs', (c) => c.json({ data: [], total: 0 }));

    const res = await app.request('/v1/constructs');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Registry-Source')).toBe('fresh');
    expect(res.headers.get('X-Registry-Last-Updated')).toBe('2026-05-06T00:00:00Z');
  });

  it('reflects stale source when loader reports stale', async () => {
    const app = new Hono();
    const loader = fakeLoader({
      source: 'stale',
      last_updated: '2026-05-05T00:00:00Z',
      entries_count: 18,
    });
    app.use('*', registryCacheStateMiddleware({ loader }));
    app.get('/v1/constructs', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/constructs');
    expect(res.headers.get('X-Registry-Source')).toBe('stale');
  });

  it('reflects cold-start during early boot before first fetch lands', async () => {
    const app = new Hono();
    const loader = fakeLoader({
      source: 'cold-start',
      last_updated: '2026-05-06T00:00:00Z',
      entries_count: 18,
    });
    app.use('*', registryCacheStateMiddleware({ loader }));
    app.get('/v1/constructs', (c) => c.json({ ok: true }));

    const res = await app.request('/v1/constructs');
    expect(res.headers.get('X-Registry-Source')).toBe('cold-start');
  });

  it('is a noop when loader is not booted (health() throws)', async () => {
    const app = new Hono();
    const loader = fakeLoader('throw');
    app.use('*', registryCacheStateMiddleware({ loader }));
    app.get('/anything', (c) => c.json({ ok: true }));

    const res = await app.request('/anything');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Registry-Source')).toBeNull();
    expect(res.headers.get('X-Registry-Last-Updated')).toBeNull();
  });

  it('does not overwrite headers explicitly set by the handler', async () => {
    const app = new Hono();
    const loader = fakeLoader({
      source: 'fresh',
      last_updated: '2026-05-06T00:00:00Z',
      entries_count: 18,
    });
    app.use('*', registryCacheStateMiddleware({ loader }));
    app.get('/v1/health', (c) => {
      // Handler explicitly sets a different value (e.g. for testing).
      c.res.headers.set('X-Registry-Source', 'cached');
      return c.json({ status: 'healthy' });
    });

    const res = await app.request('/v1/health');
    expect(res.headers.get('X-Registry-Source')).toBe('cached');
  });

  it('uses the module singleton when no opts.loader is provided', async () => {
    // The default export should be callable with no args. We just verify
    // that it doesn't throw at import/call time and returns a function.
    const mw = registryCacheStateMiddleware();
    expect(typeof mw).toBe('function');
  });
});
