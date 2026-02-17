/**
 * Public Creator Profile Routes
 * @see sprint.md T2.3: Creator Profile API
 *
 * Public endpoints for author profiles — no auth required.
 * Separate from /creator (authenticated creator dashboard).
 */

import { Hono } from 'hono';
import { getCreatorProfile } from '../services/creator.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const creatorsRouter = new Hono();

/**
 * GET /v1/creators/:username
 * Public author profile with constructs and aggregate stats.
 */
creatorsRouter.get('/:username', async (c) => {
  const username = c.req.param('username');
  const requestId = c.get('requestId');

  const profile = await getCreatorProfile(username);
  if (!profile) {
    throw Errors.NotFound('Creator not found');
  }

  logger.info(
    { username, constructCount: profile.stats.totalConstructs, requestId },
    'Creator profile retrieved'
  );

  return c.json({ data: profile, request_id: requestId });
});
