# DX Vision Strategy: The Back-Pressure Model

**Version**: 1.1.0
**Status**: Decisions Locked
**Author**: Vision Synthesizer
**Date**: 2026-02-05

---

## Core Thesis

> AI generation is infinite. Human attention is finite. The product that wins is the one that makes human back-pressure the most efficient force multiplier possible.

In neural network terms: agents are the forward pass (generation), humans are the backward pass (gradient signal). The quality of output is determined not by generation volume, but by the precision and specificity of human feedback applied to the right weights at the right time.

This is the philosophical foundation for everything Loa builds.

---

## 1. The Seven Themes

### Theme Map

```
                    ┌─────────────────────────┐
                    │   BACK-PRESSURE MODEL    │  ← Core Philosophy
                    │   (Theme 2)              │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────┐  ┌─────▼──────┐  ┌───▼──────────┐
    │ DOMAIN-      │  │ TOKEN      │  │ WORK =       │
    │ SPECIFIC DX  │  │ EFFICIENCY │  │ CONVERSATIONS │
    │ (Theme 1)    │  │ (Theme 5)  │  │ (Theme 3)    │
    └──────┬───────┘  └─────┬──────┘  └───┬──────────┘
           │                │              │
    ┌──────▼───────┐  ┌─────▼──────┐  ┌───▼──────────┐
    │ GENERATIVE   │  │ FRAMEWORK  │  │ PROGRESSIVE  │
    │ UI           │  │ STANDARD-  │  │ EXPERTISE    │
    │ (Theme 4)    │  │ IZATION    │  │ (Theme 7)    │
    │              │  │ (Theme 6)  │  │              │
    └──────────────┘  └────────────┘  └──────────────┘
```

### 1.1 Back-Pressure Model (Core)

**Insight**: The metaphor of neural network training applied to human-AI collaboration. Agents forward-pass (generate code, designs, content). Humans backward-pass (provide gradient signal). The more precisely a human can target specific "weights" (specific elements, specific design tokens, specific code paths), the fewer tokens are wasted and the better the outcome.

**Implication**: Every DX surface must maximize the signal-to-noise ratio of human feedback. Random poking of knobs is expensive. Targeted, specific feedback is cheap and effective.

### 1.2 Domain-Specific DX

**Insight**: Claude Code (terminal) is ONE interface. DX looks fundamentally different across domains:

| Domain | Interface | Feedback Modality |
|--------|-----------|-------------------|
| Code | Terminal / Editor | Text commands, code review |
| Design | Visual canvas + Agentation | Click-to-annotate, screenshots |
| Writing | Obsidian-like markdown | Inline revision, track changes |
| Strategy | Conversation + documents | Async coverage, questions |

**Implication**: Loa must not be terminal-only. Constructs need to work across surfaces.

### 1.3 Work Becomes Conversations

**Insight**: Human value shifts from execution to direction-setting. The human who understands the full system (feature set, backend, users) can have better conversations with agents. Async coverage across the org means one person can coordinate work across many agents simultaneously.

**Implication**: Skills should be conversational, not just command-driven. The `/envision` flow is a prototype of this - it generates artifacts through guided dialogue, not template-filling.

### 1.4 Generative UI

**Insight**: AI generates UI on the fly. You need a framework around it so it's smooth and predictable. Standardized component sets (Shadcn), databases (Convex), and frameworks (Next.js, Vite) give agents high-confidence generation paths.

**Implication**: Constructs should ship opinionated starter kits and framework bindings, not just skills.

### 1.5 Token Efficiency

**Insight**: Don't endlessly generate and eat tokens. The goal is minimum tokens to reach destination. More accurate feedback on specific weights = better outcomes vs randomly poking around.

**Implication**: The invisible prompt enhancement (v1.17.0) and taste compounding systems already implement this - they reduce wasted generation by front-loading context. Every new feature should be evaluated against: "Does this reduce tokens-to-destination?"

