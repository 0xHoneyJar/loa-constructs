# Software Design Document: Construct Namespace Isolation & Multi-Construct Composition

**Version**: 1.0.0
**Date**: 2026-01-22
**Author**: Software Architect Agent
**Status**: Draft
**Parent SDD**: Pack Submission & Creator Program (grimoires/loa/sdd-pack-submission.md)
**PRD Reference**: Extension to grimoires/loa/prd-pack-submission.md

---

## 1. Executive Summary

This SDD addresses namespace collision issues discovered during pack submission implementation. When constructs built with LOA (like Sigil) are packaged as third-party packs, their `.claude/` directories contain both LOA core commands AND construct-specific commands, creating collisions at install time.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Validation Timing** | Submission-time | Fail fast - prevent collisions before installation |
| **Reserved Names** | Static registry + pattern matching | Simple, auditable, version-controlled |
| **Namespacing Strategy** | `{pack-slug}-{command-name}` | Predictable, human-readable |
| **Manifest Enhancement** | Add `provides`/`uses` fields | Enable dependency resolution |
| **Multi-Construct Support** | Deferred to Phase 4 (P2) | Focus on collision prevention first |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pack Submission Flow (Enhanced)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Creator                                                            │
│  ┌─────────────┐                                                   │
│  │  Upload     │                                                   │
│  │  Pack Files │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │  Namespace  │───▶│  Reserved   │───▶│  Submit     │            │
│  │ Validation  │    │   Names     │    │  (Approved) │            │
│  │  Service    │    │  Registry   │    │             │            │
│  └──────┬──────┘    └─────────────┘    └─────────────┘            │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                   │
│  │  Rejection  │                                                   │
│  │  Response   │                                                   │
│  │ + Suggested │                                                   │
│  │   Names     │                                                   │
│  └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Problem Statement

**Example Collision** (Sigil pack):
- LOA core defines: `/implement`, `/architect`, `/sprint-plan`
- Sigil defines: `/implement`, `/architect`, `/sprint-plan` (Sigil-specific)
- **Result**: Installation overwrites LOA core commands, breaking the system

**Impact**:
- 13 commands in Sigil overlap with LOA core
- No submission-time validation - fails silently at install
- User experience is broken without warning
- No clear guidance for resolving conflicts

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer (Hono)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Pack Routes    │  │  Namespace      │  │  Admin Routes   │    │
│  │  (enhanced)     │  │  Validation     │  │  (existing)     │    │
│  │                 │  │  Endpoint (NEW) │  │                 │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                    │              │
│           └────────────────────┼────────────────────┘              │
│                                │                                    │
│                                ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     Service Layer                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │   Packs     │  │  Namespace  │  │ Submissions │          │ │
│  │  │  Service    │  │ Validation  │  │  Service    │          │ │
│  │  │  (existing) │  │  Service    │  │  (existing) │          │ │
│  │  │             │  │   (NEW)     │  │             │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                │                                    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Configuration Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Reserved Names │  │  Pattern Rules  │  │  Naming Helpers │    │
│  │   Registry      │  │   (prefixes)    │  │  (suggestion)   │    │
│  │                 │  │                 │  │                 │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Validation Flow

```
Submit Pack Flow (Enhanced):
────────────────────────────────────────────────────────────────────────
Creator                API                Validation Service      DB
   │                    │                      │                  │
   │ POST /submit       │                      │                  │
   ├───────────────────>│                      │                  │
   │                    │ Extract manifest     │                  │
   │                    │ commands & skills    │                  │
   │                    │                      │                  │
   │                    │ validatePackNamespace│                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │                  │
   │                    │                      │ Check reserved   │
   │                    │                      │ names registry   │
   │                    │                      │                  │
   │                    │                      │ Check reserved   │
   │                    │                      │ patterns         │
   │                    │                      │                  │
   │                    │<─────────────────────┤                  │
   │                    │ ValidationResult     │                  │
   │                    │                      │                  │
   │                    │ if (conflicts) {     │                  │
   │<───────────────────┤   return 400         │                  │
   │ 400 Bad Request    │   with suggestions   │                  │
   │ + suggestions      │ }                    │                  │
   │                    │                      │                  │
   │                    │ if (valid) {         │                  │
   │                    │   createSubmission() │                  │
   │                    ├────────────────────────────────────────>│
   │<───────────────────┤                      │                  │
   │ 201 Created        │                      │                  │

Validation Endpoint Flow (Pre-Submit Check):
────────────────────────────────────────────────────────────────────────
Creator                API                Validation Service
   │                    │                      │
   │ POST /validate-    │                      │
   │      namespace     │                      │
   ├───────────────────>│                      │
   │ { manifest }       │ validatePackNamespace│
   │                    ├─────────────────────>│
   │                    │                      │
   │                    │<─────────────────────┤
   │                    │ { conflicts,         │
   │<───────────────────┤   suggestions }      │
   │ 200 OK             │                      │
   │ { validation }     │                      │
```

---

## 3. Data Structures

### 3.1 Reserved Names Registry

**File**: `apps/api/src/config/reserved-names.ts`

