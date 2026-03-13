# SDD: Ruggy — Autonomous Ecosystem Intelligence Agent

**Cycle**: cycle-045
**PRD**: grimoires/loa/prd.md
**Created**: 2026-03-13
**Status**: Draft

**Grounded In**:
- Cycle-044 signal infrastructure (Convex schema, API routes, classification, Linear, Discord — all deployed)
- loa-dixie fork surface audit (5 Oracle identity points, 15-layer middleware, 13 routes, 2,431 tests)
- Day 0 product repo audit (4 have widgets, 2 need them)
- Flatline PRD skeptic concerns (7 findings — all addressed)

---

## 1. Executive Summary

Ruggy connects existing infrastructure to the repos that need it. Two layers:

**Convex Signal Layer** (exists, deployed, tested) — ingestion, dedup, Haiku classification, Linear escalation, Discord alerting, dashboard. This IS the pipeline. Rugby doesn't rebuild it.

**Dixie Governance Layer** (new, forked) — identity, knowledge corpus, sovereignty engine, Discord slash commands, override tracking, audit trail. Intelligence and governance ON TOP of the signal pipeline.

Product repos POST feedback to the existing Convex signal API (`constructs.network/api/signals`). The Dixie fork orchestrates governance decisions and provides Discord interactivity.

### What Already Works (Don't Touch)

| Component | Location | Status |
|-----------|----------|--------|
| Signal ingestion + dedup | `apps/explorer/convex/signals.ts:ingest` | Deployed |
| Haiku classification (3-retry) | `apps/explorer/convex/signals.ts:classify` | Deployed |
| Linear issue creation (template-routed) | `apps/explorer/convex/linear.ts:createLinearIssue` | Deployed |
| Discord alerts (CRITICAL/HIGH, 5-min debounce) | `apps/explorer/convex/signals.ts:alertDiscord` | Deployed |
| Signal API key validation (bcryptjs) | `apps/explorer/convex/signals.ts:verifySignalKey` | Deployed |
| Rate limiting (100/key/hour) | `apps/explorer/convex/signalRateLimits` table | Deployed |
| Reconciliation cron (hourly) | `apps/explorer/convex/crons.ts` | Deployed |
| Retry classification cron (5-min) | `apps/explorer/convex/crons.ts` | Deployed |
| Heartbeat monitoring (hourly) | `apps/explorer/convex/signals.ts:sendHeartbeat` | Deployed |
| API key provisioning | `apps/api/src/routes/keys.ts:POST /v1/keys` | Deployed |
| Feedback widget (explorer) | `apps/explorer/components/feedback-widget.tsx` | Deployed |

### What Ruggy Adds

| Component | Purpose |
|-----------|---------|
| Dixie fork with Ruggy identity | Governance brain |
| Sovereignty engine | Override-rate-driven tier system |
| Discord slash commands | Interactive ecosystem queries |
| Knowledge corpus | Rugby-domain context for classification |
| Widget logic in 6 product repos | Signal forwarding to Convex API |
| Override tracking (Convex table) | 7/30-day rolling window |
| Enhanced classification prompt | App-context-aware, severity-calibrated |
| Origin validation | Per-key domain allowlist (SKP-001) |
| Pipeline error alerting | Discord alert on 3x Linear failure (SKP-003) |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCT REPOS (sensors)                         │
│                                                                       │
│  midi-interface   honeyroad   mcv   cubquests   S&F   apDAO          │
│    [fan-out]      [new]     [fan-out] [new]   [fan-out] [fan-out]    │
│       │              │         │        │         │         │         │
└───────┼──────────────┼─────────┼────────┼─────────┼─────────┼────────┘
        └──────────────┴─────────┴────┬───┴─────────┴─────────┘
                                      │
                             POST /api/signals
                             (Authorization: sk_live_...)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CONVEX SIGNAL LAYER (nervous system)                 │
