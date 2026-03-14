# Dixie Baseline — The Infrastructure That Already Exists

> source: direct repo analysis, 0xHoneyJar/loa-dixie (main branch)

## What Dixie Is

Dixie is a **governed multi-agent BFF (Backend-for-Frontend)** — a 47-endpoint API surface that sits between clients and the knowledge infrastructure. It's not a prototype. It's a production system with:

- 15-layer middleware pipeline (constitutional ordering)
- 5-tier conviction-gated access control (Observer → Participant → Builder → Architect → Sovereign)
- Soul memory with sealing
- Compound learning pipeline
- Autonomous engine with 7-step permission model
- Agent-to-agent communication (Meeting Geometries)
- Fleet orchestration (agent spawning with process isolation)
- WebSocket proxy with ticket-based auth
- 2,431 tests across 128 test files

This is **Layer 5** of the ecosystem — the product layer that sits atop finn (runtime), hounfour (protocol), and freeside (economics).

## Architecture

```
                    Clients
                       |
            +----------+----------+
            |     loa-dixie       |
            |                     |
            |  15-layer middleware |
            |  47 API endpoints   |
            |  5-tier conviction  |
            |  4 resource govs    |
            +----------+----------+
                       |
          +------------+------------+
          |            |            |
   +------+------+  +-+--------+  ++-----------+
   |  loa-finn   |  | loa-     |  | loa-       |
   |  Knowledge  |  | hounfour |  | freeside   |
   |  Pipeline   |  | Protocol |  | Economics  |
   |  + Routing  |  | Types    |  | + Billing  |
   +-------------+  +----------+  +------------+
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Hono (same as our API) |
| Database | PostgreSQL (15 migrations) |
| Cache | Redis (projection cache, reputation cache) |
| Auth | SIWE (Sign-In With Ethereum) + JWT |
| Knowledge | 20+ curated markdown sources, tag-based retrieval |
| Infrastructure | ECS Fargate, ALB, EFS for knowledge corpus |
| Testing | 2,431 tests (bats + vitest) |
| Protocol | loa-hounfour types v8.2.0 |

## What Ruggy Inherits from Dixie

### 1. Autonomous Engine (app/src/services/autonomous-engine.ts)

7-step permission flow — exactly the permission model an autonomous agent needs:
1. Check autonomous mode enabled
2. Verify requester is owner or delegate
3. Verify capability is enabled
4. Verify tool is whitelisted
5. Check daily budget cap
6. Check confirmation threshold
7. Audit trail logging

This IS Ruggy's permission model. Not theoretical — built and tested.

### 2. Compound Learning (app/src/services/compound-learning.ts)

Signal aggregation → pattern extraction → personality evolution:
- `TopicCluster`: Detects topic patterns from interactions
- `SourceMetrics`: Hit/miss ratios for knowledge sources
- `SentimentTrend`: Improving/stable/declining over time windows
- `KnowledgeGap`: Areas where source miss rate is high (auto-detected)
- `PersonalityDrift`: Measures how the agent's behavior shifts over time

Batch processing every 10 interactions per NFT. Inactivity flush after 1 hour. This is moltbot's compound learning architecture — but production-grade.

### 3. Fleet Governor (app/src/services/fleet-governor.ts)

Conviction-gated agent spawning with database-transactional limits:
- Two-phase check: fast in-memory pre-check, then DB-transactional SELECT FOR UPDATE
- Tier limits: observer=0, participant=0, builder=1, architect=3, sovereign=10
- Invariants enforced: active_count <= tier_limit, cancelled tasks never retried
- `SpawnDeniedError` with full context (operator, tier, active count, limit)

### 4. Agent Spawner (app/src/services/agent-spawner.ts)

Process isolation for fleet agents:
- **Local mode**: tmux sessions for development
- **Container mode**: docker/podman for production
- Git worktree isolation per agent
- Loa hooks copied into each worktree
- `execFile` with argument arrays (never shell strings) — injection-proof
- Full lifecycle: spawn → monitor → kill → cleanup

### 5. State Machine Validation (app/src/services/state-machine.ts)

Runtime state transition validation — invalid transitions rejected with 409:
- `CircuitState`: closed → half_open → open
- `MemoryEncryptionState`: unencrypted → encrypting → encrypted → failed
- `AutonomousMode`: disabled → pending_confirmation → active → paused
- `ScheduleLifecycle`: draft → active → paused → completed → cancelled

Hounfour Level 2 compliance — structural validation at runtime.

### 6. Meeting Geometries (knowledge/sources/meeting-geometries.md)

8 collaboration topologies for human-AI interaction — this is the philosophical framework:

| Geometry | Pattern | Ruggy Application |
|----------|---------|-------------------|
| Circle of Equals | All contribute equally | Planning sessions with human |
| Master-Apprentice | One teaches, one learns | Ruggy learning ecosystem patterns |
| Constellation | Multiple specialists + human orchestrator | Multi-construct triage |
| Solo with Witnesses | One works, others observe | Patrol loop with circuit breaker |
| Council | Multiple perspectives, human decides | Flatline-style multi-model review |
| Relay | Sequential handoff | Signal → classify → investigate → act |

### 7. Knowledge System (knowledge/)

20+ curated markdown sources with manifest (`sources.json`):
- Tagged retrieval (glossary terms → source selection)
- Priority scoring (1-10, required vs optional)
- Token budgeting per source (maxTokens)
- Freshness tracking (last_updated + max_age_days)
- Corpus versioning (corpus_version integer)
- Cross-reference tests (all repo references verified)

This is QMD-like but domain-specific. The manifest schema:
```json
{
  "id": "ecosystem-architecture",
  "type": "local",
  "source_file": "knowledge/sources/ecosystem-architecture.md",
  "tags": ["core", "architectural"],
  "priority": 2,
  "maxTokens": 8000,
  "required": true,
  "max_age_days": 60,
  "last_updated": "2026-02-22"
}
```

### 8. dAMP-96 Personality System

96-dimensional personality vector derived deterministically from NFT token ID:
- 6 categories × 16 dials: Cognitive, Communication, Emotional, Knowledge, Decision-making, Creative
- Compiled into BEAUVOIR.md (Simone de Beauvoir — "one is not born, but becomes")
- Personality versioning via `beauvoir_hash` (SHA-256)
- Transfer listeners trigger recalibration on ownership change
- **The Oracle uses a hand-crafted BEAUVOIR** (persona/oracle.md) — pinned high analytical, high depth, moderate formality

For Ruggy: DAMP-96 provides the personality framework. Ruggy gets a hand-crafted BEAUVOIR like the Oracle, not a generated one. The "business bear" persona is pinned, not derived.

### 9. Oracle Persona Pattern (persona/oracle.md)

The Oracle's persona is the template for Ruggy:
- **Identity**: Grounded in actual codebase, not speculation
- **Voice adaptation**: Technical (cite file paths) / Architectural (explain why) / Philosophical (connect to vision) / Educational (layered depth)
- **Citation format**: `repo/path#Symbol`, `repo#N`, section references
- **Honesty protocol**: Never fabricate references, distinguish current vs planned, acknowledge gaps
- **What it is NOT**: Not a code generator, not a task tracker, not a decision maker

