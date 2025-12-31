/**
 * Storage Service Tests
 * @see sprint.md Sprint 4: T4.1 R2 Storage Setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  isAllowedMimeType,
  generateStorageKey,
  isStorageConfigured,
} from './storage.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.example.com')),
}));

vi.mock('../config/env.js', () => ({
  env: {
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET: 'loa-skills',
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MAX_FILE_SIZE', () => {
    it('should be 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should be in bytes', () => {
      expect(MAX_FILE_SIZE).toBe(10485760);
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('should include text/plain', () => {
      expect(ALLOWED_MIME_TYPES).toContain('text/plain');
    });

    it('should include text/markdown', () => {
      expect(ALLOWED_MIME_TYPES).toContain('text/markdown');
    });

    it('should include text/yaml', () => {
      expect(ALLOWED_MIME_TYPES).toContain('text/yaml');
    });

    it('should include application/json', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/json');
    });

    it('should include text/x-typescript', () => {
      expect(ALLOWED_MIME_TYPES).toContain('text/x-typescript');
    });

    it('should include text/javascript', () => {
      expect(ALLOWED_MIME_TYPES).toContain('text/javascript');
    });

    it('should have 7 allowed types', () => {
      expect(ALLOWED_MIME_TYPES).toHaveLength(7);
    });
  });

  describe('isAllowedMimeType', () => {
    it('should return true for allowed types', () => {
      expect(isAllowedMimeType('text/plain')).toBe(true);
      expect(isAllowedMimeType('text/markdown')).toBe(true);
      expect(isAllowedMimeType('application/json')).toBe(true);
    });

    it('should return false for disallowed types', () => {
      expect(isAllowedMimeType('application/octet-stream')).toBe(false);
      expect(isAllowedMimeType('image/png')).toBe(false);
      expect(isAllowedMimeType('application/zip')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isAllowedMimeType('')).toBe(false);
    });
  });

  describe('generateStorageKey', () => {
    it('should generate correct path format', () => {
      const key = generateStorageKey('my-skill', '1.0.0', 'SKILL.md');
      expect(key).toBe('skills/my-skill/1.0.0/SKILL.md');
    });

    it('should handle nested paths', () => {
      const key = generateStorageKey('my-skill', '1.0.0', 'resources/templates/base.yaml');
      expect(key).toBe('skills/my-skill/1.0.0/resources/templates/base.yaml');
    });

    it('should sanitize path traversal attempts', () => {
      const key = generateStorageKey('my-skill', '1.0.0', '../../../etc/passwd');
      expect(key).not.toContain('..');
      // After removing ".." the path becomes "///etc/passwd", leading slashes are stripped
      expect(key.startsWith('skills/my-skill/1.0.0/')).toBe(true);
    });

    it('should remove leading slashes', () => {
      const key = generateStorageKey('my-skill', '1.0.0', '/absolute/path.md');
      expect(key).toBe('skills/my-skill/1.0.0/absolute/path.md');
    });

    it('should handle version with different formats', () => {
      expect(generateStorageKey('skill', '1.0.0', 'file.md')).toBe('skills/skill/1.0.0/file.md');
      expect(generateStorageKey('skill', '0.1.0-beta', 'file.md')).toBe('skills/skill/0.1.0-beta/file.md');
    });
  });

  describe('isStorageConfigured', () => {
    it('should return false when R2 credentials are not set', () => {
      expect(isStorageConfigured()).toBe(false);
    });
  });
});

describe('Storage Key Security', () => {
  it('should prevent directory traversal attacks', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '....//....//etc/passwd',
      'valid/../../../etc/passwd',
    ];

    for (const path of maliciousPaths) {
      const key = generateStorageKey('skill', '1.0.0', path);
      expect(key).not.toContain('..');
    }
  });

  it('should prevent absolute path access', () => {
    const absolutePaths = [
      '/etc/passwd',
      '/root/.ssh/id_rsa',
      '/var/log/auth.log',
    ];

    for (const path of absolutePaths) {
      const key = generateStorageKey('skill', '1.0.0', path);
      expect(key.startsWith('skills/')).toBe(true);
    }
  });
});
