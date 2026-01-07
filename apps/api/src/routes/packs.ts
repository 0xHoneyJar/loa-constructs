/**
 * Packs Routes
 * @see sdd-v2.md §5.1 Pack Endpoints
 * @see sprint-v2.md T13.4: Pack CRUD API
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  createPack,
  getPackBySlug,
  updatePack,
  listPacks,
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
import { sendSubmissionReceivedEmail } from '../services/email.js';
import {
  uploadFile,
  downloadFile,
  isStorageConfigured,
} from '../services/storage.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { createHash } from 'crypto';
import { skillsRateLimiter } from '../middleware/rate-limiter.js';
import { validatePath, generatePackStorageKey } from '../lib/security.js';
import { getEffectiveTier, canAccessTier, type SubscriptionTier } from '../services/subscription.js';
import { db, packs } from '../db/index.js';
import { eq } from 'drizzle-orm';

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

const listPacksSchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  per_page: z.coerce.number().int().positive().max(100).optional(),
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

/**
 * GET /v1/packs
 * List packs with search, filter, pagination
 * @see sdd-v2.md §5.1 GET /v1/packs
 */
packsRouter.get('/', optionalAuth(), zValidator('query', listPacksSchema), async (c) => {
  try {
    const query = c.req.valid('query');
    const requestId = c.get('requestId');

    logger.info({ request_id: requestId, msg: 'Listing packs - start' });

    const result = await listPacks({
      query: query.q,
      tag: query.tag,
      featured: query.featured,
      page: query.page,
      limit: query.per_page,
    });

    logger.info(
      { request_id: requestId, query: query.q, total: result.total, page: result.page },
      'Packs listed'
    );

    return c.json({
      data: result.packs.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        tier_required: p.tierRequired,
        pricing_type: p.pricingType,
        downloads: p.downloads,
        is_featured: p.isFeatured,
        rating:
          p.ratingCount && p.ratingCount > 0
            ? (p.ratingSum || 0) / p.ratingCount
            : null,
        created_at: p.createdAt,
      })),
      pagination: {
        page: result.page,
        per_page: result.limit,
        total: result.total,
      },
      request_id: requestId,
    });
  } catch (error) {
    logger.error({ error, stack: error instanceof Error ? error.stack : undefined }, 'Packs list error');
    throw error;
  }
});

/**
 * GET /v1/packs/:slug
 * Get pack details
 */
packsRouter.get('/:slug', optionalAuth(), async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');

  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Get latest version
  const latestVersion = await getLatestPackVersion(pack.id);

  logger.info({ request_id: requestId, slug }, 'Pack retrieved');

  return c.json({
    data: {
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      description: pack.description,
      long_description: pack.longDescription,
      tier_required: pack.tierRequired,
      pricing_type: pack.pricingType,
      stripe_product_id: pack.stripeProductId,
      downloads: pack.downloads,
      is_featured: pack.isFeatured,
      status: pack.status,
      rating:
        pack.ratingCount && pack.ratingCount > 0
          ? (pack.ratingSum || 0) / pack.ratingCount
          : null,
      rating_count: pack.ratingCount,
      latest_version: latestVersion
        ? {
            version: latestVersion.version,
            changelog: latestVersion.changelog,
            file_count: latestVersion.fileCount,
            total_size_bytes: latestVersion.totalSizeBytes,
            published_at: latestVersion.publishedAt,
          }
        : null,
      repository_url: pack.repositoryUrl,
      homepage_url: pack.homepageUrl,
      documentation_url: pack.documentationUrl,
      created_at: pack.createdAt,
      updated_at: pack.updatedAt,
    },
    request_id: requestId,
  });
});

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
 */
packsRouter.post(
  '/:slug/submit',
  requireAuth(),
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
 */
packsRouter.post(
  '/:slug/versions',
  requireAuth(),
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
      const validatedPath = validatePath(file.path);
      await addPackFile(
        version.id,
        validatedPath.sanitized || file.path,
        contentHash,
        storageKey,
        content.length,
        file.mime_type
      );

      totalSizeBytes += content.length;
    }

    // Update version stats
    await updatePackVersionStats(version.id, fileCount, totalSizeBytes);

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
 * GET /v1/packs/:slug/download
 * Download pack files with subscription check and license generation
 * @see sdd-v2.md §5.1 GET /v1/packs/:slug/download
 * @see sprint-v2.md T14.3: Pack Download with Subscription Check
 * @see sprint-v2.md T14.4: Pack License Generation
 */
packsRouter.get('/:slug/download', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const versionParam = c.req.query('version');
  const userId = c.get('userId');
  const user = c.get('user');
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Check pack is published
  if (pack.status !== 'published') {
    // Allow owner to download draft packs
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.NotFound('Pack not found');
    }
  }

  // T14.3: Check subscription/access for non-free packs
  const isOwner = await isPackOwner(pack.id, userId);
  const tierRequired = pack.tierRequired as SubscriptionTier;

  // Check if THJ bypass is enabled for this pack
  const [packRecord] = await db
    .select({ thjBypass: packs.thjBypass })
    .from(packs)
    .where(eq(packs.id, pack.id))
    .limit(1);

  const hasThjBypass = packRecord?.thjBypass ?? false;

  // Get user's effective tier
  const effectiveTier = await getEffectiveTier(userId);

  // Determine if user can access the pack
  let canAccess = false;
  let accessReason = '';

  if (tierRequired === 'free') {
    // Free packs: allow all authenticated users
    canAccess = true;
    accessReason = 'free_pack';
  } else if (isOwner) {
    // Pack owner can always download their own packs
    canAccess = true;
    accessReason = 'owner';
  } else if (hasThjBypass) {
    // THJ bypass allows all authenticated users
    canAccess = true;
    accessReason = 'thj_bypass';
  } else if (canAccessTier(effectiveTier.tier, tierRequired)) {
    // User's tier grants access
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

  // T14.4: Generate pack license
  const license = await generatePackLicense(
    userId,
    user.email,
    pack.slug,
    version.version,
    effectiveTier.tier,
    effectiveTier.expiresAt
  );

  // Track installation
  await trackPackInstallation(
    pack.id,
    version.id,
    userId,
    null,
    'install',
    { access_reason: accessReason },
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    c.req.header('user-agent')
  );

  // Track download attribution for revenue sharing (Sprint 25)
  // This tracks downloads for premium packs only
  await trackDownloadAttribution(pack.id, userId, version.id, 'install');

  logger.info(
    {
      userId,
      packId: pack.id,
      version: version.version,
      fileCount: fileContents.length,
      accessReason,
      requestId,
    },
    'Pack downloaded'
  );

  return c.json({
    data: {
      pack: {
        name: pack.name,
        slug: pack.slug,
        version: version.version,
        manifest: version.manifest,
        files: fileContents,
      },
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

  // Get JWT secret
  const { env } = await import('../config/env.js');
  const secret = new TextEncoder().encode(env.JWT_SECRET || 'development-secret-at-least-32-chars');

  // Create JWT payload
  const payload = {
    type: 'pack',
    pack: packSlug,
    version,
    user_id: userId,
    tier,
    watermark,
  };

  // Sign token
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('https://api.constructs.network')
    .setAudience('loa-constructs-client')
    .setExpirationTime(expiresAt)
    .sign(secret);

  logger.info(
    { userId, packSlug, version, tier, watermark, expiresAt },
    'Pack license generated'
  );

  return { token, expiresAt, watermark };
}

