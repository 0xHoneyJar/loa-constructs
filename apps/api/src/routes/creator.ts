/**
 * Creator Routes - Skill Publishing API
 * @see sprint.md T10.5: Skill Publishing UI (API support)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createSkill,
  updateSkill,
  createSkillVersion,
  getSkillById,
  getSkillBySlug,
  isSkillOwner,
  addVersionFile,
  getSkillVersions,
  type SkillCategory,
} from '../services/skills.js';
import { uploadFile } from '../services/storage.js';
import { getCreatorStats, invalidateSkillAnalyticsCache } from '../services/analytics.js';
import { type SubscriptionTier, getEffectiveTier } from '../services/subscription.js';
import { logger } from '../lib/logger.js';
import type { Variables } from '../app.js';
import crypto from 'crypto';
import { creatorRateLimiter } from '../middleware/rate-limiter.js';

// --- Router ---

const creatorRouter = new Hono<{ Variables: Variables & { user: { id: string } } }>();

// All routes require authentication and rate limiting
creatorRouter.use('*', requireAuth());
creatorRouter.use('*', creatorRateLimiter());

// --- Schemas ---

const createSkillSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  longDescription: z.string().max(10000, 'Long description must be at most 10000 characters').optional(),
  category: z.enum([
    'development',
    'devops',
    'marketing',
    'sales',
    'support',
    'analytics',
    'security',
    'other',
  ] as const).default('other'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  tierRequired: z.enum(['free', 'pro', 'team', 'enterprise'] as const).default('free'),
  isPublic: z.boolean().default(true),
  repositoryUrl: z.string().url().optional().nullable(),
  documentationUrl: z.string().url().optional().nullable(),
});

const updateSkillSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  longDescription: z.string().max(10000).optional(),
  category: z.enum([
    'development',
    'devops',
    'marketing',
    'sales',
    'support',
    'analytics',
    'security',
    'other',
  ] as const).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  tierRequired: z.enum(['free', 'pro', 'team', 'enterprise'] as const).optional(),
  isPublic: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
  repositoryUrl: z.string().url().optional().nullable(),
  documentationUrl: z.string().url().optional().nullable(),
});

const createVersionSchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Version must follow semver format (e.g., 1.0.0)'),
  changelog: z.string().max(5000, 'Changelog must be at most 5000 characters').optional(),
  minLoaVersion: z.string().optional(),
});

const uploadFileSchema = z.object({
  path: z
    .string()
    .min(1, 'Path is required')
    .max(500, 'Path must be at most 500 characters')
    .regex(/^[a-zA-Z0-9/_.-]+$/, 'Path contains invalid characters'),
  content: z.string().min(1, 'Content is required'),
  mimeType: z.string().default('text/plain'),
});

// --- Helper Functions ---

/**
 * Compute SHA256 hash of content
 */
function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// --- Routes ---

/**
 * GET /v1/creator/dashboard
 * Get creator dashboard summary
 */
creatorRouter.get('/dashboard', async (c) => {
  const user = c.get('user');

  const stats = await getCreatorStats(user.id);

  return c.json({
    data: {
      summary: {
        totalSkills: stats.totalSkills,
        totalDownloads: stats.totalDownloads,
        totalActiveInstalls: stats.totalActiveInstalls,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
      },
      recentSkills: stats.skills.slice(0, 5),
    },
  });
});

/**
 * POST /v1/creator/skills
 * Create a new skill
 * @see sprint.md T10.5: Skill Publishing UI
 */
creatorRouter.post(
  '/skills',
  zValidator('json', createSkillSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');

    // Check if user can publish skills (requires Pro tier or above for paid skills)
    if (data.tierRequired !== 'free') {
      const userTier = await getEffectiveTier(user.id);
      if (userTier.tier === 'free') {
        return c.json(
          {
            error: {
              code: 'TIER_REQUIRED',
              message: 'You need a Pro subscription or higher to publish paid skills',
            },
          },
          403
        );
      }
    }

    // Check if slug is already taken
    const existingSkill = await getSkillBySlug(data.slug);
    if (existingSkill) {
      return c.json(
        {
          error: {
            code: 'SLUG_TAKEN',
            message: 'This skill slug is already taken. Please choose a different slug.',
          },
        },
        409
      );
    }

    // Create the skill
    const skill = await createSkill({
      name: data.name,
      slug: data.slug,
      description: data.description,
      longDescription: data.longDescription,
      category: data.category as SkillCategory,
      tags: data.tags,
      ownerId: user.id,
      ownerType: 'user',
      tierRequired: data.tierRequired as SubscriptionTier,
      isPublic: data.isPublic,
      repositoryUrl: data.repositoryUrl ?? undefined,
      documentationUrl: data.documentationUrl ?? undefined,
    });

    logger.info({ skillId: skill.id, userId: user.id }, 'Skill created by user');

    return c.json(
      {
        data: skill,
        message: 'Skill created successfully. Now publish a version to make it available.',
      },
      201
    );
  }
);

/**
 * PATCH /v1/creator/skills/:skillId
 * Update a skill
 */
