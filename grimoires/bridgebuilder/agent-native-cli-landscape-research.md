# Agent-Native CLI & Expertise Distribution: Landscape Research

> **Date**: 2026-02-27
> **Status**: Research artifact — landscape scan with strategic implications for constructs network
> **Scope**: MCP, SKILL.md standard, TOON format, Vercel Skills.sh, on-demand tool loading, token efficiency patterns, and where constructs sit

---

## Executive Summary

The agent tooling ecosystem has undergone rapid stratification in the last 90 days. Three distinct distribution layers have emerged, each solving a different problem:

| Layer | What It Distributes | Exemplars | Token Model |
|-------|-------------------|-----------|-------------|
| **Tool Layer** | Executable capabilities (APIs, queries, mutations) | MCP servers | High (50+ tools = ~55K-134K tokens upfront) |
| **Skill Layer** | Behavioral instructions (how-to, workflows, conventions) | SKILL.md / Skills.sh | Low (~50 tokens/skill metadata, ~2-5K when loaded) |
| **Expertise Layer** | Bundled knowledge + skills + identity + orchestration | Constructs (packs) | Medium (manifest + progressive skill loading) |

The construct model occupies the expertise layer — a position **above** both MCP and SKILL.md in the abstraction stack. No other system in the current landscape bundles persona, domain knowledge, capability metadata, inter-construct events, and golden-path workflows into a single distributable unit. This is both the construct model's unique value and its adoption risk: it's solving a problem that most teams haven't articulated yet.

---

## 1. MCP: The Tool Layer (State of Play)

### Current Adoption

MCP has achieved de facto standard status. Key metrics as of February 2026:

- **97M monthly SDK downloads**
- **5,500+ MCP servers** on registries (PulseMCP)
- Adopted by Anthropic, OpenAI, Google, Microsoft (VS Code/Copilot)
- OpenAI deprecated the Assistants API in favor of MCP (sunset mid-2026)
- Governance donated to Agentic AI Foundation under the Linux Foundation (Dec 2025)
- Enterprise wins: Block (Goose agent), Bloomberg (days-to-minutes integration)

### The Token Problem

MCP's core design flaw is context pollution. Every connected server dumps its full tool schema into the agent's context window before a single user message is processed.

| Setup | Tool Count | Token Overhead |
|-------|-----------|---------------|
| 1 server (GitHub) | ~25 tools | ~23K tokens |
| 5 servers | 58 tools | ~55K tokens |
| 10+ servers | 100+ tools | 100K-134K tokens |

This is not just a cost problem — it is an **accuracy** problem. Tool selection accuracy degrades significantly past 30 tools due to attention competition. Models pick wrong tools, hallucinate parameters, and confuse similarly-named operations.

### Emerging Solutions

**Anthropic Tool Search Tool** (January 2026): The most significant development. Tools marked with `defer_loading: true` are excluded from initial context. The agent receives only a search tool (~500 tokens) and discovers tools on-demand via regex or BM25 semantic search.

- Results: **85% reduction** in token usage
- Accuracy: Opus 4 improved from 49% to 74%; Opus 4.5 from 79.5% to 88.1%
- Now enabled by default in Claude Code when MCP tools exceed 10% of context
- Tool references auto-expand throughout conversation history (no re-search needed)

**Hierarchical Semantic Routing** (MCP-Zero): Server-level matching first, then tool-level ranking. Avoids scanning thousands of tools at once.

**Tool Groups** (Lunar MCPX): Named collections ("Development", "QA", "Admin") that scope tool visibility to relevant workflows.

**Agentic MCP Configuration**: The "server selection" step carved out as its own agent step. Can handle ~1,000 server names/descriptions in a 200K context window, then dynamically loads only 3-4 servers per task.

### What MCP Cannot Do

MCP solves "how does an agent call a tool?" It does **not** solve:

1. **When** to use a tool (sequencing, judgment)
2. **Why** to use a tool (domain reasoning, trade-off analysis)
3. **How well** to use a tool (best practices, conventions)
4. **What success looks like** (quality criteria, acceptance gates)

These are precisely the problems that the skill and expertise layers address.

### Implications for Constructs

