/**
 * Shared Validation Schemas
 * @see sdd.md §2.1 Frontend Technologies - Zod
 */

import { z } from 'zod';

// --- Common Schemas ---

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug must be less than 100 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/, 'Invalid semver version');

/**
 * Tool/MCP key schema - relaxed vs slugSchema for record keys
 * Allows shorter keys (min 1) and underscores for tool identifiers
 * @see Flatline SDD review: slugSchema min(3) rejects valid keys like "br", "gh"
 */
export const toolKeySchema = z
  .string()
  .min(1, 'Key must be at least 1 character')
  .max(100, 'Key must be less than 100 characters')
  .regex(/^[a-z0-9_-]+$/, 'Key must contain only lowercase letters, numbers, hyphens, and underscores');

// --- Auth Schemas ---

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(255),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// --- Skill Schemas ---

export const skillCategorySchema = z.enum([
  'development',
  'devops',
  'marketing',
  'sales',
  'support',
  'analytics',
  'security',
  'other',
]);

export const subscriptionTierSchema = z.enum(['free', 'pro', 'team', 'enterprise']);

export const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  category: skillCategorySchema.default('other'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  tier_required: subscriptionTierSchema.default('free'),
  repository_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
});

export const listSkillsQuerySchema = z.object({
  q: z.string().optional(),
  category: skillCategorySchema.optional(),
  tier: subscriptionTierSchema.optional(),
  tag: z.string().optional(),
  sort: z.enum(['downloads', 'rating', 'newest', 'name']).default('downloads'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Team Schemas ---

export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member']).default('member'),
});

// --- Subscription Schemas ---

export const createCheckoutSchema = z.object({
  tier: z.enum(['pro', 'team']),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

// --- API Key Schemas ---

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default(['read:skills', 'write:installs']),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

// --- Pack Schemas ---

/**
 * Pack manifest author schema
 * @see sdd-v2.md §2.3 Pack Manifest Schema
 */
export const packAuthorSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});

/**
 * Pack manifest pricing schema
 * @see sdd-v2.md §2.3 Pack Manifest Schema
 */
export const packPricingSchema = z.object({
  type: z.enum(['free', 'one_time', 'subscription']),
  tier: subscriptionTierSchema.optional(),
  stripe_product_id: z.string().optional(),
  prices: z
    .object({
      monthly: z.string().optional(),
      annual: z.string().optional(),
      one_time: z.string().optional(),
    })
    .optional(),
});

/**
 * Pack manifest skill reference schema
 */
export const packSkillRefSchema = z.object({
  slug: slugSchema,
  path: z.string().min(1).max(500),
});

/**
 * Pack manifest command reference schema
 */
export const packCommandRefSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
});

/**
 * Pack manifest protocol reference schema
 */
export const packProtocolRefSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
});

/**
 * Pack manifest dependencies schema
 */
export const packDependenciesSchema = z.object({
  loa_version: z.string().optional(), // semver range, e.g., ">=0.9.0"
  skills: z.record(z.string()).optional(), // slug -> version range
  packs: z.record(z.string()).optional(), // slug -> version range
});

/**
 * MCP tool definition schema
 * @see prd-constructs-tooling-modernization.md §WS1
 */
export const mcpToolDefinitionSchema = z.object({
  install: z.string().max(500).optional(),
  required: z.boolean().default(false),
  purpose: z.string().max(200),
  check: z.string().max(200),
  docs_url: z.string().url().optional(),
  version: z.string().max(50).optional(),
});

/**
 * MCP dependency definition schema (pack consumes)
 */
export const mcpDependencyDefinitionSchema = z.object({
  required: z.boolean().default(false),
  required_scopes: z.array(z.string().max(50)).optional(),
  reason: z.string().max(200),
  fallback: z.string().max(300).optional(),
});

/**
 * Quick start hint schema
 */
export const quickStartSchema = z.object({
  command: z.string().max(100),
  description: z.string().max(200),
});

// ── Bridgebuilder schemas (cycle-030, FR-1) ──────────────────

export const goldenPathCommandSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  truename_map: z.record(z.string().min(1).max(100), z.string().max(100)).optional(),
});

export const goldenPathSchema = z.object({
  commands: z.array(goldenPathCommandSchema).min(1),
  detect_state: z.string().max(500).optional(),
});

