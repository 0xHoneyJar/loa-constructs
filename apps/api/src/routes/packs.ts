/**
 * Packs Routes
 * @see sdd-v2.md §5.1 Pack Endpoints
 * @see sprint-v2.md T13.4: Pack CRUD API
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { JWTHeaderParameters } from 'jose';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { getRS256SigningCredentials } from '../services/license.js';
import {
  createPack,
  getPackBySlug,
  updatePack,
  isPackOwner,
  createPackVersion,
  getPackVersions,
  getLatestPackVersion,
  getPackVersion,
  addPackFile,
  getPackVersionFiles,
  updatePackVersionStats,
  trackPackInstallation,
  isSlugAvailable,
  type PackPricingType,
} from '../services/packs.js';
import {
  createPackSubmission,
  getLatestPackSubmission,
  withdrawPackSubmission,
  updatePackStatus,
  countRecentSubmissions,
} from '../services/submissions.js';
import { trackDownloadAttribution } from '../services/attributions.js';
import {
  validatePackNamespace,
  extractNamesFromFiles,
  formatConflictError,
} from '../services/namespace-validation.js';
import { sendSubmissionReceivedEmail } from '../services/email.js';
import {
  uploadFile,
  downloadFile,
  isStorageConfigured,
} from '../services/storage.js';
import { Errors, AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { createHash, randomUUID } from 'crypto';
import { skillsRateLimiter, submissionRateLimiter, uploadRateLimiter } from '../middleware/rate-limiter.js';
import { validatePath, generatePackStorageKey } from '../lib/security.js';
import { getEffectiveTier, canAccessTier, type SubscriptionTier } from '../services/subscription.js';
import { db, packs, packVersions, packFiles } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

// --- Route Instance ---

export const packsRouter = new Hono();

// Apply rate limiting (reuse skills limiter for now)
packsRouter.use('*', skillsRateLimiter());

// --- Schemas ---

const createPackSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Slug must be lowercase alphanumeric with hyphens'
    ),
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  pricing: z
    .object({
      type: z.enum(['free', 'one_time', 'subscription']).optional(),
      tier_required: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
      stripe_product_id: z.string().optional(),
      stripe_monthly_price_id: z.string().optional(),
      stripe_annual_price_id: z.string().optional(),
    })
    .optional(),
  repository_url: z.string().url().optional(),
  homepage_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
});

const updatePackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  long_description: z.string().max(10000).optional(),
  icon: z.string().max(10).optional().nullable(),
  pricing: z
    .object({
      type: z.enum(['free', 'one_time', 'subscription']).optional(),
      tier_required: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
      stripe_product_id: z.string().optional().nullable(),
      stripe_monthly_price_id: z.string().optional().nullable(),
      stripe_annual_price_id: z.string().optional().nullable(),
    })
    .optional(),
  repository_url: z.string().url().optional().nullable(),
  homepage_url: z.string().url().optional().nullable(),
  documentation_url: z.string().url().optional().nullable(),
});

const submitPackSchema = z.object({
  submission_notes: z.string().max(1000).optional(),
});

const validateNamespaceSchema = z.object({
  manifest: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    commands: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  }),
});

const createVersionSchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  changelog: z.string().max(5000).optional(),
  manifest: z.record(z.unknown()),
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

// --- Routes ---
// Note: GET /v1/packs and GET /v1/packs/:slug removed in favor of unified /v1/constructs endpoint

/**
 * POST /v1/packs
 * Create a new pack
 * @see sdd-v2.md §5.1 POST /v1/packs
 */
packsRouter.post('/', requireAuth(), zValidator('json', createPackSchema), async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const user = c.get('user');
  const requestId = c.get('requestId');

  // Require verified email
  if (!user.emailVerified) {
    throw Errors.Forbidden('Email verification required to create packs');
  }

  // Check slug availability
  const available = await isSlugAvailable(body.slug);
  if (!available) {
    throw Errors.Conflict('Pack slug already exists');
  }

  // Create pack
  const pack = await createPack({
    name: body.name,
    slug: body.slug,
    description: body.description,
    longDescription: body.long_description,
    ownerId: userId,
    ownerType: 'user',
    pricingType: (body.pricing?.type as PackPricingType) || 'free',
    tierRequired: body.pricing?.tier_required || 'free',
    stripeProductId: body.pricing?.stripe_product_id,
    stripeMonthlyPriceId: body.pricing?.stripe_monthly_price_id,
    stripeAnnualPriceId: body.pricing?.stripe_annual_price_id,
    repositoryUrl: body.repository_url,
    homepageUrl: body.homepage_url,
    documentationUrl: body.documentation_url,
  });

  logger.info({ userId, packId: pack.id, slug: pack.slug, requestId }, 'Pack created');

  return c.json(
    {
      data: {
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        status: pack.status,
        created_at: pack.createdAt,
      },
      request_id: requestId,
    },
    201
  );
});

/**
 * PATCH /v1/packs/:slug
 * Update a pack
 */
