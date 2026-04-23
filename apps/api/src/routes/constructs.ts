import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { packs, skills, type Pack, type Skill } from '../db/schema.js';
import { statsRateLimiter } from '../middleware/rate-limiter.js';

/**
 * /v1/constructs — unified registry surface (SDD §3.1)
 *
 * GET  /v1/constructs            → list + search + sort
 * GET  /v1/constructs/summary    → top-10 by downloads/views + recent
 * GET  /v1/constructs/:slug      → pack detail + embedded skills
 * POST /v1/constructs/:slug/view     → increment view_count (rate-limited)
 * POST /v1/constructs/:slug/download → increment download_count (rate-limited)
 */

export const constructsRouter = new Hono();

const listQuerySchema = z.object({
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['downloads', 'views', 'updated']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'slug must be [a-z0-9-]+'),
});

const VISIBLE_LIST = ['public', 'internal'] as const;

/**
 * GET /v1/constructs
 */
constructsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { per_page, page, q, category, sort, order } = c.req.valid('query');

  const conditions: SQL[] = [inArray(packs.visibility, VISIBLE_LIST as unknown as string[])];

  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${packs.name}) like ${pattern}`,
        sql`lower(${packs.description}) like ${pattern}`
      ) as SQL
    );
  }

  if (category) {
    conditions.push(eq(packs.category, category));
  }

  const whereClause = and(...conditions);

  const sortColumn =
    sort === 'downloads'
      ? packs.download_count
      : sort === 'views'
      ? packs.view_count
      : packs.updated_at;
  const orderBy = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(packs)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(per_page)
      .offset((page - 1) * per_page),
    db.select({ n: sql<number>`count(*)` }).from(packs).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / per_page);

  return c.json({
    data: rows,
    pagination: { page, per_page, total, total_pages: totalPages },
    request_id: c.get('requestId'),
  });
});

/**
 * GET /v1/constructs/summary
 */
constructsRouter.get('/summary', async (c) => {
  const visibleWhere = inArray(packs.visibility, VISIBLE_LIST as unknown as string[]);

  const [topDownloads, topViews, recent] = await Promise.all([
    db.select().from(packs).where(visibleWhere).orderBy(desc(packs.download_count)).limit(10),
    db.select().from(packs).where(visibleWhere).orderBy(desc(packs.view_count)).limit(10),
    db.select().from(packs).where(visibleWhere).orderBy(desc(packs.updated_at)).limit(10),
  ]);

  return c.json({
    data: {
      top_downloads: topDownloads,
      top_views: topViews,
      recent,
    },
    request_id: c.get('requestId'),
  });
});

/**
 * GET /v1/constructs/:slug
 */
constructsRouter.get('/:slug', zValidator('param', slugParamSchema), async (c) => {
  const { slug } = c.req.valid('param');

  const packRow = (await db.select().from(packs).where(eq(packs.slug, slug)).limit(1))[0];
  if (!packRow) {
    return c.json(
      {
        error: { code: 'NOT_FOUND', message: 'Pack not found' },
        request_id: c.get('requestId'),
      },
      404
    );
  }

  if (!VISIBLE_LIST.includes(packRow.visibility as (typeof VISIBLE_LIST)[number])) {
    return c.json(
      {
        error: { code: 'NOT_FOUND', message: 'Pack not found' },
        request_id: c.get('requestId'),
      },
      404
    );
  }

  const packSkills = await db
    .select()
    .from(skills)
    .where(eq(skills.pack_id, packRow.id))
    .orderBy(asc(skills.name));

  return c.json({
    data: { ...packRow, skills: packSkills as Skill[] } as Pack & { skills: Skill[] },
    request_id: c.get('requestId'),
  });
});

/**
 * POST /v1/constructs/:slug/view — atomic increment, rate-limited per (IP, slug)
 */
constructsRouter.post(
  '/:slug/view',
  statsRateLimiter('view'),
  zValidator('param', slugParamSchema),
  async (c) => {
    const { slug } = c.req.valid('param');
    const now = new Date();

    const result = await db
      .update(packs)
      .set({ view_count: sql`${packs.view_count} + 1`, updated_at: now })
      .where(eq(packs.slug, slug))
      .run();

    if (result.rowsAffected === 0) {
      return c.json(
        {
          error: { code: 'NOT_FOUND', message: 'Pack not found' },
          request_id: c.get('requestId'),
        },
        404
      );
    }

    return c.body(null, 204);
  }
);

/**
 * POST /v1/constructs/:slug/download — atomic increment, rate-limited per (IP, slug)
 */
constructsRouter.post(
  '/:slug/download',
  statsRateLimiter('download'),
  zValidator('param', slugParamSchema),
  async (c) => {
    const { slug } = c.req.valid('param');
    const now = new Date();

    const result = await db
      .update(packs)
      .set({ download_count: sql`${packs.download_count} + 1`, updated_at: now })
      .where(eq(packs.slug, slug))
      .run();

    if (result.rowsAffected === 0) {
      return c.json(
        {
          error: { code: 'NOT_FOUND', message: 'Pack not found' },
          request_id: c.get('requestId'),
        },
        404
      );
    }

    return c.body(null, 204);
  }
);
