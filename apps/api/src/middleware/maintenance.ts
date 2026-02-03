/**
 * Maintenance Mode Middleware
 * @see sdd-infrastructure-migration.md §4.1 Multi-Layer Write Freeze
 * @see prd-infrastructure-migration.md §5.5 Write-Freeze Mechanism
 *
 * Layer 1 of the multi-layer write freeze for RPO=0 during migration cutover.
 * - Blocks POST/PUT/PATCH/DELETE when MAINTENANCE_MODE=true
 * - Allows GET/HEAD/OPTIONS for read-only operations
 * - Returns 503 with Retry-After header for blocked requests
 */

import { createMiddleware } from 'hono/factory';
import { env } from '../config/env.js';

/**
 * Maintenance mode middleware for write-freeze during migration
 *
 * When MAINTENANCE_MODE=true:
 * - GET, HEAD, OPTIONS requests pass through (read-only)
 * - POST, PUT, PATCH, DELETE return 503 Service Unavailable
 *
 * This is Layer 1 of the multi-layer write freeze. Layer 2 (DB-level REVOKE)
 * should be applied separately during cutover for defense in depth.
 */
export const maintenanceMode = createMiddleware(async (c, next) => {
  // Check if maintenance mode is enabled via environment variable
  if (env.MAINTENANCE_MODE !== 'true') {
    return next();
  }

  // Allow read operations
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Block write operations with 503 + Retry-After
  return c.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'System maintenance in progress. Please retry in 5 minutes.',
        docs_url: 'https://docs.constructs.network/maintenance',
      },
      request_id: c.get('requestId'),
    },
    503,
    {
      'Retry-After': '300',
    }
  );
});
