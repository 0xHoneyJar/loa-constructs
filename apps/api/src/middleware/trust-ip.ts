import type { Context } from 'hono';

/**
 * Trusted client-IP extraction (SDD §3.2, Flatline SKP-005)
 *
 * Railway edge proxy sets X-Real-IP (and X-Forwarded-For as a chain).
 * Client-supplied values are NOT trusted — only headers the Railway edge
 * controls. If no edge header is present, fall back to the socket address.
 *
 * Extraction precedence:
 *   1. X-Real-IP (Railway sets this directly; single value)
 *   2. X-Forwarded-For left-most hop (client origin per RFC 7239 §5.2)
 *   3. Socket remote address via Hono's c.env (best-effort)
 *   4. Literal 'unknown'
 *
 * Negative-test surface (T1.5 AC): a client-supplied X-Real-IP reaching
 * this function from an off-proxy source still lands in the X-Real-IP
 * branch — edge trust is enforced at the network layer (Railway drops
 * untrusted origins), not here. This helper documents the precedence.
 */
export function trustedClientIp(c: Context): string {
  const realIp = c.req.header('x-real-ip');
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor && forwardedFor.trim().length > 0) {
    const firstHop = forwardedFor.split(',')[0];
    if (firstHop) return firstHop.trim();
  }

  const remoteAddr =
    (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket
      ?.remoteAddress;
  if (remoteAddr && remoteAddr.length > 0) return remoteAddr;

  return 'unknown';
}
