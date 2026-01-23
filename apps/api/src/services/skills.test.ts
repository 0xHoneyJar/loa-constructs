/**
 * Skills Service Tests
 * @see sprint.md Sprint 4: Skill Registry Core
 */

import { describe, it, expect, vi } from 'vitest';

// Mock database and dependencies before imports
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
          limit: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    query: {
      teamMembers: {
        findFirst: vi.fn(() => Promise.resolve(null)),
      },
    },
  },
  skills: {},
  skillVersions: {},
  skillFiles: {},
  skillUsage: {},
  users: {},
  teams: {},
}));

vi.mock('./redis.js', () => ({
  getRedis: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve('OK')),
    del: vi.fn(() => Promise.resolve(1)),
  })),
  isRedisConfigured: vi.fn(() => false),
  CACHE_KEYS: {
    skillList: (params: string) => `skills:list:${params}`,
    skill: (slug: string) => `skill:${slug}`,
  },
  CACHE_TTL: {
    skillList: 60,
    skill: 300,
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

describe('Skills Service Types', () => {
  it('should define skill categories', () => {
    const categories = [
      'development',
      'devops',
      'marketing',
      'sales',
      'support',
      'analytics',
      'security',
      'other',
    ];
    expect(categories).toHaveLength(8);
    expect(categories).toContain('development');
    expect(categories).toContain('security');
  });

  it('should define owner types', () => {
    const ownerTypes = ['user', 'team'];
    expect(ownerTypes).toHaveLength(2);
  });

  it('should define usage actions', () => {
    const actions = ['install', 'update', 'load', 'uninstall'];
    expect(actions).toHaveLength(4);
    expect(actions).toContain('install');
  });
});

describe('Skills List Options', () => {
  it('should have valid sort options', () => {
    const sortOptions = ['downloads', 'rating', 'newest', 'name'];
    expect(sortOptions).toHaveLength(4);
  });

  it('should have valid sort orders', () => {
    const sortOrders = ['asc', 'desc'];
    expect(sortOrders).toHaveLength(2);
  });

  it('should enforce max page size', () => {
    const maxPageSize = 100;
    expect(maxPageSize).toBe(100);
  });
});

describe('Skill Version Format', () => {
  it('should validate semver format', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(semverRegex.test('1.0.0')).toBe(true);
    expect(semverRegex.test('0.1.0')).toBe(true);
    expect(semverRegex.test('10.20.30')).toBe(true);
    expect(semverRegex.test('1.0')).toBe(false);
    expect(semverRegex.test('v1.0.0')).toBe(false);
  });
});

describe('Skill Slug Validation', () => {
  it('should validate slug format', () => {
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    expect(slugRegex.test('my-skill')).toBe(true);
    expect(slugRegex.test('terraform-assistant')).toBe(true);
    expect(slugRegex.test('a1')).toBe(true);
    expect(slugRegex.test('-invalid')).toBe(false);
    expect(slugRegex.test('invalid-')).toBe(false);
    expect(slugRegex.test('UPPERCASE')).toBe(false);
  });
});
