# Synthesis — Gecko Architecture Proposal

> four streams converge into one system.

## The Thesis

Gecko is not a bot, not a dashboard, not a CLI tool. Gecko is an **ecosystem intelligence agent** — a team member that watches the constructs network, classifies what it sees, and acts when action is warranted. It exists across three surfaces (CLI, Linear, signals dashboard) and operates as a compound AI system with tiered model selection.

The architecture emerges from four research streams:

| Stream | Key Inheritance |
|--------|----------------|
| Ruggie lineage | Shape paradigm, tiered models, Linear-as-bus, anti-gaming philosophy |
| Linear ecosystem | Agent SDK identity, delegation model, 10s ACK, structured progress |
| CLI architecture | incur framework, CLI>MCP, dual-mode execution, TOON output |
| AI patterns | OODA loop, ReAct reasoning, state machines, circuit breakers, cost tiering |

## Architecture

### Three Surfaces, One Agent

```
                    ┌─────────────────────┐
                    │    GECKO CORE        │
                    │  (Convex + State)    │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
       ┌──────▼──────┐ ┌──▼──────────┐ ┌───▼──────────┐
       │  gecko-cli   │ │ gecko-agent  │ │  dashboard    │
       │  (incur)     │ │ (Linear SDK) │ │  (/signals)   │
       │              │ │              │ │               │
       │ Actions:     │ │ Identity:    │ │ Display:      │
       │  triage      │ │  delegation  │ │  inbox        │
       │  classify    │ │  sessions    │ │  detail       │
       │  patrol      │ │  progress    │ │  triage       │
       │  escalate    │ │  lifecycle   │ │  analytics    │
       │              │ │              │ │               │
       │ Context:     │ │ Actions:     │ │ Input:        │
       │  MCP bridge  │ │  calls CLI   │ │  feedback     │
       │  skill files │ │  internally  │ │  widget       │
       └──────────────┘ └─────────────┘ └───────────────┘
```

**gecko-cli** does the work. **gecko-agent** manages identity and delegation. **dashboard** shows the results. All three share the same Convex state layer.

### Data Flow

```
SIGNALS (feedback widget, API, webhooks)
    │
    ▼
INGESTION (Convex action, rate-limited, deduped)
    │
    ▼
CLASSIFICATION (Haiku — severity, category, routing)
    │
    ├─── LOW → Dashboard only. No action.
    ├─── MEDIUM → Linear issue (auto-created). Dashboard.
    ├─── HIGH → Linear issue + Discord alert. Dashboard.
    └─── CRITICAL → Linear issue + Discord + @team mention. Dashboard.
    │
    ▼
CORRELATION (Sonnet — cross-signal pattern detection)
    │
    ├─── Isolated signal → resolve via single issue
    └─── Pattern detected → incident group → Opus investigation
    │
    ▼
PATROL (scheduled, ReAct-based)
    │
    ├─── OBSERVE: scan signals, PRs, deployments, issues
    ├─── ORIENT: correlate, classify, identify patterns
    ├─── DECIDE: triage (route, escalate, dismiss)
    └─── ACT: create/update issues, post comments, send alerts
```

### State Machine

```
                    ┌──────────┐
                    │   IDLE   │◄─────────────────────┐
                    └────┬─────┘                      │
                         │ (cron / delegation)        │
                    ┌────▼─────┐                      │
              ┌─────┤ OBSERVE  │                      │
              │     └────┬─────┘                      │
              │          │                            │
              │     ┌────▼─────┐                      │
              │     │  ORIENT  │                      │
              │     └────┬─────┘                      │
              │          │                            │
              │     ┌────▼─────┐     ┌──────────┐    │
              │     │  DECIDE  ├────►│ ESCALATE ├────┤
              │     └────┬─────┘     └──────────┘    │
              │          │                            │
              │     ┌────▼─────┐                      │
              │     │   ACT    ├──────────────────────┘
              │     └──────────┘
              │
              │     ┌──────────┐
              └────►│ ERRORED  │──── (backoff) ───────┐
                    └──────────┘                      │
                                                      ▼
                                                    IDLE
```

