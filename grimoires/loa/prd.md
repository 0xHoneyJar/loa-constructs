# PRD: Ruggy — Autonomous Ecosystem Intelligence Agent

**Cycle**: cycle-045
**Created**: 2026-03-12
**Status**: Draft
**Foundation**: cycle-044 (Centralized Observability Dashboard — deployed, E2E tested)
**Context**:
- `grimoires/gecko/context-pack/` (16 files, ~150KB — complete research package)
- `grimoires/loa/context/ruggy-ecosystem-intelligence.md` (synthesis)
- `grimoires/loa/context/prd-cycle-044-signals.md` (foundation PRD)
- `grimoires/gecko/autoresearch-pi-dig-trail.md` (deep research trail)

**Review**:
- Observer construct: feedback capture rigor, signal taxonomy, UTC/bug classification
- Bridgebuilder: architecture quality, Dixie fork viability, scope discipline
- Protocol construct: data flow correctness, Convex↔PostgreSQL boundary
- Gecko BEAUVOIR: voice, identity coherence, anti-patterns

---

## 1. Problem Statement

The 0xHoneyJar ecosystem operates 5+ live product apps across Berachain with no automated feedback-to-action pipeline. Cycle-044 built the signal infrastructure (Convex ingestion, Haiku classification, Linear escalation, Discord alerting, dashboard). But that infrastructure only works inside the explorer app. The product repos where users actually encounter bugs — mibera-dimensions, mcv-interface, cubquests-interface, set-and-forgetti, apdao-auction-house — have no connection to it.

The gap: **users hit bugs in product apps, but the team discovers them manually** — via Discord messages, direct reports, or stumbling into them during unrelated work. The constructs network API crash loop (2026-03-12, Bun/bcrypt segfault) was discovered accidentally. Zero product repos have error tracking, alerting, or feedback routing.

Ruggy closes this gap. Not by building new infrastructure — by connecting the infrastructure that exists to the repos that need it.

> Sources: grimoires/gecko/context-pack/00-framing.md, grimoires/gecko/context-pack/10-ground-truth.md, grimoires/loa/context/prd-cycle-044-signals.md

## 2. Vision

Ruggy is the business bear. it makes sure business is going smoothly.

Ruggy is a Dixie deployment — a fork of loa-dixie (the governed multi-agent BFF) configured with Ruggy's identity, knowledge, and skills. It monitors 5 product repos, classifies user feedback as bugs or user-to-creator signals (UTCs), creates Linear issues following the Observer workflow, and reports ecosystem health via Discord.

The vision is not "build an autonomous agent." The vision is: **when something breaks in any product repo, the team knows within hours, not days.**

> Sources: grimoires/gecko/context-pack/11-decisions.md, grimoires/gecko/context-pack/15-reframe-dixie-as-template.md

## 3. Goals & Success Metrics

### Primary Goal
Reduce Time to Awareness (TTA) for product repo issues from "unknown" (currently unmeasured, likely days) to <4 hours for HIGH severity and <1 hour for CRITICAL.

### Success Metrics (Real, Not Vanity)

| Metric | Definition | Month 1 Target | Month 3 Target |
|--------|-----------|----------------|----------------|
| **Time to Awareness (TTA)** | Time from user feedback submission to first human view of the Linear issue | Establish baseline | <4h HIGH, <1h CRITICAL |
| **Human Override Rate** | % of Ruggy's classifications that a human changes | <50% (learning) | <25% |
| **Signal-to-Action Ratio** | % of ingested signals that lead to a code change, fix, or design decision within 7 days | >5% | >10% |
| **Coverage Gap Detection** | CRITICAL incidents discovered outside Ruggy's pipeline (found via other channels) | Log all gaps | 0 missed CRITICALs |
| **Cost per Actionable Signal** | Total Ruggy spend (API + infra) / count of signals that led to action | <$10 | <$5 |

### What We Explicitly Don't Track

Total signal volume, widget install count, Discord command usage, uptime percentage, classification speed, number of Linear issues created. These are vanity — they measure deployment, not value.

> Sources: grimoires/gecko/context-pack/16-real-metrics.md

## 4. Users & Stakeholders

### Primary Users

**Product repo users** — people using mibera-dimensions, mcv-interface, cubquests-interface, set-and-forgetti, or apdao-auction-house who encounter bugs or have feedback. They interact with existing feedback UI in each app. They don't know Ruggy exists.

