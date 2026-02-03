/**
 * Public Keys Service Tests
 * @see sprint-license-jwt-rs256.md T3.1: Unit Tests - Public Keys Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database before importing the service
const mockDbSelect = vi.fn();
vi.mock('../db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockDbSelect,
        }),
      }),
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    transaction: vi.fn((cb) => cb({ insert: vi.fn(), update: vi.fn() })),
  },
  publicKeys: {},
}));

// Mock env module with RS256 keys
const mockEnv = {
  getPublicKey: vi.fn(),
  getKeyId: vi.fn(),
};

vi.mock('../config/env.js', () => ({
  getPublicKey: () => mockEnv.getPublicKey(),
  getKeyId: () => mockEnv.getKeyId(),
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
      const err = new Error(msg);
      err.name = 'NotFoundError';
      return err;
    },
  },
}));

describe('Public Keys Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.getKeyId.mockReturnValue('key-2026-02');
    mockEnv.getPublicKey.mockReturnValue(
      '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'
    );
  });

  describe('getPublicKeyById', () => {
    it('should return key from database when found', async () => {
      const dbKey = {
        keyId: 'key-2026-02',
        algorithm: 'RS256',
        publicKey: '-----BEGIN PUBLIC KEY-----\nDB_KEY\n-----END PUBLIC KEY-----',
        expiresAt: null,
      };
      mockDbSelect.mockResolvedValue([dbKey]);

      const { getPublicKeyById } = await import('./public-keys.js');
      const result = await getPublicKeyById('key-2026-02');

      expect(result).toEqual({
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: dbKey.publicKey,
        expires_at: null,
      });
    });

    it('should handle "default" alias by mapping to current key', async () => {
      mockDbSelect.mockResolvedValue([]);

      const { getPublicKeyById } = await import('./public-keys.js');
      const result = await getPublicKeyById('default');

      expect(result.key_id).toBe('key-2026-02');
      expect(result.algorithm).toBe('RS256');
    });

    it('should fall back to environment key when not in database', async () => {
      mockDbSelect.mockResolvedValue([]);

      const { getPublicKeyById } = await import('./public-keys.js');
      const result = await getPublicKeyById('key-2026-02');

      expect(result).toEqual({
        key_id: 'key-2026-02',
        algorithm: 'RS256',
        public_key: mockEnv.getPublicKey(),
        expires_at: null,
      });
    });

    it('should throw NotFound for unknown key not in DB or env', async () => {
      mockDbSelect.mockResolvedValue([]);
      mockEnv.getKeyId.mockReturnValue('different-key');

      const { getPublicKeyById } = await import('./public-keys.js');

      await expect(getPublicKeyById('unknown-key')).rejects.toThrow('not found');
    });

    it('should format expiresAt as ISO string when present', async () => {
      const expiresAt = new Date('2027-01-01T00:00:00.000Z');
      const dbKey = {
        keyId: 'expiring-key',
        algorithm: 'RS256',
        publicKey: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----',
        expiresAt,
      };
      mockDbSelect.mockResolvedValue([dbKey]);

      const { getPublicKeyById } = await import('./public-keys.js');
      const result = await getPublicKeyById('expiring-key');

      expect(result.expires_at).toBe('2027-01-01T00:00:00.000Z');
    });
  });

  describe('getCurrentKeyMetadata', () => {
    it('should return current key ID and algorithm', async () => {
      const { getCurrentKeyMetadata } = await import('./public-keys.js');
      const result = await getCurrentKeyMetadata();

      expect(result).toEqual({
        keyId: 'key-2026-02',
        algorithm: 'RS256',
      });
    });
  });
});