```typescript
/**
 * Reserved Names Registry
 * @see sdd-namespace-isolation.md §3.1
 */

export interface ReservedNameEntry {
  name: string;
  category: 'loa_core_command' | 'loa_core_skill' | 'claude_builtin' | 'system_reserved';
  reason: string;
  since?: string; // LOA version when reserved
}

/**
 * LOA Core Commands (43 commands as of v0.20.0)
 */
export const LOA_CORE_COMMANDS: ReservedNameEntry[] = [
  // Development Workflow
  { name: 'plan-and-analyze', category: 'loa_core_command', reason: 'Core discovery phase', since: 'v0.1.0' },
  { name: 'architect', category: 'loa_core_command', reason: 'Core design phase', since: 'v0.1.0' },
  { name: 'sprint-plan', category: 'loa_core_command', reason: 'Core planning phase', since: 'v0.1.0' },
  { name: 'implement', category: 'loa_core_command', reason: 'Core implementation phase', since: 'v0.1.0' },
  { name: 'review-sprint', category: 'loa_core_command', reason: 'Core code review', since: 'v0.1.0' },
  { name: 'audit-sprint', category: 'loa_core_command', reason: 'Core security audit', since: 'v0.1.0' },
  { name: 'deploy-production', category: 'loa_core_command', reason: 'Core deployment phase', since: 'v0.1.0' },

  // Mount & Ride (Existing Codebases)
  { name: 'mount', category: 'loa_core_command', reason: 'Framework installation', since: 'v0.1.0' },
  { name: 'ride', category: 'loa_core_command', reason: 'Codebase analysis', since: 'v0.1.0' },

  // Audit & Validation
  { name: 'audit', category: 'loa_core_command', reason: 'Full codebase audit', since: 'v0.1.0' },
  { name: 'audit-deployment', category: 'loa_core_command', reason: 'Deployment audit', since: 'v0.1.0' },
  { name: 'validate', category: 'loa_core_command', reason: 'Subagent validation', since: 'v0.16.0' },

  // Run Mode
  { name: 'run', category: 'loa_core_command', reason: 'Autonomous execution', since: 'v0.18.0' },
  { name: 'run-sprint-plan', category: 'loa_core_command', reason: 'Run all sprints', since: 'v0.18.0' },
  { name: 'run-status', category: 'loa_core_command', reason: 'Run mode status', since: 'v0.18.0' },
  { name: 'run-halt', category: 'loa_core_command', reason: 'Stop run mode', since: 'v0.18.0' },
  { name: 'run-resume', category: 'loa_core_command', reason: 'Resume run mode', since: 'v0.18.0' },

  // Ledger & Lifecycle
  { name: 'ledger', category: 'loa_core_command', reason: 'Sprint ledger management', since: 'v0.13.0' },
  { name: 'archive-cycle', category: 'loa_core_command', reason: 'Archive dev cycle', since: 'v0.13.0' },

  // Translation & Communication
  { name: 'translate', category: 'loa_core_command', reason: 'Executive communication', since: 'v0.1.0' },
  { name: 'translate-ride', category: 'loa_core_command', reason: 'Translate ride output', since: 'v0.1.0' },

  // Continuous Learning
  { name: 'retrospective', category: 'loa_core_command', reason: 'Skill extraction', since: 'v0.17.0' },
  { name: 'skill-audit', category: 'loa_core_command', reason: 'Skill management', since: 'v0.17.0' },

  // GTM (Go-To-Market) Suite
  { name: 'gtm-setup', category: 'loa_core_command', reason: 'GTM initialization', since: 'v0.10.0' },
  { name: 'gtm-adopt', category: 'loa_core_command', reason: 'GTM adoption', since: 'v0.10.0' },
  { name: 'gtm-feature-requests', category: 'loa_core_command', reason: 'GTM feature tracking', since: 'v0.10.0' },
  { name: 'review-gtm', category: 'loa_core_command', reason: 'GTM strategy review', since: 'v0.10.0' },
  { name: 'sync-from-gtm', category: 'loa_core_command', reason: 'GTM sync', since: 'v0.10.0' },
  { name: 'sync-from-dev', category: 'loa_core_command', reason: 'Dev sync', since: 'v0.10.0' },
  { name: 'analyze-market', category: 'loa_core_command', reason: 'Market analysis', since: 'v0.10.0' },
  { name: 'position', category: 'loa_core_command', reason: 'Product positioning', since: 'v0.10.0' },
  { name: 'price', category: 'loa_core_command', reason: 'Pricing strategy', since: 'v0.10.0' },
  { name: 'plan-launch', category: 'loa_core_command', reason: 'Launch planning', since: 'v0.10.0' },
  { name: 'plan-partnerships', category: 'loa_core_command', reason: 'Partnership planning', since: 'v0.10.0' },
  { name: 'plan-devrel', category: 'loa_core_command', reason: 'DevRel planning', since: 'v0.10.0' },
  { name: 'create-deck', category: 'loa_core_command', reason: 'Deck creation', since: 'v0.10.0' },
  { name: 'announce-release', category: 'loa_core_command', reason: 'Release announcement', since: 'v0.10.0' },

  // System & Maintenance
  { name: 'update-loa', category: 'loa_core_command', reason: 'Framework updates', since: 'v0.1.0' },
  { name: 'contribute', category: 'loa_core_command', reason: 'Contribute to LOA', since: 'v0.1.0' },
  { name: 'permission-audit', category: 'loa_core_command', reason: 'Permission analysis', since: 'v0.18.0' },

  // Oracle (Anthropic Updates)
  { name: 'oracle', category: 'loa_core_command', reason: 'Update monitoring', since: 'v0.13.0' },
  { name: 'oracle-analyze', category: 'loa_core_command', reason: 'Update analysis', since: 'v0.13.0' },

  // THJ-Only Commands
  { name: 'feedback', category: 'loa_core_command', reason: 'THJ feedback submission', since: 'v0.1.0' },
];

/**
 * LOA Core Skills (20 skills as of v0.20.0)
 */
export const LOA_CORE_SKILLS: ReservedNameEntry[] = [
  // Core Development Skills
  { name: 'discovering-requirements', category: 'loa_core_skill', reason: 'Product Manager skill', since: 'v0.1.0' },
  { name: 'designing-architecture', category: 'loa_core_skill', reason: 'Software Architect skill', since: 'v0.1.0' },
  { name: 'planning-sprints', category: 'loa_core_skill', reason: 'Technical PM skill', since: 'v0.1.0' },
  { name: 'implementing-tasks', category: 'loa_core_skill', reason: 'Senior Engineer skill', since: 'v0.1.0' },
  { name: 'reviewing-code', category: 'loa_core_skill', reason: 'Tech Lead skill', since: 'v0.1.0' },
  { name: 'auditing-security', category: 'loa_core_skill', reason: 'Security Auditor skill', since: 'v0.1.0' },
  { name: 'deploying-infrastructure', category: 'loa_core_skill', reason: 'DevOps Architect skill', since: 'v0.1.0' },
  { name: 'translating-for-executives', category: 'loa_core_skill', reason: 'Developer Relations skill', since: 'v0.1.0' },

  // Codebase Integration
  { name: 'mounting-framework', category: 'loa_core_skill', reason: 'Framework installation', since: 'v0.1.0' },
  { name: 'riding-codebase', category: 'loa_core_skill', reason: 'Codebase analysis', since: 'v0.1.0' },

  // Advanced Skills
  { name: 'continuous-learning', category: 'loa_core_skill', reason: 'Skill extraction', since: 'v0.17.0' },
  { name: 'run-mode', category: 'loa_core_skill', reason: 'Autonomous execution', since: 'v0.18.0' },

  // GTM Skills
  { name: 'reviewing-gtm', category: 'loa_core_skill', reason: 'GTM strategy review', since: 'v0.10.0' },
  { name: 'analyzing-market', category: 'loa_core_skill', reason: 'Market analysis', since: 'v0.10.0' },
  { name: 'positioning-product', category: 'loa_core_skill', reason: 'Product positioning', since: 'v0.10.0' },
  { name: 'pricing-strategist', category: 'loa_core_skill', reason: 'Pricing strategy', since: 'v0.10.0' },
  { name: 'crafting-narratives', category: 'loa_core_skill', reason: 'Narrative creation', since: 'v0.10.0' },
  { name: 'building-partnerships', category: 'loa_core_skill', reason: 'Partnership strategy', since: 'v0.10.0' },
  { name: 'educating-developers', category: 'loa_core_skill', reason: 'Developer education', since: 'v0.10.0' },
  { name: 'translating-for-stakeholders', category: 'loa_core_skill', reason: 'Stakeholder communication', since: 'v0.10.0' },
];

/**
 * Claude Code Built-in Commands
 */
export const CLAUDE_BUILTINS: ReservedNameEntry[] = [
  { name: 'help', category: 'claude_builtin', reason: 'Claude Code help system' },
  { name: 'clear', category: 'claude_builtin', reason: 'Clear conversation' },
  { name: 'reset', category: 'claude_builtin', reason: 'Reset session' },
  { name: 'context', category: 'claude_builtin', reason: 'Context management' },
  { name: 'settings', category: 'claude_builtin', reason: 'Claude Code settings' },
  { name: 'history', category: 'claude_builtin', reason: 'Command history' },
  { name: 'exit', category: 'claude_builtin', reason: 'Exit Claude Code' },
  { name: 'quit', category: 'claude_builtin', reason: 'Quit Claude Code' },
  { name: 'version', category: 'claude_builtin', reason: 'Show version' },
  { name: 'update', category: 'claude_builtin', reason: 'Update Claude Code' },
  { name: 'login', category: 'claude_builtin', reason: 'Authentication' },
  { name: 'logout', category: 'claude_builtin', reason: 'Sign out' },
  { name: 'status', category: 'claude_builtin', reason: 'System status' },
  { name: 'config', category: 'claude_builtin', reason: 'Configuration' },
  { name: 'logs', category: 'claude_builtin', reason: 'View logs' },
  { name: 'debug', category: 'claude_builtin', reason: 'Debug mode' },
  { name: 'api', category: 'claude_builtin', reason: 'API commands' },
  { name: 'mcp', category: 'claude_builtin', reason: 'MCP server management' },
];

/**
 * Reserved Prefixes and Patterns
 */
export const RESERVED_PATTERNS = [
  { pattern: /^loa-/, reason: 'Reserved for LOA core extensions' },
  { pattern: /^claude-/, reason: 'Reserved for Claude platform' },
  { pattern: /^thj-/, reason: 'Reserved for The Honey Jar' },
  { pattern: /^anthropic-/, reason: 'Reserved for Anthropic' },
  { pattern: /^_/, reason: 'Reserved for internal use (leading underscore)' },
  { pattern: /^test-/, reason: 'Reserved for testing' },
  { pattern: /^debug-/, reason: 'Reserved for debugging' },
  { pattern: /^admin-/, reason: 'Reserved for admin operations' },
  { pattern: /^system-/, reason: 'Reserved for system operations' },
];

/**
 * Build lookup map for O(1) checks
 */
export const RESERVED_COMMANDS_MAP = new Map<string, ReservedNameEntry>(
  [...LOA_CORE_COMMANDS, ...CLAUDE_BUILTINS].map((entry) => [entry.name, entry])
);

export const RESERVED_SKILLS_MAP = new Map<string, ReservedNameEntry>(
  LOA_CORE_SKILLS.map((entry) => [entry.name, entry])
);
```

