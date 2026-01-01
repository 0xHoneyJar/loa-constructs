/**
 * Analytics Routes
 * @see sprint.md T10.1, T10.3: Usage API, Creator API
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getUserUsageStats, getCreatorStats, getSkillAnalytics } from '../services/analytics.js';
import { getSkillById, isSkillOwner } from '../services/skills.js';
import type { Variables } from '../app.js';

// --- Router ---

const analyticsRouter = new Hono<{ Variables: Variables & { user: { id: string } } }>();

// Apply authentication only to analytics-specific routes (not all routes)
// This prevents interfering with other routes when mounted at root
analyticsRouter.use('/users/*', requireAuth());
analyticsRouter.use('/creator/*', requireAuth());

// --- Schemas ---

const usageQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

// --- User Usage Routes ---

/**
 * GET /v1/users/me/usage
 * Get authenticated user's skill usage statistics
 * @see sprint.md T10.1: Usage API
 */
analyticsRouter.get(
  '/users/me/usage',
  zValidator('query', usageQuerySchema),
  async (c) => {
    const user = c.get('user');
    const { period } = c.req.valid('query');

    const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const stats = await getUserUsageStats(user.id, { periodDays });

    return c.json({
      data: stats,
    });
  }
);

// --- Creator Routes ---

/**
 * GET /v1/creator/skills
 * Get authenticated user's published skills with stats
 * @see sprint.md T10.3: Creator API
 */
analyticsRouter.get('/creator/skills', async (c) => {
  const user = c.get('user');

  const stats = await getCreatorStats(user.id);

  return c.json({
    data: {
      summary: {
        totalSkills: stats.totalSkills,
        totalDownloads: stats.totalDownloads,
        totalActiveInstalls: stats.totalActiveInstalls,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
      },
      skills: stats.skills,
    },
  });
});

/**
 * GET /v1/creator/skills/:skillId/analytics
 * Get detailed analytics for a specific skill
 * @see sprint.md T10.3: Creator API
 */
analyticsRouter.get('/creator/skills/:skillId/analytics', async (c) => {
  const user = c.get('user');
  const skillId = c.req.param('skillId');

  // Verify skill exists
  const skill = await getSkillById(skillId);
  if (!skill) {
    return c.json(
      {
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
      },
      404
    );
  }

  // Verify user owns the skill
  const isOwner = await isSkillOwner(skillId, user.id);
  if (!isOwner) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view analytics for this skill',
        },
      },
      403
    );
  }

  const analytics = await getSkillAnalytics(skillId);

  if (!analytics) {
    return c.json(
      {
        error: {
          code: 'ANALYTICS_NOT_FOUND',
          message: 'Analytics not available for this skill',
        },
      },
      404
    );
  }

  return c.json({
    data: analytics,
  });
});

export { analyticsRouter };
