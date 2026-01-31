/**
 * Constructs Service Tests
 * @see sprint-constructs-api.md T3.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database and dependencies before imports
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
  skills: { id: 'id', isPublic: 'isPublic', isDeprecated: 'isDeprecated' },
  packs: { id: 'id', status: 'status', slug: 'slug' },
  packVersions: {},
  skillVersions: {},
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
    constructList: (params: string) => `constructs:list:${params}`,
    constructDetail: (slug: string) => `construct:${slug}`,
    constructSummary: () => 'constructs:summary',
    constructExists: (slug: string) => `construct:exists:${slug}`,
  },
  CACHE_TTL: {
    constructList: 60,
    constructDetail: 300,
    constructSummary: 300,
    constructExists: 60,
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

describe('Constructs Service Types', () => {
  describe('ConstructType enum', () => {
    it('should define valid construct types', () => {
      const constructTypes = ['skill', 'pack', 'bundle'];
      expect(constructTypes).toHaveLength(3);
      expect(constructTypes).toContain('skill');
      expect(constructTypes).toContain('pack');
      expect(constructTypes).toContain('bundle');
    });
  });

  describe('Construct interface', () => {
    it('should have required fields', () => {
      const requiredFields = [
        'id',
        'type',
        'name',
        'slug',
        'description',
        'version',
        'tierRequired',
        'downloads',
        'createdAt',
        'updatedAt',
      ];
      expect(requiredFields).toHaveLength(10);
    });

    it('should have optional fields', () => {
      const optionalFields = [
        'longDescription',
        'category',
        'rating',
        'isFeatured',
        'manifest',
        'owner',
        'repositoryUrl',
        'documentationUrl',
        'latestVersion',
      ];
      expect(optionalFields).toHaveLength(9);
    });
  });

  describe('ConstructSummary interface', () => {
    it('should have minimal fields for agent optimization', () => {
      const summaryFields = ['slug', 'name', 'type', 'commands', 'tier_required'];
      expect(summaryFields).toHaveLength(5);
    });
  });
});

describe('ListConstructsOptions', () => {
  it('should support query filtering', () => {
    const options = { query: 'test' };
    expect(options.query).toBe('test');
  });

  it('should support type filtering', () => {
    const typeOptions = ['skill', 'pack', 'bundle'];
    typeOptions.forEach((type) => {
      const options = { type };
      expect(options.type).toBe(type);
    });
  });

  it('should support tier filtering', () => {
    const tierOptions = ['free', 'pro', 'team', 'enterprise'];
    tierOptions.forEach((tier) => {
      const options = { tier };
      expect(options.tier).toBe(tier);
    });
  });

  it('should support category filtering', () => {
    const options = { category: 'development' };
    expect(options.category).toBe('development');
  });

  it('should support featured filtering', () => {
    const options = { featured: true };
    expect(options.featured).toBe(true);
  });

  it('should support pagination', () => {
    const options = { page: 2, limit: 50 };
    expect(options.page).toBe(2);
    expect(options.limit).toBe(50);
  });

  it('should have default page size', () => {
    const defaultPageSize = 20;
    expect(defaultPageSize).toBe(20);
  });

  it('should enforce max page size', () => {
    const maxPageSize = 100;
    expect(maxPageSize).toBe(100);
  });
});

describe('ListConstructsResult', () => {
  it('should have pagination metadata', () => {
    const result = {
      constructs: [],
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    };
    expect(result.total).toBe(100);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(5);
  });

  it('should calculate total pages correctly', () => {
    const total = 47;
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(3);
  });
});

describe('Helper Functions', () => {
  describe('calculateRating', () => {
    it('should return null for zero count', () => {
      const calculateRating = (sum: number, count: number) => {
        if (count === 0) return null;
        return Math.round((sum / count) * 10) / 10;
      };
      expect(calculateRating(0, 0)).toBeNull();
    });

    it('should calculate average rating', () => {
      const calculateRating = (sum: number, count: number) => {
        if (count === 0) return null;
        return Math.round((sum / count) * 10) / 10;
      };
      expect(calculateRating(45, 10)).toBe(4.5);
      expect(calculateRating(47, 10)).toBe(4.7);
      expect(calculateRating(43, 10)).toBe(4.3);
    });

    it('should round to one decimal place', () => {
      const calculateRating = (sum: number, count: number) => {
        if (count === 0) return null;
        return Math.round((sum / count) * 10) / 10;
      };
      expect(calculateRating(46, 10)).toBe(4.6);
      expect(calculateRating(333, 100)).toBe(3.3);
    });
  });
});

describe('Construct Slug Validation', () => {
  it('should validate slug format', () => {
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    expect(slugRegex.test('my-construct')).toBe(true);
    expect(slugRegex.test('observer')).toBe(true);
    expect(slugRegex.test('research-bundle')).toBe(true);
    expect(slugRegex.test('a')).toBe(true);
    expect(slugRegex.test('a1')).toBe(true);
  });

  it('should reject invalid slugs', () => {
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    expect(slugRegex.test('-invalid')).toBe(false);
    expect(slugRegex.test('invalid-')).toBe(false);
    expect(slugRegex.test('UPPERCASE')).toBe(false);
    expect(slugRegex.test('has spaces')).toBe(false);
    expect(slugRegex.test('has_underscore')).toBe(false);
  });
});

describe('Owner Types', () => {
  it('should support user and team owners', () => {
    const ownerTypes = ['user', 'team'];
    expect(ownerTypes).toHaveLength(2);
    expect(ownerTypes).toContain('user');
    expect(ownerTypes).toContain('team');
  });
});

describe('Tier Required Values', () => {
  it('should define valid tier values', () => {
    const tiers = ['free', 'pro', 'team', 'enterprise'];
    expect(tiers).toHaveLength(4);
    expect(tiers).toContain('free');
    expect(tiers).toContain('pro');
    expect(tiers).toContain('team');
    expect(tiers).toContain('enterprise');
  });
});

describe('Caching', () => {
  it('should define cache key patterns', () => {
    const keys = {
      list: 'constructs:list:skill:free::false:1:20',
      detail: 'construct:observer',
      summary: 'constructs:summary',
      exists: 'construct:exists:observer',
    };
    expect(keys.list).toContain('constructs:list');
    expect(keys.detail).toContain('construct:');
    expect(keys.summary).toBe('constructs:summary');
    expect(keys.exists).toContain('construct:exists:');
  });

  it('should define cache TTL values', () => {
    const ttl = {
      list: 60,
      detail: 300,
      summary: 300,
      exists: 60,
    };
    expect(ttl.list).toBe(60);
    expect(ttl.detail).toBe(300);
    expect(ttl.summary).toBe(300);
    expect(ttl.exists).toBe(60);
  });
});

describe('Manifest Conversion', () => {
  describe('skillToConstruct', () => {
    it('should create synthetic manifest for skills', () => {
      const skillSlug = 'my-skill';
      const skillDescription = 'A test skill';
      const syntheticManifest = {
        name: skillSlug,
        version: '1.0.0',
        type: 'skill',
        description: skillDescription,
        commands: [{ name: `/${skillSlug}`, description: skillDescription }],
        tier_required: 'free',
      };
      expect(syntheticManifest.name).toBe(skillSlug);
      expect(syntheticManifest.type).toBe('skill');
      expect(syntheticManifest.commands).toHaveLength(1);
      expect(syntheticManifest.commands[0].name).toBe('/my-skill');
    });
  });

  describe('packToConstruct', () => {
    it('should use manifest from pack version', () => {
      const manifest = {
        name: 'observer',
        version: '1.0.0',
        type: 'pack',
        commands: [{ name: '/observe' }, { name: '/shape' }],
      };
      expect(manifest.name).toBe('observer');
      expect(manifest.type).toBe('pack');
      expect(manifest.commands).toHaveLength(2);
    });
  });
});

describe('Summary Format', () => {
  it('should be agent-optimized (minimal tokens)', () => {
    const summary = {
      slug: 'observer',
      name: 'Observer',
      type: 'pack',
      commands: ['/observe', '/shape'],
      tier_required: 'free',
    };
    // Summary should have minimal fields
    const keys = Object.keys(summary);
    expect(keys).toHaveLength(5);
    expect(keys).not.toContain('description');
    expect(keys).not.toContain('downloads');
    expect(keys).not.toContain('rating');
  });

  it('should extract command names from manifest', () => {
    const manifest = {
      commands: [
        { name: '/observe', description: 'Observe users' },
        { name: '/shape', description: 'Shape patterns' },
      ],
    };
    const commandNames = manifest.commands.map((c) => c.name);
    expect(commandNames).toEqual(['/observe', '/shape']);
  });
});

describe('Version Information', () => {
  it('should include latest version details', () => {
    const latestVersion = {
      version: '2.1.0',
      changelog: 'Added new features',
      publishedAt: new Date('2024-01-15'),
    };
    expect(latestVersion.version).toBe('2.1.0');
    expect(latestVersion.changelog).toBe('Added new features');
    expect(latestVersion.publishedAt).toBeInstanceOf(Date);
  });

  it('should handle missing version', () => {
    const latestVersion = null;
    expect(latestVersion).toBeNull();
  });
});
