# Observability Architecture — Centralized Dashboard Plan

> **Date**: 2026-03-12
> **Status**: Design phase (pre-implementation)
> **Trigger**: API crash loop discovered manually, zero automated alerting
> **Goal**: AIO view of tickets, uptime, feedback across all live apps

---

## Problem Statement

14+ active product apps on Vercel + 1 API on Railway. Zero centralized observability.

- No uptime monitoring on any app
- No real error tracking (Sentry is a `console.log` stub)
- No cross-app feedback capture
- No automated ticket creation for incidents
- No alerting to Discord/Slack/PagerDuty
- Crash loops discovered only when consumers complain

The Bun 1.2.23 segfault crash loop (2026-03-12) was discovered manually during unrelated work. Unknown downtime duration. This is the catalyzing incident.

---

## Ecosystem Inventory

### Active Product Apps

| App | URL | Stack | User Type | Auth |
|---|---|---|---|---|
| set-and-forgetti | setandforgetti.io | Next.js / Vercel | Wallet holders | Dynamic Labs |
| cubquests / faucet | cubquests.com | Next.js / Vercel | Berachain newcomers | Dynamic Labs |
| midi-interface | midi.0xhoneyjar.xyz | Next.js / Vercel | Core users | Dynamic Labs |
| mcv-interface | mcv-interface.vercel.app | Next.js / Vercel | Creators | Dynamic Labs |
| rektdrop-interface | Vercel | Next.js / Vercel | Loss-reveal users | Dynamic Labs |
| hub-interface | hub.0xhoneyjar.xyz | Next.js / Vercel | Community | Dynamic Labs |
| mibera-interface | mibera.0xhoneyjar.xyz | Next.js / Vercel | NFT traders | Dynamic Labs |
| score-dashboard | score-dashboard.vercel.app | Next.js / Vercel | Power users | Dynamic Labs |
| explorer | constructs.network | Next.js / Vercel | Construct authors | GitHub OAuth |

### Infrastructure

| Component | Provider | Current Monitoring |
|---|---|---|
| API | Railway (`api.constructs.network`) | None (Sentry stub) |
| Database | Supabase (PostgreSQL) | Supabase dashboard only |
| Cache | Upstash (Redis) | Upstash dashboard only |
| Storage | Cloudflare R2 | None |
| DNS | Gandi (32 domains) | DMARC broken (`admin@yourdomain.com` placeholder) |
| Frontend (all) | Vercel | Vercel native only |

---

## Architecture: Three Layers

### Layer 1: Signal Collection

Signals flow FROM apps INTO the central store.

```
┌──────────────────────────────────────────────┐
│              Signal Sources                   │
├──────────────┬───────────────┬───────────────┤
│ App Feedback │ Error Events  │ Health Checks │
│ (widget/DM)  │ (Sentry/logs) │ (synthetic)   │
└──────┬───────┴───────┬───────┴───────┬───────┘
       │               │               │
       ▼               ▼               ▼
┌──────────────────────────────────────────────┐
│        Central Ingestion Endpoint            │
│   POST /api/signals (explorer Route Handler) │
│   Auth: per-app HMAC secret                  │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐
     │ Convex  │ │ Linear  │ │ Discord │
     │ (live)  │ │(tickets)│ │(alerts) │
     └─────────┘ └─────────┘ └─────────┘
```

#### Signal Types

| Signal | Source | Ingestion Method | Priority |
|---|---|---|---|
| User feedback | In-app widget | POST to central endpoint | P0 |
| Error/crash | Sentry SDK (real, not stub) | Sentry webhook → central endpoint | P0 |
| Uptime failure | Synthetic monitor (Better Stack / Checkly) | Webhook → central endpoint | P0 |
| Deployment event | Vercel webhook | POST to central endpoint | P1 |
| Build failure | Vercel/Railway webhook | POST to central endpoint | P1 |
| Transaction failure | On-chain monitoring | POST to central endpoint | P2 |
| Observer feedback | Existing Observer pipeline | Grimoire → ingest | P2 |

#### In-App Feedback Widget

Lightweight, embeddable across all apps:
```typescript
// @0xhoneyjar/feedback-widget (npm package)
<FeedbackWidget
  appSlug="set-and-forgetti"
  endpoint="https://constructs.network/api/signals"
  secret={process.env.FEEDBACK_HMAC_SECRET}
/>
```

Captures: category (bug/feature/flow), description, screenshot (optional), wallet address (if connected), page URL, user agent.

### Layer 2: Central Store (Convex)

Convex is already wired in explorer with real-time subscriptions. Add tables:

```typescript
// New tables
signals: defineTable({
  source: v.union(
    v.literal("feedback"),
    v.literal("error"),
    v.literal("uptime"),
    v.literal("deploy"),
    v.literal("build"),
  ),
  appSlug: v.string(),               // "set-and-forgetti", "cubquests", etc.
  severity: v.union(
    v.literal("critical"),
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
  ),
  category: v.optional(v.string()),   // bug, feature, flow, communication
  title: v.string(),
  body: v.optional(v.string()),
  metadata: v.optional(v.any()),      // screenshot URL, stack trace, etc.
  userIdentifier: v.optional(v.string()), // wallet or github handle
  linearIssueId: v.optional(v.string()),  // if escalated to Linear
  linearIssueUrl: v.optional(v.string()),
  status: v.union(
    v.literal("new"),
    v.literal("triaged"),
    v.literal("escalated"),           // sent to Linear
    v.literal("resolved"),
    v.literal("dismissed"),
  ),
  timestamp: v.number(),
})
  .index("by_app", ["appSlug", "timestamp"])
  .index("by_status", ["status", "timestamp"])
  .index("by_severity", ["severity", "timestamp"]),

uptimeChecks: defineTable({
  appSlug: v.string(),
  url: v.string(),
  status: v.union(v.literal("up"), v.literal("down"), v.literal("degraded")),
  responseMs: v.optional(v.number()),
  checkedAt: v.number(),
  downtimeSince: v.optional(v.number()),
})
  .index("by_app", ["appSlug", "checkedAt"]),
```