**The development team** (@janitooor + 1-2 devs) — they receive classified, labeled, routed Linear issues instead of raw Discord messages. They review Ruggy's triage via the dashboard and Linear. They override Ruggy's classification when it's wrong.

### Secondary Users

**Construct authors** — future. When Ruggy observes patterns across construct usage, authors get signal about what's working and what's not.

### Stakeholders

- **@janitooor** — primary maintainer, sole reviewer, final authority on all overrides
- **0xHoneyJar team** — receives ecosystem health reports

## 5. Functional Requirements

### FR-1: Dixie Fork & Identity Configuration

Fork loa-dixie. Replace:
- `persona/oracle.md` → `persona/ruggy.md` (hand-crafted BEAUVOIR: bazaar trader, lowercase energy)
- `knowledge/oracle-binding.yaml` → `knowledge/ruggy-binding.yaml`
- `knowledge/sources.json` → Ruggy's domain knowledge (5 product repos, signal taxonomy, construct registry, Linear config, Observer workflow)
- `knowledge/contracts/oracle-requirements.json` → `knowledge/contracts/ruggy-requirements.json`

Fix hardcoded Oracle references:
- `identity.ts` fallback `nftId: 'oracle'` → parameterize from binding
- `CorpusMeta.KNOWN_REPOS` → drive from binding or config

Run existing test suite. Fix what breaks from identity swap.

**Acceptance criteria**: Dixie fork boots, passes health check, returns Ruggy identity from `/api/health`. Knowledge queries return Ruggy-domain results.

### FR-2: Signal Triage Pipeline (Observer Workflow)

Implement the feedback-to-issue pipeline:

```
User feedback (existing UI in product repo)
  → POST api.constructs.network/v1/signals (per-app API key)
  → Convex signal store (dedup, store-first)
  → Haiku classification (async, via cheval multi-model routing)
    ├── bug → severity (critical/high/medium/low) + category
    └── UTC → severity + category
  → Linear issue creation
    ├── bug template (707cddad)
    └── UTC template (5377584f)
    └── labels: [source_repo, severity, category, ruggy-triage]
  → Discord alert (CRITICAL/HIGH only, via webhook)
```

**Acceptance criteria**: End-to-end test — submit feedback from a product repo widget → signal appears in Convex → Haiku classifies → Linear issue created with correct template and labels → Discord alert fires for HIGH/CRITICAL.

### FR-3: Malleable Widget Integration (5 Product Repos)

Insert signal ingestion logic into existing feedback UI in each product repo. Do NOT replace or restyle the existing UI — inject the POST to signals API alongside whatever the existing form does.

| Repo | Priority | Notes |
|------|----------|-------|
| mibera-dimensions | 1 | Paired with honeyroad |
| mibera-honeyroad | 1 | Paired with dimensions |
| mcv-interface | 2 | Most mature, highest expected signal density |
| cubquests-interface | 3 | Active product |
| set-and-forgetti | 4 | Gold standard dApp |
| apdao-auction-house | 5 | Origin repo |

Each repo gets a per-app API key (`sk_live_...`) synced to Convex.

**Acceptance criteria**: Each product repo submits feedback to the signals API. Signal arrives in Convex tagged with correct `app_slug`. Existing feedback UX is unchanged.

**Discovery required**: Audit each repo's current feedback UI before implementation. Document what exists and what needs modification.

### FR-4: Discord Hybrid (Alerts + Commands)

**Webhook alerts** (push, fire-and-forget):
- CRITICAL/HIGH signal alerts in #alerts channel
- Daily summary in #ops channel (if signals were classified)

**Slash command bot** (interactive):
- `/ruggy status` — health score, signal volume (24h/7d), active incidents
- `/ruggy signals [repo]` — recent signals with classification for a specific repo
- `/ruggy escalations` — open Linear issues created from signals
- `/ruggy repos` — all monitored repos with signal counts

**Acceptance criteria**: Webhook alerts fire for CRITICAL/HIGH signals. Slash commands return correct data from Convex. Bot handles errors gracefully.

### FR-5: Sovereignty Tier System

Override rate drives autonomy tier automatically:

| Override Rate | Tier | Behavior |
|---------------|------|----------|
| >40% | CONSTRAINED | Ruggy classifies but ALL issues require human review before creation |
| 15-40% | STANDARD | Ruggy creates LOW/MEDIUM issues autonomously. HIGH/CRITICAL require review |
| <15% | AUTONOMOUS | Full triage authority. Circuit breaker still active |

