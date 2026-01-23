/**
 * Namespace Validation Service Tests
 * @see grimoires/loa/sdd-namespace-isolation.md §9.1 Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock logger before imports
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  isCommandReserved,
  isSkillReserved,
  suggestNamespacedName,
  validatePackNamespace,
  extractNamesFromFiles,
  formatConflictError,
} from './namespace-validation.js';

describe('Namespace Validation Service', () => {
  describe('isCommandReserved', () => {
    it('should detect LOA core commands', () => {
      const result = isCommandReserved('implement');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_command');
      expect(result.reason).toBe('Core implementation phase');
    });

    it('should detect architect command', () => {
      const result = isCommandReserved('architect');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_command');
    });

    it('should detect sprint-plan command', () => {
      const result = isCommandReserved('sprint-plan');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_command');
    });

    it('should detect Claude built-ins', () => {
      const result = isCommandReserved('help');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('claude_builtin');
    });

    it('should detect clear command', () => {
      const result = isCommandReserved('clear');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('claude_builtin');
    });

    it('should detect reserved prefixes - loa-', () => {
      const result = isCommandReserved('loa-custom');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for LOA core');
      expect(result.category).toBe('system_reserved');
    });

    it('should detect reserved prefixes - claude-', () => {
      const result = isCommandReserved('claude-plugin');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for Claude platform');
    });

    it('should detect reserved prefixes - thj-', () => {
      const result = isCommandReserved('thj-internal');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for The Honey Jar');
    });

    it('should detect reserved prefixes - anthropic-', () => {
      const result = isCommandReserved('anthropic-tool');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for Anthropic');
    });

    it('should detect reserved prefixes - underscore', () => {
      const result = isCommandReserved('_internal');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for internal use');
    });

    it('should allow non-reserved names', () => {
      const result = isCommandReserved('sigil-implement');
      expect(result.reserved).toBe(false);
    });

    it('should allow custom pack commands', () => {
      const result = isCommandReserved('my-custom-command');
      expect(result.reserved).toBe(false);
    });

    it('should handle leading slash', () => {
      const result = isCommandReserved('/implement');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_command');
    });
  });

  describe('isSkillReserved', () => {
    it('should detect LOA core skills', () => {
      const result = isSkillReserved('implementing-tasks');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
      expect(result.reason).toBe('Senior Engineer skill');
    });

    it('should detect designing-architecture skill', () => {
      const result = isSkillReserved('designing-architecture');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
    });

    it('should detect reviewing-code skill', () => {
      const result = isSkillReserved('reviewing-code');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
    });

    it('should detect auditing-security skill', () => {
      const result = isSkillReserved('auditing-security');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
    });

    it('should detect continuous-learning skill', () => {
      const result = isSkillReserved('continuous-learning');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
    });

    it('should allow non-reserved names', () => {
      const result = isSkillReserved('implementing-sigil-contracts');
      expect(result.reserved).toBe(false);
    });

    it('should allow custom skill names', () => {
      const result = isSkillReserved('my-custom-skill');
      expect(result.reserved).toBe(false);
    });

    it('should detect reserved pattern prefixes for skills', () => {
      const result = isSkillReserved('loa-custom-skill');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('system_reserved');
    });
  });

  describe('suggestNamespacedName', () => {
    it('should prefix with pack slug', () => {
      const suggestion = suggestNamespacedName('sigil', 'implement');
      expect(suggestion).toBe('sigil-implement');
    });

    it('should handle existing prefixes', () => {
      const suggestion = suggestNamespacedName('sigil', 'mount-sigil');
      expect(suggestion).toBe('sigil-mount-sigil');
    });

    it('should handle complex names', () => {
      const suggestion = suggestNamespacedName('my-pack', 'some-command');
      expect(suggestion).toBe('my-pack-some-command');
    });

    it('should handle leading slash', () => {
      const suggestion = suggestNamespacedName('sigil', '/implement');
      expect(suggestion).toBe('sigil-implement');
    });
  });

  describe('validatePackNamespace', () => {
    it('should detect command conflicts', () => {
      const result = validatePackNamespace({
        slug: 'sigil',
        commands: ['implement', 'architect'],
        skills: [],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].type).toBe('command');
      expect(result.conflicts[0].name).toBe('implement');
      expect(result.conflicts[0].suggestion).toBe('sigil-implement');
      expect(result.conflicts[1].name).toBe('architect');
      expect(result.conflicts[1].suggestion).toBe('sigil-architect');
    });

    it('should detect skill conflicts', () => {
      const result = validatePackNamespace({
        slug: 'sigil',
        commands: [],
        skills: ['implementing-tasks'],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('skill');
      expect(result.conflicts[0].name).toBe('implementing-tasks');
      expect(result.conflicts[0].suggestion).toBe('sigil-implementing-tasks');
    });

    it('should detect mixed command and skill conflicts', () => {
      const result = validatePackNamespace({
        slug: 'sigil',
        commands: ['implement'],
        skills: ['designing-architecture'],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts[0].type).toBe('command');
      expect(result.conflicts[1].type).toBe('skill');
    });

    it('should pass with no conflicts', () => {
      const result = validatePackNamespace({
        slug: 'sigil',
        commands: ['sigil-implement', 'mount-sigil'],
        skills: ['implementing-sigil-contracts'],
      });

      expect(result.valid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should add warning if no commands or skills provided', () => {
      const result = validatePackNamespace({
        slug: 'sigil',
        commands: [],
        skills: [],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Manifest contains no commands or skills to validate');
    });

    it('should use default slug if not provided', () => {
      const result = validatePackNamespace({
        commands: ['implement'],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts[0].suggestion).toBe('pack-implement');
    });

    it('should detect pattern-based conflicts', () => {
      const result = validatePackNamespace({
        slug: 'test',
        commands: ['loa-custom'],
        skills: [],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts[0].category).toBe('system_reserved');
    });
  });

  describe('extractNamesFromFiles', () => {
    it('should extract command names from .claude/commands/', () => {
      const files = [
        { path: '.claude/commands/sigil-implement.md' },
        { path: '.claude/commands/mount-sigil.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.commands).toEqual(['sigil-implement', 'mount-sigil']);
      expect(result.skills).toHaveLength(0);
    });

    it('should extract skill names from index.yaml', () => {
      const files = [
        { path: '.claude/skills/implementing-sigil-contracts/index.yaml' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.skills).toEqual(['implementing-sigil-contracts']);
      expect(result.commands).toHaveLength(0);
    });

    it('should extract skill names from SKILL.md', () => {
      const files = [
        { path: '.claude/skills/sigil-deployer/SKILL.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.skills).toEqual(['sigil-deployer']);
      expect(result.commands).toHaveLength(0);
    });

    it('should avoid duplicate skills from index.yaml and SKILL.md', () => {
      const files = [
        { path: '.claude/skills/my-skill/index.yaml' },
        { path: '.claude/skills/my-skill/SKILL.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.skills).toEqual(['my-skill']);
    });

    it('should ignore non-command/skill files', () => {
      const files = [
        { path: 'README.md' },
        { path: '.claude/protocols/test.md' },
        { path: '.claude/templates/foo.md' },
        { path: 'src/index.ts' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.commands).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });

    it('should extract both commands and skills', () => {
      const files = [
        { path: '.claude/commands/sigil-implement.md' },
        { path: '.claude/commands/sigil-deploy.md' },
        { path: '.claude/skills/sigil-contracts/index.yaml' },
        { path: '.claude/skills/sigil-testing/SKILL.md' },
        { path: 'README.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.commands).toEqual(['sigil-implement', 'sigil-deploy']);
      expect(result.skills).toEqual(['sigil-contracts', 'sigil-testing']);
    });

    it('should handle empty files array', () => {
      const result = extractNamesFromFiles([]);
      expect(result.commands).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });
  });

  describe('formatConflictError', () => {
    it('should format conflicts into error response', () => {
      const conflicts = [
        {
          type: 'command' as const,
          name: 'implement',
          reason: 'Core implementation phase',
          category: 'loa_core_command',
          suggestion: 'sigil-implement',
        },
        {
          type: 'skill' as const,
          name: 'designing-architecture',
          reason: 'Software Architect skill',
          category: 'loa_core_skill',
          suggestion: 'designing-sigil-architecture',
        },
      ];

      const result = formatConflictError(conflicts);

      expect(result.code).toBe('NAMESPACE_VALIDATION_ERROR');
      expect(result.message).toContain('reserved names');
      expect(result.details.conflict_count).toBe(2);
      expect(result.details.conflicts).toBe(conflicts);
      expect(result.details.suggestions).toEqual({
        'implement': 'sigil-implement',
        'designing-architecture': 'designing-sigil-architecture',
      });
      expect(result.details.documentation_url).toBe('https://docs.constructs.network/packs/namespacing');
    });

    it('should handle empty conflicts array', () => {
      const result = formatConflictError([]);

      expect(result.details.conflict_count).toBe(0);
      expect(result.details.conflicts).toHaveLength(0);
      expect(result.details.suggestions).toEqual({});
    });
  });

  describe('Real-world Sigil collision scenario', () => {
    it('should detect all 13 Sigil collisions mentioned in issue', () => {
      // These are the overlapping commands from the Sigil construct
      const sigilCommands = [
        'implement',
        'architect',
        'sprint-plan',
        'plan-and-analyze',
        'review-sprint',
        'audit-sprint',
        'deploy-production',
        'mount',
        'ride',
        'audit',
        'audit-deployment',
        'translate',
        'feedback',
      ];

      const result = validatePackNamespace({
        slug: 'sigil',
        commands: sigilCommands,
        skills: [],
      });

      expect(result.valid).toBe(false);
      expect(result.conflicts).toHaveLength(13);

      // Verify all have suggestions
      for (const conflict of result.conflicts) {
        expect(conflict.suggestion).toMatch(/^sigil-/);
        expect(conflict.type).toBe('command');
        expect(conflict.category).toBe('loa_core_command');
      }
    });
  });
});