packsRouter.patch(
  '/:slug',
  requireAuth(),
  zValidator('json', updatePackSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const requestId = c.get('requestId');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('You are not the owner of this pack');
    }

    // Update pack
    const updated = await updatePack(pack.id, {
      name: body.name,
      description: body.description,
      longDescription: body.long_description,
      icon: body.icon,
      pricingType: body.pricing?.type as PackPricingType | undefined,
      tierRequired: body.pricing?.tier_required,
      stripeProductId: body.pricing?.stripe_product_id,
      stripeMonthlyPriceId: body.pricing?.stripe_monthly_price_id,
      stripeAnnualPriceId: body.pricing?.stripe_annual_price_id,
      repositoryUrl: body.repository_url,
      homepageUrl: body.homepage_url,
      documentationUrl: body.documentation_url,
    });

    logger.info({ userId, packId: pack.id, requestId }, 'Pack updated');

    return c.json({
      data: {
        id: updated?.id,
        name: updated?.name,
        slug: updated?.slug,
        status: updated?.status,
        updated_at: updated?.updatedAt,
      },
      request_id: requestId,
    });
  }
);

/**
 * POST /v1/packs/:slug/submit
 * Submit pack for review
 * @see sdd-pack-submission.md §4.1 POST /v1/packs/:slug/submit
 * @see prd-pack-submission.md §4.2 Submission Workflow
 * @see sdd-namespace-isolation.md §4.2 Enhanced Submit Endpoint
 * @see SECURITY-AUDIT-REPORT.md H-001: Rate limiting added
 */
packsRouter.post(
  '/:slug/submit',
  requireAuth(),
  submissionRateLimiter(),
  zValidator('json', submitPackSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const user = c.get('user');
    const requestId = c.get('requestId');

    // Require verified email
    if (!user.emailVerified) {
      throw Errors.Forbidden('Email verification required to submit packs');
    }

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('You are not the owner of this pack');
    }

    // Validate pack state - must be draft or rejected
    if (pack.status !== 'draft' && pack.status !== 'rejected') {
      throw Errors.BadRequest(
        `Cannot submit pack in '${pack.status}' status. Only draft or rejected packs can be submitted.`
      );
    }

    // Validate pack has at least one version
    const latestVersion = await getLatestPackVersion(pack.id);
    if (!latestVersion) {
      throw Errors.BadRequest('Pack must have at least one version before submission');
    }

    // Validate pack has description
    if (!pack.description || pack.description.trim().length === 0) {
      throw Errors.BadRequest('Pack must have a description before submission');
    }

    // Namespace validation: Extract commands/skills from pack files
    // @see sdd-namespace-isolation.md §4.2
    const packFiles = await getPackVersionFiles(latestVersion.id);
    const { commands, skills } = extractNamesFromFiles(
      packFiles.map((f) => ({ path: f.path }))
    );

    // Validate namespace against reserved names
    const namespaceValidation = validatePackNamespace({
      slug: pack.slug,
      commands,
      skills,
    });

    if (!namespaceValidation.valid) {
      const errorDetails = formatConflictError(namespaceValidation.conflicts);
      logger.warn(
        {
          packSlug: slug,
          conflictCount: namespaceValidation.conflicts.length,
          conflicts: namespaceValidation.conflicts.map((c) => c.name),
          requestId,
        },
        'Pack submission rejected due to namespace conflicts'
      );
      throw Errors.NamespaceValidationError(errorDetails);
    }

    // Rate limit: 5 submissions per 24 hours
    const recentCount = await countRecentSubmissions(userId);
    if (recentCount >= 5) {
      throw Errors.RateLimited('Submission rate limit exceeded. Maximum 5 submissions per 24 hours.');
    }

    // Create submission record
    const submission = await createPackSubmission({
      packId: pack.id,
      submissionNotes: body.submission_notes,
      versionId: latestVersion.id,
    });

    // Update pack status to pending_review
    await updatePackStatus(pack.id, 'pending_review');

    // Send confirmation email (fire and forget - don't block on email failure)
    sendSubmissionReceivedEmail(
      user.email,
      user.name || 'Creator',
      pack.name,
      pack.slug
    ).catch((err) => {
      logger.error({ error: err, packId: pack.id }, 'Failed to send submission confirmation email');
    });

    logger.info(
      { userId, packId: pack.id, submissionId: submission.id, requestId },
      'Pack submitted for review'
    );

    return c.json(
      {
        data: {
          submission_id: submission.id,
          pack_id: pack.id,
          status: 'pending_review',
          submitted_at: submission.submittedAt,
          version: latestVersion.version,
        },
        message: 'Pack submitted for review. You will be notified when a decision is made.',
        request_id: requestId,
      },
      201
    );
  }
);

/**
 * POST /v1/packs/:slug/withdraw
 * Withdraw pending submission
 * @see sdd-pack-submission.md §4.1 POST /v1/packs/:slug/withdraw
 */