const planGateSchema = z.enum(['skip', 'condense', 'full']);
const reviewGateSchema = z.enum(['skip', 'visual', 'textual', 'both']);
const auditGateSchema = z.enum(['skip', 'lightweight', 'full']);

export const workflowGatesSchema = z.object({
  prd: planGateSchema.optional(),
  sdd: planGateSchema.optional(),
  sprint: planGateSchema.optional(),
  implement: z.literal('required').optional(),
  review: reviewGateSchema.optional(),
  audit: auditGateSchema.optional(),
});

export const workflowVerificationSchema = z.object({
  method: z.enum(['visual', 'tsc', 'build', 'test', 'manual']),
});

export const workflowSchema = z.object({
  depth: z.enum(['light', 'standard', 'deep', 'full']),
  app_zone_access: z.boolean().optional(),
  gates: workflowGatesSchema,
  verification: workflowVerificationSchema.optional(),
});

export const methodologySchema = z.object({
  references: z.array(z.string().max(500)).max(20).optional(),
  principles: z.array(z.string().max(200)).max(20).optional(),
  knowledge_base: z.string().max(500).optional(),
});

export const tierSchema = z.enum(['L1', 'L2', 'L3']);

// ── Construct Lifecycle schemas (cycle-032, FR-1) ──────────────────

/** Construct archetype */
export const constructTypeSchema = z.enum(['skill-pack', 'tool-pack', 'codex', 'template']);

/** Runtime environment requirements */
export const runtimeRequirementsSchema = z.object({
  runtime: z.string().max(50).optional(),
  dependencies: z.record(z.string()).optional(),
  external_tools: z.array(z.string().max(100)).max(20).optional(),
});

/** Configurable directory paths */
export const constructPathsSchema = z.object({
  state: z.string().max(500).optional(),
  cache: z.string().max(500).optional(),
  output: z.string().max(500).optional(),
});

/** Credential requirement descriptor */
export const credentialSchema = z.object({
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Credential name must be UPPER_SNAKE_CASE'),
  description: z.string().max(500),
  sensitive: z.boolean().default(true),
  optional: z.boolean().default(false),
});

/** Access layer configuration for codex-type constructs */
export const accessLayerSchema = z.object({
  type: z.enum(['mcp', 'file', 'api']),
  entrypoint: z.string().max(500).optional(),
  transport: z.enum(['stdio', 'sse', 'http']).optional(),
});

/** Expert identity layer */
export const identitySchema = z.object({
  persona: z.string().max(500).optional(),
  expertise: z.string().max(500).optional(),
});

/** Lifecycle hooks */
export const lifecycleHooksSchema = z.object({
  post_install: z.string().max(500).optional(),
  post_update: z.string().max(500).optional(),
});

/**
 * Full pack manifest schema
 * @see sdd-v2.md §2.3 Pack Manifest Schema
 */
export const packManifestSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1).max(255),
  slug: slugSchema,
  version: semverSchema,
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  author: z.union([z.string().max(255), packAuthorSchema]).optional(),
  license: z.string().max(50).default('MIT'),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  documentation: z.string().url().optional(),

  // Pricing configuration
  pricing: packPricingSchema.optional(),

  // Schema version
  schema_version: z.number().int().min(1).default(1),

  // Pack contents
  skills: z.array(packSkillRefSchema).default([]),
  commands: z.array(packCommandRefSchema).default([]),
  protocols: z.array(packProtocolRefSchema).default([]),

  // Dependencies
  dependencies: packDependenciesSchema.optional(),

  // Metadata
  tags: z.array(z.string().max(50)).max(20).default([]),
  keywords: z.array(z.string().max(50)).max(20).default([]),

  // Engine compatibility
  engines: z
    .object({
      loa: z.string().optional(),
      node: z.string().optional(),
    })
    .optional(),

  // CLAUDE.md instruction fragment
  // @see prd.md §4.3 CLAUDE.md Fragments (Opportunity 3)
  claude_instructions: z
    .string()
    .max(500)
    .regex(/\.md$/, 'claude_instructions must end with .md')
    .optional(),

  // Tool dependencies
  tools: z.record(toolKeySchema, mcpToolDefinitionSchema).optional(),

  // MCP servers consumed (MCP server definitions live in .claude/mcp-registry.yaml)
  mcp_dependencies: z.record(toolKeySchema, mcpDependencyDefinitionSchema).optional(),

  // Quick start hint for install summary
  quick_start: quickStartSchema.optional(),

  // Bridgebuilder fields (cycle-030, FR-1)
  domain: z.array(z.string().max(50)).max(10).optional(),
  expertise: z.array(z.string().max(100)).max(20).optional(),
  golden_path: goldenPathSchema.optional(),
  workflow: workflowSchema.optional(),
  methodology: methodologySchema.optional(),
  tier: tierSchema.optional(),

  // Construct Lifecycle fields (cycle-032, FR-1)
  type: constructTypeSchema.optional(),
  runtime_requirements: runtimeRequirementsSchema.optional(),
  paths: constructPathsSchema.optional(),
  credentials: z.array(credentialSchema).max(20).optional(),
  access_layer: accessLayerSchema.optional(),
  portability_score: z.number().min(0).max(1).optional(),
  identity: identitySchema.optional(),
  hooks: lifecycleHooksSchema.optional(),

  // Drift reconciliation (SDD §3.4): meta_probe exists in JSON Schema but not Zod
  meta_probe: z.object({
    name: z.string(),
    command: z.string().optional(),
    skill: z.string().optional(),
    scope: z.enum(['internal', 'external']).default('internal'),
  }).optional(),
}).passthrough();

