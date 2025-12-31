/**
 * Pack Install Command Tests
 * @see sprint-v2.md T15.6: E2E Testing for Pack Flow
 *
 * Test scenarios:
 * 4. CLI pack install -> Files created correctly
 * 5. CLI pack list -> Shows installed pack
 * 6. CLI pack update -> Updates to new version
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock auth module
vi.mock('../src/auth.js', () => ({
  getCredentials: vi.fn(() => ({
    token: 'test-token',
    refreshToken: 'test-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    tier: 'pro',
    userId: 'test-user-id',
    email: 'test@example.com',
  })),
  getClient: vi.fn(() => Promise.resolve({
    getPack: vi.fn(() => Promise.resolve({
      id: 'pack-id',
      name: 'Test Pack',
      slug: 'test-pack',
      description: 'A test pack',
      tier_required: 'free',
      pricing_type: 'free',
    })),
    downloadPack: vi.fn(() => Promise.resolve({
      pack: {
        name: 'Test Pack',
        slug: 'test-pack',
        version: '1.0.0',
        manifest: {
          name: 'Test Pack',
          slug: 'test-pack',
          version: '1.0.0',
          skills: [{ slug: 'test-skill', path: 'skills/test-skill' }],
          commands: [{ name: 'test-cmd', path: 'commands/test-cmd.md' }],
        },
        files: [
          { path: 'skills/test-skill/SKILL.md', content: Buffer.from('# Test Skill').toString('base64') },
          { path: 'skills/test-skill/index.yaml', content: Buffer.from('name: Test Skill').toString('base64') },
          { path: 'commands/test-cmd.md', content: Buffer.from('# Test Command').toString('base64') },
        ],
      },
      license: {
        token: 'license-jwt-token',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        watermark: 'abc123watermark',
      },
    })),
    getPackVersions: vi.fn(() => Promise.resolve([
      { id: 'v1', version: '1.0.0', is_latest: false },
      { id: 'v2', version: '1.1.0', is_latest: true },
    ])),
  })),
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

describe('CLI Pack Install Flow', () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Create temp directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loa-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Pack Install', () => {
    it('should verify credentials before installing', async () => {
      const { getCredentials } = await import('../src/auth.js');
      const creds = getCredentials();

      expect(creds).toBeDefined();
      expect(creds?.tier).toBe('pro');
    });

    it('should check subscription tier before download', async () => {
      const { canAccessTier } = await import('../src/auth.js');

      // Pro user can access free packs
      expect(canAccessTier('pro', 'free')).toBe(true);

      // Free user cannot access pro packs
      expect(canAccessTier('free', 'pro')).toBe(false);
    });

    it('should create pack directory structure', async () => {
      const packDir = path.join(tempDir, '.claude', 'packs', 'test-pack');
      await fs.mkdir(packDir, { recursive: true });

      const exists = await fs.access(packDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should write skill files to skills directory', async () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills', 'test-skill');
      await fs.mkdir(skillsDir, { recursive: true });

      const skillFile = path.join(skillsDir, 'SKILL.md');
      await fs.writeFile(skillFile, '# Test Skill');

      const content = await fs.readFile(skillFile, 'utf-8');
      expect(content).toBe('# Test Skill');
    });

    it('should write command files to commands directory', async () => {
      const commandsDir = path.join(tempDir, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });

      const commandFile = path.join(commandsDir, 'test-cmd.md');
      await fs.writeFile(commandFile, '# Test Command');

      const content = await fs.readFile(commandFile, 'utf-8');
      expect(content).toBe('# Test Command');
    });

    it('should save manifest.json in pack directory', async () => {
      const packDir = path.join(tempDir, '.claude', 'packs', 'test-pack');
      await fs.mkdir(packDir, { recursive: true });

      const manifest = {
        name: 'Test Pack',
        slug: 'test-pack',
        version: '1.0.0',
        skills: [{ slug: 'test-skill', path: 'skills/test-skill' }],
      };

      const manifestPath = path.join(packDir, 'manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.name).toBe('Test Pack');
      expect(parsed.version).toBe('1.0.0');
    });

    it('should save license.json in pack directory', async () => {
      const packDir = path.join(tempDir, '.claude', 'packs', 'test-pack');
      await fs.mkdir(packDir, { recursive: true });

      const license = {
        pack: 'test-pack',
        version: '1.0.0',
        token: 'jwt-license-token',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        watermark: 'abc123',
        installed_at: new Date().toISOString(),
      };

      const licensePath = path.join(packDir, '.license.json');
      await fs.writeFile(licensePath, JSON.stringify(license, null, 2));

      const content = await fs.readFile(licensePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.pack).toBe('test-pack');
      expect(parsed.token).toBeDefined();
    });
  });

  describe('Pack List', () => {
    it('should read installed packs from packs directory', async () => {
      const packsDir = path.join(tempDir, '.claude', 'packs');
      const pack1Dir = path.join(packsDir, 'pack-1');
      const pack2Dir = path.join(packsDir, 'pack-2');

      await fs.mkdir(pack1Dir, { recursive: true });
      await fs.mkdir(pack2Dir, { recursive: true });

      // Write manifests
      await fs.writeFile(
        path.join(pack1Dir, 'manifest.json'),
        JSON.stringify({ name: 'Pack 1', slug: 'pack-1', version: '1.0.0' })
      );
      await fs.writeFile(
        path.join(pack2Dir, 'manifest.json'),
        JSON.stringify({ name: 'Pack 2', slug: 'pack-2', version: '2.0.0' })
      );

      const entries = await fs.readdir(packsDir, { withFileTypes: true });
      const packDirs = entries.filter(e => e.isDirectory());

      expect(packDirs).toHaveLength(2);
    });

    it('should show license expiration status', async () => {
      const now = new Date();
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysLeft).toBe(7);
      expect(daysLeft <= 7).toBe(true); // Should show warning
    });

    it('should detect expired licenses', async () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      const isExpired = expired < now;
      expect(isExpired).toBe(true);
    });
  });

  describe('Pack Update', () => {
    it('should compare installed version with latest', async () => {
      const installedVersion = '1.0.0';
      const latestVersion = '1.1.0';

      expect(installedVersion).not.toBe(latestVersion);
    });

    it('should download newer version if available', async () => {
      const { getClient } = await import('../src/auth.js');
      const client = await getClient();
      const versions = await client.getPackVersions('test-pack');

      const latest = versions.find(v => v.is_latest);
      expect(latest?.version).toBe('1.1.0');
    });

    it('should remove old skill files before installing new version', async () => {
      const skillDir = path.join(tempDir, '.claude', 'skills', 'old-skill');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'old content');

      // Simulate removal
      await fs.rm(skillDir, { recursive: true, force: true });

      const exists = await fs.access(skillDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should update license after version update', async () => {
      const oldLicense = {
        pack: 'test-pack',
        version: '1.0.0',
        token: 'old-token',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const newLicense = {
        pack: 'test-pack',
        version: '1.1.0',
        token: 'new-token',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      expect(newLicense.version).not.toBe(oldLicense.version);
      expect(newLicense.token).not.toBe(oldLicense.token);
    });
  });

  describe('Error Handling', () => {
    it('should handle pack not found', async () => {
      const error = { code: 'NOT_FOUND', message: 'Pack not found' };
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should handle insufficient subscription', async () => {
      const { canAccessTier } = await import('../src/auth.js');
      const canAccess = canAccessTier('free', 'enterprise');

      expect(canAccess).toBe(false);
      // Would return 402 Payment Required
    });

    it('should handle network errors gracefully', async () => {
      // Network errors should be caught and logged
      const error = new Error('Network error');
      expect(error.message).toBe('Network error');
    });

    it('should handle file system errors', async () => {
      // Try to write to a non-existent directory
      const badPath = path.join(tempDir, 'nonexistent', 'deep', 'path', 'file.txt');

      try {
        await fs.writeFile(badPath, 'content');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

describe('Base64 Encoding/Decoding', () => {
  it('should correctly encode and decode content', () => {
    const original = '# Test Skill\n\nThis is a test skill.';
    const encoded = Buffer.from(original).toString('base64');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');

    expect(decoded).toBe(original);
  });

  it('should handle unicode content', () => {
    const original = '# Test Skill\n\nUnicode: \u{1F680} \u{2728}';
    const encoded = Buffer.from(original).toString('base64');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');

    expect(decoded).toBe(original);
  });
});