Constructs already operate at the network-level MCP model (`mcp-registry.yaml`), which is correct. The construct model should NOT try to compete with MCP at the tool layer. Instead, it should be the **consumer** of MCP tools — the knowledge layer that teaches agents which tools to select, when to sequence them, and what quality gates to apply.

The `capabilities.requires` stanza in skill `index.yaml` files (e.g., `tool_calling: true`) already hints at this relationship. A future integration could declare MCP server dependencies explicitly, allowing constructs to dynamically activate the right MCP servers for their skills.

---

## 2. SKILL.md: The Behavioral Layer

### The Standard

In December 2025, Anthropic released the SKILL.md open standard. OpenAI immediately adopted it for Codex CLI. It has since been adopted by 37+ agent platforms including Claude Code, Cursor, GitHub Copilot, Gemini CLI, Windsurf, and Google Antigravity.

A skill is a directory with a `SKILL.md` file (YAML frontmatter + markdown instructions) plus optional scripts and references. The standard defines a three-tier progressive loading model:

| Tier | Content | Token Cost | When Loaded |
|------|---------|-----------|-------------|
| **Metadata** | Name + description | ~50-100 tokens | Always (startup) |
| **Instructions** | Full SKILL.md body | ~2,000-5,000 tokens | When skill activates |
| **Resources** | Scripts, references, assets | Unbounded | When skill requests them |

This progressive disclosure is the key insight: **skills extend context only when needed**. With 20 skills, startup cost is ~2K tokens instead of ~40K.

### Vercel Skills.sh

Launched January 20, 2026. The "npm for agent skills":

- CLI: `npx skills add <package>` — installs across 37+ agent platforms
- Registry: skills.sh — directory + leaderboard with anonymous telemetry
- Growth: **147 new skills per day**, tens of thousands of installs in first weeks
- Security: Snyk partnership for pre-install scanning (after ClawHavoc incident — 341 malicious skills)
- Major publishers: Stripe, Cloudflare, Sentry, HuggingFace, Trail of Bits

### Skills vs. MCP: The Clarified Distinction

As of January 2026, this distinction has crystallized in the ecosystem:

> **MCP gives agents abilities. Skills teach agents how to use those abilities well.**

- MCP = verbs (what the agent can do)
- Skills = adverbs (how the agent should do it)
- MCP provides authenticated access to external systems
- Skills provide local, fast behavioral guidance with no network overhead

Importantly, MCP adopted progressive discovery in January 2026 (via Tool Search Tool), neutralizing the context efficiency advantage that skills previously held. What remains is a **semantic** distinction: tools are executable capabilities, skills are behavioral instructions.

### Limitations of the SKILL.md Standard

1. **Auto-invocation reliability**: Practitioners report ~50% reliability for automatic skill activation based on user intent — "basically a coin flip"
2. **Non-deterministic execution**: Skills are natural language instructions, not executable code. Success depends on the LLM's capacity to interpret instructions correctly.
3. **No authentication model**: Skills cannot access authenticated data or perform actions on behalf of the user
4. **No composition model**: The SKILL.md standard has no way to express dependencies between skills, sequencing, or orchestrated workflows
5. **No identity model**: Skills are anonymous behavioral instructions — they have no persona, domain expertise boundaries, or cognitive frame
6. **No event model**: Skills cannot declare events they emit or consume, limiting inter-skill coordination

### Implications for Constructs

Points 4, 5, and 6 above are where the construct model differentiates. A construct pack like Artisan bundles:

- **Identity** (`persona.yaml`, `expertise.yaml`) — cognitive frame, voice, domain boundaries
- **Skill composition** (14 skills with a defined workflow sequence: Survey, Envision, Decompose, Craft, Iterate, Inscribe)
- **Events** (`forge.artisan.taste_inscribed`, `forge.artisan.pattern_surveyed`) — inter-construct coordination
- **Capability metadata** (`model_tier`, `danger_level`, `execution_hint`) — intelligent routing

None of these exist in the SKILL.md standard. The construct model is not competing with SKILL.md — it is a **higher-order abstraction** that uses SKILL.md-compatible skills as its atomic unit.

---

## 3. TOON: Token-Oriented Object Notation

### What It Is

TOON (Token-Oriented Object Notation) is a compact, human-readable encoding of the JSON data model. It combines YAML's indentation-based structure for nested objects with CSV-style tabular layout for uniform arrays. It is a **translation layer**: services and frontends still use JSON; data is encoded to TOON before being sent to the LLM, then decoded back to JSON after.