packsRouter.post('/:slug/withdraw', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Check ownership
  const isOwner = await isPackOwner(pack.id, userId);
  if (!isOwner) {
    throw Errors.Forbidden('You are not the owner of this pack');
  }

  // Validate pack is in pending_review status
  if (pack.status !== 'pending_review') {
    throw Errors.BadRequest(
      `Cannot withdraw pack in '${pack.status}' status. Only pending_review packs can be withdrawn.`
    );
  }

  // Withdraw submission
  const withdrawn = await withdrawPackSubmission(pack.id);
  if (!withdrawn) {
    throw Errors.BadRequest('No pending submission found to withdraw');
  }

  // Update pack status back to draft
  await updatePackStatus(pack.id, 'draft');

  logger.info(
    { userId, packId: pack.id, submissionId: withdrawn.id, requestId },
    'Pack submission withdrawn'
  );

  return c.json({
    data: {
      submission_id: withdrawn.id,
      pack_id: pack.id,
      status: 'draft',
      withdrawn_at: new Date().toISOString(),
    },
    message: 'Submission withdrawn. Pack returned to draft status.',
    request_id: requestId,
  });
});

/**
 * GET /v1/packs/:slug/review-status
 * Get submission review status
 * @see sdd-pack-submission.md §4.1 GET /v1/packs/:slug/review-status
 */
packsRouter.get('/:slug/review-status', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Check ownership
  const isOwner = await isPackOwner(pack.id, userId);
  if (!isOwner) {
    throw Errors.Forbidden('You are not the owner of this pack');
  }

  // Get latest submission
  const submission = await getLatestPackSubmission(pack.id);

  if (!submission) {
    return c.json({
      data: {
        pack_id: pack.id,
        pack_status: pack.status,
        has_submission: false,
        submission: null,
      },
      request_id: requestId,
    });
  }

  return c.json({
    data: {
      pack_id: pack.id,
      pack_status: pack.status,
      has_submission: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submitted_at: submission.submittedAt,
        submission_notes: submission.submissionNotes,
        reviewed_at: submission.reviewedAt,
        review_notes: submission.reviewNotes,
        rejection_reason: submission.rejectionReason,
      },
    },
    request_id: requestId,
  });
});

/**
 * POST /v1/packs/:slug/validate-namespace
 * Pre-submission validation for namespace conflicts
 * @see sdd-namespace-isolation.md §4.1 Namespace Validation Endpoint
 */
packsRouter.post(
  '/:slug/validate-namespace',
  requireAuth(),
  zValidator('json', validateNamespaceSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const requestId = c.get('requestId');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('You are not the owner of this pack');
    }

    // Use pack slug from manifest if provided, otherwise use the URL slug
    const manifestSlug = body.manifest.slug || slug;

    // Validate namespace
    const validation = validatePackNamespace({
      slug: manifestSlug,
      commands: body.manifest.commands,
      skills: body.manifest.skills,
    });

    logger.info(
      {
        packSlug: slug,
        manifestSlug,
        commandCount: body.manifest.commands?.length || 0,
        skillCount: body.manifest.skills?.length || 0,
        valid: validation.valid,
        conflictCount: validation.conflicts.length,
        requestId,
      },
      'Namespace validation performed'
    );

    return c.json({
      valid: validation.valid,
      conflicts: validation.conflicts,
      warnings: validation.warnings,
      request_id: requestId,
    });
  }
);

/**
 * GET /v1/packs/:slug/versions
 * Get pack versions
 */
packsRouter.get('/:slug/versions', optionalAuth(), async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');

  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  const versions = await getPackVersions(pack.id);

  return c.json({
    data: versions.map((v) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      is_latest: v.isLatest,
      file_count: v.fileCount,
      total_size_bytes: v.totalSizeBytes,
      min_loa_version: v.minLoaVersion,
      max_loa_version: v.maxLoaVersion,
      published_at: v.publishedAt,
      created_at: v.createdAt,
    })),
    request_id: requestId,
  });
});

/**
 * POST /v1/packs/:slug/versions
 * Upload a new version of a pack
 * @see sdd-v2.md §5.1 POST /v1/packs/:slug/versions
 * @see SECURITY-AUDIT-REPORT.md H-001: Rate limiting added
 */
