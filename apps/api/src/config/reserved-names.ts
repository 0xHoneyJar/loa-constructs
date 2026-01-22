/**
 * Reserved Names Registry
 * Prevents namespace collisions between LOA core, Claude built-ins, and third-party packs
 * @see grimoires/loa/sdd-namespace-isolation.md §3.1
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
export const RESERVED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
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

/**
 * Get summary statistics for reserved names
 */
export function getReservedNameStats(): {
  totalCommands: number;
  totalSkills: number;
  totalBuiltins: number;
  totalPatterns: number;
  total: number;
} {
  return {
    totalCommands: LOA_CORE_COMMANDS.length,
    totalSkills: LOA_CORE_SKILLS.length,
    totalBuiltins: CLAUDE_BUILTINS.length,
    totalPatterns: RESERVED_PATTERNS.length,
    total: LOA_CORE_COMMANDS.length + LOA_CORE_SKILLS.length + CLAUDE_BUILTINS.length,
  };
}