### Performance

| Format | Accuracy | Tokens | Efficiency Score |
|--------|----------|--------|-----------------|
| TOON | 73.9% | 2,744 | 26.9 |
| JSON (compact) | 70.7% | 3,081 | 22.9 |
| YAML | 69.0% | 3,719 | 18.6 |
| JSON (standard) | 69.7% | 4,545 | 15.3 |
| XML | 67.1% | 5,167 | 13.0 |

TOON achieves **30-60% token savings** over standard JSON while improving structured extraction accuracy. A production RAG pipeline reported $1,940 in JSON costs reduced to $760 with TOON — 61% fewer tokens, same answers.

### Limitations

- Best for uniform arrays of objects; deeply nested or non-uniform data may be less efficient
- Cannot replace JSON for model **outputs** — only validated for input/context
- Not yet widely supported; requires prompt tuning for models not pre-trained on TOON
- TypeScript SDK available but ecosystem is nascent

### Sweet Spot

TOON is ideal for: user lists, product catalogs, knowledge base snippets, logs, event streams, tool results, agent memory blocks, and summarized database exports.

### Implications for Constructs

The construct model deals with structured metadata extensively: `construct.yaml`, skill `index.yaml`, capability stanzas, event declarations. Currently, these are YAML files consumed by validation scripts (not directly by the LLM). The more relevant application of TOON would be in **tool response formatting** — when construct skills invoke tools that return structured data (e.g., API results, database queries, registry listings), encoding those results in TOON before passing them to the agent could reduce context consumption significantly.

This is a low-priority optimization. The construct model's token efficiency comes from progressive disclosure (skills auto-load when invoked), which is already well-implemented. TOON would provide marginal improvement on top of an already-efficient architecture.

---

## 4. On-Demand Tool Loading: The Convergence Pattern

### The Pattern

The most important design pattern of early 2026 is **lazy tool/skill loading**: instead of declaring everything upfront, agents discover capabilities on-demand.

This pattern has independently emerged in three systems:

| System | Mechanism | Savings |
|--------|----------|---------|
| **Claude Tool Search** | `defer_loading: true` on tool definitions | 85% token reduction |
| **SKILL.md Standard** | Three-tier progressive disclosure (metadata / instructions / resources) | ~600 tokens startup vs. ~30K full load for 12 skills |
| **Spring AI** | Tool Search Tool adapter | 34-64% token reduction |
| **Google ADK** | Custom tool search in Agent Development Kit | 94% reduction in tool context |

### The Coherence Cascade

A compelling theoretical model from recent research: when an agent is made **aware** that relevant knowledge exists but isn't currently loaded, its coherence-seeking behavior creates a functional drive to retrieve it. This transforms retrieval from passive rule-following into active, goal-aligned behavior.

In practice: the agent sees a skill name and description (~50 tokens), decides it's relevant, and actively requests the full instructions (~2-5K tokens). This mirrors cache hierarchies in computer architecture and schema-driven recall in cognitive psychology.

### How Constructs Already Implement This

The construct model implements a **four-tier** progressive disclosure:

| Tier | Content | Token Cost | When Loaded |
|------|---------|-----------|-------------|
| 1. **Pack manifest** | construct.yaml — name, skills list | ~200 tokens | On install/browse |
| 2. **Skill metadata** | index.yaml — name, description, triggers, capability stanza | ~100 tokens/skill | At session startup |
| 3. **Skill instructions** | SKILL.md — full behavioral instructions | ~2-5K tokens | When skill activates |
| 4. **Resources** | scripts/, references/, assets/ | Unbounded | When skill requests them |

This four-tier model is strictly more granular than the three-tier SKILL.md standard because it adds the pack manifest layer. The construct model gives the agent awareness of the entire expertise domain (Artisan = "Brand and UI craftsmanship") before it ever sees individual skill metadata.

### What's Missing

The construct model does not yet implement **dynamic skill discovery across packs**. If an agent has 6 packs installed (49 skills), all 49 skill metadata entries are loaded at startup (~5K tokens). For a network with hundreds of constructs, this would need a tool-search-style mechanism: a "construct search" tool that discovers relevant packs on-demand, loading only their skill metadata when a domain is relevant.

