# Ruggie Lineage — DNA Extraction

> source: deep research agent, 4 repos analyzed (64 tool uses, 103K tokens)
> repos: ruggy-bot, ruggy-v2, ruggy-security, ruggy-moltbot

## The Evolution Arc

```
ruggy-bot (Nov 2023)       → ruggy-v2 (Nov-Dec 2025)      → ruggy-security (Jan 2026)    → ruggy-moltbot (Jan-Feb 2026)
GPT-3.5 + Supabase RAG      Claude Opus + Agent SDK          Loa Construct (no runtime)     Cloudflare Workers + Edge
Single file, single channel  20+ services, 15 migrations     100+ vuln patterns             Durable Objects + R2 + Simstim
"chill herb bear"            "character with taste"           "paranoid security bear"       "autonomous ecosystem agent"
Zero tools                   15+ MCP tools                    24 MCP tools                   Multi-agent coordination
No memory                    Scratchpad + relationships       Alert routing + Linear          Compound learning + decay

      CHATBOT           →    COMMUNITY AGENT           →    SECURITY CONSTRUCT        →    INFRASTRUCTURE AGENT
```

## Per-Repo Analysis

### ruggy-bot (the seed)
- Single `index.js`, ~80 lines, GPT-3.5-turbo
- RAG via Supabase vector search (`honey_jar_search` RPC, cosine similarity 0.5 threshold)
- 5-message sliding window for conversation context
- Single hardcoded channel. No tools, no memory, no Linear
- Temperature 0.9 — character-first design
- The RAG pattern (embed → retrieve → augment → respond) survives across ALL versions

### ruggy-v2 (the real agent)
- **The production-grade community agent**. 30+ commits, actively developed
- Claude Opus orchestrator + Haiku classifier/subagent via `@anthropic-ai/claude-agent-sdk`
- 15 Supabase migrations, 20+ service modules
- **Key capabilities**:
  - Multi-channel observation (reads all public channels, responds selectively)
  - Bifurcated classifier: fast regex (internal), LLM-based (external)
  - Scratchpad working memory (24h TTL, survives context window edits)
  - Dynamic personality: energy detection, question type classification
  - **"Shape recognition"** — multi-dimensional engagement sensing that defies gameable rules

- **Economy**: Autonomous token tipping (BERA/HONEY/HENLO) via viem, on-chain transfers
- **Score/Conviction**: 5 dimensions (OG, NFT, Onchain, Timeline, IRL), 0-100 scores
- **Memory**: 4 types (observation, moment, pattern, insight) with shape dimensions
- **Linear integration**: Bi-directional sync, feedback classification (bug/UTC), template substitution
  - Team: `466d92ac-...` ← **SAME TEAM ID we just configured for signals pipeline**
  - Bug template: `707cddad-...`, UTC template: `5377584f-...`
  - Haiku generates issue titles, classifies feedback type
  - Reaction-based capture: 💡 (idea) or 🐜 (bug)
  - Webhook server (Bun HTTP on port 3001) for resolution notifications back to Discord

- **MCP tools**: 6 servers (tip, wallet, memory, context, score, visualization)
- **Knowledge base**: 7 THJ ecosystem KB files
- **Status at HEAD**: Agent responses disabled to conserve API credits. Only feedback handler active.

### ruggy-security (the construct)
- Loa construct, NOT a runtime agent. 11 skills, 22 commands, 11 rule files
- 7-session progressive audit methodology
- 7 security domains, 100+ vulnerability patterns
- THJ ecosystem-specific patterns (Henlo, Mibera, CubQuests, etc.)
- **Linear**: Full GraphQL integration, severity-based issue creation (MEDIUM+), duplicate detection
- **Discord**: Webhook alerts with severity routing, weekly digest
- **Alert routing**: CRITICAL → Discord+Linear+@core-team, HIGH → Discord+Linear

