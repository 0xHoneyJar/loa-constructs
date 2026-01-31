/**
 * Constructs Routes
 * Unified discovery endpoint for skills and packs
 * @see prd-constructs-api.md FR-1: Constructs Endpoint
 * @see sdd-constructs-api.md §7 Route Implementation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { optionalAuth } from '../middleware/auth.js';
import { skillsRateLimiter } from '../middleware/rate-limiter.js';
import {
  listConstructs,
  getConstructBySlug,
  getConstructsSummary,
  constructExists,
  type Construct,
  type ConstructManifest,
} from '../services/constructs.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

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
    skills: m.skills?.map((s: { name: string }) => s.name) || [],
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
 * GET /v1/constructs/debug
 * Debug endpoint for diagnosing query issues (TEMPORARY)
 */
constructsRouter.get('/debug', async (c) => {
  const requestId = c.get('requestId');

  try {
    // Import db directly for raw queries
    const { db, packs, packVersions, skills, skillVersions } = await import('../db/index.js');
    const { eq, and } = await import('drizzle-orm');

    // Test 1: Simple pack count
    const packCount = await db
      .select({ count: packs.id })
      .from(packs)
      .where(eq(packs.status, 'published'));

    // Test 2: Simple pack query
    const simplePacks = await db
      .select({ slug: packs.slug, name: packs.name, status: packs.status })
      .from(packs)
      .limit(5);

    // Test 3: Pack with join
    const packsWithJoin = await db
      .select()
      .from(packs)
      .leftJoin(
        packVersions,
        and(eq(packVersions.packId, packs.id), eq(packVersions.isLatest, true))
      )
      .where(eq(packs.status, 'published'))
      .limit(2);

    // Test 4: Skills count
    const skillCount = await db
      .select({ count: skills.id })
      .from(skills)
      .where(eq(skills.isPublic, true));

    return c.json({
      request_id: requestId,
      tests: {
        pack_count: packCount.length,
        simple_packs: simplePacks,
        packs_with_join: packsWithJoin.map(p => ({
          pack_slug: p.packs?.slug,
          pack_name: p.packs?.name,
          pack_status: p.packs?.status,
          version: p.pack_versions?.version,
        })),
        skill_count: skillCount.length,
      },
    });
  } catch (error) {
    const err = error as Error;
    return c.json({
      request_id: requestId,
      error: err.message,
      stack: err.stack,
    }, 500);
  }
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
