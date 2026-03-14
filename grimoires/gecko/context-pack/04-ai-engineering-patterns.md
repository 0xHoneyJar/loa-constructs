# AI Engineering Patterns — Industry Context

> the patterns that survived contact with production.

## Karpathy's Software 2.0

The central insight: neural networks are not tools that run inside traditional programs — they ARE the program. The weights are the source code. Training is the compiler. Data is the programming language.

### What Survived

| Principle | Original Context | Production Reality |
|-----------|-----------------|-------------------|
| **Think Before Coding** | Don't start typing until you understand the problem | Agents that plan before acting outperform reactive agents 3:1 |
| **Simplicity First** | Reduce complexity at every layer | Simple prompt + good tools > complex prompt + no tools |
| **Surgical Changes** | Minimal diffs, maximum impact | Agent edits that touch 3 files beat refactors that touch 30 |
| **Goal-Driven** | Every action serves a measurable objective | Agents without explicit goals hallucinate work |

### Vibe Coding → Agentic Engineering

Karpathy coined "vibe coding" (Feb 2025) — then declared it passe exactly one year later (Feb 2026), proposing **agentic engineering**:

> "The new default is that you are not writing the code directly 99% of the time, you are orchestrating agents who do and acting as oversight."

The arc: Vibe Coding (Feb 2025) → Agentic Engineering (Feb 2026) → autoresearch (Mar 2026).

### autoresearch — The Reference Implementation

Karpathy's `autoresearch` (25k stars in 5 days, Mar 2026) enforces a **three-file architecture**:
- `prepare.py` — immutable infrastructure (human-written, never touched by agent)
- `train.py` — agent-editable code (the only file the agent modifies)
- `program.md` — human instructions to agent (the spec)

630 lines total. The constraint IS the design: the entire codebase fits inside an LLM's context window. Every experiment runs exactly **5 minutes** — fixed time budget makes results comparable regardless of what the agent changed. ~12 experiments/hour, ~100 overnight. The agent found 20 additive improvements Karpathy had missed in two decades of manual work — an **11% efficiency gain** on an already well-tuned system.

This three-zone model (System / State / App) mirrors what we already have with `.claude/` / `grimoires/` / `src/`.

### The Autonomy Slider

From Karpathy's YC AI Startup School keynote (June 2025): the "Iron Man Suit, not Iron Man Robot" concept. Let the human decide how much control to cede. The best agent CLIs toggle between autocomplete mode (low autonomy) and autonomous execution (high autonomy) — not force one or the other.

Key quote on patience: *"Think of this as the **decade** of agents, not the 'year of agents.'"*

### Compound AI Systems

Berkeley AI Research (BAIR, February 2024) published the defining framing: state-of-the-art AI results come from compound systems with multiple components, not monolithic models. Google's AlphaCode 2 generates up to 1 million candidate solutions then filters. AlphaGeometry pairs an LLM with a symbolic solver. The pattern: specialized components orchestrated into a pipeline.

This is exactly the tiered model pattern from Ruggie v2:
- **Haiku** classifies, filters, routes (fast, cheap, disposable)
- **Opus/Sonnet** reasons, plans, generates (expensive, careful)
- **Orchestrator** decides which model handles what

Karpathy reinforced this but was honest about the state of the art. On the Dwarkesh Podcast he called today's autonomous agents "slop": *"I feel like the industry is making too big of a jump and is trying to pretend like this is amazing, and it's not."* His target: the fantasy of fully autonomous digital employees. The pattern that works is narrow, well-constrained, measurable (like autoresearch). The pattern that doesn't: "one agent does everything."

**What This Means for Gecko**: Don't build one agent. Build a system of specialists with a coordinator. The classifier is not the planner is not the actor. Be honest about what works — ship the triage loop first, don't pretend Gecko can autonomously run ops.

## Tobi Lutke and QMD

### The Mandate (April 2025)

Shopify's CEO posted a ~1,300-word internal memo publicly: **"Reflexive AI usage is now a baseline expectation at Shopify."** Specific mandates:
- Managers must prove AI cannot do a job before requesting headcount
- AI competency is part of 360 performance reviews
- Product designers must use AI for all feature prototypes
- No spending caps on AI tooling (unlimited Cursor, Claude, etc.)

Shopify's internal stack: Cursor (3,000+ licenses — fastest-growing users are support and revenue, not engineering), Claude Code (powers CodeAgent inside their "Roast" framework), LibreChat (internal chat/RFP agent), and an LLM Proxy with MCP connections to all internal data sources. A **token spend leaderboard** tracks highest AI usage. The CTO appeared on it.