packsRouter.post(
  '/:slug/versions',
  requireAuth(),
  uploadRateLimiter(),
  zValidator('json', createVersionSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const requestId = c.get('requestId');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('You are not the owner of this pack');
    }

    // Check if version already exists
    const existingVersion = await getPackVersion(pack.id, body.version);
    if (existingVersion) {
      throw Errors.Conflict('Version already exists');
    }

    // Validate claude_instructions if present
    // @see prd.md §4.3 CLAUDE.md Fragments (Opportunity 3)
    const claudeInstructions = (body.manifest as Record<string, unknown>).claude_instructions as string | undefined;
    if (claudeInstructions) {
      // Check if file exists in uploaded files
      const instructionFile = body.files.find(f => f.path === claudeInstructions);
      if (!instructionFile) {
        throw Errors.BadRequest(
          `claude_instructions references "${claudeInstructions}" but this file was not included in the upload`
        );
      }

      // Check file size (max 4KB = 4096 bytes)
      const content = Buffer.from(instructionFile.content, 'base64');
      const MAX_CLAUDE_INSTRUCTIONS_SIZE = 4096;
      if (content.length > MAX_CLAUDE_INSTRUCTIONS_SIZE) {
        throw Errors.BadRequest(
          `claude_instructions file "${claudeInstructions}" is ${content.length} bytes, ` +
          `but maximum allowed size is ${MAX_CLAUDE_INSTRUCTIONS_SIZE} bytes (4KB)`
        );
      }

      logger.info(
        { packSlug: slug, claudeInstructions, fileSize: content.length, requestId },
        'claude_instructions validated'
      );
    }

    // Create version
    const version = await createPackVersion({
      packId: pack.id,
      version: body.version,
      changelog: body.changelog,
      manifest: body.manifest,
      minLoaVersion: body.min_loa_version,
      maxLoaVersion: body.max_loa_version,
    });

    // Process and upload files with path validation (L4)
    let totalSizeBytes = 0;
    const fileCount = body.files.length;

    for (const file of body.files) {
      // L4: Validate file path before processing
      const pathResult = generatePackStorageKey(pack.slug, version.version, file.path);
      if (!pathResult.valid || !pathResult.key) {
        throw Errors.BadRequest(`Invalid file path: ${pathResult.error}`);
      }

      // Decode base64 content
      const content = Buffer.from(file.content, 'base64');
      const contentHash = createHash('sha256').update(content).digest('hex');
      const storageKey = pathResult.key;

      // Upload to storage if configured
      if (isStorageConfigured()) {
        await uploadFile(storageKey, content, file.mime_type || 'text/plain');
      }

      // Save file record with validated path
      // Always store base64 content in DB as fallback for when R2 is unavailable
      const validatedPath = validatePath(file.path);
      await addPackFile(
        version.id,
        validatedPath.sanitized || file.path,
        contentHash,
        storageKey,
        content.length,
        file.mime_type,
        file.content // Store original base64 content as DB fallback
      );

      totalSizeBytes += content.length;
    }

    // Update version stats
    await updatePackVersionStats(version.id, fileCount, totalSizeBytes);

    // Auto-publish: Only when the first version is created for a draft pack
    // This removes the manual publish step for new pack creators
    // but doesn't auto-publish packs that were intentionally kept in draft
    // @see https://github.com/0xHoneyJar/loa-constructs/issues/72
    const existingVersions = await getPackVersions(pack.id);
    const isFirstVersion = existingVersions.length === 1;

    if (pack.status === 'draft' && isFirstVersion) {
      try {
        await updatePack(pack.id, { status: 'published' });
        logger.info(
          { packId: pack.id, packSlug: pack.slug, requestId },
          'Pack auto-published on first version upload'
        );
      } catch (err) {
        logger.warn(
          { packId: pack.id, packSlug: pack.slug, requestId, err },
          'Auto-publish failed; pack remains in draft status'
        );
      }
    }

    logger.info(
      {
        userId,
        packId: pack.id,
        versionId: version.id,
        version: body.version,
        fileCount,
        totalSizeBytes,
        requestId,
      },
      'Pack version created'
    );

    return c.json(
      {
        data: {
          id: version.id,
          version: version.version,
          is_latest: version.isLatest,
          file_count: fileCount,
          total_size_bytes: totalSizeBytes,
          published_at: version.publishedAt,
        },
        request_id: requestId,
      },
      201
    );
  }
);

/**
 * POST /v1/packs/:slug/register-repo
 * Register a git repository for a pack. Owner-only.
 * @see sprint.md T1.4: Register-Repo API Endpoint
 */
packsRouter.post(
  '/:slug/register-repo',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      git_url: z.string().url(),
      git_ref: z.string().max(100).optional().default('main'),
    })
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { git_url, git_ref } = c.req.valid('json');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only pack owners can register repositories');
    }

    // Validate URL via GitSyncService
    const { validateGitUrl, cloneRepo, readManifest, GitSyncError } = await import('../services/git-sync.js');

    try {
      await validateGitUrl(git_url);
    } catch (err) {
      if (err instanceof GitSyncError) {
        throw Errors.BadRequest(`Invalid git URL: ${err.message}`);
      }
      throw err;
    }

    // Shallow clone test — verify repo is accessible and has a manifest
    const tmpDir = `/tmp/register-test-${randomUUID()}`;
    try {
      await cloneRepo(git_url, git_ref, tmpDir);
      await readManifest(tmpDir);
    } catch (err) {
      if (err instanceof GitSyncError) {
        throw new AppError('UNPROCESSABLE_ENTITY', err.message, 422);
      }
      throw new AppError('UNPROCESSABLE_ENTITY', 'Repository unreachable or missing manifest', 422);
    } finally {
      const fs = await import('node:fs/promises');
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    // Fetch github_repo_id via GitHub API
    let githubRepoId: number | null = null;
    try {
      const urlParts = new URL(git_url);
      const pathParts = urlParts.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const repo = pathParts[1];
        const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'constructs-network/1.0',
          },
        });
        if (resp.ok) {
          const data = await resp.json() as { id: number };
          githubRepoId = data.id;
        }
      }
    } catch {
      // Non-fatal: github_repo_id is optional, webhook matching falls back to URL
      logger.warn({ git_url }, 'Failed to fetch github_repo_id');
    }

    // Update pack
    const [updated] = await db
      .update(packs)
      .set({
        sourceType: 'git',
        gitUrl: git_url,
        gitRef: git_ref,
        githubRepoId: githubRepoId,
        updatedAt: new Date(),
      })
      .where(eq(packs.id, pack.id))
      .returning();

    logger.info(
      { packId: pack.id, slug, git_url, git_ref, githubRepoId, requestId },
      'Repository registered for pack'
    );

    return c.json({
      data: {
        slug: updated.slug,
        source_type: updated.sourceType,
        git_url: updated.gitUrl,
        git_ref: updated.gitRef,
        updated_at: updated.updatedAt?.toISOString(),
      },
      request_id: requestId,
    });
  }
);

