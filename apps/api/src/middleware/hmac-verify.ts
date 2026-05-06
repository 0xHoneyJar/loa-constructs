/**
 * HMAC canonical-string verification (T-1.11b · FR-1.6.1 · ADR-006).
 * Cycle: constructs-network-migration
 * SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.1.4
 *
 * Verifies the X-Hub-Signature-256 header on POST /v1/admin/refresh-registry.
 * The signature is HMAC-SHA256 of a canonical-string assembled from request
 * metadata + a body hash, which prevents replay-with-modified-headers
 * (per AWS Sig v4 / RFC 7616 patterns).
 *
 * Canonical-string format (newline-separated, MUST match server-side):
 *   METHOD \n
 *   PATH \n
 *   HOST \n
 *   X-Refresh-Nonce \n
 *   X-Refresh-Timestamp \n
 *   sha256(BODY-as-bytes)
 *
 * IMPORTANT — DEVIATION FROM SDD §2.1.4 line 283:
 * The SDD pseudocode uses `createHmac("sha256", "")` (HMAC-with-empty-key)
 * for the body hash — that's NOT the same as plain SHA-256. The T-1.0
 * workflow caller (.github/workflows/registry-refresh.yml) uses
 * `openssl dgst -sha256` (plain SHA-256), so this verifier MUST also use
 * plain SHA-256 or signatures will never validate. Logged in T-1.15 commit
 * for SDD correction.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger.js';

const SIGNATURE_HEADER = 'X-Hub-Signature-256';
const NONCE_HEADER = 'X-Refresh-Nonce';
const TIMESTAMP_HEADER = 'X-Refresh-Timestamp';

/**
 * Build the canonical-string per SDD §2.1.4.
 * Exported for testing; the middleware below is the wire-level entrypoint.
 */
export function buildCanonicalString(
  method: string,
  path: string,
  host: string,
  nonce: string,
  timestamp: string,
  body: string,
): string {
  // Plain SHA-256 of body — matches the workflow caller's `openssl dgst -sha256`.
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return [method.toUpperCase(), path, host, nonce, timestamp, bodyHash].join('\n');
}

export function verifyCanonicalHmac(
  canonical: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(canonical).digest('hex');
  const expectedHeader = `sha256=${expected}`;
  // Length check before timingSafeEqual avoids the throw-on-mismatch case.
  if (signatureHeader.length !== expectedHeader.length) return false;
  return timingSafeEqual(
    Buffer.from(signatureHeader, 'utf8'),
    Buffer.from(expectedHeader, 'utf8'),
  );
}

export interface HmacVerifyOptions {
  /** HMAC secret. Default reads from REGISTRY_REFRESH_HMAC_SECRET env. */
  secret?: string;
  /** Override Host header for canonical-string assembly. Default: from request. */
  expectedHost?: string;
}

/**
 * Hono middleware. Reads body once into context (`c.set('verifiedBody', ...)`)
 * so downstream handlers don't have to re-parse. Returns 401 on signature
 * mismatch, missing headers, or absent secret.
 */
export function hmacVerifyMiddleware(opts: HmacVerifyOptions = {}): MiddlewareHandler {
  return async (c: Context, next) => {
    const secret = opts.secret ?? process.env.REGISTRY_REFRESH_HMAC_SECRET;
    if (!secret) {
      logger.error({
        msg: 'HMAC: REGISTRY_REFRESH_HMAC_SECRET not configured',
      });
      return c.json({ error: 'webhook secret not configured' }, 401);
    }

    const sig = c.req.header(SIGNATURE_HEADER);
    const nonce = c.req.header(NONCE_HEADER);
    const timestamp = c.req.header(TIMESTAMP_HEADER);
    const host = opts.expectedHost ?? c.req.header('Host') ?? '';

    if (!sig || !nonce || !timestamp) {
      return c.json(
        { error: 'missing required webhook headers (signature/nonce/timestamp)' },
        401,
      );
    }

    // Read raw body for hashing. Hono's req.text() consumes the stream; we
    // stash the parsed value so the route handler doesn't have to re-read.
    let body: string;
    try {
      body = await c.req.text();
    } catch (e) {
      logger.warn({
        msg: 'HMAC: body read failed',
        error: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: 'body read failed' }, 401);
    }

    const canonical = buildCanonicalString(
      c.req.method,
      new URL(c.req.url).pathname,
      host,
      nonce,
      timestamp,
      body,
    );

    if (!verifyCanonicalHmac(canonical, sig, secret)) {
      logger.warn({
        msg: 'HMAC: signature mismatch',
        path: c.req.path,
        nonce: nonce.slice(0, 8) + '...',
      });
      return c.json({ error: 'invalid signature' }, 401);
    }

    // Stash verified body for downstream handler.
    c.set('verifiedBody', body);
    c.set('verifiedNonce', nonce);
    c.set('verifiedTimestamp', timestamp);
    return next();
  };
}