│                                                                       │
│  Ingestion → Classify (Haiku) → Escalate (Linear) → Alert (Discord) │
│                                                                       │
│  + signalOverrides (new)  + sovereigntyState (new)  + pipelineErrors │
└────────────────────────────────────┬────────────────────────────────┘
                                     │ Convex HTTP queries
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 DIXIE GOVERNANCE LAYER (brain)                       │
│                                                                       │
│  Sovereignty Engine  │  Discord Slash Commands  │  Knowledge Corpus  │
│  Circuit Breaker     │  Ruggy Identity          │  Compound Learning │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Signal Lifecycle

```
1. USER submits feedback via product repo widget
2. Widget POSTs to constructs.network/api/signals (sk_live_ key)
3. CONVEX ingest(): validate key → rate limit → dedup → store
4. CONVEX classify(): Haiku classification (async, <30s p95, 3 retries)
5. SOVEREIGNTY CHECK: tier determines auto-escalation vs human review
6. CONVEX escalate() → Linear issue (bug template 707cddad / UTC 5377584f)
7. CONVEX alertDiscord() for CRITICAL/HIGH (5-min debounce)
8. LINEAR webhook → CONVEX sync (Done→resolved, Canceled→dismissed)
9. OVERRIDE: human changes classification → logged to signalOverrides
```

### 2.3 Convex ↔ Dixie Boundary

| Convex (real-time, event-driven) | Dixie PostgreSQL (governed, transactional) |
|----------------------------------|-------------------------------------------|
| Signal store (ingestion, dedup, classification) | GovernedResource state (audit trail) |
| Signal overrides (rolling window) | Sovereignty tier history (all transitions) |
| Dashboard subscriptions (live) | Compound learning patterns (passive) |
| API key validation cache | API key master records |
| Rate limit windows | Knowledge corpus metadata |

**Bridge**: Dixie reads Convex via HTTP queries for Discord commands and dashboard data. Sovereignty state lives ONLY in Convex (where classification decisions are made) — no bridge needed for the hot path. Dixie fork handles Discord interactions and knowledge queries, not real-time governance decisions.

---

## 3. Component Design

### 3.1 Dixie Fork — Identity Swap

**Repo**: `construct-ruggy` (fork of `loa-dixie`)

**5 Oracle Identity Change Points** (from audit):

| File | Change |
|------|--------|
| `persona/oracle.md` | Replace with `persona/ruggy.md` |
| `knowledge/oracle-binding.yaml` | Replace with `knowledge/ruggy-binding.yaml` |
| `app/src/routes/identity.ts` | `'oracle'` → parameterize from binding (3 occurrences) |
| `app/src/routes/chat.ts` | `agentId: 'oracle'` → read from binding |
| `app/src/services/corpus-meta.ts` | `KNOWN_REPOS` at line 265 → Ruggy's 6 repos |

**New binding** (`knowledge/ruggy-binding.yaml`):
```yaml
agent_id: ruggy
name: Ruggy
model:
  pool: default
  temperature: 0.3
  max_tokens: 4096
knowledge:
  mode: full
  default_budget_tokens: 30000
identity:
  type: hand_crafted
persona_path: persona/ruggy.md
sources_path: knowledge/sources.json
```

**New KNOWN_REPOS**:
```typescript
const KNOWN_REPOS: Array<{ repo: string; sourceIds: string[] }> = [
  { repo: 'midi-interface',       sourceIds: ['product-repos'] },
  { repo: 'mibera-honeyroad',     sourceIds: ['product-repos'] },
  { repo: 'mcv-interface',        sourceIds: ['product-repos'] },
  { repo: 'cubquests-interface',  sourceIds: ['product-repos'] },
  { repo: 'set-and-forgetti',     sourceIds: ['product-repos'] },
  { repo: 'apdao-auction-house',  sourceIds: ['product-repos'] },
];
```

