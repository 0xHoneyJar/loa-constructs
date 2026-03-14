# Reframe — Ruggy IS a Dixie Deployment

> not a standalone construct. not "patterns adopted." Ruggy is what happens when you fork Dixie and plug in your own domain.

## The Diagram

```
LEFT SIDE (The Stack)              RIGHT SIDE (Constructs Marketplace)
═══════════════════                ════════════════════════════════════

PRODUCT: DIXIE                     MARKETPLACE: CONSTRUCTS
  Institutional Consciousness        Your Domain
  Oracle                             Your Expertise
                                     Your Skills
PLATFORM: FREESIDE                   Your Taste
  API, Billing, Discord/TG,
  Token Gating

RUNTIME: FINN
  Execution Engine, Tool Sandbox,
  Memory

PROTOCOL: HOUNFOUR
  Schemas, Rules, Model Routing
  Contracts

FRAMEWORK: LOA
  Dev Framework, Skills,
  Bridgebuilder
```

### What This Means

The left side is infrastructure. The right side is what you bring. Dixie is the product layer — the thing that RUNS an agent. The Constructs marketplace is where domain/expertise/skills/taste get discovered and composed.

**Ruggy = Dixie deployment + Ruggy's constructs**

| Dixie Slot | Ruggy Fills It With |
|------------|-------------------|
| Institutional Consciousness | Ecosystem intelligence — behavioral pattern recognition, construct health, cultural memory |
| Oracle (persona) | BEAUVOIR: bazaar trader, lowercase energy, business bear |
| Knowledge corpus | Product repo inventory, signal taxonomy, construct registry, Linear config |
| Model routing | Haiku (classify) → Sonnet (investigate) → Opus (plan) |
| Autonomous engine | 7-step permission model — constrained tier initially |
| Compound learning | Signal patterns → classification improvement → skill extraction |

## The Fork Question

Dixie today is Node.js + PostgreSQL + Redis + NATS + AWS ECS. Ruggy was scoped for Bun + Convex. There are three paths:

### Path A: Fork Dixie As-Is
- Clone loa-dixie, replace persona + knowledge + binding
- Deploy on same stack (Node.js, PostgreSQL, Redis)
- Get the FULL autonomous engine, compound learning, state machines, fleet governor for free
- **Tradeoff**: Heavier infrastructure. PostgreSQL + Redis for an agent that might not need them initially. But the 2,431 tests come with it.

### Path B: Dixie Patterns on Bun/Convex
- Build from scratch using Dixie's architecture as reference
- Bun runtime, Convex for state, no Redis/NATS
- Port GovernedResource, state machines, knowledge system as TypeScript modules
- **Tradeoff**: Lighter infrastructure but rebuilding tested code. No compound learning until we build it.

### Path C: Fork Dixie, Migrate to Bun (Best of Both)
- Fork loa-dixie
- Swap persona + knowledge
- Gradually migrate Node.js → Bun (Bun runs Node.js code)
- Swap PostgreSQL → Convex where it makes sense (signals, real-time state)
- Keep PostgreSQL for things that need transactions (GovernedResource, audit trail)
- **Tradeoff**: Migration work, but starts from a tested base and evolves.

### Recommendation: Path A for Week 1

Bun can run Node.js code. Forking Dixie gives us:
- The autonomous engine (7-step permission) — working, tested
- Compound learning pipeline — working, tested
- State machine validation — working, tested
- Knowledge system with freshness tracking — working, tested
- GovernedResource pattern — working, tested
- 2,431 tests as a safety net

What we add:
- Replace `persona/oracle.md` with `persona/ruggy.md`
- Replace `knowledge/sources.json` with Ruggy's domain knowledge
- Replace `knowledge/oracle-binding.yaml` with `knowledge/ruggy-binding.yaml`
- Wire Convex signal queries into the existing middleware pipeline
- Add signal classification commands
- Add Linear triage commands
- Connect Discord webhook for alerts

What we DON'T need to touch initially:
- The 15-layer middleware pipeline (it works, leave it)
- The route modules (add Ruggy-specific routes alongside existing ones)
- The Terraform/ECS deployment (fork and adjust)
- The test suite (run it, fix what breaks from our changes)

### Dixie Fork Readiness Gaps

From the research, these need to be addressed when forking:

| Gap | Effort | Fix |
|-----|--------|-----|
| `identity.ts` hardcoded `nftId: 'oracle'` fallback | Small | Parameterize to binding YAML |
| `CorpusMeta.KNOWN_REPOS` hardcoded to 4 repos | Small | Drive from binding or env |
| `oracle-requirements.json` requires specific source IDs | Small | Create `ruggy-requirements.json` |
| No scaffold script for new identities | Medium | Build `scripts/create-agent.sh` |
| AGPL-3.0 license | N/A | Internal org, not external deployment |

## What Changes in the Architecture

### Before (standalone construct)
```
construct-ruggy/ (new repo)
  ├── incur CLI
  ├── Convex queries
  ├── Haiku classification
  └── Linear integration
```

### After (Dixie fork)
```
loa-dixie/ (forked as ruggy-dixie or similar)
  ├── persona/ruggy.md          ← NEW
  ├── knowledge/ruggy-binding.yaml  ← NEW
  ├── knowledge/sources.json    ← REPLACED
  ├── knowledge/sources/        ← REPLACED
  ├── app/src/routes/signals.ts ← NEW (signal triage routes)
  ├── app/src/routes/patrol.ts  ← NEW (health patrol routes)
  ├── app/src/services/         ← EXISTING (autonomous engine, compound learning, etc.)
  └── (everything else from Dixie)
```

### What About the Constructs Side?

Ruggy still has constructs in the marketplace:
- **Your Domain**: ecosystem intelligence, operations
- **Your Expertise**: signal triage, behavioral pattern recognition
- **Your Skills**: patrol, observe, diagnose, report, triage, classify
- **Your Taste**: BEAUVOIR (bazaar trader, lowercase energy)

These live as construct manifests (construct.yaml, SKILL.md files) that describe what Ruggy CAN do. The Dixie fork is where Ruggy actually RUNS.

## Widget Deployment — Malleable Software

The feedback widgets already exist in the 5 product repos. The approach is:

**Insert the signal ingestion logic without changing aesthetics.**

This means:
- Find existing feedback/support UI in each repo
- Wire the submit handler to POST to `api.constructs.network/v1/signals`
- Add the per-app API key to each repo's env
- Don't touch styling, layout, or existing UX
- The widget adapts to whatever aesthetic is already there

Not 5 identical widget PRs. 5 targeted logic insertions into existing UI. Malleable software — the infrastructure is invisible, the surface stays native.

## Discord — Hybrid Approach

- **Webhook** (push, fire-and-forget): CRITICAL/HIGH signal alerts, patrol summaries
- **Bot with slash commands** (interactive): `/ruggy status`, `/ruggy signals`, `/ruggy escalations`
- The bot is lightweight — just an interaction handler that queries Convex and formats responses
- Deploy as part of the Dixie fork's API surface (additional route module)
