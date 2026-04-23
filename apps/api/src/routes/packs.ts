import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { packs } from '../db/schema.js';

/**
 * /v1/packs — CLI-compat list of packs (SDD §3.1)
 * Same shape as /v1/constructs but scoped to the pack surface.
 */

export const packsRouter = new Hono();

const listQuerySchema = z.object({
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['downloads', 'views', 'updated']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const VISIBLE_LIST = ['public', 'internal'] as const;

packsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
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

  if (category) conditions.push(eq(packs.category, category));

  const where = and(...conditions);
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
      .where(where)
      .orderBy(orderBy)
      .limit(per_page)
      .offset((page - 1) * per_page),
    db.select({ n: sql<number>`count(*)` }).from(packs).where(where),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  return c.json({
    data: rows,
    pagination: {
      page,
      per_page,
      total,
      total_pages: total === 0 ? 0 : Math.ceil(total / per_page),
    },
    request_id: c.get('requestId'),
  });
});
