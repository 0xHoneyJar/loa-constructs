import { query, action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const observationFields = {
  timestamp: v.string(),
  healthScore: v.number(),
  healthDelta: v.number(),
  apiStatus: v.string(),
  apiResponseMs: v.number(),
  registeredCount: v.number(),
  namespaceCount: v.number(),
  staleConstructs: v.array(v.string()),
  emptyCategories: v.array(v.string()),
  verificationTiers: v.any(),
  subScores: v.object({
    api_liveness: v.number(),
    version_freshness: v.number(),
    category_coverage: v.number(),
    identity_drift: v.number(),
    composition_density: v.number(),
    verification_flow: v.number(),
  }),
  source: v.optional(v.string()),
};

// Atomic insert-if-not-exists: read + write in single mutation transaction
// prevents race conditions from concurrent pushes (GPT-review finding #2)
export const insertIfNotExists = internalMutation({
  args: observationFields,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp', (q) => q.eq('timestamp', args.timestamp))
      .first();
    if (existing) {
      throw new Error('duplicate observation');
    }
    await ctx.db.insert('healthObservations', args);
  },
});

export const pushFromGecko = action({
  args: {
    writeKey: v.string(),
    ...observationFields,
  },
  handler: async (ctx, args) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || args.writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }

    const { writeKey: _, ...observation } = args;
    await ctx.runMutation(internal.healthObservations.insertIfNotExists, observation);
  },
});

export const current = query({
  handler: async (ctx) => {
    return ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp')
      .order('desc')
      .first();
  },
});

export const trends = query({
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const observations = await ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', cutoff))
      .order('asc')
      .collect();

    const byDate = new Map<string, { scores: number[]; responseTimes: number[] }>();
    for (const obs of observations) {
      const date = obs.timestamp.substring(0, 10);
      const bucket = byDate.get(date) ?? { scores: [], responseTimes: [] };
      bucket.scores.push(obs.healthScore);
      bucket.responseTimes.push(obs.apiResponseMs);
      byDate.set(date, bucket);
    }

    const points = Array.from(byDate.entries()).map(([date, { scores, responseTimes }]) => ({
      date,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      avgApiResponseMs: Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      ),
    }));

    return { period: `${days}d`, points };
  },
});

export const subScoreTrends = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 7 }) => {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const observations = await ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', cutoff))
      .order('asc')
      .collect();

    const subScoreKeys = [
      'api_liveness',
      'version_freshness',
      'category_coverage',
      'identity_drift',
      'composition_density',
      'verification_flow',
    ] as const;

    // Collect per-date averages for each sub-score
    const byDate = new Map<string, Record<string, number[]>>();
    for (const obs of observations) {
      const date = obs.timestamp.substring(0, 10);
      if (!byDate.has(date)) {
        byDate.set(date, Object.fromEntries(subScoreKeys.map((k) => [k, []])));
      }
      const bucket = byDate.get(date)!;
      for (const key of subScoreKeys) {
        bucket[key].push(obs.subScores[key]);
      }
    }

    const result: Record<string, number[]> = {};
    for (const key of subScoreKeys) {
      result[key] = Array.from(byDate.values()).map((bucket) => {
        const vals = bucket[key];
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      });
    }

    return result;
  },
});
