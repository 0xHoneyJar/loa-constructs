/**
 * Pack Analytics Service
 *
 * Ecosystem-level install analytics with client type classification.
 * This is ruggy's first query surface — the data that makes ecosystem
 * triage possible.
 *
 * @see grimoires/bridgebuilder/weight-maps/ruggy-query-spec.md
 */

import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { db, packInstallations, packs } from '../db/index.js';

export interface PackInstallAnalytics {
  /** Total installs in the period */
  totalInstalls: number;
  /** Breakdown by client type */
  byClientType: {
    human: number;
    agent: number;
    bot: number;
    unknown: number;
  };
  /** Agent-to-human ratio (the unique signal) */
  agentHumanRatio: number | null;
  /** Per-construct breakdown */
  byConstruct: Array<{
    slug: string;
    name: string;
    total: number;
    human: number;
    agent: number;
    bot: number;
    unknown: number;
    agentRatio: number | null;
  }>;
  /** Period metadata */
  period: {
    days: number;
    start: string;
    end: string;
  };
}

interface QueryOptions {
  periodDays: number;
  slug?: string;
}

export async function getPackInstallAnalytics(
  options: QueryOptions
): Promise<PackInstallAnalytics> {
  const { periodDays, slug } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const baseConditions = [
    eq(packInstallations.action, 'install'),
    gte(packInstallations.createdAt, startDate),
  ];

  // If filtering by slug, join with packs table
  if (slug) {
    const rows = await db
      .select({
        clientType: packInstallations.clientType,
        count: sql<number>`count(*)::int`,
      })
      .from(packInstallations)
      .innerJoin(packs, eq(packInstallations.packId, packs.id))
      .where(and(...baseConditions, eq(packs.slug, slug)))
      .groupBy(packInstallations.clientType);

    const byType = { human: 0, agent: 0, bot: 0, unknown: 0 };
    for (const row of rows) {
      if (row.clientType && row.clientType in byType) {
        byType[row.clientType as keyof typeof byType] = row.count;
      }
    }
    const total = byType.human + byType.agent + byType.bot + byType.unknown;
    const humanPlusAgent = byType.human + byType.agent;

    return {
      totalInstalls: total,
      byClientType: byType,
      agentHumanRatio:
        humanPlusAgent > 0 ? byType.agent / humanPlusAgent : null,
      byConstruct: [],
      period: {
        days: periodDays,
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    };
  }

  // Full ecosystem query — per-construct breakdown
  const rows = await db
    .select({
      slug: packs.slug,
      name: packs.name,
      clientType: packInstallations.clientType,
      count: sql<number>`count(*)::int`,
    })
    .from(packInstallations)
    .innerJoin(packs, eq(packInstallations.packId, packs.id))
    .where(and(...baseConditions))
    .groupBy(packs.slug, packs.name, packInstallations.clientType)
    .orderBy(desc(sql`count(*)`));

  // Aggregate totals
  const globalByType = { human: 0, agent: 0, bot: 0, unknown: 0 };
  const constructMap = new Map<
    string,
    {
      slug: string;
      name: string;
      human: number;
      agent: number;
      bot: number;
      unknown: number;
    }
  >();

  for (const row of rows) {
    const ct = (row.clientType || 'unknown') as keyof typeof globalByType;
    if (ct in globalByType) {
      globalByType[ct] += row.count;
    }

    if (!constructMap.has(row.slug)) {
      constructMap.set(row.slug, {
        slug: row.slug,
        name: row.name,
        human: 0,
        agent: 0,
        bot: 0,
        unknown: 0,
      });
    }
    const entry = constructMap.get(row.slug)!;
    if (ct === 'human' || ct === 'agent' || ct === 'bot' || ct === 'unknown') {
      entry[ct] += row.count;
    }
  }

  const byConstruct = Array.from(constructMap.values())
    .map((c) => {
      const total = c.human + c.agent + c.bot + c.unknown;
      const humanPlusAgent = c.human + c.agent;
      return {
        ...c,
        total,
        agentRatio:
          humanPlusAgent > 0 ? c.agent / humanPlusAgent : null,
      };
    })
    .sort((a, b) => b.total - a.total);

  const globalTotal =
    globalByType.human +
    globalByType.agent +
    globalByType.bot +
    globalByType.unknown;
  const globalHumanPlusAgent = globalByType.human + globalByType.agent;

  return {
    totalInstalls: globalTotal,
    byClientType: globalByType,
    agentHumanRatio:
      globalHumanPlusAgent > 0
        ? globalByType.agent / globalHumanPlusAgent
        : null,
    byConstruct,
    period: {
      days: periodDays,
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
  };
}
