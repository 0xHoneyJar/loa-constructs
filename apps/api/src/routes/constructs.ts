/**
 * Constructs Routes
 * Unified discovery endpoint for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §7 Route Implementation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { skillsRateLimiter } from '../middleware/rate-limiter.js';
import {
  listConstructs,
  getConstructBySlug,
  getConstructsSummary,
  constructExists,
  type Construct,
  type ConstructManifest,
} from '../services/constructs.js';
import {
  getGraduationStatus,
  requestGraduation,
  withdrawGraduationRequest,
  type ConstructType,
} from '../services/graduation.js';
import { db, skills, packs } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// --- Route Instance ---

export const constructsRouter = new Hono();

// Apply rate limiting (reuse skills limiter)
constructsRouter.use('*', skillsRateLimiter());

// --- Schemas ---

const listConstructsSchema = z.object({
  q: z.string().optional(),
  // 'bundle' reserved for future use - framework bundles not yet implemented
  type: z.enum(['skill', 'pack', 'bundle']).optional(),
  tier: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  maturity: z.string().optional(), // Comma-separated: "beta,stable"
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().positive().max(100).optional().default(20),
});

// --- Formatters ---

function formatConstruct(c: Construct) {
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    slug: c.slug,
    description: c.description,
    version: c.version,
    tier_required: c.tierRequired,
    category: c.category,
    downloads: c.downloads,
    rating: c.rating,
    is_featured: c.isFeatured,
    manifest: c.manifest ? formatManifestSummary(c.manifest) : null,
    maturity: c.maturity,
    graduated_at: c.graduatedAt
      ? c.graduatedAt instanceof Date
        ? c.graduatedAt.toISOString()
        : c.graduatedAt
      : null,
    latest_version: c.latestVersion
      ? {
          version: c.latestVersion.version,
          changelog: c.latestVersion.changelog,
          published_at: c.latestVersion.publishedAt
            ? c.latestVersion.publishedAt instanceof Date
              ? c.latestVersion.publishedAt.toISOString()
              : c.latestVersion.publishedAt
            : null,
        }
      : null,
    created_at: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updated_at: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

function formatConstructDetail(c: Construct) {
  const base = formatConstruct(c);
  return {
    ...base,
    long_description: c.longDescription,
    manifest: c.manifest, // Full manifest for detail view
    owner: c.owner
      ? {
          name: c.owner.name,
          type: c.owner.type,
          avatar_url: c.owner.avatarUrl,
        }
      : null,
    repository_url: c.repositoryUrl,
    homepage_url: c.homepageUrl,
    documentation_url: c.documentationUrl,
  };
}

/**
 * Format manifest summary with error handling for malformed manifests
 * @see sdd.md §7.5 Error Handling in formatConstruct
 */
function formatManifestSummary(m: ConstructManifest | null) {
  if (!m) return null;
  try {
    return {
      skills: m.skills?.map((s: { name: string }) => s.name) || [],
      commands: m.commands?.map((c: { name: string }) => c.name) || [],
      dependencies: m.dependencies || {},
    };
  } catch (error) {
    logger.warn({ error }, 'Failed to format manifest summary, returning empty');
    return { skills: [], commands: [], dependencies: {} };
  }
}

// --- Routes ---

/**
 * GET /v1/constructs
 * List all constructs (skills + packs)
 * @see prd-constructs-api.md FR-1.1
 */
constructsRouter.get(
  '/',
  optionalAuth(),
  zValidator('query', listConstructsSchema),
  async (c) => {
    const query = c.req.valid('query');
    const requestId = c.get('requestId');

    // Parse maturity filter from comma-separated string
    const maturityFilter = query.maturity
      ? (query.maturity.split(',').filter((m) =>
          ['experimental', 'beta', 'stable', 'deprecated'].includes(m.trim())
        ) as Array<'experimental' | 'beta' | 'stable' | 'deprecated'>)
      : undefined;

    const result = await listConstructs({
      query: query.q,
      type: query.type,
      tier: query.tier,
      category: query.category,
      featured: query.featured,
      maturity: maturityFilter && maturityFilter.length > 0 ? maturityFilter : undefined,
      page: query.page,
      limit: query.per_page,
    });

    logger.info(
      {
        request_id: requestId,
        query: query.q,
        type: query.type,
        total: result.total,
        page: result.page,
      },
      'Constructs listed'
    );

    return c.json({
      data: result.constructs.map(formatConstruct),
      pagination: {
        page: result.page,
        per_page: result.limit,
        total: result.total,
        total_pages: result.totalPages,
      },
      request_id: requestId,
    });
  }
);

/**
 * GET /v1/constructs/summary
 * Agent-optimized construct listing (minimal tokens)
 * @see prd-constructs-api.md FR-5.1
 */
constructsRouter.get('/summary', async (c) => {
  const requestId = c.get('requestId');

  const result = await getConstructsSummary();

  logger.info(
    { request_id: requestId, total: result.total },
    'Constructs summary fetched'
  );

  return c.json({
    constructs: result.constructs,
    total: result.total,
    last_updated: result.last_updated,
  });
});

/**
 * HEAD /v1/constructs/:slug
 * Check if construct exists
 * @see prd-constructs-api.md FR-5.2
 */
constructsRouter.on('HEAD', '/:slug', async (c) => {
  const slug = c.req.param('slug');

  const exists = await constructExists(slug);

  if (!exists) {
    return c.body(null, 404);
  }

  return c.body(null, 200);
});

/**
 * GET /v1/constructs/:slug
 * Get construct details
 * @see prd-constructs-api.md FR-1.2
 */