### ruggy-moltbot (the infrastructure attempt)
- Cloudflare Workers + Durable Objects + R2 + AI Gateway
- Claude CLI inside sandbox containers (designed, container SDK not yet available)
- **GitHub automation**: Full PR workflow (clone → branch → code → commit → push → PR)
- **Discord Gateway**: Persistent WebSocket via Durable Object, health monitoring
- **Compound learning**: PatternStorage → PatternDetector → SkillExtractor → PatternDecay
- **Multi-agent coordination** (Sprint 8): Event bus, agent registry, capability routing
- **Simstim** (Python sub-project): Telegram bot, policy engine, audit logging
- **Status**: Never stabilized. Default branch is `feature/discord-chat`, not `main`. Open issue #9 on Durable Object stability.

## What Compounds Across Versions

| Pattern | bot | v2 | security | moltbot |
|---------|-----|-----|----------|---------|
| RAG/Knowledge retrieval | Supabase vectors | 7 KB files | 11 rule files | R2 context |
| Relationship tracking | None | Full service | N/A | Compound learning |
| Linear integration | None | Bi-directional | Severity-based | GitHub issues |
| Multi-channel observation | 1 channel | All channels | Webhook routing | Gateway DO |
| Personality architecture | 1 prompt string | base.md + mode prompts | Ruggy verdicts | SOUL.md + IDENTITY.md |
| Model tiering | GPT-3.5 only | Opus + Haiku | Skill invocation | API + CLI |

## What Gecko Inherits

1. **The "shape" paradigm** — v2's most original contribution. Not rules, not scores — shapes. Multi-dimensional engagement sensing where the geometry of participation triggers judgment, not a formula. Directly transferable to ecosystem intelligence.

2. **Tiered model selection** — Haiku for classification, Opus for orchestration. Cost/quality tradeoff architecture is battle-tested.

3. **MCP tool surface pattern** — Factory-created servers with context baked in. Domain-scoped. Mode-aware (minimal/full/orchestrator).

4. **Linear as the issue bus** — Feedback → classification → template → issue. Resolution notifications back to Discord. Production-proven.

5. **Anti-gaming philosophy** — V3 Vision doc: "even the team shouldn't fully know the formula." Kaito failed because visible metrics become targets. The "character with taste" alternative.

6. **Compound learning with decay** — PatternStorage → PatternDetector → SkillExtractor → PatternDecay. Patterns detected from feedback, promoted when reinforced, decayed when stale, extracted into skills when mature.

7. **Multi-channel observation** — Observe everything, respond selectively. Channel context as ambient intelligence.

## Gaps Between Ruggie and Gecko

1. **No cross-repo intelligence** — Each version is isolated. v2 knows nothing about security's findings. moltbot can't access v2's relationships.

2. **No on-chain event processing** — v2 can check balances and send tokens, but none process events (deployments, governance, liquidity).

3. **No continuous monitoring** — moltbot has cron scanning but it's stub code. No always-on intelligence loop.

4. **Learning system never reached production** — moltbot's compound learning is architecturally complete but never stabilized. v2 disabled responses to conserve credits.

5. **No inter-agent communication** — v2's subagent model is single-process. moltbot's event bus is within one Worker. True multi-agent coordination doesn't exist yet.

6. **Identity fragmentation** — Four repos, four character definitions, four capability sets. Gecko needs unified identity.

## Key Artifacts to Preserve

- ruggy-v2 `src/services/linear-service.ts` — most mature Linear integration
- ruggy-v2 `src/services/feedback-service.ts` — Haiku classification pipeline
- ruggy-v2 `src/core/scoring/` — shape/conviction system
- ruggy-v2 `VISION_V3.md` — philosophical foundation
- ruggy-security `src/services/linear.ts` — LinearService class
- ruggy-moltbot `src/services/compound-learning/` — learning pipeline architecture
- ruggy-moltbot `src/services/memory/` — scratchpad + notes + sync patterns
