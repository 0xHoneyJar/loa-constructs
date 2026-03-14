# Observability Bundle — Multi-Construct Review Synthesis

**Date**: 2026-03-12
**Reviewers**: Observer, Protocol, Bridgebuilder, Artisan
**Status**: Ready for `/architect` with annotated constraints

---

## Consensus (All 4 Agree)

| Decision | Rationale |
|----------|-----------|
| **Phase 0 must ship first: uptime + alerting (1 day)** | The catalyzing incident was "API crashed and nobody noticed." Better Stack free tier (10 monitors) + Discord webhook solves this immediately. Everything else is Phase 1+. |
| **Store first, classify later** | Write signals to Convex unconditionally, then classify asynchronously via scheduled function. Never lose a signal because the AI classifier is down. |
| **Kill `metadata: v.any()`** | Replace with discriminated union per signal type. Type safety at the storage layer is non-negotiable. |
| **Reuse `/v1/keys` — don't build HMAC** | The API already has key generation, validation, scoping, revocation, usage tracking. Add a `write:signals` scope. Per-app keys prevent cross-app spoofing. |
| **HMAC in the widget is broken** | `process.env.FEEDBACK_HMAC_SECRET` in a client component either doesn't work (no `NEXT_PUBLIC_`) or leaks the secret (with `NEXT_PUBLIC_`). Widget auth must go through a server action or API route. |
| **Signal deduplication before Linear** | Without clustering, an outage creates N tickets for the same issue. Add `incidentGroupId` — same app + same source + similar title within 5 minutes = same group. One Linear issue per group, not per signal. |
| **String timestamps (ISO 8601)** | All 4 existing Convex tables use string timestamps. Don't introduce a second convention. |
| **2 Linear teams, not 9** | Product + Infrastructure. Split later when volume justifies it. |

---

## Productive Tensions (Reviewers Disagree)

### Custom Signal Store vs. Aggregation Layer

| Position | Advocate | Argument |
|----------|----------|----------|
| **Build the Convex signal store** | Observer, Protocol | Observer needs structured signals for canvas decomposition and pattern detection. Protocol says the three-layer architecture is sound and Convex is already proven in the explorer. The store enables the AI classifier, deduplication, and real-time dashboard — none of which work with pure aggregation. |
| **Kill the store, aggregate from Better Stack + Sentry** | Bridgebuilder | Why build what existing services already do? The only unique element is the AI classifier. Build a thin aggregation dashboard that pulls from external APIs, not a replacement signal store. |

**Resolution for architect**: Build the Convex signal store, but ONLY for feedback signals (user-generated, classified, long-lived). Uptime and error tracking should use Better Stack and Sentry respectively — don't rebuild these. The dashboard aggregates: Convex (feedback) + Better Stack API (uptime) + Sentry API (errors). This gives Observer its structured signals without reinventing monitoring.

### Observer Materialization

| Position | Advocate | Argument |
|----------|----------|----------|
| **Centralize Observer in explorer, don't clone per-repo** | Observer | One set of canvases spanning all apps, fed by the Convex signal store. Avoids dangling symlinks. Needs a signal-to-canvas decomposition step. |
| **Remove Observer from this bundle entirely** | Bridgebuilder | Observer is a 29-skill construct requiring daily crons and active curation. Installing it in repos with 0-2 maintainers creates 4 more dangling symlinks. Separate initiative. |

**Resolution for architect**: Bridgebuilder is right for Phase 1-2. Observer integration is Phase 3+ and should be a separate initiative. But Observer's recommendation to design the `userEntity` table now (even if empty) is correct — retrofitting longitudinal user identity later is painful. Add the table to the schema; populate it in Phase 3.

### Widget Packaging

| Position | Advocate | Argument |
|----------|----------|----------|
| **Construct skill that scaffolds** | Bridgebuilder | npm package = versioning, publishing, semver, React peer deps. Overkill for 6 internal repos. |
| **Theming system with warmth/weight/rhythm** | Artisan | Widget must adapt to each app's emotional context (DeFi = heavy/deliberate, gamified = light/snappy). Needs CSS custom property overrides. |

**Resolution for architect**: Start as a construct skill that generates a themed widget. Accept a theme prop (`warmth`, `weight`, `rhythm`) and CSS custom property overrides for colors. Graduate to npm package only if external adoption materializes.

---

## Revised Architecture (Post-Review)

### Phase 0: Detect Crashes (1 day)
- Better Stack free tier: 5 key URLs (API, set-and-forgetti, cubquests, explorer, mibera-dimensions)
- Discord webhook on downtime
- **Done criterion**: "Can we detect an API crash within 60 seconds and get a Discord alert?"

### Phase 1: Feedback Signal Store + Dashboard (2 weeks)
- Convex `signals` table (feedback only, discriminated union, no `v.any()`)
- Convex `userEntities` table (schema only, populated later)
- `/api/signals` Route Handler: validate with Zod, auth via `/v1/keys` (`write:signals` scope), write to Convex, schedule async classification
- AI classifier (Claude Haiku) as Convex scheduled function: extracts title, priority, labels, level1/level2/level3 diagnostics
- Signal deduplication via `incidentGroupId`
- Dashboard page: 3-zone layout (Status Bar + Triage Inbox + Activity Feed)
- Linear issue creation for escalated signals (2 teams: Product + Infrastructure)
- Linear webhook for status sync back to Convex
- Reconciliation cron for missed webhooks
- Discord webhook for critical signals (debounced per incident group)

### Phase 2: Widget + App Instrumentation (2-3 weeks)
- Feedback widget as construct skill (themed: warmth/weight/rhythm + CSS custom props)
- Install in top 3 apps (set-and-forgetti, cubquests, explorer)
- Sentry free tier in API + top 3 apps (errors go to Sentry, not custom store)
- Wire Linear classifier in 2 more repos
- Ingest bronze-tier channels (forum threads, polls) into dashboard feed

