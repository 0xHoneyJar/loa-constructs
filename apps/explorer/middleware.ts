import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decode base64url to string — handles missing padding that atob requires.
 * JWT payloads use base64url (RFC 7515) which omits padding.
 */
function decodeBase64Url(str: string): string {
  // base64url → base64: replace URL-safe chars, add padding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Dashboard auth gate — validates JWT structure and expiry.
 *
 * This is NOT signature verification (that happens API-side with the RS256
 * public key). This gate prevents:
 * - Empty/missing cookies from reaching dashboard pages
 * - Obviously non-JWT values (must be 3 base64url segments)
 * - Expired tokens (redirect to refresh flow)
 * - Malformed payloads (clear cookie, redirect)
 *
 * An attacker CAN craft a 3-segment token that passes this gate (e.g. e30.e30.e30).
 * That's acceptable — the API rejects it with 401, triggering the client refresh
 * flow which will redirect to login if the refresh token is also invalid.
 * The middleware is a UX gate, not a security boundary.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/?login=required', request.url));
  }

  // Validate JWT structure: header.payload.signature (3 base64url segments)
  // Base64url charset: [A-Za-z0-9_-]+
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => p.length === 0 || !/^[A-Za-z0-9_-]+$/.test(p))) {
    const response = NextResponse.redirect(new URL('/?login=required', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // Check expiry from payload (no signature verification)
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (typeof payload !== 'object' || payload === null) throw new Error('not an object');
    if (payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      // Expired — let client-side refresh flow handle it
      return NextResponse.next();
    }
  } catch {
    const response = NextResponse.redirect(new URL('/?login=required', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
