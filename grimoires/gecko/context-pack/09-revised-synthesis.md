# Revised Synthesis — Ruggy Architecture (Post-Dixie Discovery)

> the original synthesis (05) was written before we knew dixie existed. this is the updated version.

## The Reframe

The original synthesis proposed building 5 phases of infrastructure from scratch. Dixie eliminates that. The question changes from "what do we build?" to **"what do we wire together?"**

```
BEFORE (synthesis v1):
  Build CLI → Build Agent SDK → Build Patrol → Build Cross-Repo → Build Learning

AFTER (synthesis v2):
  Wire Dixie patterns + Signals pipeline + Linear Agent SDK + incur CLI
  into a standalone agent construct: construct-ruggy
```

### What Each Foundation Contributes

| Foundation | What It Provides | What It Lacks |
|-----------|-----------------|---------------|
| **Dixie** (loa-dixie) | Autonomous engine, compound learning, fleet governor, state machines, knowledge system, meeting geometries, GovernedResource pattern, sovereignty engine, 2,431 tests | No Convex, no Linear, no CLI, no signals pipeline, no cross-repo observation |
| **Signals** (constructs, cycle-044) | Convex signal store, dedup, classification, Linear routing, Discord alerts, dashboard, feedback widget, per-app API keys | No autonomous agent, no compound learning, no fleet orchestration, no personality |
| **Ruggie** (4 repos) | Shape paradigm, tiered models, Linear integration, anti-gaming philosophy, compound learning design, MCP tool patterns | Never stabilized, fragmented across repos, disabled in production |
| **incur** (wevm) | Agent-first CLI framework, MCP bridge, TOON output, OpenAPI mounting, skill file generation | Pre-1.0, no daemon mode, no built-in caching |
| **Linear Agent SDK** | First-class team member identity, delegation model, session lifecycle, 10s ACK | Thin layer, no circuit breaking, no bulk ops, raw GraphQL for full CRUD |

## Architecture: construct-ruggy

Ruggy lives in its own repo (`construct-ruggy`) following the construct pattern. It's not a module inside loa-constructs — it's a standalone agent construct that connects to the constructs network via the signals API.

```
construct-ruggy/
├── construct.yaml          — Construct manifest (domain: operations)
├── persona/
│   └── ruggy.md            — Hand-crafted BEAUVOIR (DAMP personality)
├── knowledge/
│   ├── sources.json        — Tagged knowledge manifest (dixie pattern)
│   └── sources/            — Curated markdown knowledge files
├── cli/                    — incur-based CLI
│   ├── src/
│   │   ├── cli.ts          — Cli.create('ruggy', {...})
│   │   ├── commands/       — Command groups (signals, issues, patrol, status)
│   │   └── middleware/     — Linear client, GitHub client injection
│   └── package.json
├── agent/                  — Linear Agent SDK integration
│   ├── src/
│   │   ├── register.ts     — Agent registration with Linear
│   │   ├── session.ts      — AgentSession lifecycle (10s ACK)
│   │   ├── webhook.ts      — Webhook event handler
│   │   └── activities.ts   — Semantic activity emission
│   └── package.json
├── patrol/                 — Autonomous observation loop
│   ├── src/
│   │   ├── loop.ts         — OODA patrol cycle
│   │   ├── state.ts        — State machine (idle → observing → orienting → deciding → acting)
│   │   ├── classifier.ts   — Haiku signal classification
│   │   ├── correlator.ts   — Cross-signal pattern detection
│   │   └── circuit.ts      — Circuit breaker (stuttering check, zombie detection)
│   └── package.json
├── skills/                 — Construct skills (installable in product repos)
│   ├── patrol/SKILL.md
│   ├── triage/SKILL.md
│   └── widget/SKILL.md     — Feedback widget installer
└── identity/
    ├── IDENTITY.md         — Who Ruggy is
    └── triggers.yaml       — Event triggers
```

### Three Surfaces, One State