### Phase 3: Intelligence Layer (separate initiative)
- Observer integration: signal-to-canvas decomposition, centralized canvases
- `userEntity` population from signal history
- Cross-signal pattern detection (semantic clustering)
- Linear Agent SDK (upgrade from GraphQL API)
- Resolution → canvas update webhook

---

## Schema Constraints for Architect

### Convex `signals` table (Protocol R-1, R-2)
```typescript
signals: defineTable({
  source: v.union(v.literal("feedback"), v.literal("error_report")),
  appSlug: v.string(),
  severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  title: v.string(),
  body: v.optional(v.string()),
  userIdentifier: v.optional(v.string()),
  status: v.union(v.literal("new"), v.literal("triaged"), v.literal("escalated"), v.literal("resolved"), v.literal("dismissed")),
  incidentGroupId: v.optional(v.string()),
  // Discriminated union for type-specific data
  data: v.union(
    v.object({
      type: v.literal("feedback"),
      category: v.string(),
      goal: v.optional(v.string()),         // "What were you trying to do?"
      frustration: v.optional(v.number()),   // 1-5 scale
      isBlocking: v.optional(v.boolean()),
      screenshotUrl: v.optional(v.string()),
      pageUrl: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    }),
    v.object({
      type: v.literal("error_report"),
      errorClass: v.optional(v.string()),
      stackTrace: v.optional(v.string()),
      occurrenceCount: v.optional(v.number()),
    }),
  ),
  // Classification (populated async by Claude Haiku)
  classification: v.optional(v.object({
    level1Symptom: v.optional(v.string()),
    level2Want: v.optional(v.string()),
    level3Hypothesis: v.optional(v.string()),
    confidence: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  })),
  // Linear sync
  linearIssueId: v.optional(v.string()),
  linearIssueUrl: v.optional(v.string()),
  linearStatus: v.optional(v.string()),
  linearSyncedAt: v.optional(v.string()),
  // Timestamps (ISO 8601 strings, matching existing convention)
  timestamp: v.string(),
})
  .index("by_app", ["appSlug", "timestamp"])
  .index("by_status", ["status", "timestamp"])
  .index("by_severity", ["severity", "timestamp"])
  .index("by_incident", ["incidentGroupId", "timestamp"]),
```

### Convex `userEntities` table (Observer R-1, schema-only in Phase 1)
```typescript
userEntities: defineTable({
  identifier: v.string(),
  identifierType: v.union(v.literal("wallet"), v.literal("github"), v.literal("discord")),
  appSlugs: v.array(v.string()),
  signalCount: v.number(),
  firstSeenAt: v.string(),
  lastSeenAt: v.string(),
  observerCanvasPath: v.optional(v.string()),
})
  .index("by_identifier", ["identifier"]),
```

### Dashboard Layout (Artisan recommendations)

**Zone A — Status Bar (top, always visible)**
Per-app health pills: app name + status dot (cyan/amber/crimson) + untriaged count. Click to filter. "ALL" pill for aggregate.

**Zone B — Triage Inbox (middle, primary interaction)**
Inbox pattern (not table): left list + right detail pane. Severity-colored left border. Actions only in detail pane with weight differentiation:
- Dismiss: ghost-weight, confirmation required for critical
- Triage: light-weight, no confirmation
- Escalate: heavy-weight, preview of Linear issue before confirming
- Resolve: medium-weight, optional PR/commit link

**Zone C — Activity Feed (bottom, collapsed by default)**
Chronological feed of all signals. Default collapsed to 3 rows. Uses `live-install-feed` pattern.

**Real-time split**: Critical/High = Convex subscription. Medium/Low = poll on focus or 30s interval. Trends = fetch on mount.

---

## Review Artifacts

| Reviewer | Key Finding | Impact |
|----------|-------------|--------|
| **Observer** | Signal schema is lossy for research methodology. Needs Level 3 diagnostic output from classifier, user entity tracking, and signal-to-canvas decomposition. | Phase 3 design constraint |
| **Protocol** | `v.any()` type hole, HMAC broken client-side, store-then-classify pattern, reuse `/v1/keys`, reconciliation cron for webhooks. | Phase 1 implementation constraints |
| **Bridgebuilder** | Scope explosion — 3 products masquerading as 1. Phase 0 (uptime) must ship before anything else. Kill custom store for uptime/errors, use Better Stack + Sentry. | Phasing and scope |
| **Artisan** | 3-zone layout (status bar + triage inbox + feed), weight-of-consequence actions, severity-based real-time split, widget theming (warmth/weight/rhythm). | Dashboard UX spec |

---

## Open Questions (Answered by Review)

| Original Question | Answer | Source |
|-------------------|--------|--------|
| Polymorphic vs split tables? | Polymorphic for feedback+error (discriminated union). Uptime stays in Better Stack. | Protocol C-1 |
| HMAC vs API keys? | Reuse `/v1/keys` with `write:signals` scope. Per-app keys. | Protocol R-3 |
| Claude Haiku vs GPT-4-turbo? | Claude Haiku. Cheaper, faster, already working in set-and-forgetti. | Bridgebuilder R-4 |
| npm package vs construct skill? | Construct skill with theming. Graduate to npm only if external adoption. | Bridgebuilder F-6, Artisan #10 |
| 9 Linear teams or fewer? | 2 teams: Product + Infrastructure. Split when volume justifies. | Bridgebuilder F-7 |
| Feedback → Observer bridge? | Phase 3 separate initiative. Design `userEntities` table now (schema only). | Observer R-7, Bridgebuilder F-3 |
