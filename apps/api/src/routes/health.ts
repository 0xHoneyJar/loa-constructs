import { Hono } from 'hono';
import { getAppVersion, type HealthCheckResult } from '../lib/monitoring.js';
import { getRedis, isRedisConfigured } from '../services/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/**
 * Health check routes
 * @see sprint.md T1.2: "Add health check endpoint (GET /v1/health)"
 * @see sprint.md T12.6: "Monitoring & Alerting"
 */
const health = new Hono();

// Track startup time
const startupTime = Date.now();

// Build timestamp for debugging deployments
const BUILD_TIMESTAMP = '2026-01-02T10:05:00Z';

/**
 * GET /v1/health
 * Basic health check endpoint for load balancers and monitoring
 *
 * @returns 200 OK with status info
 */
health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    build: BUILD_TIMESTAMP,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
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
    process: {
      pid: process.pid,
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
});

/**
 * Check database connectivity
 * Note: Uses neon serverless driver which doesn't maintain persistent connections
 */
async function checkDatabase(): Promise<HealthCheckResult['checks'][0]> {
  const start = performance.now();

  // Database URL check (actual connection happens on query)
  if (!env.DATABASE_URL) {
    return {
      name: 'database',
      status: 'warn',
      message: 'DATABASE_URL not configured',
      duration_ms: Math.round(performance.now() - start),
    };
  }

  // For Neon serverless, we just verify the URL is configured
  // Actual connections are made per-request
  return {
    name: 'database',
    status: 'pass',
    message: 'Database configured (serverless mode)',
    duration_ms: Math.round(performance.now() - start),
  };
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
