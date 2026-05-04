import { Hono } from 'hono';
import { asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';

/**
 * /v1/categories — navigation taxonomy (SDD §3.1)
 *
 * SDD §12 open question: keep or delete? Default: keep. Re-evaluated at
 * T1.11 ui-smoke — if UI doesn't read, drop in follow-up cleanup.
 */

export const categoriesRouter = new Hono();

categoriesRouter.get('/', async (c) => {
  const rows = await db.select().from(categories).orderBy(asc(categories.sort_order));

  return c.json({
    data: rows,
    request_id: c.get('requestId'),
  });
});
