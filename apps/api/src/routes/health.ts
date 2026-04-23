import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';

/**
 * Health routes — liveness + readiness (SDD §3.4)
 *
 * /v1/health       — liveness (process up). No DB touch. Always 200.
 * /v1/health/ready — readiness (DB reachable). Executes SELECT 1. 200 or 503.
 */

const startupTime = Date.now();

export const health = new Hono();

health.get('/', (c) =>
  c.json({
    status: 'ok',
    uptime_seconds: Math.floor((Date.now() - startupTime) / 1000),
    request_id: c.get('requestId'),
  })
);

health.get('/ready', async (c) => {
  const started = Date.now();
  try {
    await db.run(sql`SELECT 1`);
    return c.json({
      status: 'ok',
      db: { latency_ms: Date.now() - started },
      request_id: c.get('requestId'),
    });
  } catch (err) {
    logger.error({ err }, 'readiness-probe db query failed');
    return c.json(
      {
        status: 'db_unreachable',
        db: {
          error: err instanceof Error ? err.message : 'unknown',
        },
        request_id: c.get('requestId'),
      },
      503
    );
  }
});
