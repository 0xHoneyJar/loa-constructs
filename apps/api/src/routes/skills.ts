/**
 * Skills Routes
 * @see sprint.md T4.2: Skill Routes
 * @see sdd.md §5.3 Skills Endpoints
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  listSkills,
  getSkillBySlug,
  createSkill,
  updateSkill,
  getSkillVersions,
  getLatestVersion,
  getSkillVersion,
  createSkillVersion,
  getVersionFiles,
  addVersionFile,
  trackUsage,
  isSkillOwner,
  getSkillOwner,
  type SkillCategory,
} from '../services/skills.js';
import {
  generateLicense,
  validateLicense,
  canAccessSkill,
} from '../services/license.js';
import { getEffectiveTier, type SubscriptionTier } from '../services/subscription.js';
import {
  uploadFile,
  downloadFile,
  generateStorageKey,
  isAllowedMimeType,
  MAX_FILE_SIZE,
  isStorageConfigured,
  verifyStorageConnection,
} from '../services/storage.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { createHash } from 'crypto';
import { skillsRateLimiter } from '../middleware/rate-limiter.js';

// --- Route Instance ---

export const skillsRouter = new Hono();

// Apply rate limiting
skillsRouter.use('*', skillsRateLimiter());

// --- Schemas ---

const listSkillsSchema = z.object({
  q: z.string().optional(),
  category: z
    .enum(['development', 'devops', 'marketing', 'sales', 'support', 'analytics', 'security', 'other'])
    .optional(),
  tier: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  tags: z.string().optional(), // comma-separated
  sort: z.enum(['downloads', 'rating', 'newest', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  category: z
    .enum(['development', 'devops', 'marketing', 'sales', 'support', 'analytics', 'security', 'other'])
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  tier_required: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  is_public: z.boolean().optional(),
  repository_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
});

const updateSkillSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  category: z
    .enum(['development', 'devops', 'marketing', 'sales', 'support', 'analytics', 'security', 'other'])
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  tier_required: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  is_public: z.boolean().optional(),
  is_deprecated: z.boolean().optional(),
  repository_url: z.string().url().optional().nullable(),
  documentation_url: z.string().url().optional().nullable(),
});

const createVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  changelog: z.string().max(5000).optional(),
  min_loa_version: z.string().optional(),
  files: z.array(
    z.object({
      path: z.string().min(1).max(500),
      content: z.string(),
      mime_type: z.string().optional(),
    })
  ).min(1).max(50),
});

const validateLicenseSchema = z.object({
  token: z.string().min(1),
});

// --- Routes ---
// Note: GET /v1/skills and GET /v1/skills/:slug removed in favor of unified /v1/constructs endpoint

/**
 * GET /v1/skills/:slug/versions
 * List skill versions
 */
skillsRouter.get('/:slug/versions', async (c) => {
  const { slug } = c.req.param();

  const skill = await getSkillBySlug(slug);
  if (!skill) {
    throw Errors.NotFound('Skill');
  }

  const versions = await getSkillVersions(skill.id);

  return c.json({
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      min_loa_version: v.minLoaVersion,
      is_latest: v.isLatest,
      published_at: v.publishedAt?.toISOString() ?? null,
      created_at: v.createdAt.toISOString(),
    })),
  });
});

/**
 * GET /v1/skills/:slug/download
 * Download skill with license
 * @see sdd.md §5.3 GET /v1/skills/:slug/download
 */