**Test strategy**: Run existing 2,431 tests after identity swap. Expected breakage: tests asserting "Oracle" in responses, identity route tests, knowledge contract tests. Timebox: 1 day. If >50% break, write new Ruggy-specific tests only.

### 3.2 Convex Schema Extensions

**New table: `signalOverrides`** — tracks human classification changes for sovereignty calculation.

```typescript
signalOverrides: defineTable({
  signalId: v.id("signals"),
  appSlug: v.string(),
  originalClassification: v.object({
    level1Symptom: v.string(),
    level2Want: v.string(),
    level3Hypothesis: v.string(),
    confidence: v.number(),
    labels: v.array(v.string()),
  }),
  overriddenClassification: v.object({
    level1Symptom: v.string(),
    level2Want: v.string(),
    level3Hypothesis: v.string(),
    confidence: v.number(),
    labels: v.array(v.string()),
  }),
  overriddenBy: v.string(),
  reason: v.optional(v.string()),
  timestamp: v.number(),
}).index("by_app_timestamp", ["appSlug", "timestamp"])
  .index("by_signal", ["signalId"]),
```

**New table: `sovereigntyState`** — current tier per scope.

```typescript
sovereigntyState: defineTable({
  scope: v.string(),             // "global" or app_slug
  tier: v.union(v.literal("constrained"), v.literal("standard"), v.literal("autonomous")),
  overrideRate: v.number(),      // 0.0 - 1.0
  signalCount: v.number(),       // signals in window
  overrideCount: v.number(),     // overrides in window
  windowDays: v.number(),        // 7 or 30 (adaptive)
  manualOverride: v.optional(v.object({
    tier: v.string(),
    setBy: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  })),
  lastTransition: v.optional(v.object({
    from: v.string(),
    to: v.string(),
    timestamp: v.number(),
    trigger: v.string(),
  })),
  updatedAt: v.number(),
}).index("by_scope", ["scope"]),
```

### 3.3 Sovereignty Engine

**Tier transitions** (enhanced per SKP-005a — minimum sample size):

```
CONSTRAINED (default)
  ↓  override_rate < 40% AND signal_count >= 20
STANDARD
  ↓  override_rate < 15% AND signal_count >= 50
AUTONOMOUS
```

**Adaptive window**: ≥10 signals/week → 7-day window. <10 signals/week → 30-day window. Prevents noise-driven tier transitions on low volume.

**Circuit breaker** (SOUL.md): 5 consecutive failures → halt. Same error 3× → halt. Manual reset via Discord command.

**Rate limits** (SOUL.md): Max 5 Linear issues/day per repo. 1 hour between issues to same repo.

**Implementation**: Convex cron `recalculateSovereignty` runs hourly. Reads `signalOverrides` for rolling window, updates `sovereigntyState`. The `classify` → `escalate` path checks tier before scheduling Linear creation.

**Maintainer burden relief** (SKP-004): Start apdao-auction-house at STANDARD tier. Origin repo, lowest risk, validates autonomous classification path faster.

### 3.4 Widget Integration Strategy

**Day 0 Audit Results**:

| Repo | Local Path | Widget Status | Backend | Integration |
|------|-----------|--------------|---------|-------------|
| midi-interface (mibera-dimensions) | `/Users/zksoju/Documents/GitHub/midi-interface/` | Pulse widget + feedback dialog | Supabase `score_feedback` | Fan-out after Supabase write |
| mibera-honeyroad | `/Users/zksoju/Documents/GitHub/mibera-honeyroad/` | None | — | New widget in `(main)/layout.tsx` |
| mcv-interface | `/Users/zksoju/Documents/GitHub/mcv-interface/` | Vault rating modal (bad/fine/good) | Convex `vaultFeedback` | Convex HTTP action after insert |
| cubquests-interface | `/Users/zksoju/Documents/GitHub/cubquests-interface/` | None | — | New widget in `components/layout/navbar.tsx` |
| set-and-forgetti | `/Users/zksoju/Documents/GitHub/set-and-forgetti/` | Popover + dialog in navbar | Linear (AI-classified) | Fan-out after `createFeedbackIssue()` |
| apdao-auction-house | `/Users/zksoju/Documents/GitHub/apdao-auction-house/` | Popover + screenshot upload | Linear (AI spam+priority) | Fan-out after `createIssue()` |