```
              ┌─────────────────────────────────────┐
              │         RUGGY STATE                  │
              │                                      │
              │  Convex: signals, patrol state,      │
              │          classification results       │
              │                                      │
              │  Linear: issues, sessions, progress  │
              │                                      │
              │  Knowledge: tagged markdown sources   │
              └────────┬──────────┬──────────┬──────┘
                       │          │          │
                ┌──────▼───┐ ┌───▼──────┐ ┌─▼────────────┐
                │ ruggy-cli│ │  Linear  │ │  dashboard    │
                │ (incur)  │ │  Agent   │ │  (/signals)   │
                │          │ │  SDK     │ │               │
                │ Actions: │ │ Identity:│ │ Display:      │
                │  triage  │ │ delegatn │ │  inbox        │
                │  patrol  │ │ sessions │ │  triage       │
                │  status  │ │ progress │ │  analytics    │
                │          │ │          │ │               │
                │ + MCP    │ │ Calls    │ │ Already       │
                │   bridge │ │ CLI      │ │ built         │
                └──────────┘ └──────────┘ └───────────────┘
```

## What Changes vs Synthesis v1

### Removed: Build autonomous engine from scratch
**Adopt from Dixie**: AutonomousEngine, 7-step permission model. Adapt for Ruggy's context (signals-based, not NFT-based).

### Removed: Build compound learning from scratch
**Adopt from Dixie**: CompoundLearningEngine — topic clusters, source metrics, sentiment trends, knowledge gaps, personality drift. Wire to signals instead of chat interactions.

### Removed: Build state machines from scratch
**Adopt from Dixie**: StateMachine validation pattern with Hounfour L2 compliance. Add patrol-specific state machine.

### Removed: Build knowledge system from scratch
**Adopt from Dixie**: `sources.json` manifest pattern, tagged retrieval, freshness tracking, corpus versioning, consumer contracts. Curate Ruggy-specific knowledge sources.

### Added: GovernedResource pattern
Every Ruggy domain resource implements the same interface:
```typescript
interface GovernedResource<TState, TEvent, TInvariant> {
  transition(event: TEvent, actorId: string): Promise<TransitionResult<TState>>;
  verify(invariantId: TInvariant): InvariantResult;
  readonly auditTrail: Readonly<AuditTrail>;
}
```

### Added: Sovereignty Engine
Ruggy's autonomy is EARNED through successful patrols, not granted by configuration:
- **Constrained**: Can observe and classify. Cannot act (create issues, send alerts). Human reviews all.
- **Standard**: Can triage and route signals. Can create LOW/MEDIUM issues. CRITICAL still requires human.
- **Autonomous**: Full patrol loop. Can create issues at any severity. Circuit breaker active.