skillsRouter.get('/:slug/download', requireAuth(), async (c) => {
  const { slug } = c.req.param();
  const version = c.req.query('version');
  const user = c.get('user');
  const requestId = c.get('requestId');

  const skill = await getSkillBySlug(slug);
  if (!skill) {
    throw Errors.NotFound('Skill');
  }

  // Check tier access
  const effectiveTier = await getEffectiveTier(user.id);
  const { allowed, requiredTier } = await canAccessSkill(effectiveTier.tier, slug);

  if (!allowed) {
    throw Errors.TierUpgradeRequired(requiredTier, effectiveTier.tier);
  }

  // Get version
  let skillVersion;
  if (version) {
    skillVersion = await getSkillVersion(skill.id, version);
    if (!skillVersion) {
      throw Errors.NotFound('Version');
    }
  } else {
    skillVersion = await getLatestVersion(skill.id);
    if (!skillVersion) {
      throw Errors.NotFound('No versions available');
    }
  }

  // Get files
  const files = await getVersionFiles(skillVersion.id);

  if (files.length === 0) {
    throw Errors.NotFound('No files available for this version');
  }

  // Download file contents
  if (!isStorageConfigured()) {
    throw Errors.ServiceUnavailable('File storage is not configured');
  }

  const fileContents: Array<{ path: string; content: string; mime_type: string }> = [];
  for (const file of files) {
    const buffer = await downloadFile(file.storageKey);
    fileContents.push({
      path: file.path,
      content: buffer.toString('utf-8'),
      mime_type: file.mimeType,
    });
  }

  // Generate license
  const license = await generateLicense(
    user.id,
    slug,
    skillVersion.version,
    effectiveTier.tier,
    effectiveTier.expiresAt
  );

  // Track usage
  await trackUsage({
    skillId: skill.id,
    userId: user.id,
    versionId: skillVersion.id,
    action: 'install',
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0] ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    metadata: { version: skillVersion.version },
  });

  logger.info(
    { request_id: requestId, userId: user.id, slug, version: skillVersion.version },
    'Skill downloaded'
  );

  return c.json({
    skill: {
      name: skill.name,
      slug: skill.slug,
      version: skillVersion.version,
    },
    files: fileContents,
    license: {
      token: license.token,
      watermark: license.payload.watermark,
      tier: license.payload.tier,
      expires_at: license.expiresAt.toISOString(),
    },
  });
});

/**
 * POST /v1/skills/:slug/validate
 * Validate a license token
 * @see sdd.md §5.3 POST /v1/skills/:slug/validate
 */
skillsRouter.post('/:slug/validate', zValidator('json', validateLicenseSchema), async (c) => {
  const { slug } = c.req.param();
  const { token } = c.req.valid('json');
  const requestId = c.get('requestId');

  const result = await validateLicense(token);

  if (!result.valid) {
    logger.warn({ request_id: requestId, slug, reason: result.reason }, 'License validation failed');
    return c.json(
      {
        valid: false,
        reason: result.reason,
      },
      400
    );
  }

  // Verify license is for this skill
  if (result.payload?.skill !== slug) {
    return c.json(
      {
        valid: false,
        reason: 'License is not for this skill',
      },
      400
    );
  }

  return c.json({
    valid: true,
    skill: result.payload?.skill,
    version: result.payload?.version,
    tier: result.payload?.tier,
    expires_at: result.expiresAt?.toISOString() ?? null,
  });
});

/**
 * POST /v1/skills
 * Create a new skill (creator only)
 * @see sdd.md §5.3 POST /v1/skills
 */
skillsRouter.post('/', requireAuth(), zValidator('json', createSkillSchema), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  const data = c.req.valid('json');

  // Check if slug is already taken
  const existing = await getSkillBySlug(data.slug);
  if (existing) {
    throw Errors.Conflict('Skill slug is already taken');
  }

  const skill = await createSkill({
    name: data.name,
    slug: data.slug,
    description: data.description,
    longDescription: data.long_description,
    category: data.category as SkillCategory,
    tags: data.tags,
    ownerId: user.id,
    ownerType: 'user',
    tierRequired: data.tier_required as SubscriptionTier,
    isPublic: data.is_public,
    repositoryUrl: data.repository_url,
    documentationUrl: data.documentation_url,
  });

  logger.info({ request_id: requestId, userId: user.id, skillId: skill.id, slug: skill.slug }, 'Skill created');

  return c.json(
    {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      category: skill.category,
      tier_required: skill.tierRequired,
      created_at: skill.createdAt.toISOString(),
    },
    201
  );
});

/**
 * PATCH /v1/skills/:slug
 * Update a skill (owner only)
 */