### 1.6 Framework Standardization

**Insight**: Standard tech stacks that agents have deep expertise in. Next.js for familiarity, Vite for simplicity. Hooked up to Convex with Shadcn components. Agents can spin up sites instantly when the stack is known.

**Implication**: The `next-best-practices` skill is a seed of this. Need to expand to full "framework confidence profiles" that agents load when working within a known stack.

### 1.7 Progressive Expertise

**Insight**: Start with familiar frameworks. As feedback loops tighten, the system learns. Agents already have Rust expertise but stay realistic. Don't overshoot - optimize when you have the signal that optimization is needed.

**Implication**: The taste compounding system (cycle-011) is the progressive learning mechanism for design. Need equivalent systems for code architecture and content patterns.

---

## 2. How Existing Constructs Map to the Vision

### Pack-by-Pack Alignment

#### Observer (6 skills) - The Sensing Layer

**Role in vision**: Captures the raw signal from humans. The "gradient collection" system.

| Skill | Vision Theme | Status |
|-------|-------------|--------|
| `observing-users` | Work = Conversations | Implemented - hypothesis-first research |
| `level-3-diagnostic` | Back-Pressure | Implemented - reaches Level 3 (user goal) before solutions |
| `analyzing-gaps` | Token Efficiency | Implemented - compares expectations vs reality |
| `filing-gaps` | Back-Pressure | Implemented - converts gaps to trackable issues |
| `shaping-journeys` | Progressive Expertise | Implemented - consolidates patterns into journeys |
| `importing-research` | Domain-Specific DX | Implemented - bulk import from legacy formats |

**Assessment**: Observer is the most vision-aligned pack. It already implements the "human feedback as gradient signal" model. The diagnostic system reaches for root causes (targeted weights) rather than surface symptoms (random poking).

#### Artisan (10 skills) - The Design Feedback Loop

**Role in vision**: The most advanced implementation of back-pressure for visual domains.

| Skill | Vision Theme | Status |
|-------|-------------|--------|
| `iterating-visuals` | Back-Pressure + Domain-Specific DX | Implemented - screenshot → annotate → refine loop |
| `decomposing-feel` | Back-Pressure | Implemented - converts vague "feels off" to specific weights |
| `synthesizing-taste` | Progressive Expertise | Implemented - extracts taste tokens |
| `inscribing-taste` | Progressive Expertise | Implemented - persists taste to taste.md |
| `envisioning-direction` | Work = Conversations | Implemented - conversational direction capture |
| `analyzing-feedback` | Token Efficiency | Implemented - detects patterns from feedback logs |
| `animating-motion` | Domain-Specific DX | Implemented |
| `crafting-physics` | Domain-Specific DX | Implemented |
| `styling-material` | Framework Standardization | Implemented |
| `next-best-practices` | Framework Standardization | Implemented |

**Assessment**: Artisan is the flagship demonstration of the back-pressure model for design. The taste system (taste.md → patterns → never rules) is the most complete feedback compounding loop in the system. The `/decompose` skill is literally "help the human target specific weights instead of randomly poking."

#### Crucible (5 skills) - The Validation Layer

**Role in vision**: Ensures the gradient signal is correct before applying it.

| Skill | Vision Theme | Status |
|-------|-------------|--------|
| `iterating-feedback` | Back-Pressure | Implemented - closes loop from test results to artifacts |
| `validating-journeys` | Back-Pressure | Implemented - validates against user truth |
| `grounding-code` | Token Efficiency | Implemented - grounds decisions in code reality |
| `walking-through` | Domain-Specific DX | Implemented - E2E walkthrough with screenshots |
| `diagramming-states` | Work = Conversations | Implemented |

**Assessment**: Crucible validates that back-pressure signals are accurate before they propagate. This prevents wasted tokens from bad gradient updates.

#### Beacon (6 skills) - The Distribution Layer

