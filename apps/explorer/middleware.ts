import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Dashboard auth gate — validates JWT structure, not just cookie existence.
 * Full signature verification happens API-side; this prevents obviously
 * invalid tokens from reaching dashboard pages.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/?login=required', request.url));
  }

  // Validate JWT structure: header.payload.signature (3 base64url segments)
  const parts = token.split('.');
  if (parts.length !== 3) {
    // Not a JWT — clear the invalid cookie and redirect
    const response = NextResponse.redirect(new URL('/?login=required', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // Check expiry from payload (base64url decode, no signature verification)
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Expired — let the client-side refresh flow handle it, don't block
      // The API will reject the expired token and trigger refresh
      return NextResponse.next();
    }
  } catch {
    // Malformed payload — clear and redirect
    const response = NextResponse.redirect(new URL('/?login=required', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
