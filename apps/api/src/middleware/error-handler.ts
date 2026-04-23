import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { captureException, addBreadcrumb } from '../lib/monitoring.js';

/**
 * Global error handler middleware
 * @see sdd.md §6.2 Error Response Format, §6.3 Error Handling Implementation
 */
export const errorHandler = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await next();
    } catch (err) {
      const requestId = (c.get('requestId') as string | undefined) || randomUUID();

      // Handle AppError instances
      // Use duck typing instead of instanceof for bundling compatibility
      const isAppError = err instanceof AppError ||
        (err && typeof err === 'object' && 'code' in err && 'status' in err && 'name' in err && (err as { name: string }).name === 'AppError');

      if (isAppError) {
        const appErr = err as AppError;
        logger.warn({
          request_id: requestId,
          error_code: appErr.code,
          message: appErr.message,
          status: appErr.status,
        });

        return c.json(
          {
            error: {
              code: appErr.code,
              message: appErr.message,
              details: appErr.details,
            },
            request_id: requestId,
          },
          appErr.status as StatusCode
        );
      }

      // Handle unexpected errors
      const message = err instanceof Error ? err.message : 'Unknown error';

      // Capture error in monitoring system
      const eventId = captureException(err, {
        tags: {
          request_id: requestId,
          path: c.req.path,
          method: c.req.method,
        },
        extra: {
          url: c.req.url,
          headers: Object.fromEntries(
            [...c.req.raw.headers.entries()].filter(
              ([k]) => !['authorization', 'cookie', 'x-api-key'].includes(k.toLowerCase())
            )
          ),
        },
      });

      // Add breadcrumb for debugging
      addBreadcrumb({
        type: 'error',
        category: 'request',
        message: `Error in ${c.req.method} ${c.req.path}`,
        data: {
          error: message,
          status: 500,
        },
        level: 'error',
      });

      logger.error({
        request_id: requestId,
        event_id: eventId,
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      });

      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          request_id: requestId,
        },
        500
      );
    }
  };
};