### 3.2 Validation Service

**File**: `apps/api/src/services/namespace-validation.ts`

```typescript
/**
 * Namespace Validation Service
 * @see sdd-namespace-isolation.md §3.2
 */

import { logger } from '../lib/logger.js';
import {
  RESERVED_COMMANDS_MAP,
  RESERVED_SKILLS_MAP,
  RESERVED_PATTERNS,
  type ReservedNameEntry,
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

// --- Core Validation Functions ---

/**
 * Check if a command name is reserved
 */
export function isCommandReserved(name: string): ReservedCheckResult {
  // Check exact match
  const exactMatch = RESERVED_COMMANDS_MAP.get(name);
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
  return `${packSlug}-${originalName}`;
}

/**
 * Validate pack namespace against reserved names
 * @param manifest - Pack manifest with commands and skills
 * @returns Validation result with conflicts and suggestions
 */
export function validatePackNamespace(manifest: {
  name?: string;
  slug?: string;
  commands?: string[];
  skills?: string[];
}): ValidationResult {
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
      commands.push(commandName);
    }

    // Skills: .claude/skills/*/index.yaml
    if (file.path.includes('.claude/skills/') && file.path.endsWith('/index.yaml')) {
      const skillName = file.path
        .replace('.claude/skills/', '')
        .replace('/index.yaml', '');
      skills.push(skillName);
    }
  }

  return { commands, skills };
}
```

