/**
 * Manifest Validator Tests
 * @see sprint-constructs-api.md T3.3
 */

import { describe, it, expect } from 'vitest';
import { validateConstructManifest, assertValidManifest, manifestHasCommands, extractCommandNames } from './manifest-validator.js';

describe('validateConstructManifest', () => {
  describe('valid manifests', () => {
    it('should pass for minimal valid manifest', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for full valid manifest', () => {
      const manifest = {
        name: 'observer',
        version: '2.1.0',
        type: 'pack',
        description: 'User research workflows for Claude Code',
        author: 'HoneyJar',
        license: 'MIT',
        skills: [
          { name: 'observe', version: '>=1.0.0', required: true },
          { name: 'shape', required: false },
        ],
        commands: [
          { name: '/observe', skill: 'observe', description: 'Capture user feedback' },
          { name: '/shape', skill: 'shape', description: 'Shape patterns into journeys' },
        ],
        dependencies: {
          skills: ['core-analysis'],
          tools: ['git', 'gh'],
        },
        cultural_contexts: {
          required: ['crypto'],
          optional: ['defi', 'nft'],
        },
        directories: ['grimoires/observer', 'research/'],
        hooks: {
          post_install: 'echo "Observer installed!"',
          post_update: 'echo "Observer updated!"',
        },
        unix: {
          inputs: [],
          outputs: [],
          composes_with: ['crucible', 'artisan'],
        },
        tier_required: 'pro',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for skill type', () => {
      const manifest = {
        name: 'analyze',
        version: '1.0.0',
        type: 'skill',
        commands: [{ name: '/analyze', description: 'Run analysis' }],
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it('should pass for bundle type', () => {
      const manifest = {
        name: 'research-bundle',
        version: '1.0.0',
        type: 'bundle',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it('should pass for single character name', () => {
      const manifest = {
        name: 'a',
        version: '1.0.0',
        type: 'skill',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  describe('missing required fields', () => {
    it('should fail when name is missing', () => {
      const manifest = {
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('name') || e.path?.includes('name'))).toBe(true);
    });

    it('should fail when version is missing', () => {
      const manifest = {
        name: 'test-pack',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('version') || e.path?.includes('version'))).toBe(true);
    });

    it('should fail when type is missing', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message?.includes('type') || e.path?.includes('type'))).toBe(true);
    });
  });

  describe('invalid type enum', () => {
    it('should fail for invalid type value', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'invalid-type',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('invalid name pattern', () => {
    it('should fail for name starting with hyphen', () => {
      const manifest = {
        name: '-invalid',
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should fail for name ending with hyphen', () => {
      const manifest = {
        name: 'invalid-',
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should fail for name with uppercase', () => {
      const manifest = {
        name: 'Invalid',
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should fail for name with spaces', () => {
      const manifest = {
        name: 'test pack',
        version: '1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid version pattern', () => {
    it('should fail for non-semver version', () => {
      const manifest = {
        name: 'test-pack',
        version: 'v1.0.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should fail for incomplete version', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should fail for version with prerelease', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0-beta',
        type: 'pack',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid command name', () => {
    it('should fail for command without leading slash', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'pack',
        commands: [{ name: 'no-slash' }],
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should pass for command with leading slash', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'pack',
        commands: [{ name: '/valid-command' }],
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid tier_required', () => {
    it('should fail for invalid tier value', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'pack',
        tier_required: 'premium',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should pass for valid tier values', () => {
      for (const tier of ['free', 'pro', 'team', 'enterprise']) {
        const manifest = {
          name: 'test-pack',
          version: '1.0.0',
          type: 'pack',
          tier_required: tier,
        };
        const result = validateConstructManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('invalid license', () => {
    it('should fail for invalid license', () => {
      const manifest = {
        name: 'test-pack',
        version: '1.0.0',
        type: 'pack',
        license: 'GPL-3.0',
      };
      const result = validateConstructManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it('should pass for valid licenses', () => {
      for (const license of ['MIT', 'Apache-2.0', 'proprietary', 'UNLICENSED']) {
        const manifest = {
          name: 'test-pack',
          version: '1.0.0',
          type: 'pack',
          license,
        };
        const result = validateConstructManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });
  });
});

describe('assertValidManifest', () => {
  it('should not throw for valid manifest', () => {
    const manifest = {
      name: 'test-pack',
      version: '1.0.0',
      type: 'pack',
    };
    expect(() => assertValidManifest(manifest)).not.toThrow();
  });

  it('should throw AppError for invalid manifest', () => {
    const manifest = {
      name: 'test-pack',
      // missing version and type
    };
    expect(() => assertValidManifest(manifest)).toThrow();
  });
});

describe('manifestHasCommands', () => {
  it('should return true when manifest has commands', () => {
    const manifest = {
      commands: [{ name: '/test' }],
    };
    expect(manifestHasCommands(manifest)).toBe(true);
  });

  it('should return false for empty commands array', () => {
    const manifest = { commands: [] };
    expect(manifestHasCommands(manifest)).toBe(false);
  });

  it('should return false for null manifest', () => {
    expect(manifestHasCommands(null)).toBe(false);
  });

  it('should return false for undefined manifest', () => {
    expect(manifestHasCommands(undefined)).toBe(false);
  });

  it('should return false when commands is missing', () => {
    expect(manifestHasCommands({})).toBe(false);
  });
});

describe('extractCommandNames', () => {
  it('should extract command names', () => {
    const manifest = {
      commands: [
        { name: '/observe' },
        { name: '/shape' },
        { name: '/analyze' },
      ],
    };
    expect(extractCommandNames(manifest)).toEqual(['/observe', '/shape', '/analyze']);
  });

  it('should return empty array for null manifest', () => {
    expect(extractCommandNames(null)).toEqual([]);
  });

  it('should return empty array for manifest without commands', () => {
    expect(extractCommandNames({})).toEqual([]);
  });

  it('should filter out empty names', () => {
    const manifest = {
      commands: [{ name: '/valid' }, { name: '' }, { name: '/another' }],
    };
    expect(extractCommandNames(manifest)).toEqual(['/valid', '/another']);
  });
});
