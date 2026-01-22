/**
 * Namespace Validation Service
 * Validates pack commands and skills against reserved names to prevent collisions
 * @see grimoires/loa/sdd-namespace-isolation.md §3.2
 */

import { logger } from '../lib/logger.js';
import {
  RESERVED_COMMANDS_MAP,
  RESERVED_SKILLS_MAP,
  RESERVED_PATTERNS,
} from '../config/reserved-names.js';

// --- Types ---

export interface NamespaceConflict {
  type: 'command' | 'skill';
  name: string;
  reason: string;
  category: string;
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: NamespaceConflict[];
  warnings: string[];
}

export interface ReservedCheckResult {
  reserved: boolean;
  reason?: string;
  category?: string;
}

export interface PackManifestInput {
  name?: string;
  slug?: string;
  commands?: string[];
  skills?: string[];
}

// --- Core Validation Functions ---

/**
 * Check if a command name is reserved
 */
export function isCommandReserved(name: string): ReservedCheckResult {
  // Normalize name (remove leading slash if present)
  const normalizedName = name.startsWith('/') ? name.slice(1) : name;

  // Check exact match
  const exactMatch = RESERVED_COMMANDS_MAP.get(normalizedName);
  if (exactMatch) {
    return {
      reserved: true,
      reason: exactMatch.reason,
      category: exactMatch.category,
    };
  }

  // Check patterns
  for (const { pattern, reason } of RESERVED_PATTERNS) {
    if (pattern.test(normalizedName)) {
      return {
        reserved: true,
        reason,
        category: 'system_reserved',
      };
    }
  }

  return { reserved: false };
}

/**
 * Check if a skill name is reserved
 */
export function isSkillReserved(name: string): ReservedCheckResult {
  // Check exact match
  const exactMatch = RESERVED_SKILLS_MAP.get(name);
  if (exactMatch) {
    return {
      reserved: true,
      reason: exactMatch.reason,
      category: exactMatch.category,
    };
  }

  // Check patterns
  for (const { pattern, reason } of RESERVED_PATTERNS) {
    if (pattern.test(name)) {
      return {
        reserved: true,
        reason,
        category: 'system_reserved',
      };
    }
  }

  return { reserved: false };
}

/**
 * Suggest namespaced name for a conflict
 * @param packSlug - Pack slug (e.g., "sigil")
 * @param originalName - Original name (e.g., "implement")
 * @returns Namespaced suggestion (e.g., "sigil-implement")
 */
export function suggestNamespacedName(
  packSlug: string,
  originalName: string
): string {
  // Remove leading slash if present
  const cleanName = originalName.startsWith('/') ? originalName.slice(1) : originalName;
  return `${packSlug}-${cleanName}`;
}

/**
 * Validate pack namespace against reserved names
 * @param manifest - Pack manifest with commands and skills
 * @returns Validation result with conflicts and suggestions
 */
export function validatePackNamespace(manifest: PackManifestInput): ValidationResult {
  const conflicts: NamespaceConflict[] = [];
  const warnings: string[] = [];

  const packSlug = manifest.slug || 'pack';

  // Validate commands
  if (manifest.commands && manifest.commands.length > 0) {
    for (const commandName of manifest.commands) {
      const check = isCommandReserved(commandName);
      if (check.reserved) {
        conflicts.push({
          type: 'command',
          name: commandName,
          reason: check.reason || 'Reserved name',
          category: check.category || 'unknown',
          suggestion: suggestNamespacedName(packSlug, commandName),
        });
      }
    }
  }

  // Validate skills
  if (manifest.skills && manifest.skills.length > 0) {
    for (const skillName of manifest.skills) {
      const check = isSkillReserved(skillName);
      if (check.reserved) {
        conflicts.push({
          type: 'skill',
          name: skillName,
          reason: check.reason || 'Reserved name',
          category: check.category || 'unknown',
          suggestion: suggestNamespacedName(packSlug, skillName),
        });
      }
    }
  }

  // Add warning if no commands or skills provided
  if (
    (!manifest.commands || manifest.commands.length === 0) &&
    (!manifest.skills || manifest.skills.length === 0)
  ) {
    warnings.push('Manifest contains no commands or skills to validate');
  }

  const valid = conflicts.length === 0;

  if (!valid) {
    logger.info(
      { packSlug, conflictCount: conflicts.length },
      'Namespace conflicts detected'
    );
  }

  return {
    valid,
    conflicts,
    warnings,
  };
}

/**
 * Extract commands and skills from pack files for validation
 * @param files - Array of pack files with path and content
 * @returns Object with commands and skills arrays
 */
export function extractNamesFromFiles(
  files: Array<{ path: string; content?: string }>
): { commands: string[]; skills: string[] } {
  const commands: string[] = [];
  const skills: string[] = [];

  for (const file of files) {
    // Commands: .claude/commands/*.md
    if (file.path.startsWith('.claude/commands/') && file.path.endsWith('.md')) {
      const commandName = file.path
        .replace('.claude/commands/', '')
        .replace('.md', '');
      // Skip empty names (shouldn't happen but be safe)
      if (commandName && commandName.length > 0) {
        commands.push(commandName);
      }
    }

    // Skills: .claude/skills/*/index.yaml or .claude/skills/*/SKILL.md
    // Match .claude/skills/{skill-name}/index.yaml
    const skillMatch = file.path.match(/^\.claude\/skills\/([^/]+)\/(?:index\.yaml|SKILL\.md)$/);
    if (skillMatch && skillMatch[1]) {
      const skillName = skillMatch[1];
      // Avoid duplicates (index.yaml and SKILL.md in same skill)
      if (!skills.includes(skillName)) {
        skills.push(skillName);
      }
    }
  }

  return { commands, skills };
}

/**
 * Format conflicts as a user-friendly error message
 */
export function formatConflictError(conflicts: NamespaceConflict[]): {
  code: string;
  message: string;
  details: {
    conflict_count: number;
    conflicts: NamespaceConflict[];
    suggestions: Record<string, string>;
    documentation_url: string;
  };
} {
  return {
    code: 'NAMESPACE_VALIDATION_ERROR',
    message: 'Pack contains reserved names that conflict with LOA core or Claude built-ins',
    details: {
      conflict_count: conflicts.length,
      conflicts,
      suggestions: Object.fromEntries(
        conflicts.map((c) => [c.name, c.suggestion])
      ),
      documentation_url: 'https://docs.constructs.network/packs/namespacing',
    },
  };
}