---

## 5. Token Efficiency Patterns

### Five Patterns in Production

**1. Progressive Disclosure** (Already implemented in constructs)
Load only what's needed, when it's needed. The construct model's four-tier system is state-of-the-art.

**2. Structured Output Schemas** (Partially implemented)
Enforce predefined output formats to reduce agent "guessing." The construct model uses this in audit/review skills but could standardize output schemas across all skills.

**3. TOON for Data Payloads** (Not yet implemented)
Encode structured data in TOON format for LLM input. Relevant for skills that process structured data (e.g., registry listings, API responses).

**4. Call-to-Action Patterns** (Partially implemented)
Skills like `crafting-physics` use decision trees that reduce agent reasoning overhead: "Is this a financial operation? YES -> Pessimistic sync, 800ms, confirmation required." This pattern should be standardized.

**5. CodeAgents-style Structured Planning** (Not yet implemented)
Codify multi-agent reasoning into modular pseudocode with control structures, typed variables, and boolean logic. The construct model's `workflow` section in CLAUDE.md is a natural-language precursor to this.

### Quantified Impact

| Strategy | Token Savings | Source |
|----------|--------------|--------|
| Progressive disclosure | 45-75% | Agent Skills benchmarks |
| Tool search (defer_loading) | 85% | Anthropic internal testing |
| TOON encoding | 30-60% | TOON benchmarks |
| Decision trees over free reasoning | ~40% (estimated) | Call-to-action pattern analysis |
| Structured planning (CodeAgents) | Varies by task | arXiv 2507.03254 |

---

## 6. The Landscape Map

### Distribution Primitives

```
                    ┌──────────────────────────────────────────┐
                    │           EXPERTISE LAYER                │
                    │  Constructs (packs + identity + events)  │
                    │  ─────────────────────────────────────── │
                    │  What: Bundled domain expertise          │
                    │  How:  Manifest + skills + persona +     │
                    │        capability metadata + events      │
                    │  Unit: Pack (6-14 skills + identity)     │
                    └──────────────┬───────────────────────────┘
                                   │ contains
                    ┌──────────────┴───────────────────────────┐
                    │            SKILL LAYER                   │
                    │  SKILL.md / Skills.sh / Agent Skills     │
                    │  ─────────────────────────────────────── │
                    │  What: Behavioral instructions           │
                    │  How:  SKILL.md + scripts + references   │
                    │  Unit: Single skill directory            │
                    └──────────────┬───────────────────────────┘
                                   │ invokes
                    ┌──────────────┴───────────────────────────┐
                    │             TOOL LAYER                   │
                    │  MCP servers / CLI tools / APIs          │
                    │  ─────────────────────────────────────── │
                    │  What: Executable capabilities           │
                    │  How:  JSON-RPC protocol + OAuth         │
                    │  Unit: Tool (function with schema)       │
                    └──────────────────────────────────────────┘
```

### Competitive Positioning

| Dimension | npm Packages | MCP Servers | Skills.sh | Constructs |
|-----------|-------------|-------------|-----------|-----------|
| **Distributes** | Code | Tools | Instructions | Expertise bundles |
| **Format** | JS/TS code | JSON-RPC services | SKILL.md (markdown) | YAML manifests + SKILL.md + persona |
| **Progressive loading** | N/A | defer_loading (Jan 2026) | 3-tier disclosure | 4-tier disclosure |
| **Identity/persona** | None | None | None | Yes (persona.yaml, expertise.yaml) |
| **Workflow orchestration** | None | None | None | Yes (golden path, CLAUDE.md workflow) |
| **Capability routing** | None | None | None | Yes (model_tier, danger_level, effort_hint) |
| **Inter-unit events** | None | None | None | Yes (emits/consumes in construct.yaml) |
| **Dependency model** | package.json | N/A | None | pack_dependencies in construct.yaml |
| **Quality gates** | Linting, tests | None | None | Yes (review, audit, circuit breaker) |
| **Registry/discovery** | npmjs.org | PulseMCP, MCP.so | skills.sh | constructs.network |
| **Security** | npm audit | OAuth scoping | Snyk scanning | None yet |
| **Adoption** | Massive | 97M SDK downloads | 147 skills/day | 6 packs, ~50 skills |

