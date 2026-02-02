/**
 * Configuration Loader Tests
 * @see prd.md §4.2 Client-Side Feature Gating (Opportunity 2)
 * @see sprint.md T23.2: Create config.test.ts unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  loadLoaConfig,
  isPackEnabled,
  getDisabledPacks,
  getConfigPath,
  hasConfig,
} from '../src/config.js';

describe('Configuration Loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loa-config-test-'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadLoaConfig', () => {
    it('should load valid config with disabled_packs', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - gtm-collective
    - expensive-pack
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config).not.toBeNull();
      expect(config?.constructs?.disabled_packs).toEqual(['gtm-collective', 'expensive-pack']);
    });

    it('should load config without constructs section', async () => {
      const configContent = `
other_settings:
  key: value
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config).not.toBeNull();
      expect(config?.constructs).toBeUndefined();
      expect(config?.other_settings).toEqual({ key: 'value' });
    });

    it('should load config with empty disabled_packs', async () => {
      const configContent = `
constructs:
  disabled_packs: []
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config).not.toBeNull();
      expect(config?.constructs?.disabled_packs).toEqual([]);
    });

    it('should return null for missing config file', async () => {
      const config = await loadLoaConfig(tempDir);

      expect(config).toBeNull();
    });

    it('should return null for invalid YAML', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - valid-pack
  invalid: [
    unclosed array
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config).toBeNull();
    });

    it('should return null for empty file', async () => {
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), '');

      const config = await loadLoaConfig(tempDir);

      expect(config).toBeNull();
    });

    it('should handle config with offline section', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - test-pack
  offline:
    enabled: true
    cache_ttl_days: 30
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config).not.toBeNull();
      expect(config?.constructs?.offline?.enabled).toBe(true);
      expect(config?.constructs?.offline?.cache_ttl_days).toBe(30);
    });
  });

  describe('isPackEnabled', () => {
    it('should return false for disabled pack', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - disabled-pack
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const enabled = await isPackEnabled('disabled-pack', tempDir);

      expect(enabled).toBe(false);
    });

    it('should return true for enabled pack', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - other-pack
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const enabled = await isPackEnabled('enabled-pack', tempDir);

      expect(enabled).toBe(true);
    });

    it('should return true when no config file exists', async () => {
      const enabled = await isPackEnabled('any-pack', tempDir);

      expect(enabled).toBe(true);
    });

    it('should return true when constructs section is missing', async () => {
      const configContent = `
other_settings:
  key: value
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const enabled = await isPackEnabled('any-pack', tempDir);

      expect(enabled).toBe(true);
    });

    it('should return true when disabled_packs is missing', async () => {
      const configContent = `
constructs:
  offline:
    enabled: false
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const enabled = await isPackEnabled('any-pack', tempDir);

      expect(enabled).toBe(true);
    });

    it('should return true when disabled_packs is empty', async () => {
      const configContent = `
constructs:
  disabled_packs: []
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const enabled = await isPackEnabled('any-pack', tempDir);

      expect(enabled).toBe(true);
    });

    it('should be case-sensitive for pack slugs', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - Test-Pack
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      expect(await isPackEnabled('Test-Pack', tempDir)).toBe(false);
      expect(await isPackEnabled('test-pack', tempDir)).toBe(true);
    });
  });

  describe('getDisabledPacks', () => {
    it('should return correct array of disabled packs', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - pack-a
    - pack-b
    - pack-c
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual(['pack-a', 'pack-b', 'pack-c']);
    });

    it('should return empty array when no config', async () => {
      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual([]);
    });

    it('should return empty array when no constructs section', async () => {
      const configContent = `
other: value
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual([]);
    });

    it('should return empty array when disabled_packs is missing', async () => {
      const configContent = `
constructs:
  offline:
    enabled: true
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual([]);
    });

    it('should return empty array when disabled_packs is not an array', async () => {
      const configContent = `
constructs:
  disabled_packs: "not-an-array"
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual([]);
    });
  });

  describe('getConfigPath', () => {
    it('should return correct path', () => {
      const configPath = getConfigPath('/some/directory');

      expect(configPath).toBe('/some/directory/.loa.config.yaml');
    });

    it('should handle trailing slash', () => {
      const configPath = getConfigPath('/some/directory/');

      expect(configPath).toBe('/some/directory/.loa.config.yaml');
    });
  });

  describe('hasConfig', () => {
    it('should return true when config exists', async () => {
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), 'key: value');

      const exists = await hasConfig(tempDir);

      expect(exists).toBe(true);
    });

    it('should return false when config does not exist', async () => {
      const exists = await hasConfig(tempDir);

      expect(exists).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in pack slugs', async () => {
      const configContent = `
constructs:
  disabled_packs:
    - pack-with-123
    - pack_with_underscores
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      expect(await isPackEnabled('pack-with-123', tempDir)).toBe(false);
      expect(await isPackEnabled('pack_with_underscores', tempDir)).toBe(false);
      expect(await isPackEnabled('other-pack', tempDir)).toBe(true);
    });

    it('should handle YAML with comments', async () => {
      const configContent = `
# This is a comment
constructs:
  # Another comment
  disabled_packs:
    - pack-a  # inline comment
    - pack-b
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const disabled = await getDisabledPacks(tempDir);

      expect(disabled).toEqual(['pack-a', 'pack-b']);
    });

    it('should handle YAML with anchors and aliases', async () => {
      const configContent = `
defaults: &defaults
  enabled: true

constructs:
  <<: *defaults
  disabled_packs:
    - pack-a
`;
      await fs.writeFile(path.join(tempDir, '.loa.config.yaml'), configContent);

      const config = await loadLoaConfig(tempDir);

      expect(config?.constructs?.disabled_packs).toEqual(['pack-a']);
    });
  });
});
