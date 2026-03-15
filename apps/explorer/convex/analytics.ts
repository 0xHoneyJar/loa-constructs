import { internalQuery } from './_generated/server';

const DAY_MS = 86_400_000;

/**
 * Pull last 24h of installEvents, signals, healthObservations for digest.
 */
export const getDigestMetrics = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff24h = new Date(now - DAY_MS).toISOString();

    // Install events in last 24h (capped to prevent runaway queries)
    const installs = await ctx.db
      .query('installEvents')
      .withIndex('by_created', (q) => q.gte('timestamp', cutoff24h))
      .take(1000);

    // Signals in last 24h
    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', cutoff24h))
      .take(1000);

    // Latest health observation
    const latestHealth = await ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp')
      .order('desc')
      .first();

    // Count installs by pack
    const installsByPack: Record<string, number> = {};
    for (const event of installs) {
      const slug = event.packSlug;
      installsByPack[slug] = (installsByPack[slug] ?? 0) + 1;
    }

    // Signal summary by type and severity
    const signalSummary = signals.map((s) => ({
      type: s.data.type,
      severity: s.severity,
      title: s.title,
    }));

    return {
      installs: {
        total: installs.length,
        byPack: installsByPack,
      },
      signals: {
        total: signals.length,
        items: signalSummary,
      },
      health: latestHealth
        ? {
            score: latestHealth.healthScore,
            delta: latestHealth.healthDelta,
          }
        : null,
    };
  },
});

/**
 * Pull 7-day averages for anomaly detection.
 */
export const getDailyBaseline = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff7d = new Date(now - 7 * DAY_MS).toISOString();
    const cutoff24h = new Date(now - DAY_MS).toISOString();

    // Install events in last 7 days (excluding last 24h to avoid double-counting)
    const installs7d = await ctx.db
      .query('installEvents')
      .withIndex('by_created', (q) => q.gte('timestamp', cutoff7d).lt('timestamp', cutoff24h))
      .take(5000);

    // Signals in last 7 days (excluding last 24h)
    const signals7d = await ctx.db
      .query('signals')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', cutoff7d).lt('timestamp', cutoff24h))
      .take(5000);

    // Health observations in last 7 days (sample last 50 for average)
    const health7d = await ctx.db
      .query('healthObservations')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', cutoff7d))
      .take(200);

    // Calculate daily averages based on actual data span
    const oldestInstall = installs7d.length > 0 ? installs7d[0].timestamp : null;
    const oldestSignal = signals7d.length > 0 ? signals7d[0].timestamp : null;
    const oldest = oldestInstall && oldestSignal
      ? (oldestInstall < oldestSignal ? oldestInstall : oldestSignal)
      : oldestInstall || oldestSignal;
    const actualDays = oldest
      ? Math.max(1, Math.ceil((new Date(cutoff24h).getTime() - new Date(oldest).getTime()) / DAY_MS))
      : 1;
    const avgInstalls = installs7d.length / actualDays;
    const avgSignals = signals7d.length / actualDays;
    const avgHealthScore =
      health7d.length > 0
        ? Math.round(health7d.reduce((sum, h) => sum + h.healthScore, 0) / health7d.length)
        : null;

    return {
      avgDailyInstalls: Math.round(avgInstalls * 10) / 10,
      avgDailySignals: Math.round(avgSignals * 10) / 10,
      avgHealthScore,
    };
  },
});