State persisted in Convex. Survives process restarts. Queryable from dashboard.

### Model Tiering

| Tier | Model | Purpose | Cost/op | Volume |
|------|-------|---------|---------|--------|
| T0: Filter | Regex/rules | Spam, duplicates, known patterns | Free | 100% |
| T1: Classify | Haiku 3.5 | Severity, category, routing | $0.001 | ~50% pass T0 |
| T2: Investigate | Sonnet 4 | Cross-signal correlation, root cause | $0.05 | ~10% of T1 |
| T3: Plan | Opus 4 | Complex incident response, architecture | $0.50 | ~1% of T2 |

Expected: 100 signals/day → 50 classified → 5 investigated → 0.5 planned. **~$1/day.**

### Component Ownership

| Component | Where It Lives | Why |
|-----------|----------------|-----|
| gecko-cli | `packages/gecko-cli/` (monorepo) or standalone repo | CLI binary, incur-based |
| gecko-agent | Convex functions + Linear Agent SDK registration | Real-time, persistent |
| gecko-mcp | Auto-generated from CLI (incur `--mcp`) | Context bridge for AI agents |
| patrol scheduler | Convex cron jobs | Already have the pattern |
| signal store | Convex tables (already exist) | Already deployed |
| dashboard | `apps/explorer/app/dashboard/signals/` | Already exists |
| feedback widget | `apps/explorer/components/feedback-widget.tsx` | Already deployed |

## Implementation Phases

### Phase 0: Foundation (already done)

- [x] Signals pipeline (Convex ingestion, dedup, storage)
- [x] Linear integration (auto-escalation, webhook sync)
- [x] Discord alerting (critical signals)
- [x] Dashboard (inbox, detail, triage)
- [x] Feedback widget (all explorer pages)
- [x] API key infrastructure (per-app, Convex-synced)
- [x] E2E tested (10/10 passing, LAB-913 created)

### Phase 1: CLI + Classification

Build `gecko-cli` on incur. Core commands:

```
gecko signals list              # View unclassified signals
gecko signals classify          # Run Haiku classification on pending
gecko signals triage            # Interactive triage (or auto with --auto)
gecko issues list               # Linear issues from signals
gecko issues create             # Create from signal
gecko patrol --depth shallow    # Quick ecosystem scan
gecko status                    # Gecko health + stats
```

Haiku auto-classification on signal ingestion (Convex action, already have the store-first pattern).

**Deliverable**: CLI binary that wraps signals API + Linear GraphQL. Auto-generates MCP server and skill files.

### Phase 2: Linear Agent Identity

Register Gecko as a Linear agent via Agent SDK:
- Agent identity (shows in team roster)
- Delegation handling (accept assigned issues)
- Session lifecycle (acknowledge → in-progress → complete)
- Structured progress updates

The delegation model changes how Gecko works fundamentally. Instead of only watching and reacting, Gecko can be ASKED to investigate something. A team member assigns an issue to Gecko, Gecko acknowledges in 10s, investigates using its CLI tools, and reports findings.

**Deliverable**: Gecko appears in Linear team, accepts delegations, reports structured progress.

### Phase 3: Patrol Loop

The autonomous observation cycle:

```
Every 15 minutes (configurable):
  1. OBSERVE
     - Fetch new signals since last patrol
     - Check for new/updated PRs across monitored repos
     - Check deployment status
     - Check Linear for delegated issues

  2. ORIENT
     - Classify unclassified signals (Haiku)
     - Correlate signals with recent PRs/deploys
     - Identify incident groups (same root cause)
     - Check for pattern matches against known issues

  3. DECIDE
     - New isolated signal → auto-triage based on severity
     - Correlated pattern → create incident group, investigate
     - Delegated issue → acknowledge and start investigation
     - Stale issues → nudge or auto-close

  4. ACT
     - Create/update Linear issues with evidence
     - Post Discord alerts for escalations
     - Update dashboard state
     - Log patrol results
```

