# Loa Constructs Network — Architecture Overview

**Version**: 1.0.0
**Date**: 2026-02-09
**Purpose**: The "What Is This" document. Explains the architecture, where everything lives, how layers compose, and how to think about building and extending the system.
**Audience**: Operators, contributors, and agents working within or building on the Loa ecosystem.

---

## 1. What Loa Is

Loa is a system for **digitizing and scaling Taste** — the high-dimensional, intuitive craftsmanship of a creator — into AI-powered development workflows.

The core insight: A generic LLM produces "average" code and design. To produce *your* code and *your* design, the model needs to adopt *your* aesthetic and architectural probability distributions. Loa does this through three mechanisms:

1. **Constructs** teach the model what "good" looks like in a specific domain (design, testing, research, go-to-market)
2. **Hounfour** routes tasks to models with the right cognitive capabilities
3. **Bridgebuilder** enforces quality by adversarially reviewing output against learned standards

Together, these form a **Cognitive Architecture** — not a folder of scripts, but a garden of specialized intelligences that can be installed, composed, and refined over time.

### The Mental Model

Think of it as a teaching system, not a rules engine:

- **Low Temperature** (what we avoid): "Use Shadcn UI." Binary rules that produce compliance without understanding.
- **High Temperature** (what we build): "Use Shadcn UI *because* raw HTML elements lose semantic accessibility guarantees and can't be styled through the design token system. Using Radix primitives directly is a Near Miss — functionally correct but bypasses the token layer. Using Bootstrap is a Category Error — violates the fundamental physics of the design system."

The model that understands *why* an alternative is wrong can reject equivalent patterns it has never seen. The model that only knows the rule can only reject the exact pattern it was shown.

---

## 2. The Layer Cake — How Everything Composes

