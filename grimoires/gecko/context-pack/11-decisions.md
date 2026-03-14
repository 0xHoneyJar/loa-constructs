# Confirmed Decisions — Architecture Session (2026-03-12)

> decisions locked from grilling session. these are inputs to the final blueprint.

## Identity

| Decision | Detail |
|----------|--------|
| **Name** | Ruggy (not Gecko). "The business bear making sure business is going smoothly." |
| **Replaces** | construct-gecko. Gecko was an observability prototype using Karpathy-loop patrol. Ruggy subsumes it. |
| **Repo** | `construct-ruggy` — standalone construct repo following the pattern (construct-k-hole, construct-protocol, etc.) |
| **Domain** | Ecosystem intelligence + operations (not just observability) |
| **Personality** | Hand-crafted BEAUVOIR (not dAMP-96 generated). Business bear: high analytical, high depth, moderate formality, high citation density, warm but measured. |

## Runtime

| Decision | Detail |
|----------|--------|
| **Package manager** | Bun |
| **CLI framework** | incur (wevm). Agent-first, TOON output, auto-generated SKILL.md + MCP server |
| **Type system** | Effect.ts for structure — particularly for DAMP personality modeling and typed service composition |
| **Real-time state** | Convex. Already deployed (dev: doting-jackal-397, prod: quaint-anaconda-866). Good for agent real-time experience — viewing tickets, stats, live signal flow |
| **Deployment** | Wherever most convenient initially. Railway or Bun standalone. AWS is the eventual target (Jani's migration plan) |
| **Agent runtime** | Bun. Would clone Dixie patterns but adapted for Bun (Dixie uses Node.js + PostgreSQL/Redis/NATS) |

## Architecture — REFRAMED (2026-03-12)

| Decision | Detail |
|----------|--------|
| **Dixie relationship** | **Ruggy IS a Dixie deployment.** Fork loa-dixie, swap persona + knowledge + binding. Get autonomous engine, compound learning, state machines, knowledge system, 2,431 tests for free. |
| **Stack** | Start from Dixie's stack (Node.js, PostgreSQL, Redis). Bun can run Node.js — migrate gradually if needed. Convex for real-time signal state alongside PostgreSQL for governed resources. |
| **Sovereignty Engine** | Override rate drives tier: >40% → constrained, 15-40% → standard, <15% → autonomous. One metric, one threshold, one transition. Manual override always available. |
| **Linear Agent SDK** | Can wait. Ruggy starts as a regular Linear account, not an OAuth agent. SDK integration is Phase N+1 when the identity layer matters |
| **CLI primary consumer** | Ruggy itself. The CLI is primarily for the agent calling its own skills, not for human operators. Humans interact via dashboard and Linear |
| **Signal pipeline** | Already built (cycle-044). Ruggy connects to it via signals API and Convex queries |
| **Widget deployment** | Malleable software. Feedback widgets already exist in product repos. Insert signal ingestion logic without changing aesthetics. Not 5 identical components — 5 targeted logic insertions. |
| **Discord** | Hybrid. Webhook for push alerts (CRITICAL/HIGH). Bot with slash commands for interactive queries (status, signals, escalations). |

## What Ruggy Inherits from Gecko

| Pattern | Source | Detail |
|---------|--------|--------|
| **Karpathy-loop patrol** | `skills/patrol/SKILL.md` | 5-min windows, ratcheting health score, JSONL observations, kaironic termination |
| **6-signal composite health** | `CLAUDE.md` | API latency, error rate, signal volume, construct freshness, Linear backlog, deployment frequency |
| **Bazaar Trader archetype** | `identity/persona.yaml` | Principles: attention-is-currency, behavior-over-belief, namespace-is-network |
| **Trust boundary** | `CLAUDE.md` | Reads everything, writes only to grimoires/gecko/ |
| **4 skills** | `construct.yaml` | patrol, observe, diagnose, report — expanded in Ruggy to include triage, classify, escalate |

## What Ruggy Inherits from Ruggie

| Pattern | Source | Detail |
|---------|--------|--------|
| **Shape paradigm** | ruggy-v2 scoring/ | Multi-dimensional engagement sensing. Illegible by design — resists gaming |
| **Tiered models** | ruggy-v2 | Haiku classify, Sonnet investigate, Opus plan. Cost architecture ~$1/day |
| **Linear integration** | ruggy-v2 linear-service.ts | Bi-directional sync, template-based issue creation, same team ID (466d92ac) |
| **Compound learning with decay** | ruggy-moltbot | PatternStorage → PatternDetector → SkillExtractor → PatternDecay |
| **Anti-gaming philosophy** | VISION_V3.md | "Even the team shouldn't fully know the formula." Kaito failed because visible metrics become targets |

## Stack Decisions — REFRAMED

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Base** | loa-dixie fork | 47 endpoints, 15-layer middleware, autonomous engine, compound learning, 2,431 tests. Don't rebuild what's built. |
| **CLI** | incur (added to fork) | Agent-first. TOON output. Auto-generates MCP + SKILL.md. For Ruggy self-invocation. |
| **Structure** | Effect.ts (optional layer) | For DAMP personality modeling. Scope TBD. |
| **State (real-time)** | Convex | Signal store, dashboard subscriptions. Alongside Dixie's PostgreSQL. |
| **State (governed)** | PostgreSQL (from Dixie) | GovernedResource, audit trails, SELECT FOR UPDATE. Dixie's existing migrations. |
| **HTTP** | Hono (Dixie's existing) | Same runtime. Add Ruggy routes alongside existing modules. |
| **Models** | Claude (Haiku/Sonnet/Opus) via cheval pattern (from Dixie) | Multi-model routing with budget enforcement and fallback. Already built. |
| **Process** | Docker (Dixie's existing Dockerfile) or Bun standalone | Start with Dixie's deployment, simplify later if needed. |

## Week 1 Deliverable — LOCKED

**Goal**: Ruggy is live. Watching 5 product repos. Reporting issues to Linear via Observer workflow. Discord commands for ecosystem status.

### Feedback → Triage → Linear Pipeline
Following Observer's established workflow:
1. **Feedback ingestion** from product repo widgets → signals API
2. **Classification**: bug vs UTC (user-to-creator feedback) via Haiku
3. **Labelling**: severity, category, product repo source
4. **Linear issue creation**: using existing templates (bug: 707cddad, UTC: 5377584f)
5. **Discord notification**: alerts for CRITICAL/HIGH via webhook

### Product Repos (Priority Order)
| # | Repo | Why |
|---|------|-----|
| 1 | mibera-dimensions + mibera-honeyroad | Mibera products — paired, active |
| 2 | mcv-interface | Most mature (92 sprints) — highest signal density |
| 3 | cubquests-interface | Active product |
| 4 | set-and-forgetti | Gold standard dApp — reference implementation |
| 5 | apdao-auction-house | Origin repo |

### Discord Commands
Connected to the signals pipeline built in cycle-044:
- Ecosystem health summary
- Signal volume by repo
- Recent escalations
- Construct status

### Phase 2 (Later)
- Onchain observability via Score API
- Deeper Dixie pattern integration (autonomous engine, compound learning)
- Cross-signal correlation across repos

## ruggy-v3 — RESOLVED

ruggy-v3 is **Loa Beauvoir** — the cloud deployment infrastructure for autonomous agents using OpenClaw + Cloudflare Workers. NOT a Ruggy version. Contains:
- Ruggy's IDENTITY.md v2.0.0 and SOUL.md v4.0.0 (the canonical voice)
- Learning store with WAL persistence
- 4-gate quality filter for compound learning
- 60+ skill integrations (OpenClaw platform)
- Full details in `12-ruggy-v3-discovery.md`

Phase N+1: When Ruggy needs always-on edge presence (Discord gateway, WhatsApp), Beauvoir becomes the deployment target.

## Open Questions (Remaining)

1. **How "bear" does DAMP personality get?** Flavor text only, or does personality affect decision-making (e.g., conservative triage vs aggressive)?
2. **Effect.ts scope** — Just DAMP personality, or broader CLI/service composition?
3. **Convex schema for patrol state** — Can GovernedResource semantics (audit trail, transition validation) work on Convex mutations?
4. **Dixie integration depth for week 1** — Patterns only, or actual code porting?
