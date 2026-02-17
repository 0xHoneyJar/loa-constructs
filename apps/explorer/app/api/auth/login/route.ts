import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/api/csrf';

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const apiResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.json().catch(() => ({ message: 'Login failed' }));
    return NextResponse.json(error, { status: apiResponse.status });
  }

  const tokens = await apiResponse.json();
  const { access_token, refresh_token, expires_in } = tokens;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Invalid token response' }, { status: 502 });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ access_token, expires_in });

  // Set refresh token as HttpOnly cookie — not accessible from JavaScript
  response.cookies.set('refresh_token', refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