The system has four distinct layers, each with a different purpose and lifecycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: RUNTIME (Loa Platform — Deployed Services + Local CLI)   │
│  ────────────────────────────────────────────────────────────────   │
│  Hounfour (gateway), Bridgebuilder (reviewer), Event Bus,          │
│  Agent Teams orchestration, budget enforcement                     │
│                                                                    │
│  Lives in: loa-finn (Hounfour), loa main (BB, Event Bus, CLI)     │
│  Changes: Platform releases. Not per-project.                      │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 3: FRAMEWORK (Cross-Cutting Infrastructure)                 │
│  ────────────────────────────────────────────────────────────────   │
│  Bridgebuilder skill, mounting scripts, framework conventions      │
│                                                                    │
│  Lives in: .claude/skills/ (installed into consuming repos)        │
│  Changes: Framework releases via `mounting-framework`              │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 2: CONSTRUCTS (Domain-Specific Intelligence)                │
│  ────────────────────────────────────────────────────────────────   │
│  Packs (Artisan, Crucible, Observer, Beacon, GTM-Collective)       │
│  Each pack: Skills, SKILL.md, personas, context slots, metadata    │
│                                                                    │
│  Lives in: .claude/constructs/packs/ (installed into consuming     │
│  repos from loa-constructs source of truth)                        │
│  Changes: Pack updates, skill additions, counterfactual refinement │
├────────────────────────────────────────────────────────────────────┤
│  LAYER 1: PROJECT (Your Repo — Topology)                           │
│  ────────────────────────────────────────────────────────────────   │
│  Context slot overlays, CLAUDE.md, .loa.config.yaml,               │
│  grimoire working directories, project-specific overrides          │
│                                                                    │
│  Lives in: Your repo root                                          │
│  Changes: Per-project configuration                                │
└────────────────────────────────────────────────────────────────────┘
```

**The key rule**: Higher layers are more portable, lower layers are more specific. A Construct (Layer 2) must work across any project. A project's context overlays (Layer 1) contain the repo-specific data that makes the Construct's portable methodology applicable to *this* codebase.

---

## 3. Filesystem Map — Where Everything Lives

### 3.1 In a Consuming Project (Your Repo)

After running `mount` to install the Loa framework and desired Construct packs:

```
your-repo/
├── .claude/
│   ├── skills/                              # LAYER 3 — Framework Skills
│   │   ├── bridgebuilder-review/            # Adversarial code review
│   │   │   ├── SKILL.md
│   │   │   ├── index.yaml
│   │   │   └── resources/
│   │   │       ├── core/                    # Review engine (TypeScript)
│   │   │       └── personas/               # Critique personas
│   │   │           ├── default.md
│   │   │           ├── security.md          # Has YAML frontmatter: model: opus
│   │   │           ├── taste.md             # Artisan aesthetic critique
│   │   │           ├── research.md          # Observer research critique
│   │   │           └── strategy.md          # GTM critique
│   │   ├── mounting-framework/              # Framework installer
│   │   └── [other framework skills]/
│   │
│   └── constructs/
│       └── packs/                           # LAYER 2 — Construct Packs
│           ├── artisan/                     # Design system intelligence
│           │   ├── manifest.json            # Pack metadata, dependencies, events
│           │   └── skills/
│           │       ├── inscribing-taste/
│           │       │   ├── SKILL.md         # The methodology (with counterfactuals)
│           │       │   └── index.yaml       # Routing metadata (capabilities)
│           │       ├── synthesizing-taste/
│           │       ├── surveying-patterns/
│           │       ├── animating-motion/
│           │       ├── crafting-physics/
│           │       ├── styling-material/
│           │       ├── rams/                # WCAG accessibility audits
│           │       ├── distilling-components/
│           │       ├── applying-behavior/
│           │       └── next-best-practices/
│           │
│           ├── crucible/                    # QA & testing intelligence
│           │   ├── manifest.json
│           │   ├── contexts/                # Context Slot interface
│           │   │   ├── base/                # Universal methodology context
│           │   │   ├── overlays/            # Installable topology
│           │   │   │   ├── qa-fixtures.json.example
│           │   │   │   ├── dev-environment.json.example
│           │   │   │   └── product-states.json.example
│           │   │   ├── composed/            # Runtime-merged (gitignored)
│           │   │   └── schemas/             # JSON schemas for validation
│           │   └── skills/
│           │       ├── grounding-code/
│           │       ├── diagramming-states/
│           │       ├── validating-journeys/
│           │       ├── walking-through/
│           │       └── iterating-feedback/
│           │
│           ├── observer/                    # User research intelligence
│           │   ├── manifest.json
│           │   ├── contexts/
│           │   │   └── overlays/
│           │   ├── scripts/
│           │   │   └── compose-context.sh   # Merges base + overlays
│           │   └── skills/
│           │       ├── observing-users/
│           │       ├── shaping-journeys/
│           │       ├── analyzing-gaps/
│           │       ├── filing-gaps/
│           │       ├── importing-research/
│           │       ├── batch-observing/
│           │       ├── batch-filing-gaps/
│           │       ├── daily-synthesis/
│           │       └── level-3-diagnostic/
│           │
│           ├── beacon/                      # Web3/chain intelligence
│           │   ├── manifest.json
│           │   ├── contexts/
│           │   │   └── overlays/
│           │   │       └── chain-config.json.example
│           │   └── skills/
│           │
│           └── gtm-collective/              # Go-to-market intelligence
│               ├── manifest.json
│               └── skills/
│
├── grimoires/                               # WORKING DIRECTORIES — Agent Output
│   ├── artisan/
│   │   ├── observations/                    # Design observations captured by agent
│   │   └── taste.md                         # Extracted taste tokens
│   ├── crucible/
│   │   ├── gaps/                            # Identified QA gaps
│   │   ├── reality/                         # Reality check results
│   │   ├── diagrams/                        # State diagrams
│   │   └── tests/                           # Generated test files
│   ├── observer/
│   │   ├── canvas/                          # User journey canvases
│   │   ├── journeys/                        # Mapped user journeys
│   │   └── observations/                    # Raw research observations
│   ├── bridgebuilder/
│   │   └── feedback/                        # Correction Vectors (when adapter built)
│   │       └── {date}-{pack}-{skill}.json
│   └── loa/
│       ├── memory/                          # Session-level observations
│       │   └── observations.jsonl
│       └── NOTES.md                         # Invisible retrospective learnings
│
├── CLAUDE.md                                # LAYER 1 — Project system prompt
├── .loa.config.yaml                         # LAYER 1 — Project configuration
└── [your source code]
```

### 3.2 In loa-constructs (Source of Truth)

The repository that defines the canonical, portable versions of all Construct packs:

```
loa-constructs/
├── .claude/
│   └── constructs/
│       └── packs/
│           ├── artisan/
│           ├── crucible/
│           ├── observer/
│           ├── beacon/
│           └── gtm-collective/
├── docs/
│   ├── architecture.md                      # This document
│   └── archive/
│       └── melange-v0.8/                    # Archived dead protocol
├── scripts/
│   └── validate-topology.sh                 # Checks for topology contamination
└── CLAUDE.md
```

---

## 4. The Topology/Methodology Split

This is the single most important concept in the architecture. Get this wrong and nothing else matters.

**Methodology** = portable intuition. How to think about design tokens. How to structure a test. How to interpret user feedback. This lives in SKILL.md and is immutable across projects.

**Topology** = project-specific data. Wallet addresses, API endpoints, chain IDs, product state definitions, localhost URLs. This lives in Context Slots (overlays) and changes per project.

### How Context Slots Work

```
Pack (Methodology)                     Project (Topology)
──────────────────                     ──────────────────
SKILL.md says:                         contexts/overlays/qa-fixtures.json:
"Test the state where a user           {
has earned value but hasn't            "wallet_address": "0x79092A...",
claimed it."                            "rpc_url": "http://localhost:3003"
                                       }
         ↓
  {context:qa_fixtures}
         ↓
