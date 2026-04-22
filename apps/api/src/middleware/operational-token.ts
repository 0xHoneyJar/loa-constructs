/**
 * Operational Admin Token Middleware — cycle-002 L0
 *
 * Hand-rolled shared-secret bypass for admin endpoints, scoped to operational
 * bootstrap: discovery init, cron-driven re-scans, CI/CD admin hooks.
 *
 * This is NOT user-level auth. It's a shared secret per the 2026-04-13 sovereign
 * auth pivot ("we should not be using dynamic; we're building from the bottom up,
 * so I think we should use better auth"). Unblocks operational flows while
 * constructs.network is still on Dynamic Labs (ADR-003), before the planned
 * Freeside JWKS migration ([[freeside-as-identity-spine]]).
 *
 * @see grimoires/loa-constructs-seed-2026-04-21/cycle-002-SEED-artisan-lifecycle-walk.md §5 L0
 * @see ~/hivemind/wiki/concepts/freeside-as-identity-spine.md
 * @see ~/hivemind/wiki/concepts/sign-in-with-thj.md
 *
 * Security:
 *   - Env-gated: CONSTRUCTS_ADMIN_TOKEN unset → middleware is no-op (falls through)
 *   - Constant-time comparison (no timing oracle)
 *   - Token never logged
 *   - Scoped to adminRouter only
 *   - Audit rows tagged with operational_token source
 *   - Prefix requirement (cto_) is defense-in-depth against accidental env injection
 *
 * Usage (operator):
 *   export CONSTRUCTS_ADMIN_TOKEN="cto_$(openssl rand -hex 32)"
 *   # Deploy env to Railway / local .env
 *   curl -X POST https://api.constructs.network/v1/admin/discover \
 *        -H "Authorization: Bearer $CONSTRUCTS_ADMIN_TOKEN"
 */

import type { MiddlewareHandler } from 'hono';
import { timingSafeEqual } from 'crypto';
import { requireAuth, type AuthUser } from './auth.js';
import { requireAdmin } from './admin.js';
import { logger } from '../lib/logger.js';

/**
 * Sentinel user ID written to Hono context when operational token is accepted.
 * Stays a string for ContextVariableMap type compatibility. Downstream services
 * that persist userId to DB MUST detect this sentinel and coerce to null before
 * insert — see `createAuditLog` in services/audit.ts for the reference pattern.
 */
export const OPERATIONAL_TOKEN_USER_ID = '00000000-0000-0000-0000-000000000000';

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

// Extend Hono context to carry the operational flag.
declare module 'hono' {
  interface ContextVariableMap {
    isOperationalToken: boolean;
  }
}

/**
 * Composite middleware for admin endpoints.
 *
 * Decision tree:
 *   1. CONSTRUCTS_ADMIN_TOKEN env set AND request carries matching `Bearer cto_...` ?
 *      → synthesize operational admin context, skip user auth chain
 *   2. Otherwise
 *      → fall through to requireAuth() + requireAdmin() (user JWT / API key path)
 *
 * Replaces the two-line `requireAuth() + requireAdmin()` stack on adminRouter.
 */
export const requireAdminAccess = (): MiddlewareHandler => {
  const userAuth = requireAuth();
  const adminCheck = requireAdmin();

  return async (c, next) => {
    const expected = process.env.CONSTRUCTS_ADMIN_TOKEN;

    if (expected && isValidTokenFormat(expected)) {
      const authHeader = c.req.header('Authorization') || '';
      const presented = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

      if (isValidTokenFormat(presented) && constantTimeEqual(presented, expected)) {
        const opsUser: AuthUser = {
          id: OPERATIONAL_TOKEN_USER_ID,
          email: 'operational-token@constructs.network',
          name: 'Operational Token',
          emailVerified: true,
          tier: 'enterprise',
          role: 'admin',
          isOrgMember: true,
          isVerifier: false,
          walletAddress: null,
        };
        c.set('user', opsUser);
        c.set('userId', OPERATIONAL_TOKEN_USER_ID);
        c.set('authMethod', 'jwt');
        c.set('isOrgMember', true);
        c.set('isOperationalToken', true);

        logger.info(
          {
            event: 'admin.operational_token_used',
            path: c.req.path,
            method: c.req.method,
            requestId: c.get('requestId'),
          },
          'Operational admin token accepted'
        );

        return next();
      }
    }

    return userAuth(c, async () => {
      await adminCheck(c, next);
    });
  };
};
