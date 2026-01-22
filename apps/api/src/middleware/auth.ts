/**
 * Authentication Middleware
 * @see sprint.md T2.5: Auth Middleware
 * @see sdd.md §1.9 Security Architecture
 */

import type { MiddlewareHandler } from 'hono';
import { verifyAccessToken, verifyApiKey } from '../services/auth.js';
import { getEffectiveTier, canAccessTier, type SubscriptionTier } from '../services/subscription.js';
import { db, users, apiKeys } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';

// --- Types ---

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  role?: 'user' | 'admin' | 'super_admin';
}

// Type augmentation for Hono context
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    user: AuthUser;
    userId: string;
    authMethod: 'jwt' | 'api_key';
  }
}

// --- Helper Functions ---

/**
 * Extract token from Authorization header
 * Supports both "Bearer <token>" and raw token
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Support raw token (for API keys)
  if (authHeader.startsWith('sk_')) {
    return authHeader;
  }

  return authHeader;
}

/**
 * Get user by ID from database with effective subscription tier
 * @see sprint.md T3.4: Subscription Service
 */
async function getUserById(userId: string): Promise<AuthUser | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];

  // Get effective subscription tier (considers personal + team subscriptions)
  const effectiveTier = await getEffectiveTier(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified ?? false,
    tier: effectiveTier.tier,
    role: user.isAdmin ? 'admin' : 'user',
  };
}

/**
 * Validate API key and get associated user
 */
async function validateApiKeyAuth(token: string): Promise<AuthUser | null> {
  // Extract prefix (first 12 chars) to find candidate keys
  const prefix = token.substring(0, 12);

  const result = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      keyHash: apiKeys.keyHash,
      revoked: apiKeys.revoked,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.revoked, false)))
    .limit(10); // Limit candidates

  // Check each candidate key
  for (const key of result) {
    // Check expiry
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      continue;
    }

    // Verify the full key
    const isValid = await verifyApiKey(token, key.keyHash);
    if (isValid) {
      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id));

      // Get associated user
      return getUserById(key.userId);
    }
  }

  return null;
}

// --- Middleware ---

/**
 * Require authentication - blocks unauthenticated requests
 * Supports both JWT (Bearer token) and API key authentication
 */
export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (!token) {
      throw Errors.Unauthorized('Authentication required');
    }

    let user: AuthUser | null = null;
    let authMethod: 'jwt' | 'api_key' = 'jwt';

    // Try API key authentication first (starts with sk_)
    if (token.startsWith('sk_')) {
      user = await validateApiKeyAuth(token);
      authMethod = 'api_key';
    } else {
      // Try JWT authentication
      try {
        const payload = await verifyAccessToken(token);
        user = await getUserById(payload.sub);
        authMethod = 'jwt';
      } catch {
        throw Errors.InvalidToken();
      }
    }

    if (!user) {
      throw Errors.InvalidToken();
    }

    // Attach user to context
    c.set('user', user);
    c.set('userId', user.id);
    c.set('authMethod', authMethod);

    await next();
  };
};

/**
 * Optional authentication - allows unauthenticated requests but attaches user if present
 */
export const optionalAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (token) {
      let user: AuthUser | null = null;
      let authMethod: 'jwt' | 'api_key' = 'jwt';

      // Try API key authentication first
      if (token.startsWith('sk_')) {
        user = await validateApiKeyAuth(token);
        authMethod = 'api_key';
      } else {
        // Try JWT authentication
        try {
          const payload = await verifyAccessToken(token);
          user = await getUserById(payload.sub);
          authMethod = 'jwt';
        } catch {
          // Invalid token, continue without auth
        }
      }

      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
        c.set('authMethod', authMethod);
      }
    }

    await next();
  };
};

/**
 * Require email verification - blocks users who haven't verified email
 * Must be used after requireAuth
 */
export const requireVerifiedEmail = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw Errors.Unauthorized('Authentication required');
    }

    if (!user.emailVerified) {
      throw Errors.Forbidden('Email verification required');
    }

    await next();
  };
};

/**
 * Require specific subscription tier
 * Must be used after requireAuth
 * @see sprint.md T3.4: "canAccessTier(userTier, requiredTier) - tier hierarchy"
 */
export const requireTier = (requiredTier: SubscriptionTier): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw Errors.Unauthorized('Authentication required');
    }

    if (!canAccessTier(user.tier, requiredTier)) {
      throw Errors.TierUpgradeRequired(requiredTier, user.tier);
    }

    await next();
  };
};
