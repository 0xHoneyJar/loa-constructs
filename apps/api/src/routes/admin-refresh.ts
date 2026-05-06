/**
 * POST /v1/admin/refresh-registry — webhook target (T-1.11b/c integration).
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §5.3
 *
 * Wires the auth chain (HMAC verify → nonce → rate-limit) to the
 * registry-loader's refresh() call. Triggered by the registry-refresh
 * GitHub workflow (.github/workflows/registry-refresh.yml) on merges
 * that touch registry.yaml.
 *
 * Status table per SDD §5.3:
 *   200 — refreshed: true, entries_count, commit_sha
 *   400 — body parse failed (not JSON or missing commit_sha)
 *   401 — invalid HMAC signature OR missing webhook headers OR no secret
 *   409 — replay nonce or stale/future timestamp
 *   429 — rate limit exceeded (Retry-After header set)
 *   503 — registry-loader fetch failed (gh raw down or schema regression)
 */
import { Hono } from 'hono';
import { hmacVerifyMiddleware } from '../middleware/hmac-verify.js';
import { nonceStoreMiddleware } from '../middleware/nonce-store.js';
import { rateLimitStoreMiddleware } from '../middleware/rate-limit-store.js';
import { getRegistryLoader, type RegistryLoader } from '../lib/registry-loader.js';
import { logger } from '../lib/logger.js';

export interface AdminRefreshOptions {
  /** Override the singleton (test injection) */
  loader?: RegistryLoader;
  /** Override the chained middlewares (test injection) */
  hmacOpts?: Parameters<typeof hmacVerifyMiddleware>[0];
  nonceOpts?: Parameters<typeof nonceStoreMiddleware>[0];
  rateLimitOpts?: Parameters<typeof rateLimitStoreMiddleware>[0];
}

/**
 * Build the admin-refresh router. Default-args path is the production wiring;
 * tests can pass {loader, hmacOpts, nonceOpts, rateLimitOpts} for isolation.
 */
export function adminRefreshRouter(opts: AdminRefreshOptions = {}): Hono {
  const router = new Hono();
  router.post(
    '/refresh-registry',
    hmacVerifyMiddleware(opts.hmacOpts),
    nonceStoreMiddleware(opts.nonceOpts),
    rateLimitStoreMiddleware(opts.rateLimitOpts),
    async (c) => {
      const body = c.get('verifiedBody') as string | undefined;
      let payload: { commit_sha?: string; ref?: string };
      try {
        payload = JSON.parse(body ?? '{}');
      } catch {
        return c.json({ error: 'invalid JSON body' }, 400);
      }
      if (!payload.commit_sha || typeof payload.commit_sha !== 'string') {
        return c.json({ error: 'missing or invalid commit_sha' }, 400);
      }

      const loader = opts.loader ?? getRegistryLoader();
      try {
        const state = await loader.refresh(payload.commit_sha);
        logger.info({
          msg: 'refresh-registry: cache invalidated',
          entries_count: state.entries.size,
          commit_sha: state.commit_sha,
          source: state.source,
        });
        return c.json({
          refreshed: true,
          entries_count: state.entries.size,
          commit_sha: state.commit_sha,
        });
      } catch (e) {
        logger.error({
          msg: 'refresh-registry: loader.refresh() failed',
          error: e instanceof Error ? e.message : String(e),
        });
        return c.json({ error: 'registry refresh failed' }, 503);
      }
    },
  );
  return router;
}

/** Default singleton router for app.ts to mount at `/v1/admin`. */
export const adminRefresh = adminRefreshRouter();