/**
 * POST /v1/packs/:slug/sync
 * Trigger a sync from the registered git repository. Owner-only.
 * @see sprint.md T1.5: Sync API Endpoint
 */
packsRouter.post(
  '/:slug/sync',
  requireAuth(),
  zValidator(
    'json',
    z
      .object({
        git_ref: z.string().max(100).optional(),
      })
      .optional()
      .default({})
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const body = c.req.valid('json');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Must be git-sourced
    if (pack.sourceType !== 'git' || !pack.gitUrl) {
      throw Errors.NotFound('Pack is not git-sourced. Register a repo first.');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only pack owners can trigger sync');
    }

    // Rate limit check: max 10 syncs per pack per hour
    const { checkSyncRateLimit, recordSyncEvent } = await import('../services/sync-rate-limit.js');
    const allowed = await checkSyncRateLimit(pack.id);
    if (!allowed) {
      throw Errors.RateLimited('Max 10 syncs per pack per hour. Try again later.');
    }

    // Use provided ref or fall back to registered ref
    const gitRef = body.git_ref || pack.gitRef || 'main';

    // Run sync
    const { syncFromRepo, GitSyncError } = await import('../services/git-sync.js');

    let syncResult;
    try {
      syncResult = await syncFromRepo(pack.gitUrl, gitRef);
    } catch (err) {
      if (err instanceof GitSyncError) {
        throw new AppError('UNPROCESSABLE_ENTITY', err.message, 422);
      }
      throw err;
    }

    // Single DB transaction: version + files + pack metadata
    await db.transaction(async (tx) => {
      // Clear isLatest on previous versions
      await tx
        .update(packVersions)
        .set({ isLatest: false })
        .where(
          and(
            eq(packVersions.packId, pack.id),
            eq(packVersions.isLatest, true)
          )
        );

      // Create or update pack version
      const [version] = await tx
        .insert(packVersions)
        .values({
          packId: pack.id,
          version: syncResult.version,
          manifest: syncResult.manifest,
          isLatest: true,
          publishedAt: new Date(),
          totalSizeBytes: syncResult.totalSizeBytes,
          fileCount: syncResult.files.length,
        })
        .onConflictDoUpdate({
          target: [packVersions.packId, packVersions.version],
          set: {
            manifest: syncResult.manifest,
            isLatest: true,
            publishedAt: new Date(),
            totalSizeBytes: syncResult.totalSizeBytes,
            fileCount: syncResult.files.length,
          },
        })
        .returning();

      // Delete old files for this version and insert new ones
      await tx
        .delete(packFiles)
        .where(eq(packFiles.versionId, version.id));

      for (const file of syncResult.files) {
        await tx.insert(packFiles).values({
          versionId: version.id,
          path: file.path,
          contentHash: file.contentHash,
          storageKey: `packs/${pack.slug}/${syncResult.version}/${file.path}`,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          content: file.content, // base64 stored directly in DB
        });
      }

      // Update pack metadata
      await tx
        .update(packs)
        .set({
          gitRef: gitRef,
          lastSyncCommit: syncResult.commit,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(packs.id, pack.id));

      // Upsert identity if present
      if (syncResult.identity) {
        const { constructIdentities } = await import('../db/index.js');
        await tx
          .insert(constructIdentities)
          .values({
            packId: pack.id,
            personaYaml: syncResult.identity.personaYaml,
            expertiseYaml: syncResult.identity.expertiseYaml,
            cognitiveFrame: syncResult.identity.cognitiveFrame,
            expertiseDomains: syncResult.identity.expertiseDomains,
            voiceConfig: syncResult.identity.voiceConfig,
            modelPreferences: syncResult.identity.modelPreferences,
          })
          .onConflictDoUpdate({
            target: [constructIdentities.packId],
            set: {
              personaYaml: syncResult.identity.personaYaml,
              expertiseYaml: syncResult.identity.expertiseYaml,
              cognitiveFrame: syncResult.identity.cognitiveFrame,
              expertiseDomains: syncResult.identity.expertiseDomains,
              voiceConfig: syncResult.identity.voiceConfig,
              modelPreferences: syncResult.identity.modelPreferences,
              updatedAt: new Date(),
            },
          });
      }

    });

    // Record sync event for rate limiting (outside transaction — non-critical)
    await recordSyncEvent(pack.id, 'manual').catch((err) => {
      logger.warn({ err, packId: pack.id }, 'Failed to record sync event');
    });

    logger.info(
      {
        packId: pack.id,
        slug,
        version: syncResult.version,
        commit: syncResult.commit,
        fileCount: syncResult.files.length,
        requestId,
      },
      'Pack synced from git'
    );

    return c.json({
      data: {
        slug: pack.slug,
        version: syncResult.version,
        commit: syncResult.commit,
        files_synced: syncResult.files.length,
        total_size_bytes: syncResult.totalSizeBytes,
        synced_at: new Date().toISOString(),
      },
      request_id: requestId,
    });
  }
);

/**
 * GET /v1/packs/:slug/download
 * Download pack files with subscription check and license generation
 * Requires authentication (private beta - internal team only).
 * @see sdd-v2.md §5.1 GET /v1/packs/:slug/download
 * @see sprint-v2.md T14.3: Pack Download with Subscription Check
 * @see sprint-v2.md T14.4: Pack License Generation
 */
packsRouter.get('/:slug/download', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const versionParam = c.req.query('version');
  const userId = c.get('userId'); // May be undefined for unauthenticated requests
  const user = c.get('user'); // May be undefined for unauthenticated requests
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  const tierRequired = pack.tierRequired as SubscriptionTier;
  const isAuthenticated = !!userId;

  // Check pack is published (draft packs require auth + ownership)
  if (pack.status !== 'published') {
    if (!isAuthenticated) {
      throw Errors.NotFound('Pack not found');
    }
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.NotFound('Pack not found');
    }
  }

  // Access control logic
  let canAccess = false;
  let accessReason = '';

  // Free packs: allow unauthenticated access
  if (tierRequired === 'free' && pack.status === 'published') {
    canAccess = true;
    accessReason = isAuthenticated ? 'free_pack' : 'free_pack_anonymous';
  } else if (!isAuthenticated) {
    // Non-free packs require authentication
    throw Errors.Unauthorized('Authentication required to download this pack');
  } else {
    // Authenticated user accessing non-free pack
    const isOwner = await isPackOwner(pack.id, userId);

    // Check if THJ bypass is enabled for this pack
    const [packRecord] = await db
      .select({ thjBypass: packs.thjBypass })
      .from(packs)
      .where(eq(packs.id, pack.id))
      .limit(1);

    const hasThjBypass = packRecord?.thjBypass ?? false;

    // Get user's effective tier
    const effectiveTier = await getEffectiveTier(userId);

    if (isOwner) {
      canAccess = true;
      accessReason = 'owner';
    } else if (hasThjBypass) {
      canAccess = true;
      accessReason = 'thj_bypass';
    } else if (canAccessTier(effectiveTier.tier, tierRequired)) {
      canAccess = true;
      accessReason = 'tier_access';
    }

    // If user cannot access, return 402 Payment Required
    if (!canAccess) {
      logger.info(
        { userId, packSlug: slug, tierRequired, userTier: effectiveTier.tier, requestId },
        'Pack download denied - subscription required'
      );

      return c.json(
        {
          error: {
            code: 'PACK_SUBSCRIPTION_REQUIRED',
            message: `This pack requires a ${tierRequired} subscription`,
            details: {
              pack_slug: slug,
              tier_required: tierRequired,
              user_tier: effectiveTier.tier,
              pricing: {
                pro_monthly: '$29/month',
                pro_annual: '$290/year',
                team_monthly: '$99/month',
                team_annual: '$990/year',
              },
            },
          },
          request_id: requestId,
        },
        402
      );
    }
  }

  // Get version
  let version;
  if (versionParam) {
    version = await getPackVersion(pack.id, versionParam);
    if (!version) {
      throw Errors.NotFound('Version not found');
    }
  } else {
    version = await getLatestPackVersion(pack.id);
    if (!version) {
      throw Errors.NotFound('No versions available');
    }
  }

  // Get files
  const files = await getPackVersionFiles(version.id);

  // Download file contents
  const fileContents: Array<{ path: string; content: string }> = [];

  for (const file of files) {
    try {
      if (isStorageConfigured()) {
        // Try to download from R2 storage
        const content = await downloadFile(file.storageKey);
        fileContents.push({
          path: file.path,
          content: content.toString('base64'),
        });
      } else if (file.content) {
        // Fallback: use content stored directly in database (already base64)
        fileContents.push({
          path: file.path,
          content: file.content,
        });
      } else {
        // No storage and no DB content - skip file
        logger.warn(
          { path: file.path },
          'File has no content in storage or database'
        );
      }
    } catch (error) {
      // R2 failed, try DB fallback
      if (file.content) {
        fileContents.push({
          path: file.path,
          content: file.content,
        });
      } else {
        logger.warn(
          { error, path: file.path, storageKey: file.storageKey },
          'Failed to download file and no DB fallback'
        );
      }
    }
  }

  // Generate license (anonymous for unauthenticated, user-specific otherwise)
  let license;
  if (isAuthenticated) {
    const effectiveTier = await getEffectiveTier(userId);
    license = await generatePackLicense(
      userId,
      user.email,
      pack.slug,
      version.version,
      effectiveTier.tier,
      effectiveTier.expiresAt
    );
  } else {
    // Anonymous license for free packs (no IP tracking for privacy)
    license = await generateAnonymousPackLicense(pack.slug, version.version);
  }

  // Track installation (userId may be null for anonymous)
  await trackPackInstallation(
    pack.id,
    version.id,
    userId || null,
    null,
    'install',
    { access_reason: accessReason, anonymous: !isAuthenticated },
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    c.req.header('user-agent')
  );

  // Track download attribution for revenue sharing (only for authenticated users on premium packs)
  if (isAuthenticated && tierRequired !== 'free') {
    await trackDownloadAttribution(pack.id, userId, version.id, 'install');
  }

  logger.info(
    {
      userId: userId || 'anonymous',
      packId: pack.id,
      version: version.version,
      fileCount: fileContents.length,
      accessReason,
      requestId,
    },
    'Pack downloaded'
  );

  // Build response — add git metadata when source_type is 'git'
  const packData: Record<string, unknown> = {
    name: pack.name,
    slug: pack.slug,
    version: version.version,
    manifest: version.manifest,
    files: fileContents,
  };

  if (pack.sourceType === 'git') {
    packData.source_type = 'git';
    packData.git_url = pack.gitUrl;
    packData.git_ref = pack.gitRef;
    packData.last_synced_at = pack.lastSyncedAt?.toISOString() || null;
  }

  return c.json({
    data: {
      pack: packData,
      license: {
        token: license.token,
        expires_at: license.expiresAt.toISOString(),
        watermark: license.watermark,
      },
    },
    request_id: requestId,
  });
});

