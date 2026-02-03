/**
 * License Service
 * @see sprint.md T4.3: License Service
 * @see prd.md FR-4: License Enforcement
 * @see sdd-license-jwt-rs256.md §5.2 License Service Updates
 */

import * as jose from 'jose';
import { createHash, randomBytes } from 'crypto';
import { db, licenses, skills, subscriptions } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import {
  env,
  getPrivateKey,
  getPublicKey,
  isRS256Available,
  isHS256Available,
} from '../config/env.js';
import { logger } from '../lib/logger.js';
import { type SubscriptionTier, canAccessTier } from './subscription.js';
import { getCurrentKeyMetadata } from './public-keys.js';

// --- Types ---

export interface LicensePayload {
  /** User ID */
  sub: string;
  /** Skill slug */
  skill: string;
  /** Skill version */
  version: string;
  /** User's tier at time of issuance */
  tier: SubscriptionTier;
  /** Unique watermark for tracking */
  watermark: string;
  /** License ID in database */
  lid: string;
}

export interface LicenseToken {
  token: string;
  payload: LicensePayload;
  expiresAt: Date;
}

export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
  payload?: LicensePayload;
  expiresAt?: Date;
}

// --- Constants ---

/**
 * License token issuer
 */
const LICENSE_ISSUER = 'https://api.constructs.network';

/**
 * License token audience
 */
const LICENSE_AUDIENCE = 'loa-constructs-client';

/**
 * Default license duration (30 days) for free tier
 */
const FREE_LICENSE_DURATION_DAYS = 30;

// --- Helper Functions ---

/**
 * Generate unique watermark hash
 * Contains user ID and timestamp for tracking
 */
