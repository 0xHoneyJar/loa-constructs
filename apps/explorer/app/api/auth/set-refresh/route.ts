import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-refresh — cycle-039
 * Sets the refresh token as an HttpOnly cookie.
 * Used by OAuth callback and Dynamic Labs auth to persist refresh tokens.
 * @see sdd.md §6.5 OAuth Refresh Fix
 */
export async function POST(request: NextRequest) {
  // CSRF: validate Origin header (mandatory for cookie-setting endpoints)
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set([
    'https://constructs.network',
    'https://www.constructs.network',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  ]);

  if (!origin || !allowedOrigins.has(origin)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // Block cross-site requests via Sec-Fetch-Site
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
  }

  let body: { refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const refreshToken = body.refresh_token;
  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length < 10) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 400 });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ ok: true });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