Manual override: team can set any tier regardless of rate. Default: CONSTRAINED.

Circuit breaker (from SOUL.md): 5 consecutive failures → halt. Same error 3 times → halt.

Rate limits (from SOUL.md): Max 5 Linear issues/day per repo. 1 hour between issues to same repo.

**Acceptance criteria**: Override rate tracked per-repo. Tier transitions happen automatically when 7-day rolling rate crosses thresholds. Manual override works. Circuit breaker halts on failure patterns.

### FR-6: Knowledge Corpus

Ruggy's knowledge base following Dixie's `sources.json` pattern:

| Source | Priority | Required | Content |
|--------|----------|----------|---------|
| product-repos.md | 1 | Yes | The 5 monitored repos — what they do, who maintains them, known issues |
| signal-taxonomy.md | 1 | Yes | Classification categories, severity definitions, routing rules |
| linear-config.md | 2 | Yes | Team ID, templates, label taxonomy, project structure |
| construct-registry.md | 3 | No | 14 constructs, their health signals, composition patterns |
| observer-workflow.md | 2 | Yes | Feedback capture → classification → labelling → issue creation flow |
| ecosystem-map.md | 3 | No | Org repos, infrastructure, team structure |

**Acceptance criteria**: Knowledge queries retrieve relevant sources. Contract tests validate corpus meets requirements. Freshness tracking reports stale sources.

## 6. Technical Requirements

### TR-1: Dixie Fork Stack