**Fan-out pattern** (4 repos with existing widgets):

```typescript
// Fire-and-forget after existing feedback submission succeeds
try {
  await fetch('https://constructs.network/api/signals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SIGNALS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'feedback_widget',
      severity: derivedSeverity,
      title: feedbackTitle,
      data: { type: 'feedback', category, description },
    }),
  });
} catch (err) {
  // Log failure — don't block existing pipeline, but make it observable
  console.error('[ruggy-fanout] Signal forwarding failed:', err instanceof Error ? err.message : err);
}
```

**Integration points per repo**:

| Repo | File | Insert After |
|------|------|-------------|
| midi-interface | `app/actions/feedback.ts` | Supabase `score_feedback` insert |
| mcv-interface | `convex/feedback.ts` | Convex scheduled HTTP action after `submit` mutation |
| set-and-forgetti | `apps/web/app/api/feedback/route.ts` | `createFeedbackIssue()` success |
| apdao-auction-house | `actions/create-feedback.ts` | `createIssue()` success |

**New widget pattern** (2 repos — honeyroad, cubquests):

Copy `apps/explorer/components/feedback-widget.tsx` and adapt:
- Remove explorer-specific imports
- Configure per-repo API key via env var
- Point at `https://constructs.network/api/signals`
- Match repo's design system

**mcv special case**: Convex mutations can't call external HTTP APIs directly. Solution: schedule a Convex HTTP action (`ctx.scheduler.runAfter`) after the `submit` mutation that POSTs to the signals API.

### 3.5 Discord Slash Commands

**Architecture**: Discord Interactions endpoint on Dixie fork. HTTP-based (not gateway bot). Ed25519 signature verification.

**Route**: `POST /api/discord/interactions` (Dixie fork)

| Command | Data Source | Response |
|---------|-----------|----------|
| `/ruggy status` | Convex `statusCounts()` + `sovereigntyState` | Health score, volumes (24h/7d), tier per repo |
| `/ruggy signals [repo]` | Convex `byApp(appSlug)` | Recent signals with classification |
| `/ruggy escalations` | Convex `status: 'escalated'` query | Open Linear issues with links |
| `/ruggy repos` | Convex `statusCounts()` | All repos with signal counts + tier |

**Response format**: Discord embeds with severity color coding (critical=red, high=amber, medium=blue, low=gray). Deferred responses for multi-query commands.

### 3.6 Enhanced Classification

Existing Haiku classifier works. Ruggy enhances the prompt with app-specific context:

```
You are Ruggy, an ecosystem health triage agent for 0xHoneyJar products.

Context about {appSlug}:
{knowledge_snippet}

Classify this user feedback:
- App: {appSlug}
- Title: {title}
- Description: {description}
- Frustration: {frustration}/5

Respond with JSON:
{
  "type": "bug" | "utc",
  "level1Symptom": "...",
  "level2Want": "...",
  "level3Hypothesis": "...",
  "severity": "critical" | "high" | "medium" | "low",
  "category": "crash" | "regression" | "broken_feature" | "data_issue" |
              "feature_request" | "ux_friction" | "performance" | "confusion" | "praise",
  "confidence": 0.0-1.0,
  "labels": ["..."]
}
```

The `knowledge_snippet` is a short context block per app stored alongside the classification prompt, giving Haiku context about what the app does and known issues.

### 3.7 Knowledge Corpus

Following Dixie's `sources.json` pattern:

