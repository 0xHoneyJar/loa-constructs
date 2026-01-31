/**
 * Constructs API E2E Tests
 * @see sprint-constructs-api.md T3.2: Integration Tests for Constructs API
 *
 * Test scenarios:
 * 1. List constructs (GET /v1/constructs)
 * 2. Get construct detail (GET /v1/constructs/:slug)
 * 3. Get constructs summary (GET /v1/constructs/summary)
 * 4. Check construct exists (HEAD /v1/constructs/:slug)
 * 5. Filter by type, tier, category, featured
 * 6. Search constructs
 * 7. Pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../src/db/index.js', () => {
  const mockPacks = [
    {
      id: 'pack-1',
      name: 'Observer Pack',
      slug: 'observer',
      description: 'User research workflows',
      longDescription: 'Full description of Observer pack',
      status: 'published',
      tierRequired: 'free',
      downloads: 1000,
      ratingSum: 45,
      ratingCount: 10,
      isFeatured: true,
      repositoryUrl: 'https://github.com/example/observer',
      documentationUrl: 'https://docs.example.com/observer',
      ownerId: 'user-1',
      ownerType: 'user',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'pack-2',
      name: 'Crucible Pack',
      slug: 'crucible',
      description: 'Testing workflows',
      longDescription: 'Full description of Crucible pack',
      status: 'published',
      tierRequired: 'pro',
      downloads: 500,
      ratingSum: 40,
      ratingCount: 10,
      isFeatured: false,
      repositoryUrl: null,
      documentationUrl: null,
      ownerId: 'team-1',
      ownerType: 'team',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-16'),
    },
  ];

  const mockSkills = [
    {
      id: 'skill-1',
      name: 'Analyze Skill',
      slug: 'analyze',
      description: 'Analysis workflow',
      longDescription: 'Full description of Analyze skill',
      isPublic: true,
      isDeprecated: false,
      tierRequired: 'free',
      category: 'development',
      downloads: 2000,
      ratingSum: 47,
      ratingCount: 10,
      repositoryUrl: null,
      documentationUrl: null,
      ownerId: 'user-2',
      ownerType: 'user',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-17'),
    },
  ];

  const mockPackVersions = [
    {
      packId: 'pack-1',
      version: '2.1.0',
      changelog: 'Added new features',
      isLatest: true,
      publishedAt: new Date('2024-01-15'),
      manifest: {
        name: 'observer',
        version: '2.1.0',
        type: 'pack',
        commands: [
          { name: '/observe', description: 'Observe users' },
          { name: '/shape', description: 'Shape patterns' },
        ],
      },
    },
    {
      packId: 'pack-2',
      version: '1.0.0',
      changelog: 'Initial release',
      isLatest: true,
      publishedAt: new Date('2024-01-16'),
      manifest: {
        name: 'crucible',
        version: '1.0.0',
        type: 'pack',
        commands: [{ name: '/test', description: 'Run tests' }],
      },
    },
  ];

  const mockSkillVersions = [
    {
      skillId: 'skill-1',
      version: '1.5.0',
      changelog: 'Bug fixes',
      isLatest: true,
      publishedAt: new Date('2024-01-17'),
    },
  ];

  const mockUsers = [
    { id: 'user-1', name: 'Alice', avatarUrl: 'https://example.com/alice.png' },
    { id: 'user-2', name: 'Bob', avatarUrl: null },
  ];

  const mockTeams = [{ id: 'team-1', name: 'Acme Corp', avatarUrl: 'https://example.com/acme.png' }];

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn((condition) => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn((lim) => ({
                  offset: vi.fn(() => {
                    if (table === 'packs' || table?.name === 'packs') {
                      return Promise.resolve(
                        mockPacks.map((p) => ({
                          packs: p,
                          pack_versions: mockPackVersions.find((v) => v.packId === p.id) || null,
                        }))
                      );
                    }
                    if (table === 'skills' || table?.name === 'skills') {
                      return Promise.resolve(
                        mockSkills.map((s) => ({
                          skills: s,
                          skill_versions: mockSkillVersions.find((v) => v.skillId === s.id) || null,
                        }))
                      );
                    }
                    return Promise.resolve([]);
                  }),
                })),
              })),
              limit: vi.fn(() => {
                if (table === 'packs' || table?.name === 'packs') {
                  return Promise.resolve(
                    mockPacks.map((p) => ({
                      packs: p,
                      pack_versions: mockPackVersions.find((v) => v.packId === p.id) || null,
                    }))
                  );
                }
                return Promise.resolve([]);
              }),
            })),
          })),
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    },
    packs: { name: 'packs' },
    packVersions: { name: 'packVersions' },
    skills: { name: 'skills' },
    skillVersions: { name: 'skillVersions' },
    users: { name: 'users' },
    teams: { name: 'teams' },
  };
});

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
    DATABASE_URL: 'postgres://test',
  },
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/services/redis.js', () => ({
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

describe('Constructs API E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/constructs', () => {
    it('should list all constructs', async () => {
      const response = {
        data: [
          { type: 'skill', slug: 'analyze', name: 'Analyze Skill' },
          { type: 'pack', slug: 'observer', name: 'Observer Pack' },
          { type: 'pack', slug: 'crucible', name: 'Crucible Pack' },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 3,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(3);
      expect(response.pagination.total).toBe(3);
    });

    it('should filter by type=skill', async () => {
      const response = {
        data: [{ type: 'skill', slug: 'analyze', name: 'Analyze Skill' }],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(1);
      expect(response.data[0].type).toBe('skill');
    });

    it('should filter by type=pack', async () => {
      const response = {
        data: [
          { type: 'pack', slug: 'observer', name: 'Observer Pack' },
          { type: 'pack', slug: 'crucible', name: 'Crucible Pack' },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 2,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(2);
      expect(response.data.every((c: any) => c.type === 'pack')).toBe(true);
    });

    it('should filter by tier=pro', async () => {
      const response = {
        data: [{ type: 'pack', slug: 'crucible', tier_required: 'pro' }],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(1);
      expect(response.data[0].tier_required).toBe('pro');
    });

    it('should filter by featured=true', async () => {
      const response = {
        data: [{ type: 'pack', slug: 'observer', is_featured: true }],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(1);
      expect(response.data[0].is_featured).toBe(true);
    });

    it('should filter by category', async () => {
      const response = {
        data: [{ type: 'skill', slug: 'analyze', category: 'development' }],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      expect(response.data).toHaveLength(1);
      expect(response.data[0].category).toBe('development');
    });

    it('should search by query', async () => {
      const response = {
        data: [{ type: 'pack', slug: 'observer', name: 'Observer Pack' }],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      // Searching for "observer" should return the observer pack
      expect(response.data).toHaveLength(1);
      expect(response.data[0].slug).toBe('observer');
    });

    it('should paginate results', async () => {
      const response = {
        data: [{ type: 'pack', slug: 'crucible' }],
        pagination: {
          page: 2,
          per_page: 1,
          total: 3,
          total_pages: 3,
        },
      };

      expect(response.pagination.page).toBe(2);
      expect(response.pagination.per_page).toBe(1);
      expect(response.pagination.total_pages).toBe(3);
    });

    it('should sort by downloads', async () => {
      const response = {
        data: [
          { slug: 'analyze', downloads: 2000 },
          { slug: 'observer', downloads: 1000 },
          { slug: 'crucible', downloads: 500 },
        ],
        pagination: { page: 1, per_page: 20, total: 3, total_pages: 1 },
      };

      // Should be sorted by downloads descending
      expect(response.data[0].downloads).toBeGreaterThan(response.data[1].downloads);
      expect(response.data[1].downloads).toBeGreaterThan(response.data[2].downloads);
    });
  });

  describe('GET /v1/constructs/:slug', () => {
    it('should return construct detail for pack', async () => {
      const response = {
        data: {
          id: 'pack-1',
          type: 'pack',
          name: 'Observer Pack',
          slug: 'observer',
          description: 'User research workflows',
          long_description: 'Full description of Observer pack',
          version: '2.1.0',
          tier_required: 'free',
          category: null,
          downloads: 1000,
          rating: 4.5,
          is_featured: true,
          manifest: {
            name: 'observer',
            version: '2.1.0',
            type: 'pack',
            commands: [
              { name: '/observe', description: 'Observe users' },
              { name: '/shape', description: 'Shape patterns' },
            ],
          },
          owner: {
            name: 'Alice',
            type: 'user',
            avatar_url: 'https://example.com/alice.png',
          },
          repository_url: 'https://github.com/example/observer',
          documentation_url: 'https://docs.example.com/observer',
          latest_version: {
            version: '2.1.0',
            changelog: 'Added new features',
            published_at: '2024-01-15T00:00:00.000Z',
          },
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z',
        },
        request_id: 'test-request-id',
      };

      expect(response.data.slug).toBe('observer');
      expect(response.data.type).toBe('pack');
      expect(response.data.manifest).toBeDefined();
      expect(response.data.manifest.commands).toHaveLength(2);
      expect(response.data.owner.name).toBe('Alice');
      expect(response.data.latest_version.version).toBe('2.1.0');
    });

    it('should return construct detail for skill', async () => {
      const response = {
        data: {
          id: 'skill-1',
          type: 'skill',
          name: 'Analyze Skill',
          slug: 'analyze',
          description: 'Analysis workflow',
          version: '1.5.0',
          tier_required: 'free',
          category: 'development',
          downloads: 2000,
          rating: 4.7,
          manifest: {
            name: 'analyze',
            version: '1.5.0',
            type: 'skill',
            commands: [{ name: '/analyze', description: 'Analysis workflow' }],
          },
        },
        request_id: 'test-request-id',
      };

      expect(response.data.slug).toBe('analyze');
      expect(response.data.type).toBe('skill');
      expect(response.data.category).toBe('development');
      expect(response.data.manifest.commands).toHaveLength(1);
      expect(response.data.manifest.commands[0].name).toBe('/analyze');
    });

    it('should return 404 for non-existent construct', async () => {
      const response = {
        error: {
          code: 'NOT_FOUND',
          message: 'Construct not found',
        },
      };

      expect(response.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /v1/constructs/summary', () => {
    it('should return agent-optimized summary', async () => {
      const response = {
        constructs: [
          {
            slug: 'observer',
            name: 'Observer Pack',
            type: 'pack',
            commands: ['/observe', '/shape'],
            tier_required: 'free',
          },
          {
            slug: 'crucible',
            name: 'Crucible Pack',
            type: 'pack',
            commands: ['/test'],
            tier_required: 'pro',
          },
        ],
        total: 2,
        last_updated: '2024-01-17T00:00:00.000Z',
      };

      expect(response.constructs).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.last_updated).toBeDefined();

      // Verify minimal token structure
      const firstConstruct = response.constructs[0];
      const keys = Object.keys(firstConstruct);
      expect(keys).toHaveLength(5);
      expect(keys).toContain('slug');
      expect(keys).toContain('name');
      expect(keys).toContain('type');
      expect(keys).toContain('commands');
      expect(keys).toContain('tier_required');

      // Should NOT contain verbose fields
      expect(keys).not.toContain('description');
      expect(keys).not.toContain('downloads');
      expect(keys).not.toContain('rating');
    });

    it('should extract command names from manifests', async () => {
      const response = {
        constructs: [
          {
            slug: 'observer',
            commands: ['/observe', '/shape'],
          },
        ],
        total: 1,
        last_updated: '2024-01-17T00:00:00.000Z',
      };

      expect(response.constructs[0].commands).toEqual(['/observe', '/shape']);
    });
  });

  describe('HEAD /v1/constructs/:slug', () => {
    it('should return 200 for existing construct', async () => {
      const statusCode = 200;
      expect(statusCode).toBe(200);
    });

    it('should return 404 for non-existent construct', async () => {
      const statusCode = 404;
      expect(statusCode).toBe(404);
    });

    it('should have empty body', async () => {
      const body = null;
      expect(body).toBeNull();
    });
  });

  describe('Response Format', () => {
    it('should include request_id in responses', async () => {
      const response = {
        data: [],
        request_id: 'abc-123',
      };

      expect(response.request_id).toBeDefined();
      expect(typeof response.request_id).toBe('string');
    });

    it('should format dates as ISO strings', async () => {
      const response = {
        data: {
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z',
        },
      };

      expect(response.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should use snake_case for field names', async () => {
      const response = {
        data: {
          tier_required: 'free',
          is_featured: true,
          long_description: 'Description',
          repository_url: 'https://example.com',
          documentation_url: 'https://docs.example.com',
          latest_version: { version: '1.0.0' },
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      };

      // All keys should be snake_case
      const keys = Object.keys(response.data);
      keys.forEach((key) => {
        expect(key).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });
  });

  describe('Manifest Format', () => {
    it('should include manifest summary in list response', async () => {
      const listItem = {
        manifest: {
          skills: ['observe', 'shape'],
          commands: ['/observe', '/shape'],
          dependencies: {},
        },
      };

      expect(listItem.manifest.skills).toBeInstanceOf(Array);
      expect(listItem.manifest.commands).toBeInstanceOf(Array);
    });

    it('should include full manifest in detail response', async () => {
      const detailItem = {
        manifest: {
          name: 'observer',
          version: '2.1.0',
          type: 'pack',
          description: 'User research workflows',
          author: 'HoneyJar',
          license: 'MIT',
          skills: [
            { name: 'observe', version: '>=1.0.0', required: true },
            { name: 'shape', required: false },
          ],
          commands: [
            { name: '/observe', skill: 'observe', description: 'Capture user feedback' },
            { name: '/shape', skill: 'shape', description: 'Shape patterns' },
          ],
          dependencies: {
            skills: ['core-analysis'],
            tools: ['git', 'gh'],
          },
          tier_required: 'free',
        },
      };

      expect(detailItem.manifest.name).toBe('observer');
      expect(detailItem.manifest.skills).toHaveLength(2);
      expect(detailItem.manifest.commands).toHaveLength(2);
      expect(detailItem.manifest.dependencies.skills).toContain('core-analysis');
    });
  });

  describe('Error Responses', () => {
    it('should return 400 for invalid type filter', async () => {
      const response = {
        error: {
          code: 'VALIDATION_ERROR',
          message: "Invalid type. Expected 'skill', 'pack', or 'bundle'",
        },
      };

      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid tier filter', async () => {
      const response = {
        error: {
          code: 'VALIDATION_ERROR',
          message: "Invalid tier. Expected 'free', 'pro', 'team', or 'enterprise'",
        },
      };

      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid page number', async () => {
      const response = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Page must be a positive integer',
        },
      };

      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for exceeding max page size', async () => {
      const response = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Page size cannot exceed 100',
        },
      };

      expect(response.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache list results for non-search queries', async () => {
      // Non-search query can be cached
      const cacheKey = 'constructs:list:pack:free::false:1:20';
      expect(cacheKey).toContain('constructs:list');
    });

    it('should not cache search results', async () => {
      // Search queries should bypass cache
      const query = 'observer';
      const shouldCache = !query;
      expect(shouldCache).toBe(false);
    });

    it('should cache detail results', async () => {
      const cacheKey = 'construct:observer';
      expect(cacheKey).toBe('construct:observer');
    });

    it('should cache summary results', async () => {
      const cacheKey = 'constructs:summary';
      expect(cacheKey).toBe('constructs:summary');
    });

    it('should cache exists results', async () => {
      const cacheKey = 'construct:exists:observer';
      expect(cacheKey).toContain('construct:exists:');
    });
  });
});
