# Ecosystem Feedback Mechanism Drift Report

**Date**: 2026-03-12
**Surveyed by**: Gecko construct (automated 6-repo parallel survey)
**Scope**: All 6 live product repos in the 0xHoneyJar ecosystem

---

## Executive Summary

Every repo has Loa v1.39.1 installed. None have error tracking. The ecosystem has **strong dev-process feedback** (sprint review/audit cycles) but **near-zero runtime observability**. User-facing issues are detected only when users report them.

Two repos have the gold-standard pattern (AI-classified feedback -> Linear): **set-and-forgetti** and **apdao-auction-house**. That pattern should be the baseline for all 6.

---

## Survey Matrix

| Repo | Stack | Loa | Beehive | Error Tracking | Product Analytics | In-App Feedback | Linear Integration |
|------|-------|-----|----------|---------------|-------------------|-----------------|-------------------|
| **set-and-forgetti** | Next.js 15, React 19, Turborepo | v1.39.1 | Skill only (no construct) | NONE (console.error) | GA only | Popover + Dialog (Claude Haiku classifier) | YES (auto-routed) |
| **cubquests-interface** | Next.js 15, React 18, Bun | v1.39.1 | NONE | NONE (stub endpoint) | GA + Datafast | Polls system (operator-initiated) | Via HivemindOS (agent-mediated) |
| **mibera-honeyroad** | Next.js 15, React 18 | v1.39.1 | NONE | NONE | GA (OpenPanel dead dep) | Forum "Seller Feedback" category | NONE |
| **mibera-dimensions** | Next.js 15, React 19, Convex | v1.39.1 | **ACTIVE** (25 canvases, daily synthesis) | NONE (console.error) | GA only | Score feedback widget (Supabase) | NONE |
| **mcv-interface** | Next.js 16, React 19 | v1.39.1 | Dangling symlink | NONE | NONE (zero analytics) | Convex feedback modal | NONE |
| **apdao-auction-house** | Next.js 15, React 19 | v1.39.1 | NONE | NONE (Sentry template only) | NONE (zero analytics) | Popover widget (GPT-4 triage) | YES (auto-routed) |

---

## Universal Gaps (present in ALL 6 repos)

| Gap | Impact |
|-----|--------|
| **No error tracking** (Sentry/LogRocket/Bugsnag) | Production errors invisible. Detected only when users report. |
| **No session replay** | Cannot reproduce user-reported issues. No behavioral context. |
| **No server-side structured logging** | API routes log to stdout/console. No correlation IDs, no aggregation. |
| **No performance monitoring** | No Web Vitals, no Vercel Speed Insights, no APM. |
| **No alerting infrastructure** | No Discord/Slack/PagerDuty alerts on error spikes or degradation. |

---

## Feedback Mechanism Archetypes

### Tier 1: AI-Classified -> Linear (Gold Standard)
**Repos**: set-and-forgetti, apdao-auction-house

Pattern:
1. In-app widget captures feedback type + free text + wallet + screenshot
2. AI classifier (Claude Haiku or GPT-4) generates title, priority, labels
3. Auto-creates Linear issue with full context
4. Rate-limited per wallet via Upstash Redis

**set-and-forgetti** is slightly ahead: uses Claude Haiku for BUG vs UTC (User Truth Canvas) classification with confidence scoring. apdao uses GPT-4-turbo triage with P1-P4 priority + spam detection via GPT-4o-mini.

### Tier 2: Structured Collection (No Routing)
**Repos**: mibera-dimensions, mcv-interface

Both have in-app feedback widgets with structured data (bad/fine/good + optional note), but feedback stays in its local database (Supabase or Convex). No classification, no routing to Linear, no alerting.

mibera-dimensions is further ahead with version-aware feedback (links rating to scoring algorithm version) and the Beehive construct running daily synthesis.

### Tier 3: Unstructured / Absent
**Repos**: cubquests-interface, mibera-honeyroad

cubquests has a polls system (operator-initiated, not user-initiated) and a verification error endpoint that only `console.error`s. mibera-honeyroad has forum threads as the only feedback channel.

---

## Beehive Construct Deployment Status