Ruggy adapts this: same grounding discipline, different domain (ecosystem health vs knowledge retrieval).

## The Cheval Pattern

Dixie uses **loa-cheval** — a Python adapter layer for multi-model routing:
- Anthropic, OpenAI, Google adapters with retry and circuit breaker
- Budget enforcement with fallback (expensive model → cheaper model when budget low)
- Rate limiting per provider
- Credential store with health checks
- Trust scopes for epistemic boundaries

This is the multi-model routing infrastructure that Ruggy's tiered models (Haiku/Sonnet/Opus) would use.

## API Route Modules (16 modules, 47 endpoints)

| Module | Ruggy Relevance |
|--------|----------------|
| health | Direct — Ruggy needs health reporting |
| auth | Adapt — SIWE for wallet auth, JWT for API auth |
| chat | Indirect — Ruggy doesn't chat, it patrols |
| sessions | Direct — agent session lifecycle |
| identity | Direct — agent identity in Linear/ecosystem |
| personality | Direct — DAMP-96 / BEAUVOIR for Ruggy |
| memory | Direct — soul memory = patrol state |
| autonomous | **Critical** — 7-step permission model for autonomous ops |
| schedule | **Critical** — NL scheduling with cron for patrol loops |
| agent | **Critical** — agent-to-agent communication |
| learning | **Critical** — compound learning from signals |
| reputation | Adapt — reputation scoring for signal quality |
| fleet | Future — multi-agent spawning |

## What's NOT in Dixie

| Gap | Impact on Ruggy |
|-----|----------------|
| No CLI interface | Need incur-based CLI (Phase 1 of synthesis) |
| No Linear Agent SDK | Need agent registration and delegation (Phase 2) |
| No signals pipeline | Already built in constructs (cycle-044) |
| No cross-repo observation | Need feedback widgets in all product repos (Phase 4) |
| No construct awareness | Need to understand the constructs registry |
| No Discord/alert routing | Already built in constructs (cycle-044) |

## The Insight

Dixie isn't just a baseline — it's the **production infrastructure** for autonomous agents. The autonomous engine, compound learning, fleet governor, state machines, meeting geometries — all of it is built, tested, and deployed.

Ruggy doesn't need to rebuild this. Ruggy needs to:
1. **Adopt** Dixie's patterns (autonomous engine, compound learning, state machines)
2. **Extend** with ecosystem-specific capabilities (signals, Linear, cross-repo observation)
3. **Surface** through a CLI (incur) and Linear agent identity
4. **Connect** to the constructs network's existing infrastructure

The question isn't "what do we build?" It's "what do we wire together?"