**Role in vision**: Makes constructs discoverable and consumable by other agents.

| Skill | Vision Theme | Status |
|-------|-------------|--------|
| `auditing-content` | Token Efficiency | Implemented - LLM readiness audit |
| `generating-markdown` | Framework Standardization | Implemented |
| `optimizing-chunks` | Token Efficiency | Implemented |
| `discovering-endpoints` | Generative UI | Implemented |
| `defining-actions` | Generative UI | Implemented |
| `accepting-payments` | (Infrastructure) | Planned - NowPayments |

**Assessment**: Beacon is about making the network efficient - ensuring that when agents consume content, it's already optimized for their context windows. This is meta-level token efficiency.

#### GTM Collective (8 skills) - The Strategic Layer

**Role in vision**: Applies the "work = conversations" theme to go-to-market strategy.

| Skill | Vision Theme | Status |
|-------|-------------|--------|
| `positioning-product` | Work = Conversations | Implemented |
| `crafting-narratives` | Work = Conversations | Implemented |
| `analyzing-market` | Work = Conversations | Implemented |
| `educating-developers` | Progressive Expertise | Implemented |
| `pricing-strategist` | Work = Conversations | Implemented |
| `building-partnerships` | Work = Conversations | Implemented |
| `reviewing-gtm` | Back-Pressure | Implemented |
| `translating-for-stakeholders` | Work = Conversations | Implemented |

**Assessment**: GTM Collective demonstrates that the vision extends beyond code. Every function becomes conversational and agent-assisted.

---

## 3. The Agentation Breakthrough

Agentation is the most important technology in the stack because it solves the **precision problem** in back-pressure.

### Why It Matters

Without Agentation:
```
Human: "The card doesn't feel right"
Agent: [guesses what's wrong, changes 5 things, wastes tokens]
```

With Agentation:
```
Human: [clicks on shadow element, types "too heavy"]
Agent: [receives { element: ".card-shadow", comment: "too heavy", severity: "important" }]
Agent: [changes exactly one thing]
```

This is the difference between "randomly poking knobs" and "applying gradient to specific weights." Agentation is the mechanism that makes human back-pressure precise.

### Current Integration

| Pack | MCP Scopes | Usage |
|------|-----------|-------|
| Artisan | 9 scopes | Full visual iteration loop |
| Crucible | 2 scopes | Implementation gap capture |
| Observer | 2 scopes | User research evidence |

### What Agentation Enables Next — Protocol-First Architecture

**Decision (locked)**: Agentation becomes a *protocol*, not a single implementation. The annotation contract is universal; each domain gets a specialized backend.

| Domain | Implementation | Feedback Type |
|--------|---------------|---------------|
| Design | Agentation Visual MCP (current) | CSS selectors, components |
| Code | Agentation Code MCP (new) | Line ranges, AST nodes, variables |
| Content | Agentation Text MCP (new) | Paragraph/sentence ranges, text spans |
| Architecture | Agentation Diagram MCP (new) | Mermaid node/edge selection |

The protocol defines the shared contract:
```typescript
interface AnnotationEvent {
  target: {
    type: 'component' | 'line' | 'paragraph' | 'node';
    selector: string;  // Domain-specific selector format
  };
  signal: { direction: 'positive' | 'negative'; content: string; };
  domain: string;
  source_mcp: string;  // Which implementation produced this
}
```

