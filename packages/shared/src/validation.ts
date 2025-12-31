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
  loa: z.string().optional(), // semver range, e.g., ">=0.9.0"
  skills: z.record(z.string()).optional(), // slug -> version range
  packs: z.record(z.string()).optional(), // slug -> version range
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
  author: packAuthorSchema.optional(),
  license: z.string().max(50).default('MIT'),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  documentation: z.string().url().optional(),

  // Pricing configuration
  pricing: packPricingSchema.optional(),

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
});

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