// --- Pack License Generation ---

/**
 * Generate a license token for pack download
 * @see sprint-v2.md T14.4: Pack License Generation
 */
async function generatePackLicense(
  userId: string,
  userEmail: string,
  packSlug: string,
  version: string,
  tier: SubscriptionTier,
  subscriptionEndDate: Date | null
): Promise<{ token: string; expiresAt: Date; watermark: string }> {
  const { SignJWT } = await import('jose');

  // Determine expiry date
  let expiresAt: Date;
  if (subscriptionEndDate && tier !== 'free') {
    // Paid subscription: license valid until subscription end + 7 day grace period
    expiresAt = new Date(subscriptionEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    // Free tier or no subscription end: 30 days from now
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  // Generate watermark from user email for tracking
  const watermark = createHash('sha256')
    .update(`${userId}:${userEmail}:${Date.now()}`)
    .digest('hex')
    .substring(0, 32);

  // Get RS256 signing credentials (throws if not configured)
  // @see sdd-pack-license-rs256.md §3.2
  const { key, algorithm, keyId } = await getRS256SigningCredentials();

  // Create JWT payload
  const payload = {
    type: 'pack',
    pack: packSlug,
    version,
    user_id: userId,
    tier,
    watermark,
  };

  // Build header with kid for key rotation support
  const header: JWTHeaderParameters = {
    alg: algorithm,
    typ: 'JWT',
    kid: keyId,
  };

  // Sign token with RS256
  const token = await new SignJWT(payload)
    .setProtectedHeader(header)
    .setIssuedAt()
    .setIssuer('https://api.constructs.network')
    .setAudience('loa-constructs-client')
    .setExpirationTime(expiresAt)
    .sign(key);

  logger.info(
    { userId, packSlug, version, tier, watermark, expiresAt, algorithm, keyId },
    'Pack license generated'
  );

  return { token, expiresAt, watermark };
}

/**
 * Generate an anonymous license token for free pack downloads
 * Used when users download free packs without authentication
 * @see issue #54: Free packs require authentication
 * @see H-003: Privacy fix - no IP tracking in watermarks
 */
async function generateAnonymousPackLicense(
  packSlug: string,
  version: string
): Promise<{ token: string; expiresAt: Date; watermark: string }> {
  const { SignJWT } = await import('jose');

  // Anonymous licenses are valid for 7 days (shorter than authenticated)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Generate watermark using random session ID (no IP tracking for privacy/GDPR)
  // Uses crypto.randomUUID() + timestamp for uniqueness without PII
  const sessionId = randomUUID();
  const watermark = createHash('sha256')
    .update(`anonymous:${sessionId}:${Date.now()}`)
    .digest('hex')
    .substring(0, 32);

  // Get RS256 signing credentials (throws if not configured)
  // @see sdd-pack-license-rs256.md §3.3
  const { key, algorithm, keyId } = await getRS256SigningCredentials();

  // Create JWT payload (maintains anonymous fields)
  const payload = {
    type: 'pack',
    pack: packSlug,
    version,
    user_id: 'anonymous',
    tier: 'free' as const,
    watermark,
    anonymous: true,
  };

  // Build header with kid for key rotation support
  const header: JWTHeaderParameters = {
    alg: algorithm,
    typ: 'JWT',
    kid: keyId,
  };

  // Sign token with RS256
  const token = await new SignJWT(payload)
    .setProtectedHeader(header)
    .setIssuedAt()
    .setIssuer('https://api.constructs.network')
    .setAudience('loa-constructs-client')
    .setExpirationTime(expiresAt)
    .sign(key);

  logger.info(
    { packSlug, version, watermark, expiresAt, anonymous: true, algorithm, keyId },
    'Anonymous pack license generated'
  );

  return { token, expiresAt, watermark };
}

// --- Review Endpoints ---

/**
 * POST /v1/packs/:slug/reviews
 * Create a review for a construct. One review per user per pack.
 * @see sprint.md T2.2: Review API Endpoints
 */
packsRouter.post(
  '/:slug/reviews',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().max(200).optional(),
      body: z.string().max(5000).optional(),
    })
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { rating, title, body } = c.req.valid('json');

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Cannot review own pack
    const isOwner = await isPackOwner(pack.id, userId);
    if (isOwner) {
      throw Errors.Forbidden('Cannot review your own construct');
    }

    const { createReview, getUserReview } = await import('../services/reviews.js');

    // Check for existing review
    const existing = await getUserReview(pack.id, userId);
    if (existing) {
      throw new AppError('CONFLICT', 'You have already reviewed this construct', 409);
    }

    let review;
    try {
      review = await createReview({
        packId: pack.id,
        userId,
        rating,
        title,
        body,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_REVIEW') {
        throw new AppError('CONFLICT', 'You have already reviewed this construct', 409);
      }
      throw err;
    }

    logger.info({ packId: pack.id, slug, userId, rating, requestId }, 'Review created');

    return c.json({ data: review, request_id: requestId }, 201);
  }
);

