# Ruggy — Ecosystem Intelligence Agent

> Updated: 2026-03-13 (cycle-047 structural alignment)

## What Ruggy Is

Ruggy is the ecosystem intelligence layer for 0xHoneyJar. It consolidates user feedback and error signals from **6 independent product repos** into a single Convex-native pipeline hosted on **constructs.network** (the explorer app). Signals are ingested, classified by AI, and routed to Linear/Discord based on severity and sovereignty rules.

## What Was Actually Built (cycle-044 + cycle-045)

- Convex-powered signal store with deduplication and classification
- AI classification via Claude Haiku 4.5 (store-first, classify-later)
- Linear integration: auto-escalation creates issues, bidirectional webhook sync
- Discord alerting for critical/high signals
- Dashboard at `/dashboard/signals` with inbox/detail/triage (7 components)
- Feedback widget in explorer layout + 6 product repo fan-out integrations
- Per-app API keys (`sk_live_*`) with hash-validated auth in Convex
- Sovereignty engine: per-app governance controlling auto-escalation (constrained/standard/autonomous tiers)
- 8 cron jobs: retry-classification, reconcile-linear, purge-expired, heartbeat, heartbeat-check, recalculate-sovereignty, check-linear-failures, presence-cleanup
- E2E verified: signals flow from product apps through classification to Linear (LAB-915)

## Architecture

All signal processing runs on Convex (`quaint-anaconda-866` prod). No separate backend.

```
Product repo widget → POST constructs.network/api/signals → Convex ingest → Haiku classify → sovereignty gate → Linear issue
                                                                                                                → Discord alert
```

See `grimoires/loa/context/ruggy-signal-architecture.md` for full Mermaid diagrams.

## Product Repos (6 fan-out integrations)

| Repo | Integration Pattern | API Key |
|------|-------------------|---------|
| set-and-forgetti | Server route (fire-and-forget) | `sk_live_db79...` |
| apdao-auction-house | Server action (fire-and-forget) | `sk_live_a72b...` |
| mcv-interface | Convex scheduled action | `sk_live_10c5...` |
| midi-interface | Server action (fire-and-forget) | `sk_live_4a4f...` |
| cubquests-interface | Client widget (origin-validated) | `sk_live_e111...` |
| mibera-honeyroad | Client widget (origin-validated) | `sk_live_a109...` |

Server-side integrations keep the API key secret. Client-side widgets use `NEXT_PUBLIC_` prefix — the key is exposed but origin-validated server-side.

## Stack

| Layer | Technology |
|-------|-----------|
| Signal store + processing | Convex (prod: quaint-anaconda-866) |
| Classification | Claude Haiku 4.5 (direct API, not routed) |
| Ingestion endpoint | Next.js API route (Vercel, constructs.network) |
| Issue tracking | Linear (team 466d92ac, GraphQL API) |
| Alerting | Discord webhooks |
| Dashboard | Next.js + Convex subscriptions (real-time) |

## Sovereignty via Override Rate

Override rate drives autonomy tier automatically:
- >40% → CONSTRAINED (auto-escalate critical + high only)
- 15-40% → STANDARD (auto-escalate critical + high)
- <15% → AUTONOMOUS (full triage authority, all actionable)

Manual override always available. Tiers recalculated hourly by cron.

## Metrics That Matter (NOT Vanity)

| Metric | What | Target |
|--------|------|--------|
| Time to Awareness (TTA) | Gap between something breaking and someone knowing | <4h HIGH, <1h CRITICAL |
| Human Override Rate | How often humans change Ruggy's classification | <25% month 1, <15% month 2 |
| Signal-to-Action Ratio | % of signals that led to actual code change/fix | >10% within 7 days |
| Coverage Gap Detection | Incidents Ruggy missed | 0 CRITICAL missed |
| Cost per Actionable Signal | Total spend / signals that led to action | <$5/signal |

What we DON'T track: total signal volume, widget install count, Discord usage, uptime %, classification speed, issue count.

## Identity

Ruggy's voice (from ruggy-v3 IDENTITY.md + GECKO.md BEAUVOIR):
- Lowercase energy — calm, approachable, never corporate
- Direct but warm — doesn't waste words but the words carry weight
- Speaks from experience, not authority
- The "bazaar trader" archetype — on the ground, in the dust, between the stalls
- Never fabricates, never optimizes for engagement, never extrapolates desire from behavior

## Phase 2 (Future)

- Onchain observability via Score API (transaction patterns, contract health)
- Cross-signal correlation across repos (incident grouping)
- Linear Agent SDK (first-class team member identity)
- Compound learning (pattern extraction from classified signals)
- construct-rugby Railway deployment (blocked on loa-finn / FINN_URL)
- Historical feedback migration from midi-interface Supabase (~155 rows)

## Key Research Sources

- grimoires/gecko/context-pack/ (16 files, complete research package)
- grimoires/loa/context/ruggy-signal-architecture.md (Mermaid diagrams, security model, env vars)
- grimoires/loa/context/prd-cycle-044-signals.md (original signal PRD)

## Constraints

- Bun runtime (monorepo uses bun, Convex uses Node.js internally)
- ~$1/day cost ceiling for 6 repos
- Single maintainer (@janitooor), 1-3 dev team
- Karpathy constraint: one thing well (ecosystem health triage), not everything
- Trust boundary: reads everything, writes only grimoires/gecko/ and creates Linear issues/Discord alerts
