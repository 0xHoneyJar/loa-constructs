/**
 * Dynamic Labs Auth Routes — cycle-039
 * @see sdd.md §5.1 POST /v1/auth/dynamic
 *
 * Accepts Dynamic Labs JWT, verifies via JWKS (RS256),
 * resolves or creates user, returns our API JWT.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, users } from '../db/index.js';
import { generateTokens } from '../services/auth.js';
import {
  verifyDynamicJWT,
  extractWalletAddress,
  extractGitHubCredential,
} from '../lib/verify-dynamic-jwt.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';

const dynamicAuth = new Hono();

// Rate limit: 10 req/min per IP (same as /auth/login)
dynamicAuth.use('*', authRateLimiter());

/**
 * POST /v1/auth/dynamic
 * Exchange Dynamic Labs JWT for our API JWT.
 *
 * Authorization: Bearer <dynamic_labs_jwt>
 * Returns: { access_token, refresh_token, expires_in }
 */
dynamicAuth.post('/', async (c) => {
  const requestId = c.get('requestId');

  // 1. Extract Dynamic Labs JWT from Authorization header
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw Errors.Unauthorized('Dynamic Labs JWT required in Authorization header');
  }
  const dynamicJwt = authHeader.slice(7);

  // 2. Verify JWT via JWKS (RS256)
  let payload;
  try {
    payload = await verifyDynamicJWT(dynamicJwt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JWT verification failed';
    if (message === 'Additional authentication required') {
      throw Errors.Unauthorized('Additional authentication required');
    }
    logger.warn({ error: err, requestId }, 'Dynamic JWT verification failed');
    throw Errors.InvalidToken();
  }

  const dynamicUserId = payload.sub;
  if (!dynamicUserId) {
    throw Errors.BadRequest('JWT missing sub claim');
  }

  // 3. Extract identity from verified credentials
  const walletAddress = extractWalletAddress(payload);
  const githubCred = extractGitHubCredential(payload);

  // 4. Check GitHub org membership if GitHub is linked
  // undefined = no authoritative result (preserve DB value); true/false = authoritative
  let orgMembership: boolean | undefined = undefined;
  if (githubCred) {
    const githubToken = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN;
    if (githubToken) {
      try {
        const orgRes = await fetch(
          `https://api.github.com/orgs/${env.CONSTRUCTS_ORG}/members/${githubCred.username}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (orgRes.status === 204) {
          orgMembership = true;
        } else if (orgRes.status === 404 || orgRes.status === 302) {
          orgMembership = false;
        }
        // Other status codes: non-authoritative, preserve existing DB value
      } catch (orgErr) {
        logger.warn(
          { error: orgErr, username: githubCred.username, requestId },
          'GitHub org membership check failed during Dynamic auth; preserving existing value'
        );
      }
    }
  }

  // 5. Resolve user: dynamic_user_id → wallet_address → github_username → create new
  let user = await resolveUser(dynamicUserId, walletAddress, githubCred?.username ?? null);

  if (user) {
    // Update fields that may have changed — only write org membership when authoritative
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (orgMembership !== undefined) {
      updates.githubOrgMember = orgMembership;
      updates.githubOrgCheckedAt = new Date();
    }
    if (walletAddress && !user.walletAddress) {
      updates.walletAddress = walletAddress;
    }
    if (!user.dynamicUserId) {
      updates.dynamicUserId = dynamicUserId;
    }
    if (githubCred && !user.githubUsername) {
      updates.githubUsername = githubCred.username;
      updates.githubUserId = parseInt(githubCred.accountId, 10) || null;
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));

    const effectiveOrgMember = orgMembership ?? user.githubOrgMember ?? false;
    logger.info(
      { userId: user.id, dynamicUserId, walletAddress, isOrgMember: effectiveOrgMember, requestId },
      'Dynamic auth: existing user resolved'
    );
  } else {
    // Create new user
    const email = walletAddress
      ? `${walletAddress}@wallet.constructs.network`
      : `${dynamicUserId}@dynamic.constructs.network`;

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Dynamic User',
        walletAddress,
        dynamicUserId,
        githubUsername: githubCred?.username ?? null,
        githubUserId: githubCred ? (parseInt(githubCred.accountId, 10) || null) : null,
        githubOrgMember: orgMembership ?? false,
        githubOrgCheckedAt: orgMembership !== undefined ? new Date() : null,
        emailVerified: false,
      })
      .returning({ id: users.id, email: users.email });

    user = { id: newUser.id, email: newUser.email, walletAddress, dynamicUserId, githubUsername: githubCred?.username ?? null, githubOrgMember: orgMembership ?? false };

    logger.info(
      { userId: newUser.id, dynamicUserId, walletAddress, isOrgMember: orgMembership ?? false, requestId },
      'Dynamic auth: new user created'
    );
  }

  // 6. Generate our API tokens — use effective org membership
  const effectiveOrg = user.githubOrgMember ?? orgMembership ?? false;
  const tokens = await generateTokens(user.id, user.email, effectiveOrg);

  return c.json({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
  });
});

// --- Helpers ---

interface ResolvedUser {
  id: string;
  email: string;
  walletAddress: string | null;
  dynamicUserId: string | null;
  githubUsername: string | null;
  githubOrgMember: boolean | null;
}

const userSelect = {
  id: users.id,
  email: users.email,
  walletAddress: users.walletAddress,
  dynamicUserId: users.dynamicUserId,
  githubUsername: users.githubUsername,
  githubOrgMember: users.githubOrgMember,
};

async function resolveUser(
  dynamicUserId: string,
  walletAddress: string | null,
  githubUsername: string | null
): Promise<ResolvedUser | null> {
  // Sequential lookup with deterministic precedence

  // 1. Strongest binding: Dynamic user ID
  const [byDynamic] = await db
    .select(userSelect)
    .from(users)
    .where(eq(users.dynamicUserId, dynamicUserId))
    .limit(1);
  if (byDynamic) return byDynamic;

  // 2. Wallet address
  if (walletAddress) {
    const [byWallet] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);
    if (byWallet) return byWallet;
  }

  // 3. GitHub username
  if (githubUsername) {
    const [byGithub] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.githubUsername, githubUsername))
      .limit(1);
    if (byGithub) return byGithub;
  }

  return null;
}

export { dynamicAuth };