### Context Engineering (June 2025)

Lutke crystallized the term that displaced "prompt engineering":

> "I really like the term 'context engineering' over prompt engineering. It describes the core skill better: the art of providing all the context for the task to be plausibly solvable by the LLM."

Karpathy agreed. The term stuck. The implication: `CLAUDE.md`, `.cursor/rules/`, spec documents — anything the agent needs every session gets written down once, not repeated every prompt. Systematic context provision, not clever prompting.

### QMD (Queryable Markdown Documents)

QMD (14.4k stars, 839 forks) is Lutke's personal search engine. His own words: *"I think QMD is one of my finest tools. I use it every day because it's the foundation of all the other tools I build for myself."*

**Architecture — three-stage search pipeline:**

```
Query → [BM25 (SQLite FTS5)] ──┐
       [Vector (GGUF embeddings)] ─┤─→ RRF Fusion → LLM Reranking → Results
       [HyDE expansion] ──────────┘
```

Key design decisions:
- SQLite as single storage layer (no Elasticsearch, no servers)
- Documents chunked at ~900 tokens (avoids the averaging problem)
- **Context trees** — descriptive text attached to collections travels alongside search results, enabling downstream LLMs to make better document-selection decisions. The README calls this *"the key feature of QMD."*
- MCP server: spec-compliant, stdio or HTTP daemon at localhost:8181/mcp
- Agent-oriented output flags: `--json`, `--files`, `--all`, `--min-score`

We already have this pattern:
- `grimoires/` is a QMD-like knowledge base
- Construct SKILL.md files are queryable context
- The context-pack pattern (this folder) is QMD for planning

**What This Means for Gecko**: Gecko's knowledge base should be QMD-queryable. Every construct's SKILL.md, every research doc, every sprint artifact — searchable via hybrid BM25+vector. The context tree pattern means Gecko doesn't just search — it understands where results live in the structure.

### AI-First Development

Tobi's deeper point: if you treat AI as a tool you use sometimes, you get 10% improvement. If you redesign your workflow assuming AI is always present, you get 10x improvement. The difference is architectural, not incremental. His framing: AI turns 10x employees into 100x teams.

For Gecko: don't build "a bot that uses AI." Build an intelligence system that happens to have a CLI interface. The AI is not a feature — it's the substrate.

## Agent Loop Patterns

### OODA (Observe → Orient → Decide → Act)

Military doctrine from Col. John Boyd, adapted for AI agents. Developed for fighter pilots; maps to autonomous agents because both operate in environments that change faster than any single analysis can capture. The key insight is **Orient** — it's not enough to observe. You must contextualize observations against mental models before deciding.

```
OBSERVE: Scan signals, PRs, issues, deployments, error logs
ORIENT: Classify severity, identify patterns, correlate across repos
DECIDE: Triage (route, escalate, dismiss, investigate)
ACT: Create issue, post comment, send alert, update dashboard
```

The loop runs continuously. Speed of iteration matters more than depth of any single step. The most important part of OODA isn't any single phase — it's the loop itself. If Act doesn't feed back into Observe, you have a pipeline, not an agent.

Bruce Schneier's critique (Harvard Berkman Klein Center, October 2025) is worth tracking: today's AI agents "observe the Internet, orient via statistics, decide probabilistically, and act without verification." The Observe stage lacks authentication — adversarial examples, prompt injection, sensor spoofing can all corrupt inputs. The Orient stage can be poisoned months before deployment via training data. For Gecko this means: validate inputs at the Observe boundary. Don't trust raw signals — deduplicate, verify source, check for injection patterns. The signals pipeline already does dedup; Gecko needs to extend this with source verification.

### ReAct (Reason + Act)

The pattern from Google Brain: agent alternates between reasoning (thinking out loud) and acting (calling tools). Each reasoning step references the results of previous actions.

```
THOUGHT: The error rate spiked at 14:03. Let me check what deployed around that time.
ACTION: gecko prs list --merged-after 14:00 --repo midi-interface
OBSERVATION: PR #47 merged at 14:01, changed auth middleware
THOUGHT: Auth middleware change correlates with error spike. Let me check the error details.
ACTION: gecko signals list --since 14:00 --severity critical
OBSERVATION: 12 signals, all "JWT verification failed"
THOUGHT: PR #47 likely broke JWT verification. This is a HIGH severity incident.
ACTION: gecko issues create --title "Auth regression from PR #47" --severity high --assignee janitooor
```

**What This Means for Gecko**: Gecko's patrol loop should be ReAct-based. Not just "scan and report" but "scan, reason about correlations, investigate, then report with evidence."

### State Machines for Long-Running Agents