---

## 7. What Constructs Do Better

### 1. Expertise Bundling
No other system bundles persona + skills + events + capability metadata + quality gates into a distributable unit. MCP distributes tools. Skills.sh distributes instructions. Constructs distribute **thinking** — how a domain expert approaches problems, what they consider, and how they validate quality.

### 2. Four-Tier Progressive Disclosure
The construct model's pack-manifest/skill-metadata/skill-instructions/resources hierarchy is the most granular progressive loading system in the landscape. This matters at scale: a network of 100 constructs (500+ skills) would need this granularity to remain token-efficient.

### 3. Capability-Aware Routing
The `capabilities` stanza (`model_tier: sonnet`, `danger_level: moderate`, `execution_hint: parallel`) enables intelligent dispatch that no other system provides. An orchestrator can route low-risk tasks to cheaper models, sequence high-danger operations through human-in-the-loop gates, and parallelize independent skills.

### 4. Inter-Construct Event Coordination
The `events.emits` / `events.consumes` model in `construct.yaml` enables loose coupling between expertise domains. When Artisan emits `forge.artisan.taste_inscribed`, Protocol can consume it to trigger verification. This event-driven composition model has no equivalent in MCP or Skills.sh.

### 5. Quality Gates as First-Class Citizens
The implement-review-audit cycle with circuit breaker protection is baked into the construct workflow. Skills.sh has no quality model. MCP has no quality model. Constructs treat quality as a structural concern, not an afterthought.

---

## 8. What Constructs Are Missing

### 1. Security Model
Skills.sh has Snyk integration (scanning every new skill before installation). MCP has OAuth scoping, sandboxing, and audit logging. The construct model has no supply-chain security mechanism for third-party packs. As the network grows beyond first-party constructs, this becomes critical. The ClawHavoc incident (341 malicious skills on ClawHub) is a cautionary tale.

**Recommendation**: Implement construct signing and verification. Consider Snyk-style scanning at `constructs install` time.

### 2. Cross-Platform Compatibility
Skills.sh supports 37+ agent platforms. The construct model currently targets Claude Code (and partially Cursor via the runtime contract). The SKILL.md files within constructs ARE cross-platform compatible, but the pack-level abstractions (construct.yaml, persona.yaml, events) require a construct-aware runtime.

**Recommendation**: Ensure every construct skill can degrade gracefully to a standalone SKILL.md when consumed outside the construct runtime. The construct.yaml becomes enrichment, not a hard dependency.

### 3. Registry Distribution Infrastructure
Skills.sh has `npx skills add`, npm as a transport layer, a leaderboard, anonymous telemetry, and category browsing. The construct model has `constructs.network` but limited CLI distribution tooling. The `browsing-constructs` skill exists but operates within Claude Code sessions, not as a standalone CLI.

**Recommendation**: Ship a `npx constructs add <pack>` flow that wraps the existing install scripts. Consider publishing packs as npm packages (like skillpm) to leverage existing registry infrastructure.

### 4. Dynamic Cross-Pack Discovery
At 49 skills across 6 packs, loading all skill metadata at startup is manageable (~5K tokens). At 500 skills across 50 packs, it would be untenable. A tool-search-style mechanism for pack-level discovery is needed.

**Recommendation**: Implement a "construct search" meta-tool that discovers relevant packs on-demand, similar to Anthropic's Tool Search Tool. Load pack manifests lazily, then skill metadata on pack activation, then skill instructions on skill invocation.

### 5. Explicit MCP Integration
Constructs should be able to declare which MCP servers they depend on, so that installing a construct can automatically configure the required MCP servers. Currently, MCP servers are network-level (`mcp-registry.yaml`), which is correct for infrastructure, but skill-level MCP requirements could enable more precise tool scoping.

**Recommendation**: Add an optional `mcp_requires` field to skill `index.yaml` that declares which MCP server categories a skill needs. The runtime can then activate relevant MCP servers with `defer_loading` when the skill is invoked.

### 6. Metrics and Telemetry
Skills.sh tracks anonymous install/usage metrics for its leaderboard. Constructs have no telemetry for skill invocation frequency, success rates, or failure patterns. This data is essential for understanding which skills provide value and which need improvement.

