/**
 * Registry cache state response headers — T-1.11d (FR-1.6.7).
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.1.3
 *
 * Stamps every yaml-driven response with X-Registry-Source +
 * X-Registry-Last-Updated so downstream callers (UI, CLI, agents) can detect
 * stale-serve and act accordingly. Pulls state from the singleton registry
 * loader; if the loader hasn't been booted (e.g. in unit tests of unrelated
 * routes), the middleware is a noop.
 *
 * Apply this middleware to:
 *   - GET /v1/constructs* (yaml-source post-cutover)
 *   - GET /v1/packs (yaml-source post-cutover)
 *   - GET /v1/health (registry_status surfaces alongside)
 *
 * Webhook + admin paths intentionally do NOT carry these headers (they're
 * not yaml-driven reads).
 */
import type { MiddlewareHandler } from 'hono';
import { getRegistryLoader, type RegistryLoader } from '../lib/registry-loader.js';

export interface RegistryCacheStateOptions {
  /** Override the singleton (test injection) */
  loader?: RegistryLoader;
}

export function registryCacheStateMiddleware(
  opts: RegistryCacheStateOptions = {},
): MiddlewareHandler {
  return async (c, next) => {
    await next();

    let h: { source: string; last_updated: string } | null = null;
    try {
      const loader = opts.loader ?? getRegistryLoader();
      h = loader.health();
    } catch {
      // Loader not booted — leave headers off rather than guess.
      return;
    }

    if (!h) return;

    // Don't overwrite explicit header set by handler (defensive — handlers
    // shouldn't set these but if they do, theirs wins).
    if (!c.res.headers.has('X-Registry-Source')) {
      c.res.headers.set('X-Registry-Source', h.source);
    }
    if (!c.res.headers.has('X-Registry-Last-Updated')) {
      c.res.headers.set('X-Registry-Last-Updated', h.last_updated);
    }
  };
}
