/**
 * Signal Outcomes Routes — pack-scoped signal tracking
 * @see sdd.md §4.1 Signal Outcomes API (cycle-035)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { isPackOwner, getPackBySlug } from '../services/packs.js';
import {
  createSignalOutcome,
  evaluateSignalOutcome,
  getSignalOutcomes,
  getSignalOutcomeById,
  computeAccuracy,
  checkSignalRateLimit,
  checkShowcaseRateLimit,
} from '../services/signals.js';
import { db, constructShowcases } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';

export const signalsRouter = new Hono();

// --- Validation Schemas ---

const createOutcomeSchema = z.object({
  signal_type: z.string().min(1).max(100),
  signal_source: z.string().min(1).max(200),
  signal_source_url: z.string().url().max(2000).optional(),
  predicted_impact: z.enum(['high', 'medium', 'low']),
  outcome_summary: z.string().max(1000).optional(),
});

const evaluateOutcomeSchema = z.object({
  actual_impact: z.enum(['high', 'medium', 'low', 'none']),
  outcome_summary: z.string().max(1000).optional(),
  outcome_evidence: z.string().max(5000).optional(),
});

const createShowcaseSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  description: z.string().max(500).optional(),
});

// --- Helper: Resolve pack from slug ---

async function resolvePack(slug: string) {
  const pack = await getPackBySlug(slug);
  if (!pack) throw Errors.NotFound('Pack');
  return pack;
}

// --- Helper: Strip HTML (lightweight sanitization) ---

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// --- Signal Outcome Routes (nested under /packs/:slug/signals) ---

/**
 * POST /packs/:slug/signals/outcomes — Record a signal prediction
 * Auth: pack owner only
 */
signalsRouter.post(
  '/:slug/signals/outcomes',
  requireAuth(),
  zValidator('json', createOutcomeSchema),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    // Only pack owner can record signals
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only pack owner can record signal outcomes');
    }

    // Rate limit
    const allowed = await checkSignalRateLimit(userId);
    if (!allowed) {
      throw Errors.RateLimited('Signal outcome creation rate limit exceeded (50/hour)');
    }

    const body = c.req.valid('json' as never) as z.infer<typeof createOutcomeSchema>;

    try {
      const outcome = await createSignalOutcome({
        packId: pack.id,
        signalType: body.signal_type,
        signalSource: body.signal_source,
        signalSourceUrl: body.signal_source_url,
        predictedImpact: body.predicted_impact,
        outcomeSummary: body.outcome_summary ? stripHtml(body.outcome_summary) : undefined,
        recordedBy: userId,
      });

      return c.json({ data: outcome }, 201);
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('unique_signal_evaluation')) {
        throw Errors.Conflict(
          'Signal outcome already exists for this pack/type/source combination'
        );
      }
      throw err;
    }
  }
);

/**
 * PATCH /packs/:slug/signals/outcomes/:id — Evaluate a recorded signal
 * Auth: (pack owner OR admin) AND not self-evaluation (unless single-maintainer)
 */
signalsRouter.patch(
  '/:slug/signals/outcomes/:id',
  requireAuth(),
  zValidator('json', evaluateOutcomeSchema),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const user = c.get('user' as never) as { role?: string };
    const slug = c.req.param('slug');
    const outcomeId = c.req.param('id');
    const pack = await resolvePack(slug);

    // Auth: pack owner or admin
    const isOwner = await isPackOwner(pack.id, userId);
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    if (!isOwner && !isAdmin) {
      throw Errors.Forbidden('Only pack owner or admin can evaluate outcomes');
    }

    // Get existing outcome
    const existing = await getSignalOutcomeById(outcomeId);
    if (!existing || existing.packId !== pack.id) {
      throw Errors.NotFound('Signal outcome');
    }

    // Self-evaluation check
    if (existing.recordedBy === userId) {
      // DB constraint will also catch this, but provide a clear error message
      throw Errors.Forbidden(
        'Cannot evaluate your own signal prediction'
      );
    }

    const body = c.req.valid('json' as never) as z.infer<typeof evaluateOutcomeSchema>;

    const updated = await evaluateSignalOutcome(outcomeId, {
      actualImpact: body.actual_impact,
      outcomeSummary: body.outcome_summary ? stripHtml(body.outcome_summary) : undefined,
      outcomeEvidence: body.outcome_evidence ? stripHtml(body.outcome_evidence) : undefined,
      evaluatedBy: userId,
    });

    return c.json({ data: updated });
  }
);

