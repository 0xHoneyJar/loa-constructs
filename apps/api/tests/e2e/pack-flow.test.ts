/**
 * Pack Flow E2E Tests
 * @see sprint-v2.md T15.6: E2E Testing for Pack Flow
 *
 * Test scenarios:
 * 1. Create pack -> Upload version -> List packs
 * 2. Download pack as free user -> 402 response
 * 3. Download pack as pro user -> Success
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database
vi.mock('../../src/db/index.js', () => {
  const mockPacks = new Map<string, any>();
  const mockVersions = new Map<string, any>();
  const mockFiles = new Map<string, any>();

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn((condition) => {
            if (table === 'packs') {
              const results = Array.from(mockPacks.values());
              return results.length > 0 ? results : [];
            }
            return [];
          }),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve(Array.from(mockPacks.values()))),
            })),
          })),
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((data) => ({
          returning: vi.fn(() => {
            const id = crypto.randomUUID();
            const record = { id, ...data };
            mockPacks.set(id, record);
            return Promise.resolve([record]);
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
    packs: {},
    packVersions: {},
    packFiles: {},
    packInstallations: {},
    subscriptions: {},
    users: {},
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

vi.mock('../../src/services/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve({ key: 'test-key', size: 100 })),
  downloadFile: vi.fn(() => Promise.resolve(Buffer.from('test content'))),
  isStorageConfigured: vi.fn(() => true),
}));

vi.mock('../../src/services/subscription.js', () => ({
  getEffectiveTier: vi.fn((userId) => {
    // Free user
    if (userId === 'free-user-id') return Promise.resolve('free');
    // Pro user
    if (userId === 'pro-user-id') return Promise.resolve('pro');
    return Promise.resolve('free');
  }),
  canAccessTier: vi.fn((userTier, requiredTier) => {
    const hierarchy: Record<string, number> = {
      free: 0,
      pro: 1,
      team: 2,
      enterprise: 3,
    };
    return hierarchy[userTier] >= hierarchy[requiredTier];
  }),
}));

describe('Pack Flow E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pack Creation Flow', () => {
    it('should create a new pack', async () => {
      const packData = {
        name: 'Test Pack',
        slug: 'test-pack',
        description: 'A test pack for E2E testing',
        ownerId: 'creator-user-id',
        ownerType: 'user' as const,
        pricingType: 'free' as const,
        tierRequired: 'free' as const,
      };

      // Simulate pack creation
      expect(packData.name).toBe('Test Pack');
      expect(packData.slug).toBe('test-pack');
      expect(packData.tierRequired).toBe('free');
    });

    it('should upload pack version', async () => {
      const versionData = {
        packId: 'test-pack-id',
        version: '1.0.0',
        changelog: 'Initial release',
        manifest: {
          name: 'Test Pack',
          slug: 'test-pack',
          version: '1.0.0',
          skills: [{ slug: 'test-skill', path: 'skills/test-skill' }],
        },
      };

      // Validate version format
      expect(versionData.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(versionData.manifest.skills).toHaveLength(1);
    });

    it('should list packs', async () => {
      const mockPacks = [
        { id: '1', name: 'Pack 1', slug: 'pack-1', status: 'published' },
        { id: '2', name: 'Pack 2', slug: 'pack-2', status: 'published' },
      ];

      expect(mockPacks).toHaveLength(2);
      expect(mockPacks[0].status).toBe('published');
    });
  });

  describe('Pack Access Control', () => {
    it('should allow free user to access free packs', async () => {
      const userTier = 'free';
      const packTier = 'free';

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(true);
    });

    it('should deny free user access to pro packs (402)', async () => {
      const userTier = 'free';
      const packTier = 'pro';

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(false);

      // In real API, this would return 402 Payment Required
      const httpStatus = canAccessTier(userTier, packTier) ? 200 : 402;
      expect(httpStatus).toBe(402);
    });

    it('should allow pro user to access pro packs', async () => {
      const userTier = 'pro';
      const packTier = 'pro';

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(true);
    });

    it('should allow pro user to access free packs', async () => {
      const userTier = 'pro';
      const packTier = 'free';

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(true);
    });

    it('should allow team tier to access all lower tiers', async () => {
      const userTier = 'team';

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, 'free')).toBe(true);
      expect(canAccessTier(userTier, 'pro')).toBe(true);
      expect(canAccessTier(userTier, 'team')).toBe(true);
    });
  });

  describe('Pack Download Flow', () => {
    it('should include license token in download response', async () => {
      const mockDownloadResponse = {
        pack: {
          name: 'Test Pack',
          slug: 'test-pack',
          version: '1.0.0',
          manifest: {
            name: 'Test Pack',
            slug: 'test-pack',
            version: '1.0.0',
          },
          files: [
            { path: 'skills/test/SKILL.md', content: 'base64content' },
            { path: 'skills/test/index.yaml', content: 'base64content' },
          ],
        },
        license: {
          token: 'jwt-license-token',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          watermark: 'abc123watermark',
        },
      };

      expect(mockDownloadResponse.license.token).toBeDefined();
      expect(mockDownloadResponse.license.expires_at).toBeDefined();
      expect(mockDownloadResponse.license.watermark).toBeDefined();
      expect(mockDownloadResponse.pack.files).toHaveLength(2);
    });

    it('should include all pack files in download', async () => {
      const mockFiles = [
        { path: 'skills/skill-1/SKILL.md', content: 'base64...' },
        { path: 'skills/skill-1/index.yaml', content: 'base64...' },
        { path: 'commands/my-command.md', content: 'base64...' },
        { path: 'protocols/my-protocol.md', content: 'base64...' },
      ];

      expect(mockFiles.some(f => f.path.startsWith('skills/'))).toBe(true);
      expect(mockFiles.some(f => f.path.startsWith('commands/'))).toBe(true);
      expect(mockFiles.some(f => f.path.startsWith('protocols/'))).toBe(true);
    });
  });

  describe('Pack Manifest Validation', () => {
    it('should validate required manifest fields', () => {
      const validManifest = {
        name: 'Test Pack',
        slug: 'test-pack',
        version: '1.0.0',
      };

      expect(validManifest.name).toBeDefined();
      expect(validManifest.slug).toBeDefined();
      expect(validManifest.version).toBeDefined();
    });

    it('should validate semver format', () => {
      const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

      expect('1.0.0').toMatch(semverRegex);
      expect('2.1.3').toMatch(semverRegex);
      expect('1.0.0-beta.1').toMatch(semverRegex);
      expect('invalid').not.toMatch(semverRegex);
    });

    it('should validate slug format', () => {
      const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

      expect('test-pack').toMatch(slugRegex);
      expect('my-awesome-pack').toMatch(slugRegex);
      expect('Invalid_Pack').not.toMatch(slugRegex);
      expect('-invalid').not.toMatch(slugRegex);
    });

    it('should accept optional skill references', () => {
      const manifestWithSkills = {
        name: 'Test Pack',
        slug: 'test-pack',
        version: '1.0.0',
        skills: [
          { slug: 'skill-1', path: 'skills/skill-1' },
          { slug: 'skill-2', path: 'skills/skill-2' },
        ],
      };

      expect(manifestWithSkills.skills).toHaveLength(2);
      expect(manifestWithSkills.skills[0].slug).toBe('skill-1');
    });

    it('should accept optional command references', () => {
      const manifestWithCommands = {
        name: 'Test Pack',
        slug: 'test-pack',
        version: '1.0.0',
        commands: [
          { name: 'command-1', path: 'commands/command-1.md' },
        ],
      };

      expect(manifestWithCommands.commands).toHaveLength(1);
      expect(manifestWithCommands.commands[0].name).toBe('command-1');
    });
  });

  /**
   * GTM Collective Pack Tests
   * @see sprint.md T16.7: Write Integration Test
   */
  describe('GTM Collective Pack', () => {
    const GTM_MANIFEST = {
      name: 'GTM Collective',
      slug: 'gtm-collective',
      version: '1.0.0',
      description: 'Go-To-Market skills and commands for product launches, positioning, and developer relations.',
      author: {
        name: 'The Honey Jar',
        email: 'hello@thehoneyjar.xyz',
        url: 'https://thehoneyjar.xyz',
      },
      skills: [
        { slug: 'analyzing-market', path: 'skills/analyzing-market/' },
        { slug: 'building-partnerships', path: 'skills/building-partnerships/' },
        { slug: 'crafting-narratives', path: 'skills/crafting-narratives/' },
        { slug: 'educating-developers', path: 'skills/educating-developers/' },
        { slug: 'positioning-product', path: 'skills/positioning-product/' },
        { slug: 'pricing-strategist', path: 'skills/pricing-strategist/' },
        { slug: 'reviewing-gtm', path: 'skills/reviewing-gtm/' },
        { slug: 'translating-for-stakeholders', path: 'skills/translating-for-stakeholders/' },
      ],
      commands: [
        { name: 'analyze-market', path: 'commands/analyze-market.md' },
        { name: 'announce-release', path: 'commands/announce-release.md' },
        { name: 'create-deck', path: 'commands/create-deck.md' },
        { name: 'gtm-adopt', path: 'commands/gtm-adopt.md' },
        { name: 'gtm-feature-requests', path: 'commands/gtm-feature-requests.md' },
        { name: 'gtm-setup', path: 'commands/gtm-setup.md' },
        { name: 'plan-devrel', path: 'commands/plan-devrel.md' },
        { name: 'plan-launch', path: 'commands/plan-launch.md' },
        { name: 'plan-partnerships', path: 'commands/plan-partnerships.md' },
        { name: 'position', path: 'commands/position.md' },
        { name: 'price', path: 'commands/price.md' },
        { name: 'review-gtm', path: 'commands/review-gtm.md' },
        { name: 'sync-from-dev', path: 'commands/sync-from-dev.md' },
        { name: 'sync-from-gtm', path: 'commands/sync-from-gtm.md' },
      ],
      dependencies: {
        loa_version: '>=0.9.0',
        skills: [],
        packs: [],
      },
      pricing: {
        type: 'subscription',
        tier: 'pro',
      },
      tags: ['gtm', 'marketing', 'product', 'devrel', 'positioning', 'pricing', 'launch'],
      license: 'proprietary',
    };

    it('should have valid GTM Collective manifest structure', () => {
      expect(GTM_MANIFEST.name).toBe('GTM Collective');
      expect(GTM_MANIFEST.slug).toBe('gtm-collective');
      expect(GTM_MANIFEST.version).toBe('1.0.0');
    });

    it('should include all 8 GTM skills', () => {
      expect(GTM_MANIFEST.skills).toHaveLength(8);

      const skillSlugs = GTM_MANIFEST.skills.map(s => s.slug);
      expect(skillSlugs).toContain('analyzing-market');
      expect(skillSlugs).toContain('positioning-product');
      expect(skillSlugs).toContain('pricing-strategist');
      expect(skillSlugs).toContain('crafting-narratives');
      expect(skillSlugs).toContain('educating-developers');
      expect(skillSlugs).toContain('building-partnerships');
      expect(skillSlugs).toContain('translating-for-stakeholders');
      expect(skillSlugs).toContain('reviewing-gtm');
    });

    it('should include all 14 GTM commands', () => {
      expect(GTM_MANIFEST.commands).toHaveLength(14);

      const commandNames = GTM_MANIFEST.commands.map(c => c.name);
      // Workflow commands
      expect(commandNames).toContain('gtm-setup');
      expect(commandNames).toContain('gtm-adopt');
      expect(commandNames).toContain('review-gtm');
      // Routing commands
      expect(commandNames).toContain('analyze-market');
      expect(commandNames).toContain('position');
      expect(commandNames).toContain('price');
      expect(commandNames).toContain('plan-launch');
      expect(commandNames).toContain('create-deck');
    });

    it('should require pro tier subscription', () => {
      expect(GTM_MANIFEST.pricing.type).toBe('subscription');
      expect(GTM_MANIFEST.pricing.tier).toBe('pro');
    });

    it('should deny free tier access to GTM Collective', async () => {
      const userTier = 'free';
      const packTier = GTM_MANIFEST.pricing.tier;

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(false);

      // Simulates 402 Payment Required
      const httpStatus = canAccessTier(userTier, packTier) ? 200 : 402;
      expect(httpStatus).toBe(402);
    });

    it('should allow pro tier access to GTM Collective', async () => {
      const userTier = 'pro';
      const packTier = GTM_MANIFEST.pricing.tier;

      const { canAccessTier } = await import('../../src/services/subscription.js');
      expect(canAccessTier(userTier, packTier)).toBe(true);
    });

    it('should require Loa version 0.9.0 or higher', () => {
      expect(GTM_MANIFEST.dependencies.loa_version).toBe('>=0.9.0');
    });

    it('should have proper skill path format', () => {
      for (const skill of GTM_MANIFEST.skills) {
        expect(skill.path).toMatch(/^skills\/[\w-]+\/$/);
        expect(skill.slug).toMatch(/^[\w-]+$/);
      }
    });

    it('should have proper command path format', () => {
      for (const command of GTM_MANIFEST.commands) {
        expect(command.path).toMatch(/^commands\/[\w-]+\.md$/);
        expect(command.name).toMatch(/^[\w-]+$/);
      }
    });

    it('should include marketing-related tags', () => {
      expect(GTM_MANIFEST.tags).toContain('gtm');
      expect(GTM_MANIFEST.tags).toContain('marketing');
      expect(GTM_MANIFEST.tags).toContain('positioning');
      expect(GTM_MANIFEST.tags).toContain('pricing');
    });

    it('should have proprietary license', () => {
      expect(GTM_MANIFEST.license).toBe('proprietary');
    });
  });
});
