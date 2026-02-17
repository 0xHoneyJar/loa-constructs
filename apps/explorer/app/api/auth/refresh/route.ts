import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/api/csrf';

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const apiResponse = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.json().catch(() => ({ message: 'Refresh failed' }));
    const response = NextResponse.json(error, { status: apiResponse.status });

    // Clear invalid/expired refresh token on auth-related errors
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    }

    return response;
  }

  const tokens = await apiResponse.json();
  const { access_token, refresh_token, expires_in } = tokens;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Invalid token response' }, { status: 502 });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ access_token, expires_in });

  // Rotate refresh token
  response.cookies.set('refresh_token', refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
