/**
 * Public Keys Service
 * Manages RSA public keys for JWT signature verification
 * @see sdd-license-jwt-rs256.md §5.1 Public Keys Service
 * @see prd-license-jwt-rs256.md FR-3: Public Key Endpoint
 */

import { db, publicKeys } from '../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { getPublicKey, getKeyId } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Errors } from '../lib/errors.js';

// --- Types ---

export interface PublicKeyResponse {
  key_id: string;
  algorithm: string;
  public_key: string;
  expires_at: string | null;
}

// --- Functions ---

/**
 * Get public key by ID
 * Falls back to environment key if key_id matches current or is 'default'
 *
 * @param keyId - Key identifier from JWT kid header, or 'default'
 * @returns Public key details
 * @throws NotFound error if key doesn't exist
 */
export async function getPublicKeyById(keyId: string): Promise<PublicKeyResponse> {
  const currentKeyId = getKeyId();

  // Handle 'default' alias - maps to current key
  const lookupId = keyId === 'default' ? currentKeyId : keyId;

  // Check database first (supports key rotation)
  const [dbKey] = await db
    .select()
    .from(publicKeys)
    .where(and(eq(publicKeys.keyId, lookupId), isNull(publicKeys.revokedAt)))
    .limit(1);

  if (dbKey) {
    logger.debug({ keyId: lookupId, source: 'database' }, 'Public key found in database');
    return {
      key_id: dbKey.keyId,
      algorithm: dbKey.algorithm,
      public_key: dbKey.publicKey,
      expires_at: dbKey.expiresAt?.toISOString() ?? null,
    };
  }

  // Fall back to environment key if matches current key ID
  if (lookupId === currentKeyId) {
    try {
      const envPublicKey = getPublicKey();
      logger.debug({ keyId: lookupId, source: 'environment' }, 'Public key found in environment');
      return {
        key_id: currentKeyId,
        algorithm: 'RS256',
        public_key: envPublicKey,
        expires_at: null, // Environment keys don't have explicit expiry
      };
    } catch {
      // Key not in env, fall through to not found
    }
  }

  logger.warn({ keyId: lookupId }, 'Public key not found');
  throw Errors.NotFound(`Public key not found: ${keyId}`);
}

/**
 * Get current signing key metadata
 * Used by license service to determine key ID for JWT header
 *
 * @returns Current key ID and algorithm
 */
export async function getCurrentKeyMetadata(): Promise<{ keyId: string; algorithm: string }> {
  return {
    keyId: getKeyId(),
    algorithm: 'RS256',
  };
}

/**
 * Register a new public key in database
 * Used for key rotation - stores key for future verification
 *
 * @param keyId - Unique key identifier
 * @param publicKeyPem - PEM-encoded public key
 * @param options - Optional settings (expiresAt, makeCurrent)
 */
export async function registerPublicKey(
  keyId: string,
  publicKeyPem: string,
  options?: {
    expiresAt?: Date;
    makeCurrent?: boolean;
  }
): Promise<void> {
  const { expiresAt, makeCurrent = false } = options ?? {};

  await db.transaction(async (tx) => {
    // If making this key current, unset previous current key
    if (makeCurrent) {
      await tx.update(publicKeys).set({ isCurrent: false }).where(eq(publicKeys.isCurrent, true));
    }

    // Insert new key
    await tx.insert(publicKeys).values({
      keyId,
      algorithm: 'RS256',
      publicKey: publicKeyPem,
      expiresAt,
      isCurrent: makeCurrent,
    });
  });

  logger.info({ keyId, makeCurrent }, 'Public key registered');
}

/**
 * Revoke a public key
 * Revoked keys will not be returned by getPublicKeyById
 *
 * @param keyId - Key identifier to revoke
 */
export async function revokePublicKey(keyId: string): Promise<void> {
  await db
    .update(publicKeys)
    .set({ revokedAt: new Date() })
    .where(eq(publicKeys.keyId, keyId));

  logger.info({ keyId }, 'Public key revoked');
}
