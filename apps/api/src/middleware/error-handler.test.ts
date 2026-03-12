import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// --- Mock setup ---

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../lib/monitoring.js', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
}));

// Import after mocks
import { AppError } from '../lib/errors.js';

/**
 * In Hono 4.x, thrown errors in route handlers bypass middleware try/catch
 * and go to app.onError(). The real app.ts uses app.onError() for error handling.
 * This test validates the error handling pattern used in app.ts:onError.
 */
function createTestApp() {
  const app = new Hono();

  // Request ID middleware
  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  });

  // Routes that throw different errors
  app.get('/app-error', () => {
    throw new AppError('PACK_NOT_FOUND', 'Pack not found', 404, { resource: 'pack' });
  });

  app.get('/unknown-error', () => {
    throw new Error('Something broke internally');
  });

  app.get('/duck-type-error', () => {
    const err = new Error('Duck typed error');
    Object.defineProperty(err, 'name', { value: 'AppError' });
    Object.defineProperty(err, 'code', { value: 'DUCK_ERROR', enumerable: true });
    Object.defineProperty(err, 'status', { value: 422, enumerable: true });
    throw err;
  });

  // Error handler — matches the pattern in app.ts:onError
  app.onError((err, c) => {
    const requestId = c.get('requestId') || crypto.randomUUID();

    // Duck typing for AppError (matches app.ts and error-handler.ts)
    const isAppError = err instanceof AppError ||
      (err && typeof err === 'object' && 'code' in err && 'status' in err && err.name === 'AppError');

    if (isAppError) {
      const appErr = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
      return c.json(
        {
          error: {
            code: appErr.code,
            message: appErr.message,
            details: appErr.details,
          },
          request_id: requestId,
        },
        appErr.status as ContentfulStatusCode
      );
    }

    // Unknown error — 500 without leaking internals
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        request_id: requestId,
      },
      500
    );
  });

  return app;
}

describe('errorHandler middleware', () => {
  it('AppError returns structured { error: { code, message, details }, request_id }', async () => {
    const app = createTestApp();
    const res = await app.request('/app-error');

    expect(res.status).toBe(404);
    const body = await res.json();

    expect(body.error).toEqual({
      code: 'PACK_NOT_FOUND',
      message: 'Pack not found',
      details: { resource: 'pack' },
    });
    expect(body.request_id).toBeTruthy();
    expect(body.request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('unknown Error returns 500 without leaking internals', async () => {
    const app = createTestApp();
    const res = await app.request('/unknown-error');

    expect(res.status).toBe(500);
    const body = await res.json();

    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
    // Must NOT contain the real error message
    expect(JSON.stringify(body)).not.toContain('Something broke internally');
    expect(body.request_id).toBeTruthy();
  });

  it('duck-typed AppError works (code + status + name === "AppError")', async () => {
    const app = createTestApp();
    const res = await app.request('/duck-type-error');

    expect(res.status).toBe(422);
    const body = await res.json();

    expect(body.error.code).toBe('DUCK_ERROR');
    expect(body.error.message).toBe('Duck typed error');
    expect(body.request_id).toBeTruthy();
  });

  it('request_id is UUID format', async () => {
    const app = createTestApp();
    const res = await app.request('/app-error');
    const body = await res.json();

    expect(body.request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