Merged at runtime into the agent's context,
so the methodology knows HOW to test and
the overlay provides WHAT to test against.
```

**Three categories of Context Slots:**

| Category | Contents | Example | Changes When... |
|----------|----------|---------|----------------|
| **Static Fixtures** | Addresses, URLs, API keys, paths | `0x79092A...`, `localhost:3003` | Environment changes |
| **Dynamic State Definitions** | What user/system states *mean* | `rewards-ready` = has claimable tokens | Domain changes |
| **Product Identity** | Org names, chain names, brand terms | `0xHoneyJar`, `Berachain`, `BERA` | Project changes |

### The Install Flow

When a developer installs a pack into their project:

1. `mounting-framework` installs Layer 3 (framework skills, Bridgebuilder)
2. Pack install copies Layer 2 (skills, SKILL.md, index.yaml) into `.claude/constructs/packs/`
3. Pack creates `contexts/overlays/*.json.example` template files
4. Developer copies `.example` to `.json` and fills in their project's topology
5. `compose-context.sh` merges base methodology + project overlays at runtime

The developer never edits SKILL.md. They fill in overlays.

---

## 5. Inside a Construct Pack

### 5.1 The Pack Manifest (`manifest.json`)

Every pack declares what it needs, what it produces, and what it depends on:

```json
{
  "name": "crucible",
  "version": "1.0.0",
  "description": "QA & testing intelligence",
  "license": "MIT",

  "contexts": {
    "required_slots": [
      {
        "key": "qa_fixtures",
        "description": "Wallet addresses, RPC URLs, test user accounts",
        "schema": "contexts/schemas/qa-fixtures.schema.json",
        "example": "contexts/overlays/qa-fixtures.json.example"
      },
      {
        "key": "product_states",
        "description": "What user states mean in this product",
        "schema": "contexts/schemas/product-states.schema.json",
        "example": "contexts/overlays/product-states.json.example"
      }
    ],
    "optional_slots": [
      {
        "key": "dev_environment",
        "description": "Dev server URLs, component paths, localStorage keys"
      }
    ]
  },

  "pack_dependencies": [
    {
      "pack": "observer",
      "relationship": "consumes",
      "artifacts": ["grimoires/observer/canvas/*.md", "grimoires/observer/journeys/*.md"],
      "required": true,
      "description": "Crucible consumes Observer canvases/journeys for test generation"
    }
  ],

  "events": {
    "emits": [
      {
        "type": "forge.crucible.gaps_identified",
        "description": "Emitted when QA gaps are found",
        "data_schema": { "gap_count": "number", "severity": "string" }
      }
    ],
    "consumes": [
      {
        "type": "forge.observer.canvas_updated",
        "handler": "handlers/on-canvas-updated.sh",
        "description": "Triggers gap re-analysis when journey canvases change"
      }
    ]
  }
}
```

### 5.2 A Skill — The Unit of Intelligence

Each skill is a self-contained teaching packet:

```
skills/inscribing-taste/
├── SKILL.md          # The methodology — HOW to do this task
├── index.yaml        # Routing metadata — WHO should do this task
└── resources/        # Supporting materials (templates, examples)
    └── templates/
        └── taste-template.md
```

**`SKILL.md`** — The methodology. This is what the agent reads to understand *how* to perform the task. It must:
- Be portable (no project-specific data — use `{context:slot_name}` references)
- Include counterfactual blocks (Near Miss, Category Error with Physics of Error)
- Teach *why*, not just *what*

**`index.yaml`** — Routing metadata. Tells the Runtime what capabilities this skill requires:

```yaml
slug: inscribing-taste
name: Inscribing Taste
description: Brand taste token synthesis and persistence

capabilities:
  model_tier: sonnet
  danger_level: moderate
  effort_hint: medium
  downgrade_allowed: false
  execution_hint: sequential
  requires:
    native_runtime: true
    tool_calling: true
    thinking_traces: false
    vision: false
```

### 5.3 Counterfactual Blocks — Teaching the Negative Space

Every SKILL.md with aesthetic, architectural, or methodological judgment includes:

```markdown
## Counterfactuals — Why This Pattern

### The Target (What We Do)
Extract semantic tokens into taste.md using pattern → token → never-rule
hierarchy. Reference CSS variables, never raw values.

### The Near Miss — Raw Tailwind Tokens (Seductively Close)
**What it looks like:** taste.md references `rounded-lg` and `shadow-md`
**Why it's tempting:** These ARE design tokens — Tailwind's tokens.
**Physics of Error:** Brittle Dependency / Concept Impermanence.
`rounded-lg` maps to `0.5rem` today. If Tailwind updates, our design
intention is silently redefined by a framework we don't control.
**Detection signal:** Tailwind utility class appearing as a taste token.

### The Category Error — Hardcoded Values (Fundamentally Wrong)
**What it looks like:** "Cards have 12px border radius and #f5f5f5 background"
**Why someone might try it:** It's precise. It looks like a spec.
**Physics of Error:** Semantic Collapse. A hex color is a value pretending
to be a decision. Cannot respond to dark mode, responsive breakpoints, or
theme switching. Structurally impossible to derive correct output across
contexts from a literal value.
**Bridgebuilder action:** Immediate rejection. Regenerate from Target.
```

---

## 6. The Five Packs — What Each One Knows

### Artisan — Design System Intelligence
**Domain**: Visual design, component architecture, motion, accessibility
**Key skills**: `inscribing-taste` (extract design tokens), `synthesizing-taste` (build taste.md from codebase), `surveying-patterns` (detect violations), `rams` (WCAG audits), `animating-motion` (motion philosophy)
**Grimoire output**: `grimoires/artisan/taste.md`, `grimoires/artisan/observations/`
**Depends on**: Observer observations (for user-informed design decisions)

### Crucible — QA & Testing Intelligence
**Domain**: Test generation, state diagramming, journey validation, reality checks
**Key skills**: `validating-journeys` (generate tests from journeys), `walking-through` (manual walkthrough scripts), `grounding-code` (filesystem reality checks), `diagramming-states` (state machine visualization)
**Grimoire output**: `grimoires/crucible/gaps/`, `grimoires/crucible/tests/`, `grimoires/crucible/reality/`
**Depends on**: Observer canvases and journeys (consumes as test generation input)
**Context slots required**: `qa_fixtures`, `product_states`

### Observer — User Research Intelligence
**Domain**: User feedback interpretation, journey mapping, gap analysis, signal aggregation
**Key skills**: `observing-users` (interpret DMs/feedback), `shaping-journeys` (build journey maps), `analyzing-gaps` (cross-reference gaps), `batch-observing` (parallel DM processing), `daily-synthesis` (aggregate daily observations)
**Grimoire output**: `grimoires/observer/canvas/`, `grimoires/observer/journeys/`, `grimoires/observer/observations/`
**Depends on**: Crucible gaps (for gap analysis input), Artisan observations (for level-3 diagnostics)

### Beacon — Web3/Chain Intelligence
**Domain**: Chain-specific development patterns, smart contract interaction, DeFi conventions
**Key skills**: Chain-aware development guidance, template generation
**Context slots required**: `chain_config` (chain ID, org name, default token, network endpoints)

### GTM-Collective — Go-to-Market Intelligence
**Domain**: Strategy, competitive analysis, pricing, market positioning
**Key skills**: Strategy development, competitive analysis, pricing model validation

### Cross-Pack Data Flow

```
Observer ──produces──> canvas/*.md, journeys/*.md
    │
    ├──consumed by──> Crucible (test generation, state diagramming)
    └──consumed by──> Artisan (user-informed taste decisions)

Crucible ──produces──> gaps/, tests/, reality/
    │
    └──consumed by──> Observer (gap analysis)

Artisan ──produces──> taste.md, observations/
    │
    └──consumed by──> Observer (level-3 diagnostics)
```

---

## 7. The Runtime Layers

The Constructs Network declares *what it needs*. The Runtime decides *how to fulfill it*.

### 7.1 Hounfour — The Router (loa-finn)

Hounfour is a **deployed gateway service** (Express/Node.js) that routes tasks to the right model based on capability requirements, token budgets, and tenant authorization.

**What Constructs declare** → **What Hounfour does:**

| Construct Declares | Hounfour Response |
|-------------------|-------------------|
| `model_tier: sonnet` | Routes to a pool containing Sonnet-class models |
| `requires.native_runtime: true` | Routes only to `claude-code` type providers |
| `requires.thinking_traces: "required"` | Routes to models with reasoning capability |
| `requires.vision: true` | Routes to multimodal-capable models |
| `downgrade_allowed: false` | If over-budget, rejects rather than downgrades |

**The adapter gap**: Hounfour cannot read `index.yaml` — it's a remote service. The Loa CLI reads capability metadata locally and translates it into Hounfour's `AgentBinding` format before sending the routing request. This adapter is not yet built.

### 7.2 Bridgebuilder — The Critic

Bridgebuilder is a **local framework skill** that adversarially reviews PRs against learned standards.

**How it works:**
1. Triggered on PR (CI hook, manual invocation, or Git event)
2. Loads a persona file from `.claude/skills/bridgebuilder-review/resources/personas/`
3. Persona content becomes the LLM system prompt (prefixed with injection hardening)
4. Reviews PR diffs against persona standards
5. Posts review comments to GitHub
6. (Future) Writes Correction Vector JSON to `grimoires/bridgebuilder/feedback/`

**Persona model routing**: Personas can include YAML frontmatter (`model: claude-opus-4-6`) to request a specific model for that review. This is a *preference* — the Runtime checks tenant budget policy before honoring it.

**Operational features**: Incremental review (delta-only on PR update), progressive truncation (3-level retry for large diffs), Loa-aware filtering (auto-excludes `.claude/` framework files), output sanitization (redacts leaked secrets).

### 7.3 Event Bus — Cross-Construct Communication

A **local library** (`event-bus.sh`, 939 lines) implementing CloudEvents-based messaging with flock atomicity, dead letter queues, and idempotent consumption.

**Current status**: Fully implemented, zero consumers. Infrastructure is ready; adoption requires packs to emit and consume events.

**Event type convention**: `forge.{pack}.{action}` (dotted lowercase, e.g., `forge.observer.canvas_updated`)

### 7.4 Agent Teams — Parallel Execution

Claude Code's experimental Agent Teams feature allows a lead agent to spawn worker agents for parallel tasks.

**What Constructs declare**: `execution_hint: fan_out` (independent identical work items) or `execution_hint: pipeline` (ordered stages)

**What the Runtime decides**: Whether to actually parallelize, how many workers, token budget per worker. The Construct describes the *shape* of the work; the Runtime decides the *scale*.

---

## 8. Configuration — Where Preferences Live

### 8.1 `.loa.config.yaml` — Project-Level Configuration

```yaml
# .loa.config.yaml — lives in your repo root
schema_version: "1.0"

# Which packs are installed
constructs:
  packs:
    - artisan
    - crucible
    - observer

# Bridgebuilder configuration
bridgebuilder:
  persona: taste                    # Default persona for reviews
  persona_path: grimoires/bridgebuilder/BEAUVOIR.md  # Custom persona override
  model: claude-sonnet-4-5          # Default model for reviews

# Context slot overrides
contexts:
  overlays:
    - berachain                     # Which overlay set to load
    - defi
```

### 8.2 `CLAUDE.md` — Project System Prompt

The `CLAUDE.md` file at your repo root is read by Claude Code as a system-level instruction. It should contain:

- Project-specific conventions that ALL agents should follow
- References to installed Construct packs
- Capability declarations for the project
- Any project-level overrides to Construct behavior

This is Layer 1 — the most specific layer. It can reference Construct packs but should not duplicate their methodology.

### 8.3 Persona Files — Bridgebuilder Critique Standards

Each persona defines what Bridgebuilder looks for during review:

```markdown
---
model: claude-opus-4-6
---
# Persona: Taste Enforcer

## Review Standard
You enforce the Artisan's design system. Every violation must be classified
as a Near Miss or Category Error with a Physics of Error explanation.

## Detection Rules
1. **Shadcn Compliance:** Flag raw HTML where Shadcn components exist.
2. **Theme Token Compliance:** Reject hardcoded color values.
3. **Motion Compliance:** Flag incorrect easing/timing.
```

Personas live in `.claude/skills/bridgebuilder-review/resources/personas/`. A project can override the default persona via `persona_path` in `.loa.config.yaml`, pointing to `grimoires/bridgebuilder/BEAUVOIR.md` for project-specific critique standards.

### 8.4 Context Slot Overlays — Project-Specific Data

Each pack that needs project-specific data provides `.json.example` templates:

```bash
# After installing Crucible pack:
cp .claude/constructs/packs/crucible/contexts/overlays/qa-fixtures.json.example \
   .claude/constructs/packs/crucible/contexts/overlays/qa-fixtures.json

# Fill in your project's data:
{
  "wallet_address": "0x79092A...",
  "rpc_url": "http://localhost:3003",
  "test_user_pk": "0xdA075..."
}
```

The `.json` files are gitignored (topology is local). The `.json.example` files are committed (they document what the pack needs).

---

## 9. How to Think About Building Constructs

### 9.1 The Distillation Mindset

You are not writing scripts. You are **distilling intuition into probability distributions**.

When you build a Construct, you are answering: "If I could teach a brilliant junior developer everything I know about [domain], what would the curriculum look like?"

The SKILL.md is the curriculum. The counterfactuals are the exam — they test whether the student (agent) understands *why*, not just *what*.

### 9.2 The Checklist for a New Skill

1. **Is the methodology portable?** If you grep the SKILL.md for specific wallet addresses, API URLs, or product names, you have topology contamination. Extract to Context Slots.

2. **Does it teach the negative space?** If your SKILL.md only says what to do (Target), it's a rules engine. Add Near Miss (seductively wrong) and Category Error (fundamentally wrong) with Physics of Error explanations.

3. **Is the capability metadata accurate?** Does the skill need filesystem access (`native_runtime: true`)? Reasoning capability (`thinking_traces: "required"`)? Vision (`vision: true`)? Get this wrong and Hounfour routes to a model that can't execute.

4. **Are the cross-pack dependencies declared?** If the skill reads from another pack's grimoire directory, declare the dependency in `manifest.json`. Silent filesystem coupling breaks when the consumed pack isn't installed.

5. **Is the execution hint correct?** Can work items be processed independently (`fan_out`)? Do stages feed into each other (`pipeline`)? Or must everything happen sequentially (`sequential`)?

### 9.3 The Anti-Patterns

| Anti-Pattern | What It Looks Like | Why It Fails | Fix |
|-------------|-------------------|-------------|-----|
| **Generic Drift** | Skill accepts "average" code because it functions | The Construct loses its differentiating taste | Tighten the Bridgebuilder persona. Add sharper counterfactuals. |
| **Topology Contamination** | `0x79092A...` in SKILL.md | Pack only works for one project | Extract to Context Slot overlay |
| **Low-Res Critiques** | Feedback says "Fix this" | Agent doesn't learn *why* the alternative was rejected | Feedback must use Physics of Error vocabulary |
| **Overfitting** | Construct only works for one API/product | Not reusable across projects | Abstract to data schemas, use Context Slots |
| **Capability Mismatch** | Taste task routed to cheap model | Model hallucinates CSS classes, ruins output | Set `downgrade_allowed: false`, verify `model_tier` |
| **Silent Dependencies** | Skill reads `grimoires/observer/canvas/` without declaring it | Breaks silently when Observer pack not installed | Declare in `manifest.json` `pack_dependencies` |

### 9.4 Building a New Pack — Step by Step

1. **Define the domain.** What intuition are you distilling? (Design? Testing? Research? Writing?)

2. **Map the skills.** What are the distinct tasks within this domain? Each becomes a skill directory with its own SKILL.md and index.yaml.

3. **Write methodology first, code second.** The SKILL.md is the primary artifact. It should teach an agent how to think about this task, not just execute it. Include at least one counterfactual block per skill.

4. **Identify topology.** What data is project-specific? Create `contexts/overlays/*.json.example` templates with JSON schemas for validation.

5. **Declare everything.** Fill in `manifest.json`: context requirements, pack dependencies, event declarations, version.

6. **Add capability metadata.** For each skill's `index.yaml`: what model tier, what runtime requirements, can it be downgraded, what's the execution hint.

7. **Write the Bridgebuilder persona.** What should the adversarial reviewer look for when critiquing output from this domain? This goes in `.claude/skills/bridgebuilder-review/resources/personas/{domain}.md`.

8. **Test portability.** Clone the pack into a project that is NOT the one you built it in. Does `mount` work? Are there any hardcoded references? Can someone fill in the context overlays and get useful output?

---

## 10. The Lifecycle — How Constructs Evolve

### 10.1 The Proving Ground → Source of Truth Flow

```
midi-interface (proving ground)
    │
    │  Skills battle-tested in production
    │  ↓ Human review + topology extraction
    │
loa-constructs (source of truth)
    │
    │  Clean, portable Constructs
    │  ↓ mount / install
    │
Your project (consumer)
```

New skills are developed and tested in the proving ground (midi-interface). Once proven, they are cleaned of topology (project-specific data extracted to Context Slots) and upstreamed to loa-constructs via PR. Consuming projects get the clean version via `mount`.

### 10.2 The Taste Loop (Vision — Partially Built)

```
Agent generates code
    ↓
Bridgebuilder reviews against persona
    ↓
Correction Vectors logged (when CorrectionVectorAdapter built)
    ↓
Patterns aggregated across PRs
    ↓
Persona refinement proposals generated
    ↓
Human reviews and merges persona updates
    ↓
Construct gets smarter → Agent generates better code
```

This is the back-pressure model from the DX Vision: agents are the forward pass (generating output), humans are the backward pass (providing gradient signal through precise critique), and the Constructs are the weights that get updated.

Currently operational: Agent generates → Bridgebuilder reviews → GitHub PR comments.
Not yet built: Correction Vector logging, pattern aggregation, automated persona refinement proposals.

### 10.3 The Observation → Learning Pipeline

```
Agent captures observations during sessions
    ↓ grimoires/{pack}/observations/
Daily synthesis aggregates signals
    ↓ grimoires/observer/synthesis/
Human reviews aggregated learnings
    ↓ Approves, edits, or dismisses
PR filed upstream to loa-constructs
    ↓ (not yet automated)
Construct updated in source of truth
    ↓ mount
All consumers get improved Construct
```

Currently operational: Observation capture, partial daily synthesis.
Not yet built: Automated upstream PR creation, cross-construct pattern detection.

---

## 11. Quick Reference

### Key Commands

| Command | What It Does |
|---------|-------------|
| `mount` | Install framework + construct packs into your project |
| `compose-context.sh` | Merge base methodology + project overlays |
| `validate-topology.sh` | Check all packs for topology contamination |
| `event-registry.sh validate --strict` | Validate event topology across installed packs |

### Key Files to Edit (as a Project Consumer)

| File | Purpose | Layer |
|------|---------|-------|
| `CLAUDE.md` | Project-level system prompt | 1 — Project |
| `.loa.config.yaml` | Pack selection, Bridgebuilder config, context overlays | 1 — Project |
| `contexts/overlays/*.json` | Project-specific data (fixtures, states, identity) | 1 — Project |
| `grimoires/bridgebuilder/BEAUVOIR.md` | Project-specific Bridgebuilder persona override | 1 — Project |

### Key Files to Edit (as a Construct Author)

| File | Purpose | Layer |
|------|---------|-------|
| `skills/{name}/SKILL.md` | Skill methodology (with counterfactuals) | 2 — Construct |
| `skills/{name}/index.yaml` | Capability metadata for routing | 2 — Construct |
| `manifest.json` | Pack metadata, dependencies, events, context requirements | 2 — Construct |
| `contexts/overlays/*.json.example` | Template for project-specific data | 2 — Construct |
| `resources/personas/{domain}.md` | Bridgebuilder critique persona | 3 — Framework |

### The Boundary Rule

> If it changes when you switch projects, it's **Topology** — put it in a Context Slot overlay.
> If it stays true regardless of project, it's **Methodology** — put it in SKILL.md.
> If you're unsure, it's probably Topology. Extract it.

---

*This document describes the architecture as of Phase 2 (v0.3.1). The system is actively evolving — the Hounfour adapter, CorrectionVectorAdapter, and Event Bus consumers are the next major infrastructure milestones. The Constructs Network's job is to emit clean metadata so these Runtime components can fulfill their roles when they arrive.*
