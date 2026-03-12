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

export const insert = internalMutation({
  args: observationFields,
  handler: async (ctx, args) => {
    await ctx.db.insert('healthObservations', args);
  },
});

export const findByTimestamp = internalQuery({
  args: { timestamp: v.string() },
  handler: async (ctx, { timestamp }) => {
    return ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp', (q) => q.eq('timestamp', timestamp))
      .first();
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

    const existing = await ctx.runQuery(
      internal.healthObservations.findByTimestamp,
      { timestamp: args.timestamp },
    );
    if (existing) {
      throw new Error('duplicate observation');
    }

    const { writeKey: _, ...observation } = args;
    await ctx.runMutation(internal.healthObservations.insert, observation);
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