Reputation accumulates through: successful classifications, accurate triage (human didn't override), timely escalations, low false-positive rate.

### Added: Meeting geometry selection
Different tasks use different collaboration patterns:
- **Patrol**: Solo with Witnesses (Ruggy patrols, circuit breaker witnesses)
- **Triage**: Master-Apprentice (Ruggy classifies, human teaches corrections)
- **Investigation**: Constellation (Ruggy + Bridgebuilder + human orchestrator)
- **Planning**: Circle of Equals (Ruggy insights + human context)

## Implementation Phases (Revised)

### Phase 0: Knowledge Curation (1-2 days)
Create Ruggy's knowledge corpus following Dixie's pattern:
- `knowledge/sources.json` manifest with tags, priorities, token budgets
- Sources: constructs registry, signals pipeline architecture, Linear ecosystem, product repo inventory, signal categories/routing rules
- Hand-craft `persona/ruggy.md` (BEAUVOIR) — business bear, DAMP personality
- `construct.yaml` manifest

**No code. Just markdown and YAML.**

### Phase 1: CLI Foundation (3-5 days)
Build `ruggy-cli` on incur:
```
ruggy signals list              # View signals from Convex
ruggy signals classify          # Run Haiku on unclassified
ruggy signals triage --auto     # Auto-triage by severity
ruggy issues list               # Linear issues from signals
ruggy issues create             # Create from signal
ruggy status                    # Ruggy health + ecosystem stats
ruggy patrol --dry-run          # Preview patrol without acting
```

Wire to existing APIs:
- Convex: signal queries/mutations (already deployed)
- Linear: GraphQL API via personal API key (already configured)
- GitHub: `gh` CLI for PR/repo queries

Auto-generates MCP server and skill files from incur.

### Phase 2: Linear Agent Identity (2-3 days)
Register Ruggy as a Linear agent:
- OAuth app with actor=app
- Webhook handler for AgentSessionEvent
- 10-second ACK on delegation
- Semantic activities: thought → action → response
- Session lifecycle management

Ruggy appears in Linear team roster. Can receive delegated issues.

### Phase 3: Patrol Loop (3-5 days)
Autonomous observation cycle using Dixie patterns:
- State machine: idle → observing → orienting → deciding → acting → idle
- Convex scheduled function (15-min default, configurable)
- Haiku classification on new signals
- Sonnet investigation on correlated patterns
- Circuit breaker: stuttering check (same action 3x), zombie detection, cost ceiling
- Sovereignty engine: starts constrained, earns autonomy

### Phase 4: Cross-Repo Widgets (2-3 days)
Feedback widget in all product repos:
- `skill: widget/SKILL.md` — installable via construct
- Each repo gets an API key (per-app, synced to Convex)
- Signals flow to same pipeline
- PRs for: midi-interface, mcv-interface, rektdrop-interface, apdao, set-and-forgetti, honeycomb-lp

### Phase 5: Compound Learning (ongoing)
Port Dixie's compound learning to signals context:
- Topic clusters from signal content
- Source metrics (which repos produce most signals)
- Knowledge gap detection (signal categories with no routing rules)
- Pattern storage with confidence decay
- Feed back into patrol accuracy

## Model Tiering (Unchanged)

| Tier | Model | Purpose | Cost/op |
|------|-------|---------|---------|
| T0 | Regex/rules | Spam, duplicates, known patterns | Free |
| T1 | Haiku 3.5 | Severity, category, routing | $0.001 |
| T2 | Sonnet 4 | Cross-signal correlation, root cause | $0.05 |
| T3 | Opus 4 | Complex incident response | $0.50 |

Expected: ~$1/day for 6 repos.

## Key Design Decisions (Revised)

### 1. Standalone construct repo (not monorepo module)
Ruggy is `construct-ruggy`, following the pattern of construct-k-hole, construct-protocol, etc. It connects to the constructs network via the signals API and installs into product repos via construct skills.

### 2. Dixie patterns adopted, not Dixie dependency
Ruggy adopts Dixie's GovernedResource, state machine, compound learning, and knowledge patterns. It does NOT depend on Dixie at runtime. Ruggy's state lives in Convex (real-time, already deployed) and Linear (issue tracking, already configured). Dixie uses PostgreSQL/Redis/NATS — different infrastructure choices for a different product.

### 3. Sovereignty over configuration
Ruggy earns autonomy through successful patrols, not admin toggle. This is Dixie's SovereigntyEngine applied to ecosystem intelligence. You can always override (manual escalation, circuit breaker), but the default is earned trust.

### 4. Linear Agent SDK for identity, CLI for actions
Linear Agent SDK provides the identity layer (delegation, sessions, progress). The CLI does the actual work (triage, classify, patrol). The agent SDK calls the CLI internally. Same as synthesis v1, now with Dixie's meeting geometry vocabulary for selecting collaboration patterns.

### 5. DAMP personality, hand-crafted BEAUVOIR
Not dAMP-96 generated — hand-crafted like the Oracle. Business bear. High analytical, high depth, moderate formality, high citation density, warm but measured.

### 6. Karpathy constraint: narrow scope, measurable output
"Agents are slop" when they try to do everything. Ruggy does ONE thing: ecosystem health triage. Narrow, well-constrained, measurable. Ship the triage loop first. Everything else is Phase N+1.

## Open Questions (Revised)

1. **Construct repo creation timing**: Create `construct-ruggy` now (knowledge curation phase), or after planning session?
2. **Convex vs PostgreSQL for patrol state**: Convex is real-time and already deployed, but Dixie's GovernedResource pattern uses PostgreSQL transactions (SELECT FOR UPDATE). Can we implement GovernedResource on Convex?
3. **Linear Agent SDK registration**: Requires OAuth app creation in Linear workspace. Do this during Phase 2 or now?
4. **Widget deployment order**: Which product repos first? Priority by signal volume or by ease of integration?
5. **Sovereignty engine parameters**: What's the reputation threshold for standard → autonomous? How many successful patrols?
6. **Knowledge corpus scope**: What goes in Ruggy's knowledge base? Just constructs network, or broader ecosystem (Berachain, DeFi governance)?