constructsRouter.get('/:slug', optionalAuth(), async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');

  const construct = await getConstructBySlug(slug);

  if (!construct) {
    throw Errors.NotFound('Construct');
  }

  logger.info(
    { request_id: requestId, slug, type: construct.type },
    'Construct retrieved'
  );

  return c.json({
    data: formatConstructDetail(construct),
    request_id: requestId,
  });
});

// --- Graduation Schemas ---

const requestGraduationSchema = z.object({
  notes: z.string().max(2000).optional(),
});

// --- Helper Functions ---

/**
 * Look up construct by slug and get type + ID
 */
async function getConstructBySlugWithType(
  slug: string
): Promise<{ type: ConstructType; id: string; ownerId: string; ownerType: string } | null> {
  // Try packs first
  const [pack] = await db
    .select({ id: packs.id, ownerId: packs.ownerId, ownerType: packs.ownerType })
    .from(packs)
    .where(eq(packs.slug, slug))
    .limit(1);

  if (pack) {
    return { type: 'pack', id: pack.id, ownerId: pack.ownerId, ownerType: pack.ownerType };
  }

  // Then try skills
  const [skill] = await db
    .select({ id: skills.id, ownerId: skills.ownerId, ownerType: skills.ownerType })
    .from(skills)
    .where(eq(skills.slug, slug))
    .limit(1);

  if (skill) {
    return { type: 'skill', id: skill.id, ownerId: skill.ownerId, ownerType: skill.ownerType };
  }

  return null;
}

// --- Graduation Routes ---

/**
 * GET /v1/constructs/:slug/graduation-status
 * Get graduation status for a construct
 * @see prd.md §4.2 Graduation Status
 */
constructsRouter.get('/:slug/graduation-status', optionalAuth(), async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');

  const constructInfo = await getConstructBySlugWithType(slug);

  if (!constructInfo) {
    throw Errors.NotFound('Construct');
  }

  const status = await getGraduationStatus(constructInfo.type, constructInfo.id);

  logger.info(
    { request_id: requestId, slug, type: constructInfo.type, maturity: status.currentMaturity },
    'Graduation status retrieved'
  );

  return c.json({
    data: {
      construct_type: status.constructType,
      construct_id: status.constructId,
      current_maturity: status.currentMaturity,
      next_level: status.nextLevel,
      criteria: {
        met: status.criteria.met,
        missing: status.criteria.missing,
      },
      eligible_for_auto_graduation: status.eligibleForAutoGraduation,
      can_request: status.canRequest,
      pending_request: status.pendingRequest
        ? {
            id: status.pendingRequest.id,
            target_maturity: status.pendingRequest.targetMaturity,
            status: status.pendingRequest.status,
            requested_at: status.pendingRequest.requestedAt.toISOString(),
          }
        : null,
    },
    request_id: requestId,
  });
});

/**
 * POST /v1/constructs/:slug/request-graduation
 * Request graduation to next maturity level
 * @see prd.md §4.3 Self-Service Graduation
 */
constructsRouter.post(
  '/:slug/request-graduation',
  requireAuth(),
  zValidator('json', requestGraduationSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const body = c.req.valid('json');

    const constructInfo = await getConstructBySlugWithType(slug);

    if (!constructInfo) {
      throw Errors.NotFound('Construct');
    }

    // Verify ownership
    if (constructInfo.ownerType === 'user' && constructInfo.ownerId !== userId) {
      throw Errors.Forbidden('Only the construct owner can request graduation');
    }

    // Note: Team ownership check would require additional team membership lookup
    // For now, user-owned constructs are checked; team check deferred to route layer

    const result = await requestGraduation(
      constructInfo.type,
      constructInfo.id,
      userId,
      body.notes
    );

    logger.info(
      {
        request_id: requestId,
        slug,
        type: constructInfo.type,
        auto_approved: result.autoApproved,
      },
      'Graduation request created'
    );

    return c.json(
      {
        data: {
          request_id: result.request.id,
          construct_type: result.request.constructType,
          construct_id: result.request.constructId,
          current_maturity: result.request.currentMaturity,
          target_maturity: result.request.targetMaturity,
          status: result.request.status,
          requested_at: result.request.requestedAt.toISOString(),
          auto_approved: result.autoApproved,
        },
        message: result.autoApproved
          ? 'Graduation auto-approved. Construct is now beta.'
          : 'Graduation request submitted for review.',
        request_id: requestId,
      },
      result.autoApproved ? 200 : 201
    );
  }
);

/**
 * DELETE /v1/constructs/:slug/graduation-request
 * Withdraw pending graduation request
 * @see prd.md §4.3 Self-Service Graduation
 */
constructsRouter.delete('/:slug/graduation-request', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  const constructInfo = await getConstructBySlugWithType(slug);

  if (!constructInfo) {
    throw Errors.NotFound('Construct');
  }

  // Verify ownership
  if (constructInfo.ownerType === 'user' && constructInfo.ownerId !== userId) {
    throw Errors.Forbidden('Only the construct owner can withdraw graduation requests');
  }

  const request = await withdrawGraduationRequest(
    constructInfo.type,
    constructInfo.id,
    userId
  );

  logger.info(
    { request_id: requestId, slug, type: constructInfo.type, graduation_request_id: request.id },
    'Graduation request withdrawn'
  );

  return c.json({
    data: {
      request_id: request.id,
      status: request.status,
    },
    message: 'Graduation request withdrawn successfully.',
    request_id: requestId,
  });
});
