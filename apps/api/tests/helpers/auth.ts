/**
 * Shared Auth Test Helpers
 *
 * Generates real JWT tokens using jose (same library as src/services/auth.ts)
 * with the test JWT_SECRET from vitest.setup.ts.
 *
 * Tokens are verifiable by the real verifyAccessToken() code path.
 */

import { SignJWT } from 'jose';

// Must match the value set in vitest.setup.ts
const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests-only-32chars!';
const TEST_JWT_ISSUER = 'https://api.constructs.network';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(TEST_JWT_SECRET);
}

/**
 * Create Authorization headers with a valid JWT access token.
 *
 * @param userId - User ID for the sub claim (default: 'user-test-1')
 * @param email - Email for the email claim (default: 'test@constructs.network')
 * @param opts.expiresIn - Token expiration (default: '15m')
 * @param opts.jti - JWT ID for blacklist testing
 * @param opts.isOrgMember - Whether user is org member (default: false)
 * @param opts.type - Token type: 'access' or 'refresh' (default: 'access')
 */
export async function createAuthHeaders(
  userId = 'user-test-1',
  email = 'test@constructs.network',
  opts?: {
    expiresIn?: string;
    jti?: string;
    isOrgMember?: boolean;
    type?: 'access' | 'refresh';
  }
): Promise<{ Authorization: string }> {
  const now = Math.floor(Date.now() / 1000);
  const tokenType = opts?.type ?? 'access';

  const builder = new SignJWT({
    sub: userId,
    email,
    type: tokenType,
    org: opts?.isOrgMember ?? false,
    ...(opts?.jti && { jti: opts.jti }),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(TEST_JWT_ISSUER)
    .setExpirationTime(opts?.expiresIn ?? '15m');

  const token = await builder.sign(getSecretKey());
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create Authorization headers with an expired JWT.
 * Useful for testing 401 responses on expired tokens.
 */
export async function createExpiredAuthHeaders(
  userId = 'user-test-1'
): Promise<{ Authorization: string }> {
  const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

  const token = await new SignJWT({
    sub: userId,
    email: 'test@constructs.network',
    type: 'access',
    org: false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(pastTime - 900) // issued 1h15m ago
    .setIssuer(TEST_JWT_ISSUER)
    .setExpirationTime(pastTime) // expired 1h ago
    .sign(getSecretKey());

  return { Authorization: `Bearer ${token}` };
}

/**
 * Create a raw refresh token (not wrapped in headers).
 * Useful for testing POST /v1/auth/refresh and /v1/auth/logout.
 */
export async function createRefreshToken(
  userId = 'user-test-1',
  opts?: { jti?: string; expiresIn?: string }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = opts?.jti ?? crypto.randomUUID();

  return new SignJWT({
    sub: userId,
    jti,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(TEST_JWT_ISSUER)
    .setExpirationTime(opts?.expiresIn ?? '30d')
    .sign(getSecretKey());
}
