# Deep Research Results — Linear Agent SDK, Production Agents, Compound AI

> source: user-provided deep research (6 topics, external research tools)

## 1. Linear Agent SDK — Deep Dive

**Key finding**: Linear's "Agent SDK" is not a standalone library but a thin layer of agent-specific primitives (AgentSession + AgentActivity mutations/webhooks) built atop their mature GraphQL + TypeScript SDK.

### Registration Model
- Agents register as **OAuth apps with actor=app** (workspace-scoped, admin install required)
- Agents gain native UX as first-class teammates: they appear in @mention menus
- Can be assigned as **delegates** (not assignees — humans retain ownership)
- Delegation triggers automatic sessions on mention or delegation

### Session Lifecycle
- Sessions have visible states: `pending → active → awaitingInput → error → complete`
- States auto-managed by Linear based on emitted activities
- **Must emit a thought activity within 10 seconds** of `created` webhook or risk "unresponsive" marking
- Progress uses semantic activities: `thought | action | elicitation | response | error`
- Rich `promptContext` (XML-structured issue + comments + guidance)

### Event Consumption
- **Webhooks are the real-time consumption path** (AgentSessionEvent)
- Raw GraphQL fills gaps (proactive sessions, external URLs, plans)
- No agent-specific rate limits — standard GraphQL applies (5k req/hr, complexity-based)

### Identity
- Agent identity is **app-level** (unique per workspace install), distinct from user OAuth
- Delegation UX is seamless: assign issue → agent gets session + context

### Open Source Examples
- Cyrus (Claude Code wrapper)
- linear-agent-demo (Cloudflare Workers)
- Jellypod Claude integration
- Best practices from Cursor, internal Linear experiments: disclose agent nature, provide instant feedback, keep responses transparent/native, use webhooks over polling

### Gaps
- No built-in circuit-breaking or long-running task orchestration beyond session states
- Raw GraphQL still required for full issue CRUD or bulk operations
- Production best practices emerging but lack deep rate-limit guidance for autonomous loops
- No official multi-agent coordination primitives

## 2. Production Autonomous Agent Architectures

**Key finding**: Real production agents are checkpoint-heavy, stateful loops with explicit human-in-the-loop (HITL) gates — not fully autonomous black boxes.

| Agent | Architecture | State Model | Circuit Breaker |
|-------|-------------|-------------|-----------------|
| **Devin** | Cloud-sandboxed env, planning checkpoint → execution → test/self-verify/auto-fix loop | Playbooks for repetitive tasks, PR/review gates | Repeated failure detection or human override |
| **Sweep AI** | GitHub-issue → code-search index → XML-structured plan → iterative file edits → PR push | Git + internal index (no heavy DB) | IDE agent mode with human review mandatory |
| **Linear Triage** | LLM-based duplicate/related-issue detection + property inference on every new issue | Rules-based escalation | N/A (lightweight) |
| **Copilot Workspace** | NL task → spec/plan → multi-step code changes + test/iterate loop | "Plan then execute" reasoning | Human approval gates |
| **Cursor/Windsurf** | Parallel planners + role-separated agents (planner/verifier), git worktrees for isolation | Recursive sub-tasks | YOLO/auto-run build loops |

### Universal Patterns
- **Circuit breaking**: Progress monitoring + stuck detection (no improvement after N steps)
- **State persistence**: DB (Postgres/Convex) or git/index for reproducibility
- **Cost control**: Model routing/caching + smaller models for sub-tasks
- **HITL**: Mandatory review gates or awaitingInput sessions

### What This Means for Ruggy
Patrol loops + Linear delegation mirror these exactly. CLI actions fit as tool calls. Small-team (1-3 devs) needs match: git/Convex state + Discord webhooks for HITL.

## 3. Compound AI Systems

**Key finding**: Berkeley's core insight (2024) is correct and already dominant — SOTA comes from compound systems, not monolithic LLMs.

- Tiered architectures win: fast/cheap model (filter) → medium (investigate) → expensive (plan)
- Routing via simple classifiers/heuristics or learned cascades (FrugalGPT pattern)
- Cost optimization via routing, sampling ensembles, caching, smaller models for 80% of work
- Orchestration: ReAct-style loops, DSPy for tuning, or workflow engines (LangChain/LangGraph)
- Function/tool calling is the glue — LLM decides calls, tools return structured data

**Ruggy's Haiku → Sonnet → Opus tiering + patrol loop is textbook compound AI.**

### Gaps
- No single standard orchestrator (framework fragmentation)
- Routing logic often hand-tuned
- Production cost dashboards for multi-model systems are nascent

## 4. CLI-First Agent Tooling

**Key finding**: incur (wevm) is purpose-built for agent-first CLIs. TOON compresses 30-60% vs JSON.

- **TOON** (Token-Oriented Object Notation): separate format, compresses structured data while remaining human-readable
- **MCP bridge**: Expose incur commands as MCP servers or subprocess invocation
- **Agent invocation**: Subprocess (common, low overhead) or HTTP/MCP
- **CLI > pure MCP** because agents get Unix-pipe composition without bloating context

### Gaps
- Very early ecosystem (few production incur examples)
- TOON adoption still niche
- Robust CLI→MCP bridges require custom servers

## 5. Cross-Repository Signal Aggregation

**Key finding**: Production microservices correlate via propagated correlation/trace IDs (OpenTelemetry standard) + event timestamps/tags/deployments.

- PagerDuty/OpsGenie/Rootly group alerts into single incidents using ML/time-window/topology analysis (89% noise reduction)
- For small teams (<5): simple shared event IDs + log aggregation + anomaly detection
- Multi-repo incident grouping succeeds when you link signals to a central Linear issue or shared trace store

**Ruggy approach**: Use trace IDs + Convex for real-time correlation, route grouped signals to Linear via Agent SDK. No need for enterprise PagerDuty.

## 6. Anti-Gaming Intelligence ("Shape" Paradigm)

**Key finding**: Formulaic scoring inevitably gets gamed. Illegible multi-dimensional "shape" sensing resists it.

- Stack Overflow suffers repwhores, serial low-effort questions, and moderator gatekeeping despite years of tweaks
- James C. Scott's *Seeing Like a State*: legible systems invite manipulation; illegible systems resist it
- AI-based systems can detect "illegible" patterns (social graphs, timing, diversity of contribution) with high accuracy while keeping criteria opaque
- Sybil resistance without tokens works via proof-of-personhood patterns or hidden AI classifiers on engagement geometry

**Ruggy's shape recognition for community/engagement signals is state-of-the-art anti-gaming.** Apply to feedback routing to prevent formulaic spam/escalation gaming.

## Overall Assessment

> Your architecture — tiered Claude + incur CLI + Linear Agent SDK + Convex state — is already ahead of most production examples. Focus next on: (1) implementing AgentActivity emission + 10s ack in patrols, (2) TOON for context, (3) trace-ID correlation across repos, (4) shape-based illegible routing.
