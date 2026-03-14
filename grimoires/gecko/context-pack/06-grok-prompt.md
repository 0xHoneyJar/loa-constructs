# Deep Research Prompt — Gecko Agent System

> for Grok deep research mode, ChatGPT deep research, or Gemini deep research.

## Prompt

I'm building an autonomous ecosystem intelligence agent called **Gecko** for a Web3 developer tools network. I need deep research across several dimensions. Here's the full context:

### What Gecko Is

Gecko is an autonomous agent that monitors a network of 14+ developer constructs (packaged AI skills for software development). It:
- Ingests signals from feedback widgets, error reports, and API events across 6+ product repositories
- Classifies signals using tiered AI models (Haiku for filtering, Sonnet for investigation, Opus for planning)
- Routes to Linear issues with severity-based escalation
- Runs patrol loops (observe → orient → decide → act) on a 15-minute schedule
- Operates as a first-class Linear team member via the Agent SDK (not just a webhook reactor)
- Exposes all capabilities via a CLI built on the `incur` framework (CLI > MCP for actions)

### What I Need Researched

**1. Linear Agent SDK — Deep Dive**

The Linear Agent SDK is relatively new. I need:
- Complete API surface: registration, delegation handling, session lifecycle, progress reporting
- Rate limits and quotas for agent operations
- Best practices from teams who've deployed Linear agents in production
- How agent identity differs from OAuth app identity
- The delegation model: how do humans assign to agents? What's the UX on Linear's side?
- Webhook vs real-time API for agent event consumption
- Any open-source Linear agent implementations to study
- GraphQL API coverage that the Agent SDK doesn't wrap (gaps we'd need to fill with raw GraphQL)

**2. Production Autonomous Agent Architectures**

I need case studies and patterns from teams running agents in production (not demos):
- **Devin** (Cognition): How does their agent loop work? What's the task delegation model?
- **Sweep AI**: Autonomous code review and PR generation. How do they handle state?
- **Linear's own AI features**: Auto-triage, auto-assignment — what patterns do they use internally?
- **GitHub Copilot Workspace**: Multi-step task execution, how does the planning loop work?
- **Cursor/Windsurf agent mode**: How do IDE agents manage long-running tasks?
- **Any production agent that uses Linear as its task management surface**

Key questions:
- How do production agents handle circuit breaking (stopping when they're making things worse)?
- What state persistence patterns work? (SQLite? Convex? Redis? Postgres?)
- How do they handle cost control for model inference?
- What's the human-in-the-loop pattern for escalation?

**3. Compound AI Systems in Practice**

Berkeley AI Research published work on compound AI systems. I need:
- The original paper/blog and its practical implications
- Examples of tiered model architectures in production
- Cost optimization patterns for multi-model systems
- How routing decisions are made (which model handles which task)
- Orchestration patterns: is there a standard approach?
- How does function calling / tool use work in compound systems?

**4. CLI-First Agent Tooling**

The `incur` framework (by wevm, the viem/wagmi team) is our chosen CLI framework. I need:
- Comparable frameworks: anything else doing agent-first CLI design?
- The TOON (Token-Optimized Object Notation) format — has anyone else adopted it?
- MCP server integration patterns: what's the best way to bridge CLI → MCP?
- OpenAPI mounting for agent CLIs — any production examples?
- How do autonomous agents invoke CLIs? (subprocess? HTTP? MCP?)

**5. Cross-Repository Signal Aggregation**

Gecko monitors 6+ repos and correlates signals across them:
- How do companies with many microservices correlate errors across services?
- What patterns exist for cross-repo incident grouping?
- How does PagerDuty/OpsGenie/Linear handle multi-source signal correlation?
- Any open-source signal aggregation systems designed for small teams (< 5 people)?

**6. The "Shape" Paradigm — Anti-Gaming Intelligence**

Our predecessor agent (Ruggie) developed a "shape recognition" system for community engagement — multi-dimensional sensing where the geometry of participation triggers judgment, not a formula. The key insight: if people know the formula, they game it (see: Kaito reputation gaming).

I need:
- Academic research on anti-gaming mechanisms in reputation/scoring systems
- Sybil resistance patterns that don't require token gating
- How does Stack Overflow's reputation system handle gaming? What worked, what didn't?
- The concept of "legibility" vs "illegibility" in scoring (James C. Scott's "Seeing Like a State")
- Any AI-based systems that detect engagement patterns without exposing the detection criteria

### Output Format

For each topic, I need:
- **Key findings** (concise, opinionated)
- **Source links** (papers, repos, blog posts, docs)
- **Relevance to Gecko** (how this applies to our specific architecture)
- **Gaps** (what's not yet solved by existing work)

### Context on Our Stack

- **Runtime**: Next.js 15 (Vercel) + Hono API (Railway)
- **State**: Convex (real-time) + Supabase (relational)
- **Models**: Claude family (Haiku/Sonnet/Opus) via Anthropic API
- **CLI**: incur framework (TypeScript, Bun runtime)
- **Issue tracking**: Linear (team ID: 466d92ac-...)
- **Alerting**: Discord webhooks
- **Repos**: 6 product apps + 14 construct repos
- **Team size**: 1-3 developers

---

## How to Use This Prompt

1. Copy the entire prompt above
2. Paste into Grok deep research, ChatGPT deep research, or Gemini deep research
3. Let it run (typically 10-30 minutes for deep research mode)
4. Save output to `grimoires/gecko/context-pack/07-deep-research-results.md`
5. Feed back into planning session

## Alternative: Targeted Sub-Prompts

If the full prompt is too broad, split into these focused queries:

### Query A: Linear Agent SDK
"I'm building an autonomous agent that registers as a first-class team member in Linear using the Agent SDK. Deep dive into the complete API surface, delegation model, session lifecycle, and any open-source implementations. I need production patterns, not demos."

### Query B: Production Agent Loops
"Research production autonomous AI agents (Devin, Sweep, GitHub Copilot Workspace, Cursor agent mode). Focus on: state management, circuit breaking, cost control, and human-in-the-loop escalation patterns. I need architecture patterns from teams running agents 24/7."

### Query C: Anti-Gaming Intelligence
"Research anti-gaming mechanisms for AI-powered engagement scoring. The system observes community participation and makes qualitative judgments about engagement quality. Key constraint: if the formula is visible, it will be gamed. References: Kaito reputation gaming, Stack Overflow rep gaming, James C. Scott's 'Seeing Like a State' on legibility. I need patterns where the detection criteria are deliberately opaque."