/**
 * GET /v1/packs/:slug/reviews
 * List reviews for a construct. Public endpoint.
 * @see sprint.md T2.2: Review API Endpoints
 */
packsRouter.get('/:slug/reviews', async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');
  const sort = (c.req.query('sort') || 'newest') as 'newest' | 'highest' | 'lowest';
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  const { getPackReviews } = await import('../services/reviews.js');
  const { reviews, total } = await getPackReviews(pack.id, { sort, limit, offset });

  return c.json({
    data: reviews,
    pagination: { total, limit, offset },
    request_id: requestId,
  });
});

/**
 * PATCH /v1/packs/:slug/reviews/:reviewId/respond
 * Add author response to a review. Pack owner only.
 * @see sprint.md T2.2: Review API Endpoints
 */
packsRouter.patch(
  '/:slug/reviews/:reviewId/respond',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      response: z.string().max(5000),
    })
  ),
  async (c) => {
    const slug = c.req.param('slug');
    const reviewId = c.req.param('reviewId');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { response } = c.req.valid('json');

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Only pack owner can respond
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only pack owners can respond to reviews');
    }

    const { addAuthorResponse } = await import('../services/reviews.js');
    const updated = await addAuthorResponse(reviewId, pack.id, response);

    logger.info({ packId: pack.id, reviewId, requestId }, 'Author response added');

    return c.json({ data: updated, request_id: requestId });
  }
);