This scales better than a single monolithic MCP — each domain can evolve its annotation semantics independently while feeding into the unified feedback schema (#104).

---

## 4. What's Missing: The Gap Analysis

### Gap 1: Writing DX Surface

**Problem**: No pack addresses the writing domain. Obsidian-like markdown editing with revisions, track changes, and inline feedback is absent.

**What's needed**:
- A **Scribe** pack with skills for long-form content iteration
- Revision tracking (not git commits, but semantic revisions)
- Inline annotation (Agentation for text)
- Tone/voice persistence (like taste.md but for writing style)

**Implementation path**: New pack in loa-constructs + Agentation extension for text content.

### Gap 2: Generative UI Framework Kits

**Problem**: No skill helps agents spin up standardized apps. The `next-best-practices` skill teaches patterns but doesn't scaffold.

**What's needed**:
- **Framework Confidence Profiles** - structured knowledge about stacks agents can generate with high confidence (Next.js + Shadcn + Convex, Vite + React + Supabase, etc.)
- **Starter templates** that agents can clone and customize
- **Component library bindings** so agents know exactly which Shadcn components to reach for
- Integration with the sandbox for publishing generated apps as constructs

**Implementation path**: Extend Artisan with framework profiles, or create a new **Forge** pack for app generation.

### Gap 3: Cross-Domain Back-Pressure Unification

**Problem**: Each pack has its own feedback mechanism. Observer uses UTCs, Artisan uses taste.md, Crucible uses test results. There's no unified feedback ontology.

**What's needed**:
- A shared **feedback schema** that works across Observer, Artisan, and Crucible
- Unified pattern detection that can find cross-domain signals (e.g., "users who dislike heavy shadows also tend to want simpler copy")
- The Construct Messaging v3 protocol (PRD exists) to enable cross-construct feedback flow

**Implementation path**: Extend the JSONL feedback format to be pack-agnostic. Build cross-pack analysis into the `analyzing-feedback` skill.

### Gap 4: Token Efficiency Instrumentation

**Problem**: No visibility into token consumption. Can't measure whether back-pressure is actually reducing tokens-to-destination.

**What's needed**:
- Token tracking per skill invocation
- Before/after comparison: how many tokens to reach the same outcome with vs without taste context
- Dashboard in the web app showing token efficiency trends

**Implementation path**: Add instrumentation to the loa framework's skill runner. Surface in the web dashboard.

### Gap 5: Progressive Expertise Beyond Design

**Problem**: Taste compounding only works for design (Artisan). Code architecture patterns, API design patterns, and content patterns don't compound across sessions.

**What's needed**:
- **Code taste** - persistent preferences for code style, architecture patterns, error handling approaches
- **Content taste** - persistent preferences for tone, structure, terminology
- **API taste** - persistent preferences for endpoint design, response shapes, naming conventions

**Implementation path (decision locked)**: Hybrid architecture — loa framework owns the taste *engine* (compound/decay/never-rules/pattern-detection), packs provide domain-specific *adapters*. Artisan adapter writes `taste.md`, Scribe adapter writes `voice.md`, Code adapter writes `style.md`. All use the same engine, all emit into the unified feedback schema.

### Gap 6: Agent Swarm Coordination for Async Coverage

**Problem**: The vision mentions "async coverage across the whole org" but the current system is single-agent, single-session. No mechanism for one human to provide back-pressure across multiple concurrent agent streams.

**What's needed**:
- Multi-agent task delegation with feedback aggregation
- Priority routing: which agent stream needs human attention most urgently
- Cross-session context sharing so taste/patterns compound globally

**Implementation path**: Build on the existing Team/Task system in Claude Code. Extend the loa framework's run-mode to support multi-stream coordination.

---

## 5. Strategic Roadmap

### Phase 1: Deepen the Loop (Q1 2026)

**Goal**: Make the existing back-pressure model undeniable. Ship taste compounding (cycle-011), complete Design Cointelligence v2, and demonstrate token savings.

| Deliverable | Repo | Builds On |
|-------------|------|-----------|
| Taste compounding with never-rules | loa-constructs | PRD exists (prd-taste-compounding.md) |
| Agentation v2 MCP integration | loa-constructs | AGENTATION.md complete |
| Token instrumentation | loa | Framework-level |
| Invisible skill activation | loa | loa#75 |

**Success metric**: Measurable reduction in tokens-to-destination for design tasks with loaded taste context vs cold start.

### Phase 2: Expand the Surface (Q2 2026)

**Goal**: Take the back-pressure model beyond design into code and content. Ship framework confidence profiles and the writing DX surface.

| Deliverable | Repo | New/Existing |
|-------------|------|--------------|
| Generalized taste system | loa | Generalize from Artisan |
| Framework Confidence Profiles | loa-constructs | New - extends Artisan or new pack |
| Code taste persistence | loa | New feature |
| Scribe pack (writing DX) | loa-constructs | New pack |
| Agentation for text | loa-constructs | Agentation extension |

**Success metric**: Back-pressure model working in 3 domains (design, code, writing) with cross-session persistence.

### Phase 3: Network Effects (Q3 2026)

**Goal**: Cross-construct feedback, multi-agent coordination, and the generative UI platform.

| Deliverable | Repo | Builds On |
|-------------|------|-----------|
| Construct Messaging v3 | loa-constructs | PRD exists |
| Cross-pack pattern detection | loa-constructs | Gap 3 |
| Multi-agent coordination | loa | Gap 6 |
| Generative UI starter kits | loa-constructs | Gap 2 |
| NowPayments integration | loa-constructs | Beacon pack |

**Success metric**: Patterns detected in one project's design feedback automatically improve construct behavior for other users.

---

## 6. The Competitive Moat

What Loa builds that no one else has:

1. **Taste persistence** - Every other AI tool starts from zero every session. Loa compounds.
2. **Precise back-pressure** - Agentation gives pixel-level feedback specificity. Others get "make it better."
3. **Multi-domain coverage** - Not just code, not just design. Observer + Artisan + Crucible + Beacon + GTM covers the full product lifecycle.
4. **Network learning** - Patterns from one user's feedback improve constructs for everyone (via upstream learning protocol).
5. **Token-aware architecture** - Every feature is evaluated against "does this reduce tokens-to-destination?"

The back-pressure model is not just a metaphor. It's a measurable, optimizable system. The team that builds the tightest feedback loop with the lowest token cost wins.

---

## 7. Key Decisions — LOCKED (2026-02-06)

| # | Decision | Outcome | Rationale |
|---|----------|---------|-----------|
| 1 | Where does generalized taste live? | **Hybrid: framework owns engine, packs are domain adapters** | Engine should own the system. Constructs are the domain-specific tools which apply it. Riders (users) see the benefits via their human-agent and human-human tools. |
| 2 | New Scribe pack or extend Artisan? | **Separate pack (UNIX philosophy)** | Writing and design have fundamentally different feedback modalities. We design these with UNIX principles — do one thing well. |
| 3 | Agentation for text: new tool or extend? | **Protocol-first, multiple implementations** | Define the annotation protocol in Agentation, let domain-specific servers implement it. Consistent API, specialized backends per domain. |
| 4 | Token instrumentation: visible or invisible? | **Both — invisible default, progressive disclosure** | System optimizes silently for beginners. Power users get dashboards. Framework devs get granular data. Mirrors existing invisible prompt enhancement pattern. |
| 5 | Framework profiles: new pack or extend Artisan? | **Open — to be decided in Phase 2** | Deferred until taste generalization (Decision 1) is implemented. |

---

## Appendix: Theme-to-Issue Mapping

For downstream issue creation, each theme maps to concrete work:

| Theme | loa Issues | loa-constructs Issues |
|-------|-----------|----------------------|
| Back-Pressure | #211 (DX audit), #75 (invisible activation) | #96 (taste compounding), #80 (feedback loop RFC) |
| Domain-Specific DX | #90 (playground plugins) | Agentation extensions, Scribe pack |
| Work = Conversations | - | `/envision` pattern for all packs |
| Generative UI | - | Framework profiles, starter kits |
| Token Efficiency | Framework instrumentation | Beacon optimization |
| Framework Standardization | - | `next-best-practices` expansion |
| Progressive Expertise | Generalized taste system | Cross-session pattern compounding |
