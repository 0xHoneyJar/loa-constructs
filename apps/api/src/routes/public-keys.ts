/**
 * Public Keys Route
 * Provides public key retrieval for JWT signature verification
 * @see sdd-license-jwt-rs256.md §6.1 Public Keys Route
 * @see prd-license-jwt-rs256.md FR-3: Public Key Endpoint
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPublicKeyById } from '../services/public-keys.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const publicKeysRouter = new Hono();

// --- Schemas ---

/**
 * Key ID parameter validation
 * Accepts alphanumeric with dashes and underscores
 */
const keyIdParamSchema = z.object({
  keyId: z
    .string()
    .min(1, 'Key ID is required')
    .max(64, 'Key ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Key ID must be alphanumeric with dashes/underscores'),
});

// --- Routes ---

/**
 * GET /v1/public-keys/:keyId
 *
 * Retrieve public key for JWT signature verification.
 * This is a PUBLIC endpoint - no authentication required.
 *
 * The client-side license-validator.sh calls this endpoint to fetch
 * the public key needed to verify RS256 JWT signatures.
 *
 * @param keyId - Key identifier from JWT `kid` header, or "default" for current key
 * @returns PublicKeyResponse with PEM-encoded public key
 */
publicKeysRouter.get('/:keyId', zValidator('param', keyIdParamSchema), async (c) => {
  const { keyId } = c.req.valid('param');
  const requestId = c.get('requestId');

  try {
    const publicKey = await getPublicKeyById(keyId);

    // Set cache headers - 4 hours (14400 seconds)
    // This matches the public_key_cache_hours setting in .loa.config.yaml
    c.header('Cache-Control', 'public, max-age=14400');
    c.header('Vary', 'Accept');

    logger.debug({ keyId, requestId }, 'Public key retrieved');

    return c.json(publicKey, 200);
  } catch (error) {
    // Re-throw NotFound errors as-is
    if (error instanceof Error && error.message.includes('not found')) {
      throw Errors.NotFound(`Public key not found: ${keyId}`);
    }
    // Log and re-throw other errors
    logger.error({ error, keyId, requestId }, 'Error fetching public key');
    throw error;
  }
});

export { publicKeysRouter };
