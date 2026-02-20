/**
 * Constructs Routes
 * Unified discovery endpoint for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §7 Route Implementation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { randomUUID } from 'crypto';
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
import { isSlugAvailable, createPack } from '../services/packs.js';
import { Errors, AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getRedis, isRedisConfigured } from '../services/redis.js';

// --- Route Instance ---

export const constructsRouter = new Hono();

// Apply rate limiting (reuse skills limiter)
constructsRouter.use('*', skillsRateLimiter());

// --- Schemas ---

const listConstructsSchema = z.object({
  q: z.string().optional(),
  type: z.enum(['skill', 'pack', 'bundle']).optional(),
  tier: z.enum(['free', 'pro', 'team', 'enterprise']).optional(),
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().positive().max(100).optional().default(20),
});

// --- Formatters ---

function formatConstruct(c: Construct) {
  const manifestSummary = c.manifest ? formatManifestSummary(c.manifest) : null;
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    description: c.description,
    version: c.version,
    tier_required: c.tierRequired,
    category: c.category,
    downloads: c.downloads,
    rating: c.rating,
    is_featured: c.isFeatured,
    skills_count: manifestSummary?.skills?.length || 0,
    manifest: manifestSummary,
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
    maturity: c.maturity,
    source_type: c.sourceType,
    created_at: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updated_at: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

function formatConstructDetail(c: Construct) {
  return {
    ...formatConstruct(c),
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
    git_url: c.gitUrl,
    has_identity: c.hasIdentity,
    identity: c.identity
      ? {
          cognitive_frame: c.identity.cognitiveFrame,
          expertise_domains: c.identity.expertiseDomains,
          voice_config: c.identity.voiceConfig,
          model_preferences: c.identity.modelPreferences,
        }
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
  };
}

function formatManifestSummary(m: ConstructManifest) {
  return {
    // Skills may have 'name' or 'slug' depending on manifest format
    skills: m.skills?.map((s: { name?: string; slug?: string }) => s.name || s.slug).filter(Boolean) || [],
    commands: m.commands?.map((c: { name: string }) => c.name) || [],
    dependencies: m.dependencies || {},
  };
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

    const result = await listConstructs({
      query: query.q,
      type: query.type,
      tier: query.tier,
      category: query.category,
      featured: query.featured,
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

// ── Construct Lifecycle endpoints (cycle-032) ──────────────────

/**
 * POST /v1/constructs/register
 * Reserve a construct slug for future publishing
 * @see sdd.md §6.4 POST /v1/constructs/register
 */
constructsRouter.post(
  '/register',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      slug: z
        .string()
        .min(3)
        .max(100)
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens'),
      name: z.string().min(1).max(255),
      type: z.enum(['skill-pack', 'tool-pack', 'codex', 'template']).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const userEmail = c.get('userEmail' as never) as string;
    const requestId = randomUUID();

    // Require email verification
    if (!userEmail) {
      throw Errors.Forbidden('Email verification required to register constructs');
    }

    const body = c.req.valid('json' as never) as { slug: string; name: string; type?: string };

    // Rate limit: 5 registrations per 24h
    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        const key = `construct:register:${userId}`;
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, 86400);
        }
        if (count > 5) {
          throw new AppError('RATE_LIMITED', 'Maximum 5 registrations per 24 hours', 429);
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        // Log but don't block on Redis errors — graceful degradation
        logger.error({ error: err, requestId, userId }, 'Redis rate limit check failed — bypassing');
      }
    }

    // Fast-path check (advisory only — uniqueness enforced by DB constraint)
    const available = await isSlugAvailable(body.slug);
    if (!available) {
      throw new AppError('SLUG_TAKEN', `Slug '${body.slug}' is already taken`, 409);
    }

    // Create the construct entry — DB unique constraint on slug prevents TOCTOU race
    try {
      await createPack({
        name: body.name,
        slug: body.slug,
        description: body.type ? `A ${body.type} construct` : undefined,
        ownerId: userId,
        ownerType: 'user',
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('unique')) {
        throw new AppError('SLUG_TAKEN', `Slug '${body.slug}' is already taken`, 409);
      }
      throw err;
    }

    logger.info({ slug: body.slug, name: body.name, type: body.type, userId, requestId }, 'Construct registered');

    return c.json(
      {
        data: {
          slug: body.slug,
          status: 'reserved',
        },
        request_id: requestId,
      },
      201
    );
  }
);
