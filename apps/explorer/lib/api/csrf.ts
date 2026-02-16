import { NextRequest, NextResponse } from 'next/server';

const RAW_ALLOWED_ORIGINS = [
  'https://constructs.network',
  'https://www.constructs.network',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
];

function normalizeOrigin(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    let port = url.port;

    // Strip default ports
    if ((protocol === 'https:' && (port === '' || port === '443')) ||
        (protocol === 'http:' && (port === '' || port === '80'))) {
      port = '';
    } else if (port) {
      port = `:${port}`;
    }

    return `${protocol}//${hostname}${port}`;
  } catch {
    return null;
  }
}

const ALLOWED_ORIGINS = new Set(
  RAW_ALLOWED_ORIGINS.map((o) => normalizeOrigin(o)).filter((o): o is string => Boolean(o))
);

/**
 * Validate Origin/Referer header for CSRF protection on state-changing requests.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return null;
  }

  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');

  // Check Origin header first (most reliable)
  if (originHeader) {
    const origin = normalizeOrigin(originHeader);
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      return null;
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fall back to Referer header
  if (refererHeader) {
    const refererOrigin = normalizeOrigin(refererHeader);
    if (refererOrigin && ALLOWED_ORIGINS.has(refererOrigin)) {
      return null;
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // No Origin or Referer — reject (conservative)
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
