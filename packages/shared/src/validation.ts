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

// --- Export type inference helpers ---

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