creatorRouter.patch(
  '/skills/:skillId',
  zValidator('json', updateSkillSchema),
  async (c) => {
    const user = c.get('user');
    const skillId = c.req.param('skillId');
    const data = c.req.valid('json');

    // Verify skill exists
    const skill = await getSkillById(skillId);
    if (!skill) {
      return c.json(
        {
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        },
        404
      );
    }

    // Verify ownership
    const isOwner = await isSkillOwner(skillId, user.id);
    if (!isOwner) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this skill',
          },
        },
        403
      );
    }

    // Check tier requirement for paid skills
    if (data.tierRequired && data.tierRequired !== 'free') {
      const userTier = await getEffectiveTier(user.id);
      if (userTier.tier === 'free') {
        return c.json(
          {
            error: {
              code: 'TIER_REQUIRED',
              message: 'You need a Pro subscription or higher to set paid tier requirements',
            },
          },
          403
        );
      }
    }

    const updatedSkill = await updateSkill(skillId, {
      name: data.name,
      description: data.description,
      longDescription: data.longDescription,
      category: data.category as SkillCategory | undefined,
      tags: data.tags,
      tierRequired: data.tierRequired as SubscriptionTier | undefined,
      isPublic: data.isPublic,
      isDeprecated: data.isDeprecated,
      repositoryUrl: data.repositoryUrl ?? undefined,
      documentationUrl: data.documentationUrl ?? undefined,
    });

    // Invalidate analytics cache
    await invalidateSkillAnalyticsCache(skillId);

    logger.info({ skillId, userId: user.id }, 'Skill updated by user');

    return c.json({
      data: updatedSkill,
      message: 'Skill updated successfully',
    });
  }
);

/**
 * GET /v1/creator/skills/:skillId/versions
 * Get all versions of a skill
 */
creatorRouter.get('/skills/:skillId/versions', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  // Verify skill exists
  const skill = await getSkillById(skillId);
  if (!skill) {
    return c.json(
      {
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      },
      404
    );
  }

  // Verify ownership
  const isOwner = await isSkillOwner(skillId, user.id);
  if (!isOwner) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view versions for this skill',
        },
      },
      403
    );
  }

  const versions = await getSkillVersions(skillId);

  return c.json({
    data: versions,
  });
});

/**
 * POST /v1/creator/skills/:skillId/versions
 * Publish a new version of a skill
 * @see sprint.md T10.5: Skill Publishing UI
 */
creatorRouter.post(
  '/skills/:skillId/versions',
  zValidator('json', createVersionSchema),
  async (c) => {
    const user = c.get('user');
    const skillId = c.req.param('skillId');
    const data = c.req.valid('json');

    // Verify skill exists
    const skill = await getSkillById(skillId);
    if (!skill) {
      return c.json(
        {
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        },
        404
      );
    }

    // Verify ownership
    const isOwner = await isSkillOwner(skillId, user.id);
    if (!isOwner) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to publish versions for this skill',
          },
        },
        403
      );
    }

    // Check if version already exists
    const versions = await getSkillVersions(skillId);
    if (versions.some((v) => v.version === data.version)) {
      return c.json(
        {
          error: {
            code: 'VERSION_EXISTS',
            message: `Version ${data.version} already exists. Please use a different version number.`,
          },
        },
        409
      );
    }

    // Create the version
    const version = await createSkillVersion({
      skillId,
      version: data.version,
      changelog: data.changelog,
      minLoaVersion: data.minLoaVersion,
    });

    // Invalidate analytics cache
    await invalidateSkillAnalyticsCache(skillId);

    logger.info({ skillId, version: data.version, userId: user.id }, 'Skill version published');

    return c.json(
      {
        data: version,
        message: `Version ${data.version} published successfully. Now upload files to complete the release.`,
      },
      201
    );
  }
);

/**
 * POST /v1/creator/skills/:skillId/versions/:versionId/files
 * Upload a file to a skill version
 */
creatorRouter.post(
  '/skills/:skillId/versions/:versionId/files',
  zValidator('json', uploadFileSchema),
  async (c) => {
    const user = c.get('user');
    const skillId = c.req.param('skillId');
    const versionId = c.req.param('versionId');
    const data = c.req.valid('json');

    // Verify skill exists and user owns it
    const skill = await getSkillById(skillId);
    if (!skill) {
      return c.json(
        {
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        },
        404
      );
    }

    const isOwner = await isSkillOwner(skillId, user.id);
    if (!isOwner) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to upload files for this skill',
          },
        },
        403
      );
    }

    // Verify version exists and belongs to this skill
    const versions = await getSkillVersions(skillId);
    const version = versions.find((v) => v.id === versionId);
    if (!version) {
      return c.json(
        {
          error: {
            code: 'VERSION_NOT_FOUND',
            message: 'Version not found',
          },
        },
        404
      );
    }

    // Compute content hash
    const contentHash = computeHash(data.content);

    // Generate storage key
    const storageKey = `skills/${skill.slug}/${version.version}/${data.path}`;

    // Upload to storage
    const contentBuffer = Buffer.from(data.content, 'utf-8');
    await uploadFile(storageKey, contentBuffer, data.mimeType);

    // Record in database
    const file = await addVersionFile({
      versionId,
      path: data.path,
      contentHash,
      storageKey,
      sizeBytes: contentBuffer.length,
      mimeType: data.mimeType,
    });

    logger.info(
      { skillId, versionId, path: data.path, userId: user.id },
      'File uploaded to skill version'
    );

    return c.json(
      {
        data: {
          id: file.id,
          path: file.path,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          contentHash: file.contentHash,
        },
        message: 'File uploaded successfully',
      },
      201
    );
  }
);

/**
 * POST /v1/creator/skills/:skillId/deprecate
 * Mark a skill as deprecated
 */
creatorRouter.post('/skills/:skillId/deprecate', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  // Verify skill exists
  const skill = await getSkillById(skillId);
  if (!skill) {
    return c.json(
      {
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      },
      404
    );
  }

  // Verify ownership
  const isOwner = await isSkillOwner(skillId, user.id);
  if (!isOwner) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to deprecate this skill',
        },
      },
      403
    );
  }

  await updateSkill(skillId, { isDeprecated: true });

  logger.info({ skillId, userId: user.id }, 'Skill deprecated');

  return c.json({
    message: 'Skill has been marked as deprecated',
  });
});

export { creatorRouter };
