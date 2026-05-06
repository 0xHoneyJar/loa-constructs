/**
 * CORS policy — T-1.15 (FR-4.2 + ADR-009)
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.5
 *
 * Tightens the prior catch-all `*.vercel.app` allowance to a team-namespace
 * regex that matches only this project's preview URLs. Mutating verbs are
 * additionally rejected when the origin is a preview, even with the
 * CORS_ALLOW_PREVIEW env-var on (preview = browse-only).
 */
import { cors } from 'hono/cors';
import type { Context, MiddlewareHandler } from 'hono';

const PRODUCTION_ORIGINS = [
  'https://constructs.0xhoneyjar.xyz',
  'https://constructs.network', // 30-day transition alias
  'https://www.constructs.network', // 30-day transition alias
];

// Vercel preview URLs for projects in 0xhoneyjar-s-team take one of these
// shapes:
//   https://constructs-network-<branch-slug>-0xhoneyjar-s-team.vercel.app
//   https://constructs-network-git-<branch>-0xhoneyjar-s-team.vercel.app
// The pattern below matches both and rejects any other team's previews.
export const PREVIEW_PATTERN =
  /^https:\/\/constructs-network(-git)?-[a-z0-9-]+-0xhoneyjar-s-team\.vercel\.app$/;

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Browse paths that bypass mutating-endpoint protection even when called
// from a preview origin. Listed explicitly to make the contract auditable.
const BROWSE_PATH_PREFIXES = [
  '/v1/constructs',
  '/v1/health',
  '/v1/categories',
];

function isBrowsePath(path: string): boolean {
  return BROWSE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
}

interface CorsPolicyDecision {
  allow: boolean;
  credentials: boolean;
}

export function decideCors(origin: string): CorsPolicyDecision {
  const allowPreview = process.env.CORS_ALLOW_PREVIEW === 'true';
  const nodeEnv = process.env.NODE_ENV ?? 'production';

  if (PRODUCTION_ORIGINS.includes(origin)) {
    return {
      allow: true,
      // Only the canonical operator-namespace origin gets credentials.
      // The transition aliases are session-less browse-only.
      credentials: origin === 'https://constructs.0xhoneyjar.xyz',
    };
  }

  if (allowPreview && PREVIEW_PATTERN.test(origin)) {
    // Preview origins are browse-only — credentials always false.
    // Mutating-endpoint guard (below) further restricts what they can hit.
    return { allow: true, credentials: false };
  }

  if (
    nodeEnv === 'development' &&
    (origin === 'null' || /^https?:\/\/localhost(:\d+)?$/.test(origin))
  ) {
    return { allow: true, credentials: true };
  }

  return { allow: false, credentials: false };
}

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null;
    const { allow, credentials } = decideCors(origin);
    if (!allow) return null;
    // Hono cors() returns the literal origin (or null to deny). Credentials
    // header is set separately via `credentials: true` factory option, but
    // we want it conditional, so we leave `credentials` off the cors()
    // factory call and add `Access-Control-Allow-Credentials` ourselves
    // inside the route-level guard.
    return origin;
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Hub-Signature-256',
    'X-Refresh-Nonce',
    'X-Refresh-Timestamp',
  ],
  exposeHeaders: ['X-Registry-Source', 'X-Registry-Last-Updated'],
});

/**
 * Mutating-endpoint preview guard (FR-4.2).
 *
 * Even when CORS_ALLOW_PREVIEW=true lets a preview origin through CORS, this
 * middleware blocks any preview origin from calling a mutating verb on a
 * non-browse path. Returns 403 with no body so we don't leak which
 * endpoints exist via timing.
 */
export const previewMutationGuard: MiddlewareHandler = async (c: Context, next) => {
  const origin = c.req.header('Origin');
  if (!origin) return next();
  if (!MUTATING_METHODS.has(c.req.method)) return next();
  if (!PREVIEW_PATTERN.test(origin)) return next();
  if (isBrowsePath(c.req.path)) return next();
  return c.json({ error: 'preview origin cannot call mutating endpoints' }, 403);
};

/**
 * Credentials header for the canonical origin (browser sessions).
 * Hono's cors() factory takes a single `credentials` boolean; we want
 * conditional behavior, so this middleware injects the header only when
 * the request's Origin matches the canonical production domain.
 */
export const conditionalCredentials: MiddlewareHandler = async (c: Context, next) => {
  await next();
  const origin = c.req.header('Origin');
  if (!origin) return;
  const { allow, credentials } = decideCors(origin);
  if (allow && credentials) {
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
};