/**
 * Validate a pack manifest
 * @param manifest - The manifest object to validate
 * @returns Validation result with errors if any
 */
export function validatePackManifest(manifest: unknown): {
  success: boolean;
  data?: z.infer<typeof packManifestSchema>;
  errors?: z.ZodError;
} {
  const result = packManifestSchema.safeParse(manifest);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * List packs query schema
 */
export const listPacksQuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Create pack input schema (API)
 */
export const createPackSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  pricing: z
    .object({
      type: z.enum(['free', 'one_time', 'subscription']).optional(),
      tier_required: subscriptionTierSchema.optional(),
      stripe_product_id: z.string().optional(),
      stripe_monthly_price_id: z.string().optional(),
      stripe_annual_price_id: z.string().optional(),
    })
    .optional(),
  repository_url: z.string().url().optional(),
  homepage_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
});

/**
 * Create pack version input schema (API)
 */
export const createPackVersionSchema = z.object({
  version: semverSchema,
  changelog: z.string().max(5000).optional(),
  manifest: packManifestSchema,
  min_loa_version: z.string().optional(),
  max_loa_version: z.string().optional(),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(500),
        content: z.string(), // base64 encoded
        mime_type: z.string().optional(),
      })
    )
    .min(1)
    .max(100),
});

// --- Export type inference helpers ---

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// Pack types (note: PackManifest is exported from types.ts, use ValidatedPackManifest for zod inference)
export type ValidatedPackManifest = z.infer<typeof packManifestSchema>;
export type PackAuthor = z.infer<typeof packAuthorSchema>;
export type PackPricing = z.infer<typeof packPricingSchema>;
export type PackSkillRef = z.infer<typeof packSkillRefSchema>;
export type PackCommandRef = z.infer<typeof packCommandRefSchema>;
export type PackProtocolRef = z.infer<typeof packProtocolRefSchema>;
export type PackDependencies = z.infer<typeof packDependenciesSchema>;
export type ListPacksQuery = z.infer<typeof listPacksQuerySchema>;
export type CreatePackInput = z.infer<typeof createPackSchema>;
export type CreatePackVersionInput = z.infer<typeof createPackVersionSchema>;

// MCP types
export type McpToolDefinition = z.infer<typeof mcpToolDefinitionSchema>;
export type McpDependencyDefinition = z.infer<typeof mcpDependencyDefinitionSchema>;
export type QuickStart = z.infer<typeof quickStartSchema>;

// Bridgebuilder types (cycle-030)
export type GoldenPathCommand = z.infer<typeof goldenPathCommandSchema>;
export type GoldenPath = z.infer<typeof goldenPathSchema>;
export type WorkflowGates = z.infer<typeof workflowGatesSchema>;
export type WorkflowVerification = z.infer<typeof workflowVerificationSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Methodology = z.infer<typeof methodologySchema>;
export type Tier = z.infer<typeof tierSchema>;

// Construct Lifecycle types (cycle-032)
export type ConstructType = z.infer<typeof constructTypeSchema>;
export type RuntimeRequirements = z.infer<typeof runtimeRequirementsSchema>;
export type ConstructPaths = z.infer<typeof constructPathsSchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type AccessLayer = z.infer<typeof accessLayerSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type LifecycleHooks = z.infer<typeof lifecycleHooksSchema>;