| Source | Priority | Required | Tokens |
|--------|----------|----------|--------|
| `product-repos.md` | 1 | Yes | 8000 |
| `signal-taxonomy.md` | 1 | Yes | 4000 |
| `observer-workflow.md` | 2 | Yes | 4000 |
| `linear-config.md` | 2 | Yes | 3000 |
| `construct-registry.md` | 3 | No | 5000 |
| `ecosystem-map.md` | 3 | No | 4000 |

---

## 4. Security Architecture

### 4.1 Client-Side API Key Protection (SKP-001)

| Layer | Protection | Status |
|-------|-----------|--------|
| Rate limiting | 100 signals/key/hour (sliding window) | Deployed |
| Origin validation | `Origin`/`Referer` check against per-key domain allowlist | **New** |
| Body validation | Zod schema rejects malformed payloads | Deployed |
| Stack trace sanitization | Strips secrets from traces | Deployed |
| Dedup | 5-minute time bucket dedup | Deployed |
| Key revocation | Immediate via `DELETE /v1/keys/:id` | Deployed |
| Cost ceiling | 100 signals/hr × $0.001 = $2.40/day worst case per key | Acceptable |

**New: Origin validation** (add to `apps/explorer/app/api/signals/route.ts`):

```typescript
const ALLOWED_ORIGINS: Record<string, string[]> = {
  'midi-interface':       ['https://mibera.xyz', 'http://localhost:3000'],
  'mibera-honeyroad':     ['https://honeyroad.xyz', 'http://localhost:3000'],
  'set-and-forgetti':     ['https://setandforgetti.com', 'http://localhost:3000'],
  'apdao-auction-house':  ['https://apiology.xyz', 'http://localhost:3000'],
  'mcv-interface':        ['https://moneycomb.xyz', 'http://localhost:3000'],
  'cubquests-interface':  ['https://cubquests.xyz', 'http://localhost:3000'],
};
```

**Phase 2**: Short-lived signed tokens (server-issued, 15-min TTL).

### 4.2 Key Lifecycle (SKP-002)

| Policy | Value |
|--------|-------|
| Rotation | 90 days advisory |
| Revocation | Immediate via API |
| Compromise response | Revoke → provision new → update env → deploy |
| Audit | `lastUsedAt` on `apiKeys` table |

### 4.3 Trust Boundary

| Can Write To | Gate |
|-------------|------|
| Convex signal store | Rate-limited, key-validated |
| Convex signalOverrides | writeKey-gated |
| Linear issues | Personal key, template-constrained |
| Discord messages | Webhook URL |
| grimoires/gecko/ | Filesystem (Dixie fork only) |

---

## 5. Failure Handling (SKP-003)

### 5.1 Existing Protections

| Step | Failure Mode | Existing Handling |
|------|-------------|-------------------|
| Ingestion | Convex down | 500 to client (client retries) |
| Classification | Haiku error | 3 retries + 5-min cron |
| Linear creation | Linear error | 3 retries + hourly reconciliation |
| Discord alert | Webhook fail | Silent (fire-and-forget) |
| Status sync | Webhook miss | Hourly reconciliation polls Linear |

### 5.2 New: Pipeline Error Alerting

After 3 failed Linear creation attempts, alert Discord #ops:

```typescript
if (signal.linearCreationAttempts >= 3) {
  await ctx.scheduler.runAfter(0, internal.signals.alertPipelineError, {
    signalId, error: 'Linear creation failed after 3 attempts', step: 'linear_escalation',
  });
}
```

### 5.3 Idempotency

| Operation | Key | Strategy |
|-----------|-----|----------|
| Signal ingestion | `incidentGroupId` (5-min bucket) | Dedup on match |
| Classification | `classificationAttempts` counter | Max 3, no infinite retry |
| Linear creation | `linearIssueId` field | Only creates if null |
| Discord alert | `discordAlertedAt` field | Only alerts once |
| Override recording | Signal ID + timestamp | Append-only |