### 3.3 Enhanced Manifest Schema

**Current Manifest** (existing):
```typescript
{
  name: string;
  version: string;
  description?: string;
  // ... existing fields
}
```

**Enhanced Manifest** (Phase 2):
```typescript
export interface EnhancedPackManifest {
  // Existing fields
  name: string;
  version: string;
  description?: string;

  // NEW: Namespace declaration (Phase 2)
  provides?: {
    skills?: string[];      // Skills this pack provides
    commands?: string[];    // Commands this pack provides
    grimoires?: string[];   // Grimoire templates this pack provides
  };

  // NEW: Dependencies (Phase 4 - Multi-Construct)
  uses?: {
    skills?: string[];      // External skills this pack depends on
    commands?: string[];    // External commands this pack requires
    constructs?: string[];  // Other constructs this pack requires
  };

  // NEW: Grimoire configuration (Phase 3)
  grimoire?: {
    namespace?: string;                 // Grimoire namespace (e.g., "sigil")
    required_directories?: string[];    // Directories pack expects to create
    setup_command?: string;             // Command to run after install
  };
}
```

---

## 4. API Design

### 4.1 Namespace Validation Endpoint

**NEW Endpoint**: `POST /v1/packs/:slug/validate-namespace`

Pre-submission validation endpoint for creators to test their pack before submitting.

**Request**:
```typescript
{
  manifest: {
    name: "Sigil",
    slug: "sigil",
    commands: ["implement", "architect", "mount-sigil"],
    skills: ["implementing-sigil-contracts", "designing-architecture"]
  }
}
```

**Response (Success)**:
```typescript
{
  valid: true,
  conflicts: [],
  warnings: [],
  request_id: "req_abc123"
}
```

**Response (Conflicts)**:
```typescript
{
  valid: false,
  conflicts: [
    {
      type: "command",
      name: "implement",
      reason: "Core implementation phase",
      category: "loa_core_command",
      suggestion: "sigil-implement"
    },
    {
      type: "command",
      name: "architect",
      reason: "Core design phase",
      category: "loa_core_command",
      suggestion: "sigil-architect"
    },
    {
      type: "skill",
      name: "designing-architecture",
      reason: "Software Architect skill",
      category: "loa_core_skill",
      suggestion: "designing-sigil-architecture"
    }
  ],
  warnings: [],
  request_id: "req_abc123"
}
```

**Response (HTTP 400 - Validation)**:
```typescript
{
  error: {
    code: "NAMESPACE_VALIDATION_ERROR",
    message: "Pack contains reserved names",
    details: {
      conflicts: [/* ... */],
      suggestions: {
        "implement": "sigil-implement",
        "architect": "sigil-architect",
        "designing-architecture": "designing-sigil-architecture"
      }
    }
  },
  request_id: "req_abc123"
}
```

### 4.2 Enhanced Submit Endpoint

**Modified Endpoint**: `POST /v1/packs/:slug/submit`

Add namespace validation to existing submission flow.

