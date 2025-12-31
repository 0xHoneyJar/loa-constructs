/**
 * Audit Log Routes
 * @see sprint.md T11.2: Audit Logging
 * @see sdd.md §5.7 Audit Endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import {
  queryAuditLogs,
  getUserAuditLogs,
  getTeamAuditLogs,
  type AuditAction,
  type ResourceType,
} from '../services/audit.js';
import { isTeamAdmin } from '../services/team.js';

// --- Schemas ---

const auditQuerySchema = z.object({
  action: z.string().optional(),
  resourceType: z.enum(['user', 'team', 'subscription', 'skill', 'api_key', 'invitation', 'sso_config']).optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// --- Routes ---

const auditRouter = new Hono();

// Apply auth middleware to all routes
auditRouter.use('*', requireAuth());

/**
 * GET /v1/audit/me
 * Get audit logs for the current user
 */
auditRouter.get('/me', zValidator('query', auditQuerySchema), async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const { startDate, endDate, limit, offset } = c.req.valid('query');

  const result = await getUserAuditLogs(userId, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
    offset,
  });

  logger.debug({ userId, count: result.logs.length, requestId }, 'User audit logs fetched');

  return c.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
  });
});

/**
 * GET /v1/audit/teams/:teamId
 * Get audit logs for a team (admin/owner only)
 */
auditRouter.get('/teams/:teamId', zValidator('query', auditQuerySchema), async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const { startDate, endDate, limit, offset } = c.req.valid('query');

  // Check if user is team admin
  const isAdmin = await isTeamAdmin(teamId, userId);
  if (!isAdmin) {
    throw Errors.Forbidden('Only team admins can view team audit logs');
  }

  const result = await getTeamAuditLogs(teamId, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
    offset,
  });

  logger.debug({ teamId, userId, count: result.logs.length, requestId }, 'Team audit logs fetched');

  return c.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
  });
});

/**
 * GET /v1/audit/admin
 * Get all audit logs (admin only - requires admin middleware)
 * Note: This endpoint is for future admin panel integration
 */
auditRouter.get('/admin', zValidator('query', auditQuerySchema), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  const { action, resourceType, resourceId, startDate, endDate, limit, offset } = c.req.valid('query');

  // Check if user is system admin (tier === 'admin' or special flag)
  // For now, only allow users with specific admin role
  // This will be expanded with proper RBAC in admin panel task
  if (user.tier !== 'enterprise') {
    throw Errors.Forbidden('Admin access required');
  }

  const result = await queryAuditLogs({
    action: action as AuditAction,
    resourceType: resourceType as ResourceType,
    resourceId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
    offset,
  });

  logger.info({ userId: user.id, count: result.logs.length, requestId }, 'Admin audit logs fetched');

  return c.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
  });
});

export { auditRouter };