| Component | Technology | Source |
|-----------|-----------|--------|
| Runtime | Hono on Bun (Dixie's Hono, migrated to Bun) | loa-dixie fork |
| Database | PostgreSQL (Dixie's 15 migrations) | loa-dixie fork |
| Cache | Redis (projection cache, reputation cache) | loa-dixie fork |
| Real-time | Convex (signal store, dashboard, patrol state) | cycle-044 |
| Models | Claude Haiku/Sonnet/Opus via cheval | loa-dixie fork |
| CLI | incur (agent-first, TOON, MCP bridge) | New |
| Issue tracking | Linear GraphQL API | Existing (team 466d92ac) |
| Alerting | Discord webhooks + slash command bot | New |

### TR-2: Convex ↔ PostgreSQL Boundary

| Convex (real-time, reactive) | PostgreSQL (governed, transactional) |
|------------------------------|--------------------------------------|
| Signal store (ingestion, dedup) | GovernedResource state (audit trail) |
| Signal classifications | Compound learning patterns |
| Patrol state (current cycle) | Sovereignty tier history |
| Dashboard subscriptions | Override tracking (rolling 7-day) |
| API key validation cache | API key master records |

### TR-3: Cost Architecture

| Model | Cost/op | Usage |
|-------|---------|-------|
| Haiku 3.5 | $0.001 | Every signal classification |
| Sonnet 4 | $0.05 | Cross-signal investigation (10% of signals) |
| Opus 4 | $0.50 | Complex incident analysis (1% of signals) |

Target: ~$1/day for 5 repos. Hard ceiling: $3/day. Budget enforcement via cheval's existing mechanism.

### TR-4: Security

- API keys per product repo (`sk_live_...`) — SHA256 hashed in cache, cleartext never logged
- Linear API key: personal key (not OAuth agent) — stored in env, never in code
- Anthropic API key: stored in env, cost ceiling enforced
- Trust boundary: reads everything, writes only to grimoires/gecko/, Linear issues, Discord webhooks
- No direct database writes from external requests — all mutations through Convex or Dixie's middleware pipeline

## 7. Scope

### In Scope (Week 1)

- FR-1: Dixie fork with Ruggy identity
- FR-2: Signal triage pipeline (Observer workflow)
- FR-3: Malleable widget integration (5 repos)
- FR-4: Discord hybrid (alerts + commands)
- FR-5: Sovereignty tier system (starting CONSTRAINED)
- FR-6: Knowledge corpus

### Out of Scope (Phase 2+)

| Feature | Why Deferred |
|---------|-------------|
| Onchain observability (Score API) | Separate integration, separate signal type |
| Linear Agent SDK registration | Can use personal account. SDK adds complexity without users yet |
| Cross-signal correlation / incident grouping | Need signal volume data before designing correlation logic |
| Compound learning (active) | Pipeline will accumulate data passively. Active pattern extraction is Phase 2 |
| Beauvoir edge deployment (Cloudflare Workers) | Need always-on requirement before adding edge infrastructure |
| Autonomous patrol loop | Triage loop first. Proactive patrol second. |
| incur CLI | For agent self-invocation. Add after the triage pipeline proves value |

### Explicitly NOT Building

| Not This | Why |
|----------|-----|
| A Discord bot that chats | Ruggy creates issues and sends alerts. It doesn't have conversations |
| A monitoring SaaS | Not competing with Datadog. Ruggy monitors user feedback, not infrastructure |
| A general-purpose agent | Karpathy constraint: one thing well (ecosystem health triage) |
| A replacement for Bridgebuilder | Bridgebuilder reviews code quality. Ruggy watches ecosystem health. Different loops |
| Everything at once | Week 1 ships the triage loop. Compound learning is month 3+ |

## 8. Risks & Dependencies

### Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Dixie fork test breakage | Days of debugging instead of building | Timebox to 1 day. If >50% tests break, skip test fixes and focus on new tests for Ruggy-specific code |
| Product repos have no feedback UI | "Malleable insertion" has nothing to insert into | Audit repos FIRST (Day 0). Fall back to standalone widget if needed |
| Low signal volume | Can't validate metrics with 0 signals | Seed with test signals. First real validation when repos go live |
| Haiku classification accuracy | High override rate kills trust | Start CONSTRAINED. Every override is training data. Accuracy improves with corrections |
| Single maintainer bottleneck | @janitooor reviews everything | Sovereignty system reduces review burden as accuracy improves |

### Dependencies

| Dependency | Status | Risk |
|-----------|--------|------|
| Convex signal pipeline (cycle-044) | Deployed, E2E tested | Low — working |
| Linear team + templates | Configured (466d92ac) | Low — existing |
| Discord webhook | Configured | Low — existing |
| loa-dixie repo access | Private, org member | Low — same org |
| Product repo access (5 repos) | Private, org member | Low — same org |
| Anthropic API key | Configured | Low — existing |
| Per-app API keys | Infrastructure exists, keys need creation per repo | Medium — 5 keys to create and configure |

## 9. Ruggy Identity (BEAUVOIR)

Hand-crafted, not dAMP-96 generated. Adapted from ruggy-v3 IDENTITY.md + GECKO.md BEAUVOIR.

**Core traits**:
- **lowercase energy** — calm, approachable, never shouting
- **high analytical** — data-first, evidence-based triage
- **high depth** — follows signals to root causes, not symptoms
- **moderate formality** — business bear, not corporate bot
- **high citation density** — always shows its work
- **warm but measured** — cares about the ecosystem, doesn't panic

**Voice**: Direct but warm. Speaks from experience, not authority. "i've seen this before" not "the data suggests." Encourages without cheerleading. Honest about what it doesn't know.

**Anti-patterns**: Never surveil (observe, don't watch). Never extrapolate desire from behavior. Never optimize for engagement. Never mistake the registry for the bazaar.

**Banned words**: exciting, incredible, massive, revolutionary, game-changing, conviction, stay tuned, trust the process.

> Sources: grimoires/bridgebuilder/GECKO.md, /Users/zksoju/Documents/GitHub/ruggy-v3/deploy/loa-identity/IDENTITY.md, grimoires/gecko/context-pack/07-dixie-baseline.md

## 10. Timeline

| Day | Deliverable |
|-----|------------|
| 0 | Audit 5 product repos — what feedback UI exists? Document findings. |
| 1 | Fork loa-dixie. Replace persona + knowledge + binding. Run tests, fix breakage. |
| 2 | Signal triage route (Convex bridge). Haiku classifier through cheval. |
| 3 | Linear issue creation from classified signals. Observer workflow wired end-to-end. |
| 3 | Malleable widget logic PRs for product repos (based on Day 0 audit). |
| 4 | Discord hybrid — webhook alerts + slash command bot. |
| 4 | Sovereignty tier tracking (CONSTRAINED default). Circuit breaker. Rate limits. |
| 5 | Integration testing — full pipeline: widget → signal → classify → issue → alert. |
| 5 | Deploy. Start measuring TTA and override rate. |

---

*This PRD crystallizes decisions from 16 files of research across 3 sessions. Superseded architectures (standalone construct, patterns-only adoption) are archived in `grimoires/gecko/context-pack/`. The current architecture is: fork Dixie, build on top, deploy.*
