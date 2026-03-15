import { internalAction, internalQuery } from './_generated/server';

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

// --- Umami Cloud Traffic ---

const UMAMI_API_BASE = 'https://api.umami.is/v1';

export interface UmamiSiteStats {
  name: string;
  visitors: number;
  pageviews: number;
}

export interface UmamiTrafficStats {
  visitors: number;
  pageviews: number;
  topReferrers: { name: string; value: number }[];
  topPages: { name: string; value: number }[];
  /** Per-site breakdown when UMAMI_SITE_IDS is configured */
  sites?: UmamiSiteStats[];
}

async function umamiGet(
  path: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const url = new URL(`${UMAMI_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  try {
    const response = await fetch(url.toString(), {
      headers: { 'x-umami-api-key': apiKey },
    });
    if (!response.ok) {
      console.error(`[umami] ${path} HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[umami] fetch error:', (error as Error).message);
    return null;
  }
}

async function fetchSingleSiteStats(
  websiteId: string,
  apiKey: string,
  startAt: string,
  endAt: string,
): Promise<{ visitors: number; pageviews: number } | null> {
  const statsRaw = await umamiGet(`/websites/${websiteId}/stats`, apiKey, { startAt, endAt });
  if (!statsRaw) return null;
  const stats = statsRaw as {
    visitors: { value: number };
    pageviews: { value: number };
  };
  return {
    visitors: stats.visitors?.value ?? 0,
    pageviews: stats.pageviews?.value ?? 0,
  };
}

/**
 * Fetch last-24h traffic stats from Umami Cloud.
 * Supports multi-site via UMAMI_SITE_IDS (JSON map of name→websiteId).
 * Falls back to single UMAMI_WEBSITE_ID when UMAMI_SITE_IDS is not set.
 * Returns null when no Umami credentials are configured.
 */
export const fetchUmamiTraffic = internalAction({
  handler: async (): Promise<UmamiTrafficStats | null> => {
    const apiKey = process.env.UMAMI_API_KEY;
    const siteIdsRaw = process.env.UMAMI_SITE_IDS;
    const websiteId = process.env.UMAMI_WEBSITE_ID;

    if (!apiKey) {
      console.warn('[umami] UMAMI_API_KEY not set — skipping traffic');
      return null;
    }

    const now = Date.now();
    const startAt = String(now - DAY_MS);
    const endAt = String(now);

    // Multi-site mode: UMAMI_SITE_IDS is a JSON map of { displayName: websiteId }
    if (siteIdsRaw) {
      let siteMap: Record<string, string>;
      try {
        siteMap = JSON.parse(siteIdsRaw);
      } catch {
        console.error('[umami] UMAMI_SITE_IDS is not valid JSON — skipping traffic');
        return null;
      }

      const entries = Object.entries(siteMap);
      if (entries.length === 0) {
        console.warn('[umami] UMAMI_SITE_IDS is empty — skipping traffic');
        return null;
      }

      // Fetch stats for all sites in parallel
      const siteResults = await Promise.all(
        entries.map(async ([name, id]) => {
          const stats = await fetchSingleSiteStats(id, apiKey, startAt, endAt);
          return { name, stats };
        }),
      );

      // Build per-site breakdown
      const sites: UmamiSiteStats[] = [];
      let totalVisitors = 0;
      let totalPageviews = 0;

      for (const { name, stats } of siteResults) {
        if (stats) {
          sites.push({ name, visitors: stats.visitors, pageviews: stats.pageviews });
          totalVisitors += stats.visitors;
          totalPageviews += stats.pageviews;
        }
      }

      if (sites.length === 0) return null;

      // Sort sites by visitors descending
      sites.sort((a, b) => b.visitors - a.visitors);

      // Fetch referrers and top pages for the highest-traffic site only
      const topSiteId = siteMap[sites[0].name];
      const [referrersRaw, pagesRaw] = await Promise.all([
        umamiGet(`/websites/${topSiteId}/metrics`, apiKey, {
          startAt,
          endAt,
          type: 'referrer',
          limit: '5',
        }),
        umamiGet(`/websites/${topSiteId}/metrics`, apiKey, {
          startAt,
          endAt,
          type: 'url',
          limit: '5',
        }),
      ]);

      const referrers = (referrersRaw as { x: string; y: number }[] | null) ?? [];
      const pages = (pagesRaw as { x: string; y: number }[] | null) ?? [];

      return {
        visitors: totalVisitors,
        pageviews: totalPageviews,
        topReferrers: referrers.map((r) => ({ name: r.x || 'direct', value: r.y })),
        topPages: pages.map((p) => ({ name: p.x, value: p.y })),
        sites,
      };
    }

    // Single-site fallback: UMAMI_WEBSITE_ID
    if (!websiteId) {
      console.warn('[umami] UMAMI_WEBSITE_ID not set — skipping traffic');
      return null;
    }

    // Fetch stats and top referrers in parallel
    const [statsRaw, referrersRaw, pagesRaw] = await Promise.all([
      umamiGet(`/websites/${websiteId}/stats`, apiKey, { startAt, endAt }),
      umamiGet(`/websites/${websiteId}/metrics`, apiKey, {
        startAt,
        endAt,
        type: 'referrer',
        limit: '5',
      }),
      umamiGet(`/websites/${websiteId}/metrics`, apiKey, {
        startAt,
        endAt,
        type: 'url',
        limit: '5',
      }),
    ]);

    if (!statsRaw) return null;

    const stats = statsRaw as {
      visitors: { value: number };
      pageviews: { value: number };
    };
    const referrers = (referrersRaw as { x: string; y: number }[] | null) ?? [];
    const pages = (pagesRaw as { x: string; y: number }[] | null) ?? [];

    return {
      visitors: stats.visitors?.value ?? 0,
      pageviews: stats.pageviews?.value ?? 0,
      topReferrers: referrers.map((r) => ({ name: r.x || 'direct', value: r.y })),
      topPages: pages.map((p) => ({ name: p.x, value: p.y })),
    };
  },
});