skillsRouter.patch('/:slug', requireAuth(), zValidator('json', updateSkillSchema), async (c) => {
  const { slug } = c.req.param();
  const user = c.get('user');
  const requestId = c.get('requestId');
  const data = c.req.valid('json');

  const skill = await getSkillBySlug(slug);
  if (!skill) {
    throw Errors.NotFound('Skill');
  }

  // Check ownership
  const isOwner = await isSkillOwner(skill.id, user.id);
  if (!isOwner) {
    throw Errors.Forbidden('You do not have permission to update this skill');
  }

  const updated = await updateSkill(skill.id, {
    name: data.name,
    description: data.description,
    longDescription: data.long_description,
    category: data.category as SkillCategory,
    tags: data.tags,
    tierRequired: data.tier_required as SubscriptionTier,
    isPublic: data.is_public,
    isDeprecated: data.is_deprecated,
    repositoryUrl: data.repository_url ?? undefined,
    documentationUrl: data.documentation_url ?? undefined,
  });

  logger.info({ request_id: requestId, userId: user.id, skillId: skill.id }, 'Skill updated');

  return c.json({
    id: updated!.id,
    name: updated!.name,
    slug: updated!.slug,
    description: updated!.description,
    category: updated!.category,
    tier_required: updated!.tierRequired,
    updated_at: updated!.updatedAt.toISOString(),
  });
});

/**
 * POST /v1/skills/:slug/versions
 * Publish a new version (owner only)
 * @see sdd.md §5.3 POST /v1/skills/:slug/versions
 */
skillsRouter.post('/:slug/versions', requireAuth(), zValidator('json', createVersionSchema), async (c) => {
  const { slug } = c.req.param();
  const user = c.get('user');
  const requestId = c.get('requestId');
  const data = c.req.valid('json');

  const skill = await getSkillBySlug(slug);
  if (!skill) {
    throw Errors.NotFound('Skill');
  }

  // Check ownership
  const isOwner = await isSkillOwner(skill.id, user.id);
  if (!isOwner) {
    throw Errors.Forbidden('You do not have permission to publish versions for this skill');
  }

  // Check version doesn't exist
  const existingVersion = await getSkillVersion(skill.id, data.version);
  if (existingVersion) {
    throw Errors.Conflict(`Version ${data.version} already exists`);
  }

  // Validate storage is configured and accessible
  if (!isStorageConfigured()) {
    throw Errors.ServiceUnavailable('File storage is not configured');
  }

  // Pre-flight check: verify storage is accessible before creating version record
  const storageStatus = await verifyStorageConnection();
  if (!storageStatus.connected) {
    logger.error(
      { request_id: requestId, slug, error: storageStatus.error },
      'Storage pre-flight check failed'
    );
    throw Errors.ServiceUnavailable(
      `File storage is not accessible: ${storageStatus.error ?? 'Unknown error'}. Please try again later.`
    );
  }

  // Create version
  const version = await createSkillVersion({
    skillId: skill.id,
    version: data.version,
    changelog: data.changelog,
    minLoaVersion: data.min_loa_version,
  });

  // Upload files
  const uploadedFiles: Array<{ path: string; size: number }> = [];
  for (const file of data.files) {
    const mimeType = file.mime_type ?? 'text/plain';

    // Validate MIME type
    if (!isAllowedMimeType(mimeType)) {
      throw Errors.BadRequest(`Invalid file type: ${mimeType}`);
    }

    const buffer = Buffer.from(file.content, 'utf-8');

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw Errors.BadRequest(`File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
    }

    // Generate storage key and content hash
    const storageKey = generateStorageKey(slug, data.version, file.path);
    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // Upload to R2
    await uploadFile(storageKey, buffer, mimeType);

    // Create file record
    await addVersionFile({
      versionId: version.id,
      path: file.path,
      contentHash,
      storageKey,
      sizeBytes: buffer.length,
      mimeType,
    });

    uploadedFiles.push({ path: file.path, size: buffer.length });
  }

  logger.info(
    {
      request_id: requestId,
      userId: user.id,
      skillId: skill.id,
      version: data.version,
      files: uploadedFiles.length,
    },
    'Version published'
  );

  return c.json(
    {
      id: version.id,
      skill_id: skill.id,
      version: version.version,
      changelog: version.changelog,
      min_loa_version: version.minLoaVersion,
      is_latest: version.isLatest,
      files: uploadedFiles,
      published_at: version.publishedAt?.toISOString() ?? null,
    },
    201
  );
});
