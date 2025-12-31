import type { MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger.js';

/**
 * Request logging middleware
 * @see sdd.md §6.4 Logging Strategy - Structured Logging Format
 */
export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    const requestId = c.get('requestId') || 'unknown';

    await next();

    const duration = Date.now() - start;

    logger.info({
      request_id: requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: duration,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      user_agent: c.req.header('user-agent') || 'unknown',
    });
  };
};