**New Validation Step** (before existing validations):
```typescript
// Extract commands/skills from pack files
const { commands, skills } = extractNamesFromFiles(body.files);

// Validate namespace
const validation = validatePackNamespace({
  slug: pack.slug,
  commands,
  skills,
});

// Reject if conflicts
if (!validation.valid) {
  throw Errors.BadRequest({
    code: 'NAMESPACE_VALIDATION_ERROR',
    message: 'Pack contains reserved names',
    details: {
      conflicts: validation.conflicts,
      suggestions: Object.fromEntries(
        validation.conflicts.map(c => [c.name, c.suggestion])
      ),
    },
  });
}

// Continue with existing submission flow...
```

---

## 5. Implementation Details

### 5.1 Validation Logic

**Algorithm**: Reserved Name Check

```typescript
function validatePackNamespace(manifest):
  conflicts = []

  // Phase 1: Check commands
  for each command in manifest.commands:
    if isCommandReserved(command):
      conflicts.push({
        type: 'command',
        name: command,
        reason: getReservedReason(command),
        suggestion: suggestNamespacedName(manifest.slug, command)
      })

  // Phase 2: Check skills
  for each skill in manifest.skills:
    if isSkillReserved(skill):
      conflicts.push({
        type: 'skill',
        name: skill,
        reason: getReservedReason(skill),
        suggestion: suggestNamespacedName(manifest.slug, skill)
      })

  return {
    valid: conflicts.length === 0,
    conflicts: conflicts
  }
```

**Complexity**: O(n) where n = total commands + skills in pack

### 5.2 Name Extraction from Files

When pack files are uploaded (POST /v1/packs/:slug/versions), extract command and skill names:

```typescript
function extractNamesFromFiles(files):
  commands = []
  skills = []

  for each file in files:
    // Commands: .claude/commands/*.md
    if file.path.startsWith('.claude/commands/') and file.path.endsWith('.md'):
      commandName = extractFilename(file.path)
      commands.push(commandName)

    // Skills: .claude/skills/*/index.yaml
    if file.path.includes('.claude/skills/') and file.path.endsWith('/index.yaml'):
      skillName = extractDirectoryName(file.path)
      skills.push(skillName)

  return { commands, skills }
```

### 5.3 Suggestion Algorithm

```typescript
function suggestNamespacedName(packSlug, originalName):
  // Strategy 1: Prefix with pack slug
  suggestion = `${packSlug}-${originalName}`

  // Strategy 2: If still conflicts, add counter
  counter = 1
  while isReserved(suggestion):
    suggestion = `${packSlug}-${originalName}-${counter}`
    counter++

  return suggestion
```

---

## 6. Error Response Design

### 6.1 Namespace Conflict Error

**Error Code**: `NAMESPACE_VALIDATION_ERROR`

**HTTP Status**: 400 Bad Request

**Response Structure**:
```typescript
{
  error: {
    code: "NAMESPACE_VALIDATION_ERROR",
    message: "Pack contains reserved names that conflict with LOA core or Claude built-ins",
    details: {
      pack_slug: "sigil",
      conflict_count: 13,
      conflicts: [
        {
          type: "command",
          name: "implement",
          reason: "Core implementation phase",
          category: "loa_core_command",
          suggestion: "sigil-implement"
        },
        // ... more conflicts
      ],
      suggestions: {
        "implement": "sigil-implement",
        "architect": "sigil-architect",
        // ... more suggestions
      },
      documentation_url: "https://docs.constructs.network/packs/namespacing"
    }
  },
  request_id: "req_abc123"
}
```

### 6.2 User-Friendly Error Messages

**Command Collision**:
> "Your pack defines a command named **implement** which conflicts with LOA core. Please rename it to **sigil-implement** or choose another name."

**Skill Collision**:
> "Your pack defines a skill named **designing-architecture** which conflicts with LOA core. Please rename it to **designing-sigil-architecture** or choose another name."

**Pattern Collision**:
> "Command **loa-custom** uses reserved prefix **loa-**. This prefix is reserved for LOA core extensions. Please choose a different name."

---

## 7. Database Considerations

### 7.1 No Schema Changes Required

Namespace validation is **stateless** - all checks performed against in-memory registry.

**Rationale**:
- Reserved names change infrequently (only with LOA version updates)
- No need to persist validation results
- Manifest already stores command/skill names (in JSONB)

### 7.2 Future: Dependency Tracking (Phase 4)

If multi-construct composition is implemented, add:

```sql
CREATE TABLE pack_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type VARCHAR(20) NOT NULL, -- skill, command, construct
  dependency_name VARCHAR(100) NOT NULL,

  -- Optional: reference to another pack
  depends_on_pack_id UUID REFERENCES packs(id),

  -- Version constraints
  min_version VARCHAR(20),
  max_version VARCHAR(20),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(pack_id, dependency_type, dependency_name)
);

CREATE INDEX idx_pack_dependencies_pack ON pack_dependencies(pack_id);
CREATE INDEX idx_pack_dependencies_type ON pack_dependencies(dependency_type);
```

---

## 8. Implementation Tasks

### 8.1 Phase 1: Reserved Names Registry (P0)

