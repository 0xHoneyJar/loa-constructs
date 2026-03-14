import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/api/csrf';

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Best-effort server-side logout — must include refresh_token so the API blacklists it
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best-effort — don't block client-side cleanup
    }
  }

  const response = NextResponse.json({ ok: true });

  // Clear HttpOnly refresh token (match attributes)
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