---

## 6. Operational SLOs (SKP-007)

| SLO | Target | Measurement |
|-----|--------|-------------|
| Ingestion availability | 99.5% | Heartbeat cron (existing) |
| Classification p95 latency | <30s | `classifiedAt - createdAt` |
| Linear creation success rate | >95%/day | `linearCreationAttempts < 3` ratio |
| Alert delivery latency | <5 min from classification | `discordAlertedAt - classifiedAt` |

Not vanity — these are the operational guarantees required for TTA <4h HIGH, <1h CRITICAL.

---

## 7. Deployment Architecture

### 7.1 Dixie Fork

Railway deployment. Environment:

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | New PostgreSQL (Supabase or Railway) |
| `REDIS_URL` | New Redis (Upstash or Railway) |
| `CONVEX_URL` | Existing: `quaint-anaconda-866` (prod) |
| `CONVEX_WRITE_KEY` | Existing (shared with explorer) |
| `DISCORD_APPLICATION_ID` | New Discord app |
| `DISCORD_PUBLIC_KEY` | New Discord app |

### 7.2 Convex Changes

Deploy to existing instance. Additions:
- Tables: `signalOverrides`, `sovereigntyState`
- Functions: `recordOverride`, `recalculateSovereignty`, `alertPipelineError`
- Modified: `classify` (enhanced prompt)
- Cron: `recalculateSovereignty` (hourly)

### 7.3 Phased Rollout (SKP-005b)

| Phase | Day | Repos | Approach |
|-------|-----|-------|----------|
| 1 | 2-3 | set-and-forgetti, apdao-auction-house | Fan-out (existing widgets + Linear) |
| 2 | 3-4 | midi-interface, mcv-interface | Fan-out (existing widgets, different backends) |
| 3 | 4-5 | cubquests-interface, mibera-honeyroad | New widgets built |

---

## 8. Cost Architecture

| Component | Cost/month |
|-----------|-----------|
| Haiku classification | ~$3 (100 signals/day × $0.001) |
| Railway (Dixie fork) | ~$5 |
| Convex | $0 (free tier) |
| Linear | $0 (existing) |
| Discord | $0 |
| **Total** | **~$8/month** |

Hard ceiling: $3/day. Enforced via classification count in Convex.

---

## 9. Ruggy Identity (BEAUVOIR)

`persona/ruggy.md` — hand-crafted, not dAMP-96 generated.

Core: lowercase energy, bazaar trader archetype, speaks from experience not authority. Classifies and recommends — humans decide. Never surveils, never extrapolates desire from behavior, never optimizes for engagement.

Banned words: exciting, incredible, massive, revolutionary, game-changing, conviction, stay tuned, trust the process.

---

## 10. Timeline (Revised)

| Day | Deliverable |
|-----|------------|
| 0 | Provision 6 API keys via `POST /v1/keys`. Discord app setup |
| 1 | Fork loa-dixie → construct-ruggy. Identity swap (5 files). Run tests |
| 2 | Convex extensions (signalOverrides, sovereigntyState, enhanced classify). Origin validation |
| 2-3 | Fan-out PRs: set-and-forgetti, apdao-auction-house, midi-interface |
| 3 | Sovereignty engine + circuit breaker. mcv-interface Convex HTTP action PR |
| 4 | Discord slash commands (`/ruggy status` first). New widget PRs: cubquests, honeyroad |
| 5 | E2E integration test. Deploy Dixie fork (Railway). Convex deploy |

---

*Grounded in: cycle-044 Convex signal infrastructure (deployed, 10/10 E2E), loa-dixie fork surface (5 identity points, 2,431 tests), Day 0 product repo audit (4 have widgets, 2 need them). Flatline skeptic concerns (Opus + GPT-5.3 + Gemini 2.5 Pro) addressed in Sections 4-6.*
