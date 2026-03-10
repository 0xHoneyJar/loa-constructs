import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-refresh — cycle-039
 * Sets the refresh token as an HttpOnly cookie.
 * Used by OAuth callback and Dynamic Labs auth to persist refresh tokens.
 * @see sdd.md §6.5 OAuth Refresh Fix
 */
export async function POST(request: NextRequest) {
  // CSRF: validate Origin header
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://constructs.network',
    'https://www.constructs.network',
  ];
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin) && !origin.endsWith('.vercel.app')) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
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