The transition from stateless request-response to stateful agent lifecycle is the primary source of architectural friction in modern AI systems. Unlike microservices that aim for the shortest path to completion, an agent's value lies in its ability to loiter — pause, reason, self-correct. Agents must be able to suspend mid-session (waiting for human approval, an external webhook, a long-running tool execution) and resume later without losing accumulated context.

| State | Meaning | Transitions |
|-------|---------|-------------|
| IDLE | Waiting for trigger | → OBSERVING (cron), DELEGATED (Linear) |
| OBSERVING | Scanning ecosystem | → ORIENTING |
| ORIENTING | Classifying and correlating | → DECIDING |
| DECIDING | Choosing action | → ACTING, ESCALATING |
| ACTING | Executing action | → IDLE, OBSERVING |
| ESCALATING | Human needed | → IDLE (after human response) |
| ERRORED | Something broke | → IDLE (after backoff) |

**State externalization** is the key principle: task state lives in files or external storage, not memory. If the process dies and restarts, execution resumes from the last checkpoint. LangGraph persists state after each node execution. Microsoft Agent Framework provides explicit suspend/resume semantics for human-in-the-loop scenarios. Convex is ideal for Gecko — reactive state that survives process restarts with real-time subscriptions.

### Circuit Breaker Pattern

When an agent starts making things worse, it needs to stop. The pattern:
- **Closed** (normal): agent operates freely
- **Open** (tripped): agent stops acting, only observes
- **Half-Open** (testing): agent acts on one thing, checks if it worked

Triggers for opening the circuit:
- N consecutive failed actions
- Human override / negative feedback
- Anomalous volume (suddenly 100x normal signal rate)
- Cost threshold exceeded
- Token/reasoning budget exhausted

A **Reasoning Circuit Breaker** is a specific subpattern: if an agent hits the same tool with the same parameters more than 3 times (the "Stuttering Check"), the circuit trips, state is persisted, and an alert fires for human intervention.

Common failure modes the circuit breaker catches:
- **Zombie tasks**: alive by every metric except the one that matters — a tool call hangs waiting for a response, no error occurs, no recovery triggers
- **Subagent black holes**: a spawned subagent fails silently in its isolated session, parent waits forever for a completion signal that never comes
- **Infinite refinement loops**: agent burns tokens without converging on useful output

We already use this pattern in Run Mode (`/run` circuit breaker). Gecko inherits the same pattern.

### Escalation Ladders

Not every decision belongs to automation. The pattern: implement a **Reasoning Budget** per transaction — if token count or reasoning depth exceeds a threshold, freeze state and trigger human-in-the-loop (HITL) escalation.

Escalation options ranked by preference:
1. **Route elsewhere** — human operator handoff, alternative agent, queue for later processing
2. **Partial processing** — complete what's safe, skip what's risky, be transparent about limitations
3. **Iteration cap with fallback** — maximum step count, then return best result with quality warning

For Gecko: every patrol cycle should have an explicit cost ceiling. If classification + investigation exceeds the budget, halt and report what was found so far. Don't keep spending to reach a conclusion that might be wrong.

## The "Agent as Team Member" Paradigm

### Linear's Vision

Linear Agent SDK treats agents as first-class team members. They show up in the team roster. They get assigned issues. They have sessions with start/end times. They report progress in the same timeline as human activity.

This is architecturally different from "bot that reacts to webhooks." The agent has **identity** and **accountability** within the team's workflow.

### Devin's Contribution

Cognition's Devin (launched early 2025) demonstrated the delegation model at scale — plans, codes, tests, deploys, and submits PRs independently. Goldman Sachs deployed it as "Employee #1" in their hybrid workforce vision, calling it a "generative AI-based full-stack developer."

Production numbers from 2025: PR merge rate improved from 34% to 67% over the year — meaning one-third still need significant rework. The honest assessment: treat agent output like code from a junior developer. Implementation is often correct, but edge cases, error handling, and architectural decisions require senior review.

The pattern that matters isn't the capability, it's the **delegation model**: humans scope the work, agents execute, humans review. Use cases where this actually works: backlog clearing (bug fixes, test coverage, dependency upgrades), code migrations (10-14x faster than manual), security fixes (~1.5 minutes vs 30 for a human), test generation (50-60% coverage to 80-90%).

### What This Means for Gecko

Gecko should be a team member in Linear, not a service that posts to Linear. The difference:

| Service Model | Team Member Model |
|--------------|-------------------|
| Webhook → process → post | Get assigned → acknowledge → investigate → report |
| Invisible until it posts | Visible in team roster |
| No accountability | Session lifecycle, progress tracking |
| Can't be directed | Can receive delegation with context |
| Operates on its own schedule | Responds to team needs |