// ── Construct Lifecycle endpoints (cycle-032) ──────────────────

/**
 * GET /packs/:slug/hash — Content hash for divergence detection
 * @see sdd.md §6.1 GET /v1/packs/:slug/hash
 */
packsRouter.get(
  '/:slug/hash',
  optionalAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const requestId = randomUUID();

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    const latestVersion = await getLatestPackVersion(pack.id);
    if (!latestVersion) {
      throw Errors.NotFound('No published version found');
    }

    // Compute content hash from version files
    const files = await getPackVersionFiles(latestVersion.id);
    const hashInput = files
      .map((f) => `${f.path}:${createHash('sha256').update(f.content || '').digest('hex')}`)
      .sort()
      .join('\n');
    const contentHash = `sha256:${createHash('sha256').update(hashInput).digest('hex')}`;

    return c.json({
      data: {
        slug,
        version: latestVersion.version,
        hash: contentHash,
      },
      request_id: requestId,
    });
  }
);

/**
 * GET /packs/:slug/permissions — Check user permissions for a pack
 * @see sdd.md §6.2 GET /v1/packs/:slug/permissions
 */
packsRouter.get(
  '/:slug/permissions',
  requireAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId' as never) as string;
    const requestId = randomUUID();

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    const ownerCheck = await isPackOwner(pack.id, userId);

    return c.json({
      data: {
        slug,
        permissions: {
          is_owner: ownerCheck,
          can_publish: ownerCheck,
          can_fork: true, // All authenticated users can fork
        },
      },
      request_id: requestId,
    });
  }
);

/**
 * POST /packs/fork — Fork a pack as a scoped variant
 * @see sdd.md §6.3 POST /v1/packs/fork
 */
packsRouter.post(
  '/fork',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      source_slug: z.string().min(1),
      new_slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
      description: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const userEmail = c.get('userEmail' as never) as string;
    const requestId = randomUUID();

    // Require email verification
    if (!userEmail) {
      throw Errors.Forbidden('Email verification required to fork packs');
    }

    const { source_slug, new_slug, description } = c.req.valid('json' as never) as {
      source_slug: string;
      new_slug: string;
      description?: string;
    };

    // Check source exists
    const sourcePack = await getPackBySlug(source_slug);
    if (!sourcePack) {
      throw Errors.NotFound('Source pack not found');
    }

    // Check new slug is available
    const slugAvailable = await isSlugAvailable(new_slug);
    if (!slugAvailable) {
      throw new AppError('SLUG_TAKEN', `Slug '${new_slug}' is already taken`, 409);
    }

    // Create forked pack
    await createPack({
      name: `${sourcePack.name} (fork)`,
      slug: new_slug,
      description: description || sourcePack.description || undefined,
      ownerId: userId,
      ownerType: 'user',
    });

    logger.info({ sourceSlug: source_slug, newSlug: new_slug, userId, requestId }, 'Pack forked');

    return c.json(
      {
        data: {
          slug: new_slug,
          source_slug,
          version: '0.1.0',
          status: 'created',
        },
        request_id: requestId,
      },
      201
    );
  }
);

