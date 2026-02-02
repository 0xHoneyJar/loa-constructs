/**
 * Pack Marker Utility Tests
 * @see prd.md §4.1 Magic Markers (Opportunity 1)
 * @see sprint.md T22.2: Create pack-marker.test.ts unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  shouldAddMarker,
  computeContentHash,
  addPackMarker,
  hasPackMarker,
  extractPackMarker,
  removePackMarker,
  verifyPackMarkerIntegrity,
  type PackMarkerInfo,
} from '../src/pack-marker.js';

describe('Pack Marker Utilities', () => {
  describe('shouldAddMarker', () => {
    it('should return true for .md files', () => {
      expect(shouldAddMarker('SKILL.md')).toBe(true);
      expect(shouldAddMarker('path/to/README.md')).toBe(true);
      expect(shouldAddMarker('/absolute/path/file.md')).toBe(true);
    });

    it('should return true for .yaml files', () => {
      expect(shouldAddMarker('index.yaml')).toBe(true);
      expect(shouldAddMarker('path/to/config.yaml')).toBe(true);
    });

    it('should return true for .yml files', () => {
      expect(shouldAddMarker('config.yml')).toBe(true);
      expect(shouldAddMarker('path/to/data.yml')).toBe(true);
    });

    it('should return false for other file types', () => {
      expect(shouldAddMarker('file.ts')).toBe(false);
      expect(shouldAddMarker('file.js')).toBe(false);
      expect(shouldAddMarker('file.json')).toBe(false);
      expect(shouldAddMarker('file.txt')).toBe(false);
      expect(shouldAddMarker('file.py')).toBe(false);
    });

    it('should be case-insensitive for extensions', () => {
      expect(shouldAddMarker('FILE.MD')).toBe(true);
      expect(shouldAddMarker('file.YAML')).toBe(true);
      expect(shouldAddMarker('file.YML')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(shouldAddMarker('.md')).toBe(true);
      expect(shouldAddMarker('')).toBe(false);
    });
  });

  describe('computeContentHash', () => {
    it('should return 16-character hash', () => {
      const hash = computeContentHash('test content');
      expect(hash).toHaveLength(16);
    });

    it('should return consistent results', () => {
      const content = '# Test Skill\n\nThis is a test.';
      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different content', () => {
      const hash1 = computeContentHash('content 1');
      const hash2 = computeContentHash('content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return hexadecimal characters only', () => {
      const hash = computeContentHash('any content');
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle empty content', () => {
      const hash = computeContentHash('');
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle unicode content', () => {
      const hash = computeContentHash('Unicode content: \u{1F680} \u{2728}');
      expect(hash).toHaveLength(16);
    });
  });

  describe('addPackMarker - Markdown', () => {
    const originalContent = '# My Skill\n\nThis is my skill.';
    const packSlug = 'gtm-collective';
    const version = '1.0.0';
    const filePath = 'skills/my-skill/SKILL.md';

    it('should add HTML comment marker to markdown files', () => {
      const result = addPackMarker(originalContent, packSlug, version, filePath);

      expect(result).toContain('<!-- @pack-managed: true');
      expect(result).toContain(`pack: ${packSlug}`);
      expect(result).toContain(`version: ${version}`);
      expect(result).toContain('hash:');
    });

    it('should add warning line after marker', () => {
      const result = addPackMarker(originalContent, packSlug, version, filePath);

      expect(result).toContain('<!-- DO NOT EDIT - Installed by Loa Constructs Registry -->');
    });

    it('should preserve original content', () => {
      const result = addPackMarker(originalContent, packSlug, version, filePath);

      expect(result).toContain(originalContent);
    });

    it('should compute hash from original content', () => {
      const result = addPackMarker(originalContent, packSlug, version, filePath);
      const expectedHash = computeContentHash(originalContent);

      expect(result).toContain(`hash: ${expectedHash}`);
    });

    it('should use correct marker format', () => {
      const result = addPackMarker(originalContent, packSlug, version, filePath);

      // Marker should be on first line
      const lines = result.split('\n');
      expect(lines[0]).toMatch(/^<!-- @pack-managed: true \| pack: [^\s]+ \| version: [^\s]+ \| hash: [a-f0-9]+ -->$/);
      expect(lines[1]).toBe('<!-- DO NOT EDIT - Installed by Loa Constructs Registry -->');
    });
  });

  describe('addPackMarker - YAML', () => {
    const originalContent = 'name: My Skill\ndescription: A test skill';
    const packSlug = 'gtm-collective';
    const version = '1.0.0';
    const yamlPath = 'skills/my-skill/index.yaml';
    const ymlPath = 'skills/my-skill/config.yml';

    it('should add hash comment marker to .yaml files', () => {
      const result = addPackMarker(originalContent, packSlug, version, yamlPath);

      expect(result).toContain('# @pack-managed: true');
      expect(result).toContain(`pack: ${packSlug}`);
      expect(result).toContain(`version: ${version}`);
    });

    it('should add hash comment marker to .yml files', () => {
      const result = addPackMarker(originalContent, packSlug, version, ymlPath);

      expect(result).toContain('# @pack-managed: true');
    });

    it('should add warning line after marker', () => {
      const result = addPackMarker(originalContent, packSlug, version, yamlPath);

      expect(result).toContain('# DO NOT EDIT - Installed by Loa Constructs Registry');
    });

    it('should preserve original content', () => {
      const result = addPackMarker(originalContent, packSlug, version, yamlPath);

      expect(result).toContain(originalContent);
    });

    it('should use correct YAML marker format', () => {
      const result = addPackMarker(originalContent, packSlug, version, yamlPath);

      const lines = result.split('\n');
      expect(lines[0]).toMatch(/^# @pack-managed: true \| pack: [^\s]+ \| version: [^\s]+ \| hash: [a-f0-9]+$/);
      expect(lines[1]).toBe('# DO NOT EDIT - Installed by Loa Constructs Registry');
    });
  });

  describe('hasPackMarker', () => {
    it('should detect markdown marker', () => {
      const content = `<!-- @pack-managed: true | pack: test-pack | version: 1.0.0 | hash: abc123def4567890 -->
<!-- DO NOT EDIT - Installed by Loa Constructs Registry -->

# Original Content`;

      expect(hasPackMarker(content)).toBe(true);
    });

    it('should detect YAML marker', () => {
      const content = `# @pack-managed: true | pack: test-pack | version: 1.0.0 | hash: abc123def4567890
# DO NOT EDIT - Installed by Loa Constructs Registry

name: Test`;

      expect(hasPackMarker(content)).toBe(true);
    });

    it('should return false for content without marker', () => {
      const content = '# Regular Content\n\nNo marker here.';

      expect(hasPackMarker(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(hasPackMarker('')).toBe(false);
    });

    it('should return false for partial/invalid marker', () => {
      const partial = '<!-- @pack-managed: true -->\nSome content';

      expect(hasPackMarker(partial)).toBe(false);
    });

    it('should work with markers added by addPackMarker', () => {
      const original = '# Test';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.md');

      expect(hasPackMarker(marked)).toBe(true);
    });
  });

  describe('extractPackMarker', () => {
    it('should extract info from markdown marker', () => {
      const content = `<!-- @pack-managed: true | pack: gtm-collective | version: 1.2.3 | hash: abc123def4567890 -->
<!-- DO NOT EDIT - Installed by Loa Constructs Registry -->

# Content`;

      const info = extractPackMarker(content);

      expect(info).not.toBeNull();
      expect(info?.packManaged).toBe(true);
      expect(info?.pack).toBe('gtm-collective');
      expect(info?.version).toBe('1.2.3');
      expect(info?.hash).toBe('abc123def4567890');
    });

    it('should extract info from YAML marker', () => {
      const content = `# @pack-managed: true | pack: my-pack | version: 2.0.0 | hash: 1234567890abcdef
# DO NOT EDIT - Installed by Loa Constructs Registry

name: Test`;

      const info = extractPackMarker(content);

      expect(info).not.toBeNull();
      expect(info?.packManaged).toBe(true);
      expect(info?.pack).toBe('my-pack');
      expect(info?.version).toBe('2.0.0');
      expect(info?.hash).toBe('1234567890abcdef');
    });

    it('should return null for content without marker', () => {
      const content = '# No marker here';

      expect(extractPackMarker(content)).toBeNull();
    });

    it('should return null for empty content', () => {
      expect(extractPackMarker('')).toBeNull();
    });

    it('should return null for invalid marker format', () => {
      const invalid = '<!-- @pack-managed: true -->\nMissing fields';

      expect(extractPackMarker(invalid)).toBeNull();
    });

    it('should work with markers added by addPackMarker', () => {
      const original = '# Test Content';
      const marked = addPackMarker(original, 'my-pack', '3.0.0', 'test.md');

      const info = extractPackMarker(marked);

      expect(info?.pack).toBe('my-pack');
      expect(info?.version).toBe('3.0.0');
      expect(info?.hash).toHaveLength(16);
    });
  });

  describe('removePackMarker', () => {
    it('should remove markdown marker', () => {
      const original = '# Original Content\n\nThis is the content.';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.md');

      const result = removePackMarker(marked);

      expect(result).toBe(original);
    });

    it('should remove YAML marker', () => {
      const original = 'name: Test\nversion: 1.0.0';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.yaml');

      const result = removePackMarker(marked);

      expect(result).toBe(original);
    });

    it('should return unchanged content if no marker present', () => {
      const content = '# No marker here';

      expect(removePackMarker(content)).toBe(content);
    });

    it('should handle empty content', () => {
      expect(removePackMarker('')).toBe('');
    });

    it('should preserve content exactly after round-trip', () => {
      const testCases = [
        '# Simple',
        '# Multi\n\nLine\n\nContent',
        'yaml: content\nwith: lines',
        '# Special chars: @#$%^&*()',
        '# Unicode: \u{1F680}',
      ];

      for (const original of testCases) {
        const markedMd = addPackMarker(original, 'test', '1.0.0', 'test.md');
        expect(removePackMarker(markedMd)).toBe(original);

        const markedYaml = addPackMarker(original, 'test', '1.0.0', 'test.yaml');
        expect(removePackMarker(markedYaml)).toBe(original);
      }
    });
  });

  describe('verifyPackMarkerIntegrity', () => {
    it('should return true for unmodified content', () => {
      const original = '# Test Content';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.md');

      expect(verifyPackMarkerIntegrity(marked)).toBe(true);
    });

    it('should return false for modified content', () => {
      const original = '# Test Content';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.md');

      // Tamper with the content after the marker
      const tampered = marked.replace('Test Content', 'Modified Content');

      expect(verifyPackMarkerIntegrity(tampered)).toBe(false);
    });

    it('should return false for content without marker', () => {
      const content = '# No marker';

      expect(verifyPackMarkerIntegrity(content)).toBe(false);
    });

    it('should work with YAML content', () => {
      const original = 'name: Test\nversion: 1.0.0';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.yaml');

      expect(verifyPackMarkerIntegrity(marked)).toBe(true);

      // Tamper
      const tampered = marked.replace('name: Test', 'name: Modified');
      expect(verifyPackMarkerIntegrity(tampered)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in pack slug', () => {
      const original = '# Test';
      const marked = addPackMarker(original, 'my-pack-123', '1.0.0', 'test.md');

      const info = extractPackMarker(marked);
      expect(info?.pack).toBe('my-pack-123');
    });

    it('should handle pre-release versions', () => {
      const original = '# Test';
      const marked = addPackMarker(original, 'test', '1.0.0-beta.1', 'test.md');

      const info = extractPackMarker(marked);
      expect(info?.version).toBe('1.0.0-beta.1');
    });

    it('should handle large content', () => {
      const largeContent = '# Large Content\n' + 'Line of text\n'.repeat(1000);
      const marked = addPackMarker(largeContent, 'test', '1.0.0', 'test.md');

      expect(hasPackMarker(marked)).toBe(true);
      expect(removePackMarker(marked)).toBe(largeContent);
    });

    it('should handle content with existing HTML comments', () => {
      const original = '<!-- User comment -->\n# Test';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.md');

      expect(hasPackMarker(marked)).toBe(true);
      expect(removePackMarker(marked)).toBe(original);
    });

    it('should handle content with existing YAML comments', () => {
      const original = '# User comment\nname: Test';
      const marked = addPackMarker(original, 'test', '1.0.0', 'test.yaml');

      expect(hasPackMarker(marked)).toBe(true);
      expect(removePackMarker(marked)).toBe(original);
    });
  });
});
