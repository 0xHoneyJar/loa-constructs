import { Hono } from 'hono';
import { getAppVersion, type HealthCheckResult } from '../lib/monitoring.js';
import { getRedis, isRedisConfigured } from '../services/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * Health check routes
 * @see sprint.md T1.2: "Add health check endpoint (GET /v1/health)"
 * @see sprint.md T12.6: "Monitoring & Alerting"
 */
const health = new Hono();

// Track startup time - used as proxy for build/deployment time
const startupTime = Date.now();
const BUILD_TIMESTAMP = new Date(startupTime).toISOString();

/**
 * GET /v1/health
 * Basic health check endpoint for load balancers and monitoring.
 *
 * Per SDD §5.4 (cycle constructs-network-migration · T-1.4 acceptance), this
 * endpoint surfaces `db_status` so operators can confirm the cutover landed
 * without hitting the heavier /v1/health/ready check. A failed ping returns
 * 200 with `db_status: 'disconnected'` (the API still serves yaml-sourced
 * read paths even when Postgres is down — readiness probe handles 503).
 *
 * @returns 200 OK with status info
 */
health.get('/', async (c) => {
  let db_status: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  try {
    await db.execute(sql`SELECT 1`);
    db_status = 'connected';
  } catch (error) {
    logger.warn({
      msg: 'Health: database ping failed',
      error: error instanceof Error ? error.message : String(error),
    });
    db_status = 'disconnected';
  }

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    build: BUILD_TIMESTAMP,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    db_status,
  });
});

/**
 * GET /v1/health/ready
 * Readiness check - can this instance serve traffic?
 * Checks database connectivity, cache availability, etc.
 */
health.get('/ready', async (c) => {
  const checks: HealthCheckResult['checks'] = [];

  // Check API is responding
  checks.push({
    name: 'api',
    status: 'pass',
    duration_ms: 0,
  });

  // Check database connectivity
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);

  // Check Redis connectivity
  const redisCheck = await checkRedis();
  checks.push(redisCheck);

  // Determine overall status
  const hasFailure = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warn');

  const overallStatus: HealthCheckResult['status'] = hasFailure
    ? 'unhealthy'
    : hasWarning
      ? 'degraded'
      : 'healthy';

  const result: HealthCheckResult = {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
  };

  return c.json(result, overallStatus === 'unhealthy' ? 503 : 200);
});

/**
 * GET /v1/health/live
 * Liveness check - is this instance alive?
 * Returns 200 if the process is running
 */
health.get('/live', (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    startup_time: new Date(startupTime).toISOString(),
  });
});

/**
 * GET /v1/health/metrics
 * Extended metrics for monitoring dashboards
 */
health.get('/metrics', (c) => {
  const memUsage = process.memoryUsage();

  return c.json({
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    uptime_seconds: Math.round(process.uptime()),
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024),
    },
    // Process fingerprinting data removed — aids reconnaissance (CVE targeting)
  });
});

/**
 * Check database connectivity with a real query
 * Runs SELECT 1 to verify the full connection path through PgBouncer.
 */
async function checkDatabase(): Promise<HealthCheckResult['checks'][0]> {
  const start = performance.now();

  if (!env.DATABASE_URL) {
    return {
      name: 'database',
      status: 'warn',
      message: 'DATABASE_URL not configured',
      duration_ms: Math.round(performance.now() - start),
    };
  }

  try {
    await db.execute(sql`SELECT 1`);
    return {
      name: 'database',
      status: 'pass',
      message: 'Connected',
      duration_ms: Math.round(performance.now() - start),
    };
  } catch (error) {
    logger.warn({
      msg: 'Database health check failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      name: 'database',
      status: 'fail',
      message: `Connection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      duration_ms: Math.round(performance.now() - start),
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheckResult['checks'][0]> {
  const start = performance.now();

  // Check if Redis is configured
  if (!isRedisConfigured()) {
    return {
      name: 'cache',
      status: 'warn',
      message: 'Redis not configured - operating without cache',
      duration_ms: Math.round(performance.now() - start),
    };
  }

  try {
    const redis = getRedis();
    await redis.ping();

    return {
      name: 'cache',
      status: 'pass',
      duration_ms: Math.round(performance.now() - start),
    };
  } catch (error) {
    logger.warn({
      msg: 'Redis health check failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      name: 'cache',
      status: 'warn', // Cache failure is degraded, not unhealthy
      message: 'Cache connection failed - operating in degraded mode',
      duration_ms: Math.round(performance.now() - start),
    };
  }
}

export { health };
