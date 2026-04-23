import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { skills, packs } from '../db/schema.js';

/**
 * /v1/skills — CLI-compat list of skills across visible packs (SDD §3.1)
 *
 * Filters skills down to those belonging to packs with visibility=public|internal.
 */

export const skillsRouter = new Hono();

const listQuerySchema = z.object({
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().min(1).max(200).optional(),
  pack_slug: z.string().trim().min(1).max(100).optional(),
});

skillsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { per_page, page, q, pack_slug } = c.req.valid('query');

  const visiblePackIds = db
    .select({ id: packs.id })
    .from(packs)
    .where(sql`${packs.visibility} IN ('public', 'internal')`);

  const conditions: SQL[] = [sql`${skills.pack_id} IN ${visiblePackIds}`];

  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${skills.name}) like ${pattern}`,
        sql`lower(${skills.description}) like ${pattern}`
      ) as SQL
    );
  }

  if (pack_slug) {
    conditions.push(
      sql`${skills.pack_id} = (SELECT ${packs.id} FROM ${packs} WHERE ${packs.slug} = ${pack_slug})`
    );
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(skills)
      .where(where)
      .orderBy(asc(skills.name))
      .limit(per_page)
      .offset((page - 1) * per_page),
    db.select({ n: sql<number>`count(*)` }).from(skills).where(where),
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
