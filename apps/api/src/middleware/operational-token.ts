import type { MiddlewareHandler } from 'hono';
import { timingSafeEqual } from 'crypto';
import { logger } from '../lib/logger.js';

/**
 * Operational-token middleware — cycle-012 scope (SDD §6.1)
 *
 * Shared-secret gate for `/v1/admin/*` endpoints. No user-auth fallback —
 * cycle-012 removed the OAuth / Dynamic surface entirely. If
 * CONSTRUCTS_ADMIN_TOKEN is unset, admin endpoints become unreachable.
 *
 * Security:
 *   - Constant-time comparison (no timing oracle)
 *   - Token never logged
 *   - Prefix requirement (`cto_`) = defense-in-depth against env-var
 *     injection of arbitrary non-token strings
 *   - Fingerprint (first 8 hex of SHA-256(token)) captured by callers for
 *     the `discovery_runs.triggered_by_fingerprint` audit column
 *
 * @see ~/hivemind/wiki/concepts/saas-exit-vectors.md — instance-1 rationale
 */

const TOKEN_PREFIX = 'cto_';
const MIN_TOKEN_LENGTH = TOKEN_PREFIX.length + 32;

function isValidTokenFormat(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length >= MIN_TOKEN_LENGTH;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export const operationalToken: MiddlewareHandler = async (c, next) => {
  const expected = process.env.CONSTRUCTS_ADMIN_TOKEN;

  if (!expected || !isValidTokenFormat(expected)) {
    return c.json(
      {
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Admin access not configured',
        },
        request_id: c.get('requestId'),
      },
      503
    );
  }

  const authHeader = c.req.header('Authorization') || '';
  const presented = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!isValidTokenFormat(presented) || !constantTimeEqual(presented, expected)) {
    logger.warn(
      {
        event: 'admin.operational_token_rejected',
        path: c.req.path,
        method: c.req.method,
        requestId: c.get('requestId'),
      },
      'Operational admin token rejected'
    );

    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Valid operational token required',
        },
        request_id: c.get('requestId'),
      },
      401
    );
  }

  logger.info(
    {
      event: 'admin.operational_token_accepted',
      path: c.req.path,
      method: c.req.method,
      requestId: c.get('requestId'),
    },
    'Operational admin token accepted'
  );

  return next();
};