| Task ID | Description | Effort | Files | Dependencies |
|---------|-------------|--------|-------|--------------|
| **T1.1** | Create reserved-names.ts config | M | `config/reserved-names.ts` | - |
| **T1.2** | Populate LOA core commands (43) | S | `config/reserved-names.ts` | T1.1 |
| **T1.3** | Populate LOA core skills (20) | S | `config/reserved-names.ts` | T1.1 |
| **T1.4** | Populate Claude built-ins (18) | S | `config/reserved-names.ts` | T1.1 |
| **T1.5** | Add reserved patterns | S | `config/reserved-names.ts` | T1.1 |
| **T1.6** | Create namespace-validation.ts service | M | `services/namespace-validation.ts` | T1.1-T1.5 |
| **T1.7** | Implement isCommandReserved() | S | `services/namespace-validation.ts` | T1.6 |
| **T1.8** | Implement isSkillReserved() | S | `services/namespace-validation.ts` | T1.6 |
| **T1.9** | Implement suggestNamespacedName() | S | `services/namespace-validation.ts` | T1.6 |
| **T1.10** | Implement validatePackNamespace() | M | `services/namespace-validation.ts` | T1.7-T1.9 |
| **T1.11** | Implement extractNamesFromFiles() | S | `services/namespace-validation.ts` | T1.6 |
| **T1.12** | Add POST /validate-namespace endpoint | M | `routes/packs.ts` | T1.10 |
| **T1.13** | Integrate validation into POST /submit | M | `routes/packs.ts` | T1.10, T1.11 |
| **T1.14** | Add unit tests for validation service | M | `tests/unit/namespace-validation.test.ts` | T1.10 |
| **T1.15** | Add integration tests for endpoints | M | `tests/e2e/namespace-validation.test.ts` | T1.12, T1.13 |

**Effort Key**: S = Small (<2 hrs), M = Medium (2-4 hrs), L = Large (>4 hrs)

**Total Estimated Effort**: ~18-24 hours

### 8.2 Phase 2: Manifest Enhancement (P1)

| Task ID | Description | Effort | Files | Dependencies |
|---------|-------------|--------|-------|--------------|
| **T2.1** | Define EnhancedPackManifest interface | S | `types/manifest.ts` | - |
| **T2.2** | Add `provides` field to manifest schema | S | `types/manifest.ts` | T2.1 |
| **T2.3** | Add `uses` field to manifest schema | S | `types/manifest.ts` | T2.1 |
| **T2.4** | Add `grimoire` field to manifest schema | S | `types/manifest.ts` | T2.1 |
| **T2.5** | Update pack version creation endpoint | M | `routes/packs.ts` | T2.1-T2.4 |
| **T2.6** | Update pack retrieval to include new fields | S | `routes/packs.ts` | T2.1-T2.4 |
| **T2.7** | Add validation for manifest fields | M | `services/namespace-validation.ts` | T2.1-T2.4 |
| **T2.8** | Update API documentation | S | `docs/api.md` | T2.1-T2.6 |

**Total Estimated Effort**: ~8-12 hours

### 8.3 Phase 3: Documentation (P1)

| Task ID | Description | Effort | Files | Dependencies |
|---------|-------------|--------|-------|--------------|
| **T3.1** | Create NAMESPACING.md best practices guide | M | `docs/NAMESPACING.md` | - |
| **T3.2** | Update MANIFEST-REFERENCE.md | S | `docs/MANIFEST-REFERENCE.md` | T2.1-T2.4 |
| **T3.3** | Add namespace section to pack submission guide | S | `docs/pack-submission.md` | T3.1 |
| **T3.4** | Create example pack with namespacing | M | `examples/namespaced-pack/` | T3.1 |
| **T3.5** | Add API error documentation | S | `docs/api-errors.md` | T1.12, T1.13 |

**Total Estimated Effort**: ~6-10 hours

### 8.4 Phase 4: Multi-Construct Composition (P2 - Future)

| Task ID | Description | Effort | Files | Dependencies |
|---------|-------------|--------|-------|--------------|
| **T4.1** | Create pack_dependencies table | S | `schema.ts`, `migrations/` | - |
| **T4.2** | Create dependency resolution service | L | `services/dependency-resolution.ts` | T4.1 |
| **T4.3** | Implement dependency graph validation | L | `services/dependency-resolution.ts` | T4.2 |
| **T4.4** | Add dependency checks to submission | M | `routes/packs.ts` | T4.2, T4.3 |
| **T4.5** | Add dependency installation support | L | `services/packs.ts` | T4.2 |
| **T4.6** | Create dependency API endpoints | M | `routes/packs.ts` | T4.2-T4.5 |

**Total Estimated Effort**: ~24-32 hours (deferred)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File**: `apps/api/tests/unit/namespace-validation.test.ts`

