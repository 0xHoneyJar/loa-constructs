/**
 * Dynamic Labs JWT Verification
 * @see sdd.md §5.2 JWKS Verification Module
 * @see midi-interface/lib/verify-jwt.ts (ecosystem pattern)
 *
 * Verifies Dynamic Labs JWTs using RS256 via JWKS endpoint.
 * Uses jose (already in project) — no new dependencies needed.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

// --- Types ---

export interface DynamicVerifiedCredential {
  address?: string;
  chain?: string;
  format?: string;
  oauthProvider?: string;
  oauthUsername?: string;
  oauthAccountId?: string;
}

export interface DynamicJWTPayload {
  sub: string; // Dynamic user ID
  aud?: string; // Environment ID
  iss?: string; // https://app.dynamic.xyz/{envId}
  verified_credentials?: DynamicVerifiedCredential[];
  scopes?: string[];
}

// --- JWKS Setup ---

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
    if (!envId) {
      throw new Error('DYNAMIC_ENVIRONMENT_ID environment variable is required');
    }
    const jwksUrl = new URL(
      `https://app.dynamicauth.com/api/v0/sdk/${envId}/.well-known/jwks`
    );
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

// --- Verification ---

/**
 * Verify a Dynamic Labs JWT using RS256 via JWKS.
 *
 * @param token - Dynamic Labs JWT from getAuthToken()
 * @returns Verified payload with sub, verified_credentials, scopes
 * @throws Error if verification fails or token requires additional auth
 */
export async function verifyDynamicJWT(token: string): Promise<DynamicJWTPayload> {
  const envId = process.env.DYNAMIC_ENVIRONMENT_ID;
  if (!envId) {
    throw new Error('DYNAMIC_ENVIRONMENT_ID environment variable is required');
  }

  // Dynamic Labs migrated from app.dynamic.xyz to app.dynamicauth.com
  const expectedIssuers = [
    `https://app.dynamic.xyz/${envId}`,
    `app.dynamicauth.com/${envId}`,
  ];

  const { payload } = await jwtVerify(token, getJWKS(), {
    clockTolerance: 30,
    algorithms: ['RS256'],
    issuer: expectedIssuers,
  });

  // Reject tokens that require additional authentication steps
  const scopes = (payload as Record<string, unknown>).scopes as string[] | undefined;
  if (scopes?.includes('requiresAdditionalAuth')) {
    throw new Error('Additional authentication required');
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('JWT missing valid sub claim');
  }

  return payload as unknown as DynamicJWTPayload;
}

/**
 * Extract wallet address from Dynamic JWT payload.
 * Returns lowercased address for EVM normalization.
 */
export function extractWalletAddress(payload: DynamicJWTPayload): string | null {
  const cred = payload.verified_credentials?.find(
    (c) => c.address && c.format !== 'oauth'
  );
  return cred?.address?.toLowerCase() ?? null;
}

/**
 * Extract GitHub social credential from Dynamic JWT payload.
 */
export function extractGitHubCredential(
  payload: DynamicJWTPayload
): { username: string; accountId: string } | null {
  const cred = payload.verified_credentials?.find(
    (c) => c.oauthProvider === 'github'
  );
  if (!cred?.oauthUsername || !cred?.oauthAccountId) return null;
  return { username: cred.oauthUsername, accountId: cred.oauthAccountId };
}
