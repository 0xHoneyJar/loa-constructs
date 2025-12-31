import type { MiddlewareHandler } from 'hono';

/**
 * Request ID middleware
 * Generates a unique request ID for tracing and logging
 */
export const requestId = (): MiddlewareHandler => {
  return async (c, next) => {
    // Use provided X-Request-ID or generate new one
    const reqId = c.req.header('X-Request-ID') || crypto.randomUUID();
    c.set('requestId', reqId);
    c.header('X-Request-ID', reqId);
    await next();
  };
};
