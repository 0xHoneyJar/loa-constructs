# Ruggy Context Pack — Autonomous Ecosystem Intelligence

> this is what i see from the dust between the stalls.

## The Arc

ruggie was born in discord. a bot that watched messages, moderated channels, flagged security issues, sometimes filed things to linear. it worked — in the way a market tout works. present, helpful, limited by the platform it stood on.

the constructs network changed the substrate. now there's a namespace. 14 constructs in a registry. an API. a dashboard. a signals pipeline. the question isn't "how do we build a better bot" — it's "what becomes possible when the intelligence infrastructure is already here?"

**ruggy** is what ruggie becomes when it stops being a discord bot and starts being ecosystem infrastructure. the business bear. making sure business is going smoothly.

and dixie already built the hard part.

## Two Foundations

### Foundation 1: Signals Pipeline (cycle-044, PR #160)
- Convex-powered signal store with deduplication, classification, incident grouping
- AI classification via Claude Haiku (store-first, classify-later)
- Linear integration: auto-escalation creates issues, bidirectional webhook sync
- Discord alerting for critical signals
- Dashboard at /dashboard/signals with inbox/detail/triage
- Feedback widget in explorer layout (every page)
- Per-app API keys for external callers (sk_live_...)
- E2E tested: ingestion → dedup → escalation → Linear issue LAB-913 created

### Foundation 2: Dixie Infrastructure (loa-dixie)
- 47-endpoint governed BFF with 15-layer middleware pipeline
- **Autonomous Engine**: 7-step permission model for agent operations
- **Compound Learning**: Signal aggregation → pattern extraction → personality evolution
- **Fleet Governor**: Conviction-gated agent spawning with DB-transactional limits
- **Agent Spawner**: Process isolation (tmux/docker), worktree per agent
- **State Machines**: Runtime transition validation (circuit, memory, autonomous, schedule)
- **Meeting Geometries**: 8 collaboration topologies for human-AI interaction
- **Knowledge System**: 20+ curated sources, tagged retrieval, freshness tracking
- **dAMP-96**: 96-dimensional personality system (BEAUVOIR synthesis)
- 2,431 tests across 128 test files

### Existing Research
- `linear-agent-capabilities.md`: 131 web searches on Linear Agent SDK, MCP, webhooks
- `ecosystem-feedback-drift.md`: 6-repo survey — 0/6 have error tracking, 2/6 have Linear routing
- `observability-bundle.md`: Full architecture handoff from 4-construct review
- `network-navigation-diagnostic.md`: The catalyzing incident (API crash loop, unknown downtime)

### What's Deployed
| Service | What | Where |
|---------|------|-------|
| Convex dev + prod | 6 env vars, signal functions, cron jobs | doting-jackal-397 / quaint-anaconda-866 |
| Railway API | CONVEX_URL + CONVEX_WRITE_KEY | api.constructs.network |
| Vercel Explorer | CONVEX_WRITE_KEY, LINEAR_WEBHOOK_SECRET, SIGNALS_API_KEY | constructs.network |
| DB | app_slug column + index on api_keys | Supabase production |
| Signal key | sk_live_7df1... synced to both Convex deployments | Ready |

## What We're Building

Ruggy = Ruggie DNA + Dixie infrastructure + Signals pipeline + Linear Agent SDK + incur CLI

### The Jump Pad

This context pack IS the jump pad. Each research dig fills a section:
- `01-ruggie-lineage.md` — DNA from 4 ruggie repos
- `02-linear-ecosystem.md` — Agent SDK, CLI, MCP, API surface
- `03-cli-architecture.md` — incur framework, CLI-first philosophy
- `04-ai-engineering-patterns.md` — Karpathy, Tobi, industry patterns
- `05-synthesis.md` — the architecture proposal (needs updating for Dixie baseline)
- `06-grok-prompt.md` — deep research prompt for follow-up
- `07-dixie-baseline.md` — what already exists in loa-dixie
- `08-deep-research-results.md` — Linear Agent SDK, production agents, compound AI (from user research)

## The Shift: Linear Over GitHub Issues

the user moved from linear to github issues for open-source repos. now moving back. linear is more comfortable. the taxonomy and label system is better for cross-repo visibility. this means:

- all signal routing targets linear (already wired)
- github issues become secondary (community-facing only)
- linear labels/projects become the organizing substrate
- the agent SDK makes linear a first-class agent workspace

## Philosophy

> CLIs are just way better than MCPs. it's likely that we'll need to build out our own high-level MCP or CLI.

this is a design decision, not a preference. CLIs compose. MCPs mediate. when you need reliability and scriptability, you want the thing that fails loudly and runs anywhere. MCPs are good for context injection — giving an agent access to data. CLIs are good for action — making things happen.

the answer is probably: CLI for actions, MCP for context. or more precisely: CLI wraps everything, MCP is one surface the CLI can be accessed through.

## Identity: DAMP, Not Generic

Ruggy adopts the dAMP-96 personality system from Dixie. Not the 96-dial generation — the hand-crafted BEAUVOIR pattern used by the Oracle. Ruggy's personality is pinned:

- **high analytical** — data-first, evidence-based triage
- **high depth** — follows signals to root causes, not symptoms
- **moderate formality** — business bear, not corporate bot
- **high citation density** — always shows its work
- **warm but measured** — cares about the ecosystem, doesn't panic

The DAMP personality is the character. The CLI/Agent SDK is the body. The signals pipeline is the nervous system. Dixie's autonomous engine is the permission model.