| Repo | Status | Detail |
|------|--------|--------|
| mibera-dimensions | **ACTIVE** | 25 canvases, 24 cognition profiles, 8 journeys, daily synthesis cron, 21 reports |
| mcv-interface | **DANGLING** | Symlink to `.claude/constructs/packs/observer/` but pack never cloned |
| set-and-forgetti | **SKILL ONLY** | `observing-users` Loa skill, 11 canvases in `grimoires/laboratory/`, no construct |
| cubquests-interface | ABSENT | Zero Beehive presence |
| mibera-honeyroad | ABSENT | Zero Beehive presence |
| apdao-auction-house | ABSENT | Zero Beehive presence |

---

## Centralized Dashboard Requirements (derived from survey)

### What the dashboard must ingest

| Signal Source | Repos Using | Format | Transport |
|--------------|-------------|--------|-----------|
| Linear issues (from AI classifier) | set-and-forgetti, apdao | Linear API/webhooks | Linear webhook -> API |
| Convex feedback tables | mcv-interface, mibera-dimensions | Convex documents | Convex subscription |
| Supabase score_feedback | mibera-dimensions | PostgreSQL rows | Supabase realtime / polling |
| Forum threads | mibera-honeyroad | Supabase rows | Polling |
| Polls | cubquests-interface | Supabase rows | Polling |
| Beehive synthesis | mibera-dimensions | Grimoire markdown | Git webhook / file watch |
| GitHub issues | All 6 | GitHub API | GitHub webhook |
| Verification errors | cubquests-interface | JSON (currently console.error) | Needs endpoint wiring |

### What's missing that the dashboard should add

| Capability | Implementation |
|-----------|---------------|
| Error tracking ingestion | Sentry -> webhook -> dashboard |
| Product analytics events | PostHog -> webhook -> dashboard (or direct API) |
| Uptime monitoring | Synthetic checks against each app's health endpoint |
| Alerting | Discord webhook on error spike / feedback spike / downtime |

---

## Recommended Convergence Path

### Phase 1: Baseline (all 6 repos)
1. **Add error tracking** — Sentry (free tier covers all 6). Wire into existing error boundaries.
2. **Add Vercel Analytics** — Zero-config, free, already on the platform.
3. **Standardize feedback widget** — Extract set-and-forgetti's AI classifier pattern into a shared package or construct skill.

### Phase 2: Connect (centralized)
4. **Deploy feedback ingestion API** — Single endpoint on constructs network API that receives signals from all repos.
5. **Wire Linear across all repos** — Extend the AI classifier pattern from 2 repos to all 6.
6. **Materialize Beehive** — Clone the construct pack into the 4 repos that lack it. Fix mcv-interface's dangling symlink.

### Phase 3: Dashboard (Convex + Explorer)
7. **Build Convex signal tables** — `signals`, `uptimeChecks` (already designed in observability-architecture.md).
8. **Build explorer dashboard route** — Real-time view of all signals, filterable by repo/type/severity.
9. **Add Discord alerting** — Webhook on P1/P2 signals and downtime events.

---

## Appendix: Per-Repo Tech Stack Details

### set-and-forgetti
- Turborepo monorepo (apps/web, apps/landing, apps/docs)
- Berancer SDK, Dynamic Labs, Wagmi v2
- AI: `@ai-sdk/openai`, `@anthropic-ai/sdk`
- Linear SDK for feedback routing
- Sigil HUD (dev overlay, v3.2.2)
- 11 user canvases in `grimoires/laboratory/`

### cubquests-interface
- HivemindOS integration (`.hive/` directory)
- Convex for identity/presence
- Trigger.dev for background jobs
- Datafast for event tracking
- 7 CubQuests-specific Loa skills

### mibera-honeyroad
- SMF (Simple Machines Forum) clone
- Subsquid + Envio HyperIndex
- Trigger.dev background jobs (gif uploads, VM gen)
- OpenAI + Anthropic SDKs (Honey-GPT)
- ~289 files under `app/`

### mibera-dimensions
- React Three Fiber / Three.js / Konva
- Convex for real-time presence + oracle telemetry
- Effect-TS, Agentation
- External Score API
- Beehive construct with daily synthesis cron

### mcv-interface
- Next.js 16 (newest in ecosystem)
- Wagmi 3 + Zustand 5
- Convex (optional, graceful no-op)
- oxlint + Biome
- Single-page vault DApp

### apdao-auction-house
- 34 API routes (most in ecosystem)
- SWR + Cache-Control + unstable_cache (3-layer caching)
- Upstash Redis rate limiting
- Envio HyperIndex for auctions/loans
- 80 completed Loa sprints (most mature)
