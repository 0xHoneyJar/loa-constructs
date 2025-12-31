import type { MiddlewareHandler } from 'hono';
import crypto from 'crypto';

/**
 * Security headers middleware
 * @see sprint.md T11.5: Security Hardening
 * @see sdd.md §1.9 Security Architecture - Security Headers
 */
export const securityHeaders = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');

    // XSS protection (legacy browsers)
    c.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Content Security Policy for API responses
    c.header(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    );

    // Strict Transport Security (only in production)
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Cache control for API responses (no caching by default)
    if (!c.res.headers.has('Cache-Control')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
    }
  };
};

/**
 * CSRF protection middleware
 * Uses double-submit cookie pattern for stateless CSRF protection
 * @see sprint.md T11.5: Security Hardening
 */
export const csrfProtection = (): MiddlewareHandler => {
  const CSRF_COOKIE_NAME = '__csrf';
  const CSRF_HEADER_NAME = 'x-csrf-token';

  return async (c, next) => {
    const method = c.req.method;

    // Skip CSRF check for safe methods and webhooks
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next();
    }

    // Skip for webhook endpoints (they use signature verification)
    if (c.req.path.includes('/webhooks/')) {
      return next();
    }

    // Skip for API key authenticated requests (Authorization: Bearer sk_*)
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer sk_')) {
      return next();
    }

    // For browser requests (with cookies), verify CSRF token
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      const csrfCookie = cookies[CSRF_COOKIE_NAME];
      const csrfHeader = c.req.header(CSRF_HEADER_NAME);

      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return c.json(
          {
            error: {
              code: 'CSRF_VALIDATION_FAILED',
              message: 'CSRF token validation failed',
            },
          },
          403
        );
      }
    }

    await next();
  };
};

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Input sanitization helper for common patterns
 * Note: This is a basic sanitizer. For HTML content, use a dedicated library like DOMPurify.
 * @see sprint.md T11.5: Security Hardening - Input sanitization
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length (prevent DoS)
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return sanitized;
}

/**
 * Validate and sanitize URL input
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validate path input (prevent path traversal)
 */
export function isValidPath(path: string): boolean {
  // Check for path traversal attempts
  if (path.includes('..') || path.includes('\0')) {
    return false;
  }

  // Only allow specific characters
  const validPathRegex = /^[a-zA-Z0-9/_.-]+$/;
  return validPathRegex.test(path);
}