### Layer 3: Routing & Triage

#### Linear Integration (Agent SDK path)

```
Signal arrives in Convex
  → severity == critical?
    → YES: Auto-create Linear issue + Discord alert
    → NO: Sits in dashboard for manual triage

Dashboard "Escalate" button
  → Creates Linear issue via Agent SDK
  → Stores linearIssueId back in Convex signal
  → Linear webhook syncs status changes back to Convex
```

#### Linear Team Routing

| App Slug | Linear Team | Team Key |
|---|---|---|
| explorer, constructs.network | EXP | Constructs Network |
| set-and-forgetti | SAF | Set-and-Forgetti |
| cubquests, faucet | CUB | CubQuests |
| midi-interface | MID | Midi |
| mibera-interface | MIB | Mibera |
| api, railway, dns | INF | Infrastructure |
| All others | GEN | General |

#### Taxonomy (aligned with Observer)

Shared workspace-level labels:
```
Type:     bug | feature-request | flow-issue | communication | strategy
Severity: critical | high | medium | low
Source:   user-feedback | error-tracking | uptime-monitor | agent-created | manual
```

---

## Dashboard UI (Explorer)

### Route: `/dashboard/signals` (admin-gated)

#### Views

1. **Live Feed** — real-time signal stream via Convex subscription (like existing `live-install-feed`)
2. **Per-App Health** — uptime status, error rate, signal count per app
3. **Triage Queue** — new signals awaiting human review, "Escalate to Linear" action
4. **Linear Sync** — issues created from signals, status synced back
5. **Trends** — signals over time, per-app, per-type

#### Actions

- **Triage**: Mark signal as triaged/dismissed
- **Escalate**: Create Linear issue from signal (selects team based on appSlug)
- **Resolve**: Mark resolved (optionally links to PR/commit)
- **Alert**: Send one-off Discord notification

---

## Implementation Phases

### Phase 1: Minimum Viable Observability (1–2 weeks)

- [ ] Convex `signals` table + mutations
- [ ] `/api/signals` Route Handler with HMAC auth
- [ ] Dashboard page with live feed + triage actions
- [ ] Linear issue creation (GraphQL API, not Agent SDK yet)
- [ ] Better Stack or Checkly for uptime (3–5 key URLs)
- [ ] Discord webhook for critical alerts

### Phase 2: App Instrumentation (2–3 weeks)

- [ ] `@0xhoneyjar/feedback-widget` npm package
- [ ] Install in set-and-forgetti + cubquests + explorer
- [ ] Real Sentry SDK in API (replace console.log stub)
- [ ] Vercel deployment webhook → signals
- [ ] Railway deployment webhook → signals

### Phase 3: Intelligence Layer (3–4 weeks)

- [ ] Linear Agent SDK integration (bidirectional sync)
- [ ] Observer integration (signals → canvases, gap analysis)
- [ ] Gecko integration (network health → signals)
- [ ] Automated triage rules (severity-based escalation)
- [ ] Cross-app pattern detection (same bug in multiple apps)

### Phase 4: Maturity (ongoing)

- [ ] On-chain transaction monitoring
- [ ] SLA tracking per app
- [ ] Burndown / resolution time analytics
- [ ] Public status page (status.constructs.network)

---

## Existing Infrastructure to Build On

| What exists | How it helps |
|---|---|
| Convex in explorer (4 tables, provider wired) | Real-time subscriptions for dashboard |
| Gecko health observations (Convex `healthObservations`) | Network health already flowing |
| Observer gap taxonomy | Shared classification schema |
| Health dashboard page (`/dashboard/health`) | UI pattern to replicate |
| Live install feed component | Real-time feed pattern to replicate |
| `CONVEX_WRITE_KEY` auth pattern | Proven server-side write auth |
| Railway CLI access | Deployment automation |
| GitHub Actions CI | Webhook trigger infrastructure |

---

## Decision Points (Needs User Input)

1. **Feedback scope**: All 14 apps or start with top 3? (set-and-forgetti, cubquests, explorer recommended)
2. **Dashboard audience**: Admin-only (like health) or role-based?
3. **Uptime provider**: Better Stack (free tier, 10 monitors) vs. Checkly vs. self-hosted?
4. **Linear workspace setup**: Create teams now or start with one team + labels?
5. **Alert channel**: Discord webhook? Slack? Both?
6. **Agent SDK timeline**: Phase 1 (simple API) or jump to Agent SDK?

---

## Related Context

- `network-navigation-diagnostic.md` — The catalyzing incident (Bun crash loop)
- `linear-agent-capabilities.md` — Full Linear SDK/API/MCP research
- `gecko-health-dashboard-plan.md` — Existing health dashboard plan (Gecko-specific)
- `internal-dashboard-convex-plan.md` — Prior Convex dashboard architecture