export function generateWatermark(userId: string): string {
  const data = `${userId}:${Date.now()}:${randomBytes(8).toString('hex')}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Get JWT secret for HS256 license signing (deprecated)
 */
function getSecret(): Uint8Array {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

/**
 * Get signing credentials for license generation
 * Prefers RS256 (asymmetric) over HS256 (symmetric)
 * @see sdd-license-jwt-rs256.md §5.2 License Service Updates
 */
async function getSigningCredentials(): Promise<{
  key: Uint8Array | jose.KeyLike;
  algorithm: 'RS256' | 'HS256';
  keyId?: string;
}> {
  // Prefer RS256 (asymmetric key pair)
  if (isRS256Available()) {
    const privateKeyPem = getPrivateKey();
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
    const keyMeta = await getCurrentKeyMetadata();
    return {
      key: privateKey,
      algorithm: 'RS256',
      keyId: keyMeta.keyId,
    };
  }

  // Fall back to HS256 (deprecated) - no keyId for legacy HS256 tokens
  if (isHS256Available()) {
    logger.warn('Using deprecated HS256 signing - configure RS256 keys for production');
    return {
      key: getSecret(),
      algorithm: 'HS256',
      keyId: undefined,
    };
  }

  throw new Error('No signing key configured - set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY or JWT_SECRET');
}

// --- Core Functions ---

/**
 * Generate a license token for skill download
 * @see sprint.md T4.3: "Generate license tokens with: User ID, Skill slug, Version, Tier, Expiry, Watermark"
 */
export async function generateLicense(
  userId: string,
  skillSlug: string,
  version: string,
  tier: SubscriptionTier,
  subscriptionEndDate: Date | null
): Promise<LicenseToken> {
  // Determine expiry date
  let expiresAt: Date;
  if (subscriptionEndDate && tier !== 'free') {
    // Paid subscription: license valid until subscription end + 7 day grace period
    expiresAt = new Date(subscriptionEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    // Free tier or no subscription end: 30 days from now
    expiresAt = new Date(Date.now() + FREE_LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
  }

  // Generate watermark
  const watermark = generateWatermark(userId);

  // Get skill ID
  const skillRecord = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.slug, skillSlug))
    .limit(1);

  if (skillRecord.length === 0) {
    throw new Error(`Skill not found: ${skillSlug}`);
  }

  // Get user's active subscription (if any)
  const userSubscription = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .limit(1);

  // Create license record in database
  const licenseRecord = await db
    .insert(licenses)
    .values({
      userId,
      skillId: skillRecord[0].id,
      subscriptionId: userSubscription.length > 0 ? userSubscription[0].id : null,
      watermark,
      expiresAt,
    })
    .returning();

  const license = licenseRecord[0];

  // Create JWT payload
  const payload: LicensePayload = {
    sub: userId,
    skill: skillSlug,
    version,
    tier,
    watermark,
    lid: license.id,
  };

  // Get signing credentials (RS256 preferred, HS256 fallback)
  const { key, algorithm, keyId } = await getSigningCredentials();

  // Build header - only include kid for RS256 tokens
  const header: jose.JWTHeaderParameters = {
    alg: algorithm,
    typ: 'JWT',
  };
  if (algorithm === 'RS256' && keyId) {
    header.kid = keyId;
  }

  // Sign token
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader(header)
    .setIssuedAt()
    .setIssuer(LICENSE_ISSUER)
    .setAudience(LICENSE_AUDIENCE)
    .setExpirationTime(expiresAt)
    .sign(key);

  logger.info(
    { userId, skillSlug, version, tier, watermark, licenseId: license.id, algorithm, keyId },
    'License generated'
  );

  return {
    token,
    payload,
    expiresAt,
  };
}

/**
 * Validate a license token
 * Validates based on the token's alg header to prevent algorithm confusion attacks
 * @see sprint.md T4.3: "Validate licenses (check signature, expiry, tier)"
 * @see sdd-license-jwt-rs256.md §5.2 License Service Updates
 */
export async function validateLicense(token: string): Promise<LicenseValidationResult> {
  // Decode the protected header to determine algorithm
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch {
    return { valid: false, reason: 'Invalid license token' };
  }

  // Validate based on the token's declared algorithm (prevents algorithm confusion)
  if (header.alg === 'RS256') {
    if (!isRS256Available()) {
      return { valid: false, reason: 'No validation key configured for RS256' };
    }

    try {
      const publicKeyPem = getPublicKey();
      const publicKey = await jose.importSPKI(publicKeyPem, 'RS256');

      const { payload } = await jose.jwtVerify(token, publicKey, {
        issuer: LICENSE_ISSUER,
        audience: LICENSE_AUDIENCE,
        algorithms: ['RS256'], // Explicitly restrict to RS256
      });

      return await validateLicensePayload(payload);
    } catch (error) {
      return handleValidationError(error);
    }
  }

  if (header.alg === 'HS256') {
    // HS256 tokens accepted for backward compatibility during grace period
    if (!isHS256Available()) {
      return { valid: false, reason: 'No validation key configured for HS256' };
    }
    return await validateLicenseHS256(token);
  }

  // Reject unknown algorithms
  return { valid: false, reason: `Unsupported algorithm: ${header.alg}` };
}

/**
 * HS256 validation (deprecated, for backward compatibility)
 * @see sdd-license-jwt-rs256.md §5.2 - 30-day grace period for HS256 tokens
 */
async function validateLicenseHS256(token: string): Promise<LicenseValidationResult> {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: LICENSE_ISSUER,
      audience: LICENSE_AUDIENCE,
      algorithms: ['HS256'], // Explicitly restrict to HS256
    });

    // Log deprecation warning for monitoring
    const licensePayload = payload as unknown as LicensePayload & jose.JWTPayload;
    logger.warn(
      { lid: licensePayload.lid, skill: licensePayload.skill },
      'HS256 token validated - user should refresh license for RS256'
    );

    return await validateLicensePayload(payload);
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * Common payload validation after signature verification
 * Checks database for revocation and expiry
 */
async function validateLicensePayload(
  payload: jose.JWTPayload
): Promise<LicenseValidationResult> {
  const licensePayload = payload as unknown as LicensePayload & jose.JWTPayload;

  // Check if license exists and isn't revoked
  const licenseRecord = await db
    .select({
      id: licenses.id,
      revoked: licenses.revoked,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .where(eq(licenses.id, licensePayload.lid))
    .limit(1);

  if (licenseRecord.length === 0) {
    return { valid: false, reason: 'License not found in database' };
  }

  if (licenseRecord[0].revoked) {
    return { valid: false, reason: 'License has been revoked' };
  }

  // Check expiry (JWT verification already does this, but double-check DB)
  const expiresAt = licenseRecord[0].expiresAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return { valid: false, reason: 'License has expired' };
  }

  return {
    valid: true,
    payload: {
      sub: licensePayload.sub,
      skill: licensePayload.skill,
      version: licensePayload.version,
      tier: licensePayload.tier as SubscriptionTier,
      watermark: licensePayload.watermark,
      lid: licensePayload.lid,
    },
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  };
}

/**
 * Handle JWT validation errors
 */
function handleValidationError(error: unknown): LicenseValidationResult {
  if (error instanceof jose.errors.JWTExpired) {
    return { valid: false, reason: 'License token has expired' };
  }
  if (
    error instanceof jose.errors.JWTInvalid ||
    error instanceof jose.errors.JWSSignatureVerificationFailed
  ) {
    return { valid: false, reason: 'Invalid license token' };
  }

  logger.error({ error }, 'License validation failed');
  return { valid: false, reason: 'License validation failed' };
}

/**
 * Check if user can access a skill based on tier
 */
export async function canAccessSkill(
  userTier: SubscriptionTier,
  skillSlug: string
): Promise<{ allowed: boolean; requiredTier: SubscriptionTier }> {
  const skillRecord = await db
    .select({ tierRequired: skills.tierRequired })
    .from(skills)
    .where(eq(skills.slug, skillSlug))
    .limit(1);

  if (skillRecord.length === 0) {
    throw new Error(`Skill not found: ${skillSlug}`);
  }

  const requiredTier = skillRecord[0].tierRequired as SubscriptionTier;
  const allowed = canAccessTier(userTier, requiredTier);

  return { allowed, requiredTier };
}

/**
 * Revoke a license
 */
export async function revokeLicense(licenseId: string, reason: string): Promise<void> {
  await db
    .update(licenses)
    .set({
      revoked: true,
      revokedAt: new Date(),
      revokeReason: reason,
    })
    .where(eq(licenses.id, licenseId));

  logger.info({ licenseId, reason }, 'License revoked');
}

/**
 * Get user's active licenses for a skill
 */
export async function getUserLicensesForSkill(
  userId: string,
  skillSlug: string
): Promise<Array<{ id: string; watermark: string; expiresAt: Date; revoked: boolean }>> {
  const result = await db
    .select({
      id: licenses.id,
      watermark: licenses.watermark,
      expiresAt: licenses.expiresAt,
      revoked: licenses.revoked,
    })
    .from(licenses)
    .innerJoin(skills, eq(licenses.skillId, skills.id))
    .where(and(eq(licenses.userId, userId), eq(skills.slug, skillSlug)));

  return result.map((r) => ({
    id: r.id,
    watermark: r.watermark,
    expiresAt: r.expiresAt,
    revoked: r.revoked ?? false,
  }));
}
