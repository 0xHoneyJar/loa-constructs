import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

/**
 * Request ID middleware — generates a unique request ID for tracing.
 */
export const requestId = (): MiddlewareHandler => {
  return async (c, next) => {
    const reqId = c.req.header('X-Request-ID') || randomUUID();
    c.set('requestId', reqId);
    c.header('X-Request-ID', reqId);
    await next();
  };
};
