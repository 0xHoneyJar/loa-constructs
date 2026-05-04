import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { operationalToken } from '../middleware/operational-token.js';
import { trustedClientIp } from '../middleware/trust-ip.js';
import { fingerprintFromHeader, runDiscovery } from '../services/discovery.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * /v1/admin — operational endpoints (SDD §3.3, §6.1)
 *
 * Scope-reduced from the pre-cycle-012 multi-admin surface. Cycle-012 keeps
 * only `POST /v1/admin/discover` gated behind the operational token. All
 * calls audited in `discovery_runs` with token fingerprint + caller IP.
 */

export const adminRouter = new Hono();

adminRouter.use('*', operationalToken);

const discoverQuerySchema = z.object({
  owner: z.string().trim().min(1).max(100).default('0xHoneyJar'),
  dry_run: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .default(false)
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true')),
});

adminRouter.post('/discover', zValidator('query', discoverQuerySchema), async (c) => {
  const { owner, dry_run } = c.req.valid('query');

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return c.json(
      {
        error: {
          code: 'NOT_CONFIGURED',
          message: 'GITHUB_TOKEN env var not configured',
        },
        request_id: c.get('requestId'),
      },
      503
    );
  }

  const fingerprint = fingerprintFromHeader(c.req.header('authorization'));
  const ip = trustedClientIp(c);
  const userAgent = c.req.header('user-agent') ?? undefined;

  logger.info(
    { owner, dry_run, fingerprint, env: env.NODE_ENV },
    'admin.discover invoked'
  );

  try {
    const result = await runDiscovery({
      owner,
      dryRun: dry_run,
      githubToken,
      callerFingerprint: fingerprint,
      callerIp: ip,
      callerUserAgent: userAgent,
    });

    return c.json({
      ...result,
      request_id: c.get('requestId'),
    });
  } catch (err) {
    logger.error({ err }, 'discovery run failed');
    return c.json(
      {
        error: {
          code: 'DISCOVERY_FAILED',
          message: err instanceof Error ? err.message : 'unknown error',
        },
        request_id: c.get('requestId'),
      },
      500
    );
  }
});
