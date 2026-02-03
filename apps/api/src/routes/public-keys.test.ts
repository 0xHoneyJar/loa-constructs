/**
 * Public Keys Route Tests
 * @see sprint-license-jwt-rs256.md T3.2: Route Tests - Public Keys
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Create a test app with the public keys router
const mockGetPublicKeyById = vi.fn();

vi.mock('../services/public-keys.js', () => ({
  getPublicKeyById: (...args: unknown[]) => mockGetPublicKeyById(...args),
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/errors.js', () => ({
  Errors: {
    NotFound: (msg: string) => {
      const err = new Error(msg) as Error & { code: string; status: number; name: string };
      err.name = 'AppError';
      err.code = 'NOT_FOUND';
      err.status = 404;
      return err;
    },
  },
}));

describe('Public Keys Routes', () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-import the router to get fresh instance
    vi.resetModules();
    const { publicKeysRouter } = await import('./public-keys.js');

    // Create test app with error handling
    app = new Hono();
    app.use('*', async (c, next) => {
      c.set('requestId', 'test-request-id');
      await next();
    });
    app.route('/v1/public-keys', publicKeysRouter);

    // Add error handler
    app.onError((err, c) => {
      const isAppError =
        err && typeof err === 'object' && 'code' in err && 'status' in err && err.name === 'AppError';
      if (isAppError) {
        const appErr = err as { code: string; message: string; status: number };
        return c.json(
          {
            error: { code: appErr.code, message: appErr.message },
            request_id: 'test-request-id',
          },
          appErr.status as 404
        );
      }
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: err.message } },
        500
      );
    });
  });

  describe('GET /v1/public-keys/:keyId', () => {
    it('should return 200 with public key for valid keyId', async () => {
      const mockKey = {
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      };
      mockGetPublicKeyById.mockResolvedValue(mockKey);

      const res = await app.request('/v1/public-keys/key-2026-02');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual(mockKey);
    });

    it('should return 200 for "default" keyId', async () => {
      const mockKey = {
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      };
      mockGetPublicKeyById.mockResolvedValue(mockKey);

      const res = await app.request('/v1/public-keys/default');

      expect(res.status).toBe(200);
      expect(mockGetPublicKeyById).toHaveBeenCalledWith('default');
    });

    it('should set Cache-Control header for 4 hours', async () => {
      mockGetPublicKeyById.mockResolvedValue({
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      });

      const res = await app.request('/v1/public-keys/key-2026-02');

      expect(res.headers.get('Cache-Control')).toBe('public, max-age=14400');
    });

    it('should set Vary header', async () => {
      mockGetPublicKeyById.mockResolvedValue({
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      });

      const res = await app.request('/v1/public-keys/key-2026-02');

      expect(res.headers.get('Vary')).toBe('Accept');
    });

    it('should return 404 for nonexistent key', async () => {
      mockGetPublicKeyById.mockRejectedValue(new Error('Public key not found: unknown-key'));

      const res = await app.request('/v1/public-keys/unknown-key');

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid keyId format with special characters', async () => {
      const res = await app.request('/v1/public-keys/invalid@key!');

      expect(res.status).toBe(400);
    });

    it('should accept keyId with dashes and underscores', async () => {
      mockGetPublicKeyById.mockResolvedValue({
        key_id: 'key-2026_02-test',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      });

      const res = await app.request('/v1/public-keys/key-2026_02-test');

      expect(res.status).toBe(200);
    });

    it('should return algorithm as RS256', async () => {
      mockGetPublicKeyById.mockResolvedValue({
        key_id: 'test-key',
        algorithm: 'RS256',
        public_key: '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----',
        expires_at: null,
      });

      const res = await app.request('/v1/public-keys/test-key');
      const body = await res.json();

      expect(body.algorithm).toBe('RS256');
    });

    it('should return public_key in PEM format', async () => {
      const pemKey =
        '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';
      mockGetPublicKeyById.mockResolvedValue({
        key_id: 'test-key',
        algorithm: 'RS256',
        public_key: pemKey,
        expires_at: null,
      });

      const res = await app.request('/v1/public-keys/test-key');
      const body = await res.json();

      expect(body.public_key).toContain('-----BEGIN PUBLIC KEY-----');
      expect(body.public_key).toContain('-----END PUBLIC KEY-----');
    });
  });
});
