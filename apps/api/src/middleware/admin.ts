/**
 * Admin Middleware
 * @see sprint-v2.md T15.5: Admin API
 */

import type { MiddlewareHandler } from 'hono';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Admin roles that have access to admin endpoints
 */
const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Middleware to require admin role
 * Must be used after requireAuth() middleware
 */
export const requireAdmin = (): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    const userId = c.get('userId');
    const requestId = c.get('requestId');

    if (!user || !userId) {
      throw Errors.Unauthorized('Authentication required');
    }

    // Check if user has admin role
    const userRole = user.role || 'user';

    if (!ADMIN_ROLES.includes(userRole)) {
      logger.warn(
        { userId, userRole, requestId, path: c.req.path },
        'Admin access denied - insufficient role'
      );
      throw Errors.Forbidden('Admin access required');
    }

    // Set admin context for audit logging
    c.set('isAdmin', true);
    c.set('adminRole', userRole);

    await next();
  };
};

/**
 * Check if user is an admin (without blocking)
 */
export const isAdmin = (user: { role?: string } | null | undefined): boolean => {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role || 'user');
};