**Recommendation**: Optional telemetry hooks that log skill invocations to `.run/audit.jsonl` (already partially implemented via mutation logger hooks). Aggregate anonymized data for the constructs.network registry.

---

## 9. Patterns to Adopt

### From MCP: defer_loading for Pack Discovery
Apply the Tool Search Tool pattern at the construct level. At startup, load only a pack search tool (~500 tokens). When the agent encounters a domain-relevant task, search for matching packs, load skill metadata, then proceed with progressive disclosure.

### From Skills.sh: npm as Transport
Skills.sh's decision to use npm as the distribution backbone was pragmatic and effective. Constructs should evaluate whether packs can be published as npm packages containing `construct.yaml` + skills + identity, with a thin install script that places them in `.claude/constructs/packs/`.

### From TOON: Token-Efficient Data Payloads
For skills that process or return structured data (registry listings, audit results, gap analysis), consider TOON encoding of data payloads. This is low-priority compared to the architectural improvements above.

### From Anthropic: Capability Metadata as Routing Contract
The construct model's `capabilities` stanza is ahead of the market. Formalize it as a routing contract that runtimes can use for model selection, parallelization, and danger-gating. Publish this as a spec that other agent platforms can adopt.

### From the Coherence Cascade: Awareness Before Loading
The theoretical insight that awareness drives retrieval validates the construct model's design. The key is that agents need to know a capability EXISTS (pack manifest + description) before they can coherently request it. This is why the four-tier model works: awareness at each tier triggers goal-directed retrieval at the next tier.

---

## 10. Strategic Position

The construct model occupies a genuinely novel position in the agent tooling landscape:

```
npm: "Here's code. Import it."
MCP: "Here's a tool. Call it."
Skills.sh: "Here's how to do this task. Follow these instructions."
Constructs: "Here's a domain expert. It knows what to do, how to do it,
             when to use which tools, what quality looks like, and how
             to coordinate with other experts."
```

This is the difference between giving someone a hammer (MCP), giving them carpentry instructions (SKILL.md), and giving them access to a carpenter who owns a workshop (constructs).

The risk is that this level of abstraction may be premature for the market. Most teams are still figuring out basic SKILL.md workflows and MCP server configuration. The construct model solves problems of scale, coordination, and quality that become critical at 50+ skills — a scale most organizations haven't reached yet.

The opportunity is to be ready when they do. The teams that hit the 50-skill wall first (enterprise developer platforms, AI coding assistant companies, large open-source projects) will need exactly what the construct model provides: bundled expertise with identity, routing, events, and quality gates.

**Recommended next move**: Ship the graceful-degradation story first. Every construct skill should work perfectly as a standalone SKILL.md on any of the 37+ platforms Skills.sh supports. The construct layer becomes enrichment for Claude Code users, not a walled garden. This expands the addressable market from "Claude Code users who understand constructs" to "anyone using any agent who wants better skills" — and the ones who need more will graduate into the full construct model.

---

## Sources

