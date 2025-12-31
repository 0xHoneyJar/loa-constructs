/**
 * License Service
 * @see sprint.md T4.3: License Service
 * @see prd.md FR-4: License Enforcement
 */

import * as jose from 'jose';
import { createHash, randomBytes } from 'crypto';
import { db, licenses, skills, subscriptions } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { type SubscriptionTier, canAccessTier } from './subscription.js';

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
const LICENSE_ISSUER = 'https://api.loaskills.dev';

/**
 * License token audience
 */
const LICENSE_AUDIENCE = 'loa-skills-client';

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
 * Get JWT secret for license signing
 */
function getSecret(): Uint8Array {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(env.JWT_SECRET);
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

  // Sign token
  const secret = getSecret();
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(LICENSE_ISSUER)
    .setAudience(LICENSE_AUDIENCE)
    .setExpirationTime(expiresAt)
    .sign(secret);

  logger.info(
    { userId, skillSlug, version, tier, watermark, licenseId: license.id },
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
 * @see sprint.md T4.3: "Validate licenses (check signature, expiry, tier)"
 */
export async function validateLicense(token: string): Promise<LicenseValidationResult> {
  try {
    const secret = getSecret();

    // Verify JWT signature and claims
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: LICENSE_ISSUER,
      audience: LICENSE_AUDIENCE,
    });

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
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, reason: 'License token has expired' };
    }
    if (error instanceof jose.errors.JWTInvalid || error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return { valid: false, reason: 'Invalid license token' };
    }

    logger.error({ error }, 'License validation failed');
    return { valid: false, reason: 'License validation failed' };
  }
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