```typescript
describe('Namespace Validation Service', () => {
  describe('isCommandReserved', () => {
    it('should detect LOA core commands', () => {
      const result = isCommandReserved('implement');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_command');
    });

    it('should detect Claude built-ins', () => {
      const result = isCommandReserved('help');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('claude_builtin');
    });

    it('should detect reserved prefixes', () => {
      const result = isCommandReserved('loa-custom');
      expect(result.reserved).toBe(true);
      expect(result.reason).toContain('Reserved for LOA core');
    });

    it('should allow non-reserved names', () => {
      const result = isCommandReserved('sigil-implement');
      expect(result.reserved).toBe(false);
    });
  });

  describe('isSkillReserved', () => {
    it('should detect LOA core skills', () => {
      const result = isSkillReserved('implementing-tasks');
      expect(result.reserved).toBe(true);
      expect(result.category).toBe('loa_core_skill');
    });

    it('should allow non-reserved names', () => {
      const result = isSkillReserved('implementing-sigil-contracts');
      expect(result.reserved).toBe(false);
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
      expect(result.conflicts[0].suggestion).toBe('sigil-implement');
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
  });

  describe('extractNamesFromFiles', () => {
    it('should extract command names', () => {
      const files = [
        { path: '.claude/commands/sigil-implement.md' },
        { path: '.claude/commands/mount-sigil.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.commands).toEqual(['sigil-implement', 'mount-sigil']);
    });

    it('should extract skill names', () => {
      const files = [
        { path: '.claude/skills/implementing-sigil-contracts/index.yaml' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.skills).toEqual(['implementing-sigil-contracts']);
    });

    it('should ignore non-command/skill files', () => {
      const files = [
        { path: 'README.md' },
        { path: '.claude/protocols/test.md' },
      ];

      const result = extractNamesFromFiles(files);
      expect(result.commands).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });
  });
});
```

### 9.2 Integration Tests

**File**: `apps/api/tests/e2e/namespace-validation.test.ts`

