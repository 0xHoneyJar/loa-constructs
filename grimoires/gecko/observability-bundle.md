# Observability Dashboard — Architect Handoff Bundle

**Date**: 2026-03-12
**Status**: Pre-architecture review complete, ready for `/architect`
**Trigger**: API crash loop (Bun/bcrypt segfault) discovered manually, zero automated alerting
**User preference**: Convex for realtime (mcv-interface pattern), Linear for manageability

---

## 1. What Happened (Catalyzing Incident)

Three bugs cascading: native bcrypt C++ addon segfaults under Bun (API down), stale sk_test_ API key causes browse script to get 502 from auth middleware on public endpoints (empty registry), find without -L skips symlinked construct packs (loader reports nothing installed). All three fixed and shipped (PR #159 + upstream Loa PR #447 merged). Full diagnostic: `grimoires/gecko/network-navigation-diagnostic.md`.

## 2. What We Found (6-Repo Ecosystem Survey)

All 6 live product repos surveyed in parallel. Every repo has Loa v1.39.1. Zero repos have error tracking.

### Feedback Mechanism Tiers

| Tier | Pattern | Repos | Key Detail |
|------|---------|-------|------------|
| **Gold** | AI classifier → Linear | set-and-forgetti (Claude Haiku), apdao-auction-house (GPT-4-turbo) | Auto-triaged, auto-routed, rate-limited |
| **Silver** | Structured widget, no routing | mibera-dimensions (Supabase), mcv-interface (Convex) | Captured but siloed in local DB |
| **Bronze** | Unstructured / absent | cubquests-interface (stub endpoint), mibera-honeyroad (forum threads) | Effectively no feedback pipeline |

### Universal Gaps

- **Error tracking**: 0/6 repos have Sentry or equivalent
- **Session replay**: 0/6 repos have LogRocket/PostHog/FullStory
- **Server-side logging**: 0/6 repos have structured logging (pino/winston)
- **Performance monitoring**: 0/6 repos have Web Vitals or APM
- **Alerting**: 0/6 repos alert on anything

### Beehive Construct Deployment

| Repo | Status |
|------|--------|
| mibera-dimensions | **ACTIVE** — 25 canvases, daily synthesis cron, 8 journey maps |
| mcv-interface | **DANGLING** — symlink to pack that was never cloned |
| set-and-forgetti | Loa skill only (no construct) — 11 canvases in grimoires/laboratory/ |
| cubquests, mibera-honeyroad, apdao | Absent |

Full survey: `grimoires/gecko/ecosystem-feedback-drift.md`.

## 3. What We Want to Build

A centralized observability dashboard in the explorer app that ingests signals from all product repos, stores them in Convex (realtime), and routes actionable items to Linear.

### Design Constraints (from user)

1. **Convex is the signal store** — user likes mcv-interface's realtime pattern and ease of implementation
2. **Linear is the ticket sink** — user likes the manageability
3. **Not Sentry-first** — error tracking is additive, not the foundation
4. **Pattern to propagate**: set-and-forgetti's AI classifier (Claude Haiku) → Linear pipeline

### Target Data Flow

```
In-app widget → POST /api/signals → Convex signal table
                                       ↓
                              AI classifier (Claude Haiku)
                                       ↓
                              Linear issue (auto-routed by app)
                                       ↓
                              Linear webhook → Convex status sync
```

### What Exists Already

| Asset | Location | Reuse Potential |
|-------|----------|----------------|
| Convex provider + 4 tables | explorer app | Add `signals` + `uptimeChecks` tables |
| Convex feedback schema | mcv-interface (`convex/schema.ts`) | Extract as reference implementation |
| Claude Haiku classifier | set-and-forgetti (`lib/linear/classifier.ts`) | Extract to shared package or construct |
| Linear issue creation | set-and-forgetti (`lib/linear/issue.ts`) | Extract to shared package |
| GPT-4 triage pipeline | apdao-auction-house (`actions/create-feedback.ts`) | Alternative classifier to benchmark |
| Health dashboard page | explorer (`/dashboard/health`) | UI pattern to extend |
| Live install feed | explorer component | Real-time feed pattern |
| Beehive gap taxonomy | mibera-dimensions grimoires | Classification schema |
| Gecko health observations | Convex `healthObservations` table | Already flowing |

## 4. Linear Integration Architecture

Full research: `grimoires/gecko/linear-agent-capabilities.md` (131 web searches).

**Key capabilities**:
- Agent SDK (Developer Preview) — agents are first-class citizens with delegation model
- Remote MCP at `mcp.linear.app/mcp` — OAuth 2.1, Claude/Cursor native
- Webhooks with HMAC-SHA256 — bidirectional sync (status changes back to Convex)
- Rate limit: 1,500 req/hr per API key, 500/hr per OAuth app

**Recommended**: Agent SDK for inbound (apps → agent → Linear) + MCP for agent-side (Claude reads/manages).

**Team routing**: One Linear team per product app (EXP, SAF, CUB, MIB, MID, MCR, RKT, HUB, INF).

## 5. Proposed Implementation Phases

### Phase 1: Convex Signal Store + Dashboard (MVP)
- `signals` table in Convex with source/severity/status/appSlug
- `uptimeChecks` table for synthetic monitoring
- `/api/signals` Route Handler with HMAC auth
- `/dashboard/signals` page with live feed + triage queue
- Linear issue creation via GraphQL API
- Discord webhook for critical alerts

### Phase 2: Widget Extraction + App Instrumentation
- `@0xhoneyjar/feedback-widget` npm package (extracting mcv-interface + set-and-forgetti patterns)
- Install across top 3 apps first
- Wire Linear across all 6 repos (standardize on Claude Haiku classifier)
- Materialize Beehive in 4 missing repos

### Phase 3: Intelligence Layer
- Linear Agent SDK integration (bidirectional sync)
- Beehive integration (signals → canvases, automated gap analysis)
- Cross-app pattern detection
- Automated severity escalation rules

## 6. Open Questions for Architect

1. **Convex schema design**: Should `signals` be a single polymorphic table or split by signal type (feedback, error, uptime, deploy)?
2. **Auth model**: HMAC per-app secrets vs. API keys from the existing `/v1/keys` system?
3. **Classifier standardization**: Claude Haiku (set-and-forgetti) vs GPT-4-turbo (apdao) — pick one or A/B?
4. **Widget packaging**: npm package vs. construct skill vs. both?
5. **Linear workspace**: Create all teams upfront or start with one team + labels?
6. **Feedback → Beehive bridge**: How do Convex signals feed into Beehive canvases? Manual grimoire import or automated pipeline?

## 7. Artifact Index

| Artifact | Path | Purpose |
|----------|------|---------|
| Catalyzing incident diagnostic | `grimoires/gecko/network-navigation-diagnostic.md` | 3-bug root cause analysis |
| 6-repo ecosystem survey | `grimoires/gecko/ecosystem-feedback-drift.md` | Feedback mechanism inventory + gaps |
| Linear capabilities research | `grimoires/gecko/linear-agent-capabilities.md` | API/SDK/MCP/webhook architecture |
| Architecture plan (v1) | `grimoires/gecko/observability-architecture.md` | Three-layer design + phases |
| This bundle | `grimoires/gecko/observability-bundle.md` | Architect handoff synthesis |

## 8. Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Time to detect API crash | Unknown (hours?) | < 60 seconds |
| Repos with error tracking | 0/6 | 6/6 |
| Repos with feedback widget | 2/6 (non-standard) | 6/6 (standardized) |
| Repos with Linear routing | 2/6 | 6/6 |
| Beehive construct deployed | 1/6 active | 6/6 active |
| Cross-app signal visibility | None | Real-time dashboard |