### MCP
- [MCP Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [2026: The Year for Enterprise-Ready MCP Adoption](https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption)
- [MCP on Every Executive Agenda (CIO)](https://www.cio.com/article/4136548/why-model-context-protocol-is-suddenly-on-every-executive-agenda.html)
- [MCP Explained: Why It Matters in 2026](https://robomotion.io/blog/mcp-explained-why-model-context-protocol-matters-in-2026)
- [MCP Tool Discovery for LLM Agents (Portkey)](https://portkey.ai/blog/mcp-tool-discovery-for-llm-agents/)
- [How to Prevent MCP Tool Overload (Lunar)](https://www.lunar.dev/post/why-is-there-mcp-tool-overload-and-how-to-solve-it-for-your-ai-agents)
- [Tool-space Interference in the MCP Era (Microsoft Research)](https://www.microsoft.com/en-us/research/blog/tool-space-interference-in-the-mcp-era-designing-for-agent-compatibility-at-scale/)
- [Tool Search Tool (Claude API Docs)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Advanced Tool Use (Anthropic)](https://www.anthropic.com/engineering/advanced-tool-use)
- [MCP Context Overload (EclipseSource)](https://eclipsesource.com/blogs/2026/01/22/mcp-context-overload/)
- [Agentic MCP Configuration (PulseMCP)](https://www.pulsemcp.com/posts/agentic-mcp-configuration)

### SKILL.md / Agent Skills Standard
- [Equipping Agents for the Real World (Anthropic)](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Extend Claude with Skills (Claude Code Docs)](https://code.claude.com/docs/en/skills)
- [Agent Skills (Claude API Docs)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Agent Skills FAQ (Vercel)](https://vercel.com/blog/agent-skills-explained-an-faq)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [The Complete Guide to Building Skills for Claude (Anthropic)](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)

### Vercel Skills.sh
- [Introducing Skills (Vercel Changelog)](https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem)
- [Skills.sh: Open Ecosystem for Agent Commands (InfoQ)](https://www.infoq.com/news/2026/02/vercel-agent-skills/)
- [Skills GitHub Repository](https://github.com/vercel-labs/skills)
- [Skills.sh Directory](https://skills.sh/docs)
- [Snyk + Vercel: Securing Agent Skill Ecosystem](https://snyk.io/blog/snyk-vercel-securing-agent-skill-ecosystem/)

### Skills vs. MCP Comparisons
- [Skills vs MCP Tools: When to Use What (LlamaIndex)](https://www.llamaindex.ai/blog/skills-vs-mcp-tools-for-agents-when-to-use-what)
- [MCP, Skills, and Agents (Cra.mr)](https://cra.mr/mcp-skills-and-agents/)
- [Did Skills Kill MCP? (Goose / Block)](https://block.github.io/goose/blog/2025/12/22/agent-skills-vs-mcp/)
- [Why Do We Need MCP If Skills Exist? (Mintlify)](https://www.mintlify.com/blog/why-do-we-need-mcp-if-skills-exist)
- [Skills vs MCP vs Plugins vs Subagents (Awesome Skills)](https://awesomeskill.ai/blog/skills-vs-mcp-vs-plugins-vs-subagents)

### TOON Format
- [TOON vs JSON (Tensorlake)](https://www.tensorlake.ai/blog/toon-vs-json)
- [TOON GitHub Repository](https://github.com/toon-format/toon)
- [TOON vs JSON (DigitalOcean)](https://www.digitalocean.com/community/tutorials/toon-vs-json)
- [What is TOON? (freeCodeCamp)](https://www.freecodecamp.org/news/what-is-toon-how-token-oriented-object-notation-could-change-how-ai-sees-data/)

### On-Demand Loading / Progressive Disclosure
- [Dynamic Tool Loading in Strands SDK (AWS)](https://builder.aws.com/content/2zeKrP0DJJLqC0Q9jp842IPxLMm/dynamic-tool-loading-in-strands-sdk-enabling-meta-tooling-for-adaptive-ai-agents)
- [Smart Tool Selection: 34-64% Savings (Spring AI)](https://spring.io/blog/2025/12/11/spring-ai-tool-search-tools-tzolov/)
- [Progressive Tool Discovery (Agentic Patterns)](https://agentic-patterns.com/patterns/progressive-tool-discovery/)
- [The Coherence Cascade for AI (Medium)](https://medium.com/@todd.dsm/why-progressive-disclosure-works-for-ai-agents-a-theory-of-motivated-retrieval-665a9d1ea23a)
- [Progressive Disclosure Matters (AI Positive)](https://aipositive.substack.com/p/progressive-disclosure-matters)

### Token Efficiency / Structured Output
- [CodeAgents: Token-Efficient Multi-Agent Reasoning (arXiv)](https://arxiv.org/abs/2507.03254)
- [Agent Skills for Context Engineering (DeepWiki)](https://deepwiki.com/muratcankoylan/Agent-Skills-for-Context-Engineering)
- [Coding Agents in Feb 2026 (calv.info)](https://calv.info/agents-feb-2026)
- [Structured Outputs (Claude API Docs)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Workflow Orchestration
- [AI Agent Design Patterns (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Agentic Workflows for Software Development (McKinsey)](https://medium.com/quantumblack/agentic-workflows-for-software-development-dc8e64f4a79d)
- [Every AI Agent Skills Platform in 2026 (DEV Community)](https://dev.to/haoyang_pang_a9f08cdb0b6c/every-ai-agent-skills-platform-you-need-to-know-in-2026-4alg)
- [The Agent Skills Directory (skills.sh)](https://skills.sh/)