Circuit breaker: if 3 consecutive patrols produce errors, stop acting and alert human.

**Deliverable**: Convex cron-based patrol loop with state machine, circuit breaker, and dashboard visibility.

### Phase 4: Cross-Repo Intelligence

Expand observation from explorer-only to all product repos:
- midi-interface (Observer production)
- mcv-interface (most mature, 92 sprints)
- rektdrop-interface (Easel-dominant)
- apdao (origin repo)
- set-and-forgetti (gold standard)
- honeycomb-lp (Berachain native)

Each repo gets a feedback widget (construct-based install) and API key. Signals flow to the same pipeline. Gecko sees everything.

**Deliverable**: Multi-repo signal ingestion, cross-repo correlation, unified dashboard.

### Phase 5: Compound Learning

Port moltbot's compound learning architecture to Convex:

```
PatternStorage: Store observed patterns with confidence scores
PatternDetector: Match new signals against stored patterns
SkillExtractor: When a pattern matures (enough observations), extract it as a skill
PatternDecay: Reduce confidence over time, prune stale patterns
```

This is where Gecko stops being reactive and starts being predictive. After enough observations, it recognizes "when PR changes auth middleware and error signals spike within 30 minutes, it's usually a JWT regression" — and acts on that recognition faster each time.

**Deliverable**: Pattern storage in Convex, confidence scoring, decay, and skill extraction.

## What We're NOT Building

| Not This | Why Not |
|----------|---------|
| A Discord bot | Ruggie was a Discord bot. Gecko is ecosystem infrastructure. Discord is one alert channel. |
| A monitoring SaaS | We're not competing with Datadog. Gecko monitors constructs, not infrastructure. |
| A general-purpose agent framework | Gecko is domain-specific. It knows about constructs, signals, Linear, and the HoneyJar ecosystem. |
| A replacement for Bridgebuilder | Bridgebuilder reviews code quality. Gecko watches ecosystem health. Different loops, same team. |
| Everything at once | Phase 1 ships a CLI. Phase 5 ships compound learning. Could be months between them. |

## Key Design Decisions

### 1. Convex as State Layer (not Supabase)

Convex provides:
- Reactive subscriptions (dashboard updates in real-time)
- Scheduled functions (patrol cron)
- Durable state (survives process restarts)
- Built-in auth (already wired)

Supabase is the API's database. Convex is Gecko's brain.

### 2. incur as CLI Framework (not commander/yargs)

incur provides:
- Agent-first design (TOON, CTAs, skill files)
- MCP bridge (free)
- HTTP duality (CLI + server from same code)
- Zod schemas (same validation everywhere)

### 3. Linear Agent SDK (not just webhooks)

The delegation model is the killer feature. Gecko becomes a team member that can be directed, not just a service that reacts.

### 4. Tiered Models (not one model)

Cost control and quality optimization. Haiku for the 90% that's trivial. Opus for the 1% that matters.

### 5. CLI > MCP for Actions

CLIs compose, fail loudly, run anywhere. MCPs mediate. The CLI does the work. The MCP is a bridge for agents that need it.

## Open Questions

1. **Where does gecko-cli live?** Monorepo `packages/gecko-cli/` or standalone `construct-gecko` repo?
2. **Agent registration timing**: Register with Linear now (before CLI) or after CLI is working?
3. **Patrol frequency**: 15-minute default? Configurable per-repo?
4. **Cross-repo key distribution**: Manual API key creation per repo, or automated via construct install?
5. **Learning system scope**: Start with pattern matching only, or include full compound learning from Phase 1?
6. **Cost budget**: Hard cap on daily spend? Alert threshold?