## Tool Calling Patterns

### CLI vs MCP vs SDK — The Hard Numbers

The ScaleKit benchmark (75 runs, Claude Sonnet 4, 5 GitHub tasks) provides definitive data:

| Metric | CLI | CLI + Skills | MCP |
|--------|-----|-------------|-----|
| Token cost (simplest task) | 1,365 | 4,724 | **44,026** |
| Token multiplier vs CLI | 1x | 3.5x | **32x** |
| Reliability | 100% (25/25) | 100% (25/25) | **72% (18/25)** |
| Monthly cost (10k ops) | $3.20 | — | **$55.20** |

Root cause: GitHub's MCP server exposes 93 tools, injecting ~55,000 tokens of schema into every conversation. CLI has zero schema overhead — models compose `gh` commands from training knowledge (billions of terminal interaction examples in training corpora).

**The 800-token trick**: An ~800-token skills file with useful `gh` flags reduces tool calls and latency by ~33% vs naive CLI. The skill is the single highest-leverage artifact in the entire agent stack.

| Dimension | CLI | MCP | SDK |
|-----------|-----|-----|-----|
| Token efficiency | Best (~300/op) | Worst (~2000/op) | Good (~500/op) |
| Composability | Excellent (pipes) | Poor (protocol overhead) | Moderate |
| Error handling | Exit codes, stderr | Protocol errors | Exceptions |
| Real-time | Watch mode | Subscriptions | Events/callbacks |
| Discovery | --help, man pages | Tool listing | Type definitions |
| Cross-platform | Universal | Needs MCP host | Language-specific |

**When MCP still wins**: Multi-tenant auth, non-developer users, governance/audit trails, remote SaaS without vendor CLIs.

The emerging consensus: **CLI for actions, MCP for context, SDK for identity.**

### Tool Calling is Just Function Calling

The insight that simplifies everything: when an AI agent "uses a tool," it's calling a function. The function has:
- A name (the command)
- Parameters (the arguments, typed by Zod)
- A return value (structured output)
- Side effects (the actual work)

The transport (CLI invocation, MCP message, HTTP request) is an implementation detail. incur gets this right by making the same command definition work across all transports.

### Vercel AI SDK 6 Agent Patterns

AI SDK 6 (20M+ monthly downloads) introduced the patterns that matter for production agents:

- **`ToolLoopAgent` class**: manages agent loops and message arrays — reduces boilerplate, improves reusability
- **Human-in-the-loop approvals**: a single `needsApproval` flag on any tool — no custom approval code
- **Programmatic tool calling**: Claude calls tools from a code execution environment, keeping intermediate results out of context — significant token savings
- **Dynamic tool search**: regex or BM25 to search/select tools at runtime (relevant when tool count exceeds context budget)
- **Multi-agent workflows**: chaining, routing, parallel execution, evaluator-optimizer patterns

The design principle: **tools as first-class citizens in the agent's world model.** The agent doesn't just have access to tools — it understands what each tool does, what it returns, and when to use it. Combined with incur's CTA pattern (each command suggests next commands), the agent builds a workflow graph in real-time.

## Claude Code as Reference Architecture

Claude Code authors **4% of all public GitHub commits (~135,000/day)** — a 42,896x growth in 13 months. 90% of Anthropic's own code is AI-written. The extension point timeline matters for understanding what a production agent system looks like:

| Date | Extension | Purpose |
|------|-----------|---------|
| Nov 2024 | MCP | External tool integration |
| Jul 2025 | Subagents | Hierarchical task decomposition |
| Sep 2025 | Hooks | Lifecycle automation (14 events) |
| Oct 2025 | Plugins + Skills | Third-party packages + repeatable workflows |
| Feb 2026 | Agent Teams | Collaborative multi-agent sessions |

The **hooks system** is the most architecturally significant feature: 14 lifecycle events with `PreToolUse` (fires before every tool call, can allow/deny — highest-priority control mechanism) and `PostToolUse` (fires after, can inject context). This is a programmable control plane expressed as shell scripts — not YAML, not a DSL.

The **CLAUDE.md pattern** became a cross-runtime standard adopted by Codex CLI, Gemini CLI, and others within weeks. Write it down once, every session gets it.

**What This Means for Gecko**: We're already inside this architecture (Loa IS a Claude Code extension). Gecko's hooks, skills, and agent teams patterns should inherit directly from Claude Code's extension model, not reinvent them.

## Cost Architecture

### The Hard Numbers