```typescript
describe('Namespace Validation API', () => {
  describe('POST /v1/packs/:slug/validate-namespace', () => {
    it('should return conflicts for reserved names', async () => {
      const res = await request(app)
        .post('/v1/packs/sigil/validate-namespace')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          manifest: {
            slug: 'sigil',
            commands: ['implement', 'architect'],
            skills: ['implementing-tasks'],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.conflicts).toHaveLength(3);
      expect(res.body.conflicts[0].suggestion).toBe('sigil-implement');
    });

    it('should pass with no conflicts', async () => {
      const res = await request(app)
        .post('/v1/packs/sigil/validate-namespace')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          manifest: {
            slug: 'sigil',
            commands: ['sigil-implement'],
            skills: ['implementing-sigil-contracts'],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.conflicts).toHaveLength(0);
    });
  });

  describe('POST /v1/packs/:slug/submit (with validation)', () => {
    it('should reject submission with namespace conflicts', async () => {
      // First, create a pack with version
      const pack = await createTestPack('sigil', creatorToken);
      await createTestVersion(pack.slug, creatorToken, {
        version: '1.0.0',
        files: [
          { path: '.claude/commands/implement.md', content: '...' },
          { path: '.claude/skills/implementing-tasks/index.yaml', content: '...' },
        ],
      });

      // Try to submit - should fail
      const res = await request(app)
        .post(`/v1/packs/${pack.slug}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NAMESPACE_VALIDATION_ERROR');
      expect(res.body.error.details.conflicts).toHaveLength(2);
      expect(res.body.error.details.suggestions).toHaveProperty('implement');
    });

    it('should accept submission with no conflicts', async () => {
      // Create pack with properly namespaced commands
      const pack = await createTestPack('sigil', creatorToken);
      await createTestVersion(pack.slug, creatorToken, {
        version: '1.0.0',
        files: [
          { path: '.claude/commands/sigil-implement.md', content: '...' },
          { path: '.claude/skills/implementing-sigil-contracts/index.yaml', content: '...' },
        ],
      });

      // Submit - should succeed
      const res = await request(app)
        .post(`/v1/packs/${pack.slug}/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending_review');
    });
  });
});
```

### 9.3 Test Cases

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| **TC-1**: Exact command match | `implement` | Conflict: LOA core command |
| **TC-2**: Exact skill match | `implementing-tasks` | Conflict: LOA core skill |
| **TC-3**: Reserved prefix | `loa-custom` | Conflict: Reserved prefix |
| **TC-4**: Claude built-in | `help` | Conflict: Claude built-in |
| **TC-5**: Valid namespaced | `sigil-implement` | Pass |
| **TC-6**: Multiple conflicts | `[implement, architect, help]` | 3 conflicts |
| **TC-7**: Empty manifest | `{}` | Pass with warning |
| **TC-8**: Mixed valid/invalid | `[sigil-impl, implement]` | 1 conflict |

---

## 10. Backward Compatibility

### 10.1 Existing Packs

**No Breaking Changes**:
- Validation only applies to **new submissions** (POST /submit)
- Existing published packs are **grandfathered**
- No retroactive enforcement

**Rationale**:
- Current registry has zero third-party packs (only LOA internal)
- No user impact from new validation

### 10.2 Future Pack Updates

**Policy** (TBD by product team):

Option A: **Enforce on update**
- When creator updates pack, run namespace validation
- Force rename if conflicts

Option B: **Warn but allow**
- Grandfather existing packs forever
- Only enforce for new packs

**Recommendation**: Option A (enforce on update) to prevent technical debt.

### 10.3 Migration Path for Existing Packs

If LOA adds new reserved names in future versions:

1. **Add to reserved-names.ts**
2. **Version gate**: Only enforce for new packs submitted after version X
3. **Notify existing creators** via email if their pack would conflict
4. **Grace period**: 30 days to rename before enforcement

---

## 11. Documentation Requirements

### 11.1 NAMESPACING.md

**File**: `docs/NAMESPACING.md`

**Sections**:
1. **Why Namespacing Matters** - Explain collision problem
2. **Reserved Names** - Link to registry
3. **Best Practices** - Naming conventions
4. **Examples** - Good and bad naming
5. **Validation API** - How to test before submit
6. **Migration Guide** - Renaming commands/skills

**Example Snippet**:
```markdown
## Naming Your Commands

✅ **Good**: `sigil-implement`, `mypack-deploy`, `custom-analyze`
❌ **Bad**: `implement`, `deploy`, `analyze`

### Naming Convention

1. Prefix with your pack slug: `{pack-slug}-{command-name}`
2. Use lowercase with hyphens
3. Be descriptive but concise

### Reserved Prefixes

Avoid these prefixes:
- `loa-*` - Reserved for LOA core
- `claude-*` - Reserved for Claude platform
- `thj-*` - Reserved for The Honey Jar
```

### 11.2 MANIFEST-REFERENCE.md

**Enhancement**: Add section for `provides`/`uses`/`grimoire` fields

**Example**:
```markdown
## Enhanced Manifest Fields (v2.0)

### provides

Declares what your pack provides to the LOA ecosystem.

```json
{
  "provides": {
    "skills": ["implementing-sigil-contracts"],
    "commands": ["sigil-implement", "mount-sigil"],
    "grimoires": ["contract-dev"]
  }
}
```

### uses

Declares external dependencies your pack requires.

```json
{
  "uses": {
    "skills": ["implementing-tasks"],  // LOA core skill
    "constructs": ["solana-toolkit"]   // Another pack
  }
}
```
```

---

## 12. Deployment Plan

### 12.1 Rollout Phases

**Phase 1: Dark Launch** (Week 1)
- Deploy namespace validation service
- Enable logging but **no rejection**
- Monitor for false positives

**Phase 2: Soft Enforcement** (Week 2)
- Enable rejection for new submissions
- Add `/validate-namespace` endpoint
- Notify creators in UI/email

**Phase 3: Full Enforcement** (Week 3+)
- Block submissions with conflicts
- Update documentation
- Announce via blog post

### 12.2 Rollback Plan

If validation causes issues:

1. **Quick Rollback**: Feature flag `NAMESPACE_VALIDATION_ENABLED=false`
2. **Fix**: Address false positive in reserved-names.ts
3. **Redeploy**: Push update
4. **Re-enable**: Set flag to `true`

**No database rollback needed** - validation is stateless.

---

## 13. Monitoring & Observability

### 13.1 Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `namespace_conflicts_total` | Total conflicts detected | - |
| `namespace_conflicts_rate` | % of submissions with conflicts | > 50% |
| `namespace_validation_latency_ms` | Validation time | > 500ms |
| `namespace_suggestions_provided` | Suggestions offered | - |
| `reserved_names_registry_size` | Total reserved names | - |

### 13.2 Logging

```typescript
logger.info({
  packSlug,
  conflictCount: conflicts.length,
  conflictedNames: conflicts.map(c => c.name),
  suggestions: conflicts.map(c => c.suggestion),
  requestId,
}, 'Namespace conflicts detected');
```

---

## 14. Appendix

### A. Reserved Names Summary

| Category | Count | Examples |
|----------|-------|----------|
| LOA Core Commands | 43 | `implement`, `architect`, `sprint-plan` |
| LOA Core Skills | 20 | `implementing-tasks`, `designing-architecture` |
| Claude Built-ins | 18 | `help`, `clear`, `settings` |
| Reserved Prefixes | 9 | `loa-*`, `claude-*`, `thj-*` |

**Total**: ~90 reserved names

### B. File Structure

```
apps/api/src/
├── config/
│   └── reserved-names.ts           # NEW - Reserved names registry
├── services/
│   ├── namespace-validation.ts     # NEW - Validation service
│   ├── packs.ts                    # Enhanced - Add namespace checks
│   └── submissions.ts              # Enhanced - Integrate validation
├── routes/
│   └── packs.ts                    # Enhanced - Add validation endpoint
└── types/
    └── manifest.ts                 # NEW - Enhanced manifest schema

apps/api/tests/
├── unit/
│   └── namespace-validation.test.ts  # NEW
└── e2e/
    └── namespace-validation.test.ts  # NEW
```

### C. Environment Variables

No new environment variables required.

Optional feature flag:
```bash
NAMESPACE_VALIDATION_ENABLED=true  # Default: true
```

### D. API Endpoints Summary

| Method | Endpoint | Auth | Description | Phase |
|--------|----------|------|-------------|-------|
| POST | `/v1/packs/:slug/validate-namespace` | Creator | Pre-submit validation | P0 |
| POST | `/v1/packs/:slug/submit` | Creator | **Enhanced** with validation | P0 |

---

**Document Status**: Ready for Implementation
**Next Step**: `/sprint-plan` to create implementation tasks for Sprint 26

---

## References

- Parent SDD: `grimoires/loa/sdd-pack-submission.md`
- Parent PRD: `grimoires/loa/prd-pack-submission.md`
- Pack Routes: `apps/api/src/routes/packs.ts`
- Submissions Service: `apps/api/src/services/submissions.ts`
- Security Validation: `apps/api/src/lib/security.ts`