/**
 * GET /packs/:slug/signals/outcomes — List outcomes (public, summaries only)
 */
signalsRouter.get(
  '/:slug/signals/outcomes',
  optionalAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    const page = parseInt(c.req.query('page') || '1', 10);
    const perPage = Math.min(parseInt(c.req.query('per_page') || '20', 10), 100);

    const outcomes = await getSignalOutcomes(pack.id, {
      page,
      perPage,
      includeEvidence: false,
    });

    return c.json({ data: outcomes, page, per_page: perPage });
  }
);

/**
 * GET /packs/:slug/signals/outcomes/detail — List with evidence (owner only)
 */
signalsRouter.get(
  '/:slug/signals/outcomes/detail',
  requireAuth(),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only pack owner can view outcome details');
    }

    const page = parseInt(c.req.query('page') || '1', 10);
    const perPage = Math.min(parseInt(c.req.query('per_page') || '20', 10), 100);

    const outcomes = await getSignalOutcomes(pack.id, {
      page,
      perPage,
      includeEvidence: true,
    });

    return c.json({ data: outcomes, page, per_page: perPage });
  }
);

/**
 * GET /packs/:slug/signals/accuracy — Public accuracy report
 */
signalsRouter.get(
  '/:slug/signals/accuracy',
  optionalAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    const report = await computeAccuracy(pack.id, slug);
    return c.json({ data: report });
  }
);

// --- Showcase Routes (nested under /packs/:slug/showcases) ---

/**
 * POST /packs/:slug/showcases — Submit a showcase (any authenticated user)
 */
signalsRouter.post(
  '/:slug/showcases',
  requireAuth(),
  zValidator('json', createShowcaseSchema),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    // Rate limit
    const allowed = await checkShowcaseRateLimit(userId);
    if (!allowed) {
      throw Errors.RateLimited('Showcase submission rate limit exceeded (20/hour)');
    }

    const body = c.req.valid('json' as never) as z.infer<typeof createShowcaseSchema>;

    const [showcase] = await db
      .insert(constructShowcases)
      .values({
        packId: pack.id,
        title: stripHtml(body.title),
        url: body.url,
        description: body.description ? stripHtml(body.description) : undefined,
        submittedBy: userId,
        approved: false,
      })
      .returning();

    return c.json({ data: showcase }, 201);
  }
);

/**
 * PATCH /packs/:slug/showcases/:id/approve — Approve a showcase
 * Auth: pack owner or admin
 */
signalsRouter.patch(
  '/:slug/showcases/:id/approve',
  requireAuth(),
  async (c) => {
    const userId = c.get('userId' as never) as string;
    const user = c.get('user' as never) as { role?: string };
    const slug = c.req.param('slug');
    const showcaseId = c.req.param('id');
    const pack = await resolvePack(slug);

    const isOwner = await isPackOwner(pack.id, userId);
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    if (!isOwner && !isAdmin) {
      throw Errors.Forbidden('Only pack owner or admin can approve showcases');
    }

    const [updated] = await db
      .update(constructShowcases)
      .set({ approved: true })
      .where(
        and(
          eq(constructShowcases.id, showcaseId),
          eq(constructShowcases.packId, pack.id)
        )
      )
      .returning();

    if (!updated) {
      throw Errors.NotFound('Showcase');
    }

    return c.json({ data: updated });
  }
);

/**
 * GET /packs/:slug/showcases — List showcases
 * Public: only approved. Pack owner: all.
 */
signalsRouter.get(
  '/:slug/showcases',
  optionalAuth(),
  async (c) => {
    const userId = c.get('userId' as never) as string | undefined;
    const slug = c.req.param('slug');
    const pack = await resolvePack(slug);

    const isOwner = userId ? await isPackOwner(pack.id, userId) : false;

    const conditions = [eq(constructShowcases.packId, pack.id)];
    if (!isOwner) {
      conditions.push(eq(constructShowcases.approved, true));
    }

    const showcases = await db
      .select()
      .from(constructShowcases)
      .where(and(...conditions))
      .orderBy(desc(constructShowcases.createdAt));

    return c.json({ data: showcases });
  }
);
