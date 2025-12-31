/**
 * Auth Service Tests
 * @see sprint.md T2.1: Auth Service
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  verifyVerificationToken,
  generateResetToken,
  verifyResetToken,
  hashRefreshToken,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} from './auth.js';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'securePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash prefix
    });

    it('should verify correct password', async () => {
      const password = 'securePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'securePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'securePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('JWT Token Generation', () => {
    const userId = 'test-user-id';
    const email = 'test@example.com';

    it('should generate access and refresh tokens', async () => {
      const tokens = await generateTokens(userId, email);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900); // 15 minutes
    });

    it('should generate valid access token', async () => {
      const tokens = await generateTokens(userId, email);
      const payload = await verifyAccessToken(tokens.accessToken);

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('access');
    });

    it('should generate valid refresh token', async () => {
      const tokens = await generateTokens(userId, email);
      const payload = await verifyRefreshToken(tokens.refreshToken);

      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('refresh');
      expect(payload.jti).toBeDefined();
    });

    it('should reject access token as refresh token', async () => {
      const tokens = await generateTokens(userId, email);

      await expect(verifyRefreshToken(tokens.accessToken)).rejects.toThrow();
    });

    it('should reject refresh token as access token', async () => {
      const tokens = await generateTokens(userId, email);

      await expect(verifyAccessToken(tokens.refreshToken)).rejects.toThrow();
    });

    it('should reject invalid token', async () => {
      await expect(verifyAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('Verification Token', () => {
    const userId = 'test-user-id';
    const email = 'test@example.com';

    it('should generate verification token', async () => {
      const token = await generateVerificationToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid verification token', async () => {
      const token = await generateVerificationToken(userId, email);
      const payload = await verifyVerificationToken(token);

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('verification');
    });

    it('should reject invalid verification token', async () => {
      await expect(verifyVerificationToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('Reset Token', () => {
    const userId = 'test-user-id';

    it('should generate reset token', async () => {
      const token = await generateResetToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid reset token', async () => {
      const token = await generateResetToken(userId);
      const payload = await verifyResetToken(token);

      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('reset');
    });

    it('should reject invalid reset token', async () => {
      await expect(verifyResetToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('Refresh Token Hash', () => {
    it('should hash refresh token', async () => {
      const token = 'some-refresh-token';
      const hash = await hashRefreshToken(token);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex string
    });

    it('should produce consistent hash', async () => {
      const token = 'some-refresh-token';
      const hash1 = await hashRefreshToken(token);
      const hash2 = await hashRefreshToken(token);

      expect(hash1).toBe(hash2);
    });
  });

  describe('API Key', () => {
    it('should generate API key with correct format', () => {
      const { key, prefix } = generateApiKey();

      expect(key).toMatch(/^sk_(test|live)_[a-f0-9]{32}$/);
      expect(prefix.length).toBe(12);
      expect(key.startsWith(prefix)).toBe(true);
    });

    it('should hash API key', async () => {
      const { key } = generateApiKey();
      const hash = await hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify correct API key', async () => {
      const { key } = generateApiKey();
      const hash = await hashApiKey(key);

      const isValid = await verifyApiKey(key, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key', async () => {
      const { key } = generateApiKey();
      const hash = await hashApiKey(key);

      const isValid = await verifyApiKey('sk_test_wrongkey', hash);
      expect(isValid).toBe(false);
    });
  });
});