| Model | Input $/M tokens | Output $/M tokens | Latency |
|-------|-------------------|---------------------|---------|
| Claude Haiku 3.5 | $0.25 | $1.25 | ~200ms |
| Claude Sonnet 4 | $3.00 | $15.00 | ~1s |
| Claude Opus 4 | $15.00 | $75.00 | ~3s |

### Tiering Strategy

```
CLASSIFIER (Haiku): Is this signal worth investigating?
  → 90% filtered here. Cost: $0.001 per signal.

INVESTIGATOR (Sonnet): What does this signal mean in context?
  → 80% of remaining resolved here. Cost: $0.05 per investigation.

PLANNER (Opus): What should we do about this pattern?
  → Only complex, cross-cutting issues reach this tier. Cost: $0.50 per plan.
```

Expected daily cost for an ecosystem of 6 repos:
- 100 signals/day × $0.001 = $0.10 (classification)
- 10 investigations/day × $0.05 = $0.50 (investigation)
- 1 plan/day × $0.50 = $0.50 (planning)
- **Total: ~$1.10/day** (under $35/month)

This is cheaper than a Datadog seat.

### Trust Calibration Warning

The CodeRabbit study (December 2025, 470 open-source PRs) found AI-co-authored code contained ~1.7x more "major" issues versus human-written code. METR's randomized controlled trial found experienced open-source developers were 19% slower when using AI tools, despite predicting they'd be 24% faster. The gap is trust calibration — overconfidence in AI output degrades quality. For Gecko, this means triage output must always surface confidence levels, never present classifications as certainties.

## Patterns That Don't Work

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| **One model for everything** | Opus on every signal = $150/day for mostly trivial work |
| **Pure MCP agents** | Token overhead kills cost efficiency at scale |
| **Stateless agents** | Without memory, every patrol starts from zero |
| **Invisible agents** | Agents must show their work to build trust |
| **Perfect-first agents** | Ship the triage loop, iterate on accuracy |
| **Config-heavy agents** | If it takes 30 minutes to configure, nobody will use it |
| **Fully autonomous agents** | Karpathy: "they just don't work" — narrow and constrained beats general and autonomous |
| **Agents without escalation** | No circuit breaker = zombie tasks, runaway costs, silent failures |
| **Overconfident outputs** | 1.7x more issues in AI code (CodeRabbit) — always surface confidence, never assert certainty |

## Synthesis: The Gecko Pattern

Combining all of the above:

1. **CLI-first** (incur) — all capabilities as typed commands, TOON for token efficiency
2. **Tiered models** (Karpathy/Ruggie/BAIR) — Haiku classifies, Sonnet investigates, Opus plans
3. **OODA loop** (Boyd/ReAct) — observe, orient, decide, act — with input validation at the Observe boundary
4. **Linear-native** (Agent SDK) — team member with identity, not a service that posts
5. **State machine** (Run Mode pattern) — explicit states, persisted in Convex, survives restarts
6. **Circuit breaker** (production pattern) — stop when making things worse, stutter detection, reasoning budget
7. **Escalation ladder** — cost ceiling per patrol cycle, partial results over no results
8. **QMD context** (Tobi/Shopify) — grimoires as queryable knowledge, local search with re-ranking
9. **Compound system** (Karpathy/Berkeley) — specialists with coordinator, not one agent doing everything
10. **Constrained scope** (AutoResearch) — one observable, one metric, one loop — iterate on accuracy

---

*Sources: Karpathy [Software 2.0](https://karpathy.medium.com/software-2-0-a64152b37c35), [2025 LLM Year in Review](https://karpathy.bearblog.dev/year-in-review-2025/), [AutoResearch](https://www.marktechpost.com/2026/03/08/andrej-karpathy-open-sources-autoresearch-a-630-line-python-tool-letting-ai-agents-run-autonomous-ml-experiments-on-single-gpus/); Lutke [QMD](https://github.com/tobi/qmd), [AI Mandate](https://x.com/tobi/status/1909251946235437514); Berkeley BAIR [Compound AI Systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/); [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview); [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6); [incur](https://github.com/wevm/incur); [MCP vs CLI Benchmark](https://www.scalekit.com/blog/mcp-vs-cli-use); Schneier [OODA Loop Problem](https://cyber.harvard.edu/story/2025-10/agentic-ais-ooda-loop-problem); [Agent Architecture Patterns](https://dev.to/topuzas/ai-agent-architecture-patterns-engineering-for-autonomy-resilience-and-control-134m); [Devin](https://devin.ai/agents101); [Linear Agents](https://linear.app/agents); [Agentic Engineering](https://www.glideapps.com/blog/what-is-agentic-engineering)*
