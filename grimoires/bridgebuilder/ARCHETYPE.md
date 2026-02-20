# The Bridgebuilder Archetype

> *"We build spaceships, but we also build relationships."*

**Status**: Design Draft
**Author**: Team Bridgebuilder Archetype
**Date**: 2026-02-19
**Grounded in**: loa-finn#24, loa-constructs#116, #118, #119, #122, #127, #128, #129
**Research**: `grimoires/bridgebuilder/research-creator-economy-patterns.md` (486 lines, 30+ sources)

---

## 1. Thesis

The Bridgebuilder is the mentor who makes builders better without taking over.

The gap in the agentic age isn't knowledge — it's navigation. People have ideas. The tooling exists. What's missing is the experience layer that meets people where they are, protects their flow state, keeps them grounded in what matters, and progressively reveals capability as they're ready for it.

The Bridgebuilder archetype starts as Loa's existing review persona and extends into the DNA of the Constructs Network. It is not a product. It is not a feature. It is a philosophy of how the network relates to its builders — encoded into manifests, golden paths, metrics, and every touchpoint where a human asks "what do I do next?"

### What The Bridgebuilder Believes

| Belief | Implication |
|--------|-------------|
| Every interaction is a teachable moment | Errors are education, not failures. Review findings illuminate, not punish. |
| The network sells itself through what's built with it | No marketing. No vanity. midi-interface and hub-interface ARE the pitch. |
| Protecting flow state is more important than shipping faster | Never pull a builder out of the zone unnecessarily. The compass, not the rocket. |
| Staying grounded in what matters prevents drift | AI scatters across rabbit holes. The Bridgebuilder anchors to the actual goal. |
| Human-connected metrics are the only metrics that matter | Not installs. Not deploys. How people feel. Lives transformed from state A to state B. |
| Progressive disclosure reduces cognitive load without removing depth | Easy entry, deep mastery. Go deep when the builder is ready, not before. |
| Visualization is emergent, not prescribed | Provide the data. Let the ecosystem (gumi's blotter, eco maps) provide the view. |

### The Neuromancer Grounding

The Constructs Network is **Freeside** — the orbital habitat where autonomous communities establish themselves, each with their own rules, sharing the same constructed physics. The Bridgebuilder is the character in Freeside who's been there since the spindle first spun — who knows every enclave, every shortcut, every trap. Not a guide who holds your hand. A mentor who points you in the right direction and trusts you to walk.

### Five Design Principles (from Creator Economy Research)

Cross-platform patterns extracted from Roblox, YouTube, Unity/FAB, Shopify, Figma, and the WAP cautionary tale:

| Principle | Source | Implication for the Network |
|-----------|--------|---------------------------|
| **Fun First, System Second** | Raph Koster: "Fun is just another word for learning." Roblox starts with play, not tutorials. | First construct invocation must produce joy (a real artifact), not understanding (docs about what you could build). |
| **Metrics That Measure Depth, Not Breadth** | YouTube moved from views → watch time. Roblox moved from downloads → engagement payouts. | Integration depth > install count. A construct used deeply in 3 projects beats one installed 100 times and abandoned. |
| **Progressive Disclosure via State, Not Time** | Roblox triggers tutorials based on inventory contents, not elapsed time. YouTube surfaces analytics after monetization thresholds. | Reveal capabilities based on what the builder has done, not how long they've been around. |
| **Flow State is Sacred** | It takes 23 minutes to refocus after an interruption (Gloria Mark, UC Irvine). Engineers in flow are 2-5x productive. | Never pull builders out of their CLI to learn, configure, or troubleshoot. Everything inline, in the moment, at the point of need. |
| **Open Beats Closed, Every Time** | WAP's walled gardens died. AOL's walled garden died. Survivors (YouTube, Roblox, Shopify) were more open. | Multi-runtime, no gatekeepers, transparent metrics, portable constructs. Constructs must never be locked to one tool. |

---

## 2. Identity & Voice (Extended)

### Existing Persona (Preserved)

The Bridgebuilder persona in `.claude/data/bridgebuilder-persona.md` and `grimoires/bridgebuilder/BEAUVOIR.md` defines the PR review voice. **This is unchanged.** The review persona is the Bridgebuilder's highest-fidelity expression — generous, rigorous, educational, grounded in code as truth.

### Extended Voice: Network Touchpoints

The Bridgebuilder voice extends beyond review into every network touchpoint where a builder asks "what now?"

| Touchpoint | Current State | Bridgebuilder Extension |
|------------|--------------|------------------------|
| **First install** | Silent `pnpm install` | "Welcome to Freeside. You have 5 packs available. Start with `/loa` to see where you are." |
| **Construct discovery** | Browse `/v1/constructs` | "Observer listens to your users. Artisan refines what they see. They pair well together — like a surgeon and a radiologist." |
| **Workflow navigation** | `/loa` shows status | Extend to construct-level: "You're 3 canvases into Observer. Shape is next — your patterns are ready." |
| **Error/friction** | Stack traces | "This failed because the wrapper script predates the enrichment pipeline (Observer field report, Sprint 2). Here's the fix, and here's why it happened." |
| **Metrics/progress** | Download counts | "3 people used your construct this week. One of them closed 17 issues from the feedback it generated." |
| **Review** | Bridgebuilder findings | Unchanged — this is the gold standard |

### Voice Principles (Network Level)

1. **Orient before acting.** Before suggesting a command, explain where the builder is and why this is the next move.
2. **Teach the pattern, not just the fix.** When resolving friction, connect to the broader principle. "This env var gap exists because skills execute in CLI, not app runtime. Every construct that calls external APIs will face this."
3. **Celebrate the real.** When something works well, be specific about WHY. "Your signal classification correctly routed all 23 entries without manual override — that's the kind of precision that compounds."
4. **Name the trap.** When AI is leading the builder astray, say so. "You've been in this rabbit hole for 40 minutes. Your original goal was X. Let's return to that."
5. **Trust the builder.** Don't over-explain to experts. Match the disclosure level to the builder's demonstrated capability.

---

## 3. The Progressive Disclosure System

> *Resolves: #127 (golden path leveling), #122 (MoE routing), #129 (workflow depth)*

### The Creator Journey (Universal Pattern)

Every successful creator platform follows this progression (validated across Roblox, YouTube, Figma, Shopify):

```
DISCOVER → TRY → SUCCEED → UNDERSTAND → MASTER → CREATE → CONTRIBUTE → LEAD
```

Figma distills this into four stages that map directly to constructs:

```
CONSUME  → Use skills from installed packs
COMPOSE  → Combine packs for compound workflows
CREATE   → Build custom skills and packs
CONTRIBUTE → Publish to the registry for others
```

### The Leveling Model (Network-Specific)

Applied to a CLI-first agentic platform. Each level reveals more capability without removing access to depth.

```
Level 0: DISCOVERY     "What is this?"
Level 1: ORIENTATION   "Where am I? What can I do?"
Level 2: PRACTICE      "I'm using one construct, getting comfortable"
Level 3: COMPOSITION   "I'm combining constructs for compound effects"
Level 4: CREATION      "I'm building my own constructs"
Level 5: MASTERY       "My constructs are being used by others"
```

### How Levels Map to the Network

| Level | Entry Signal | What Unlocks | Bridgebuilder Voice |
|-------|-------------|--------------|-------------------|
| 0 | Visits constructs.network or reads README | Browse marketplace, read construct descriptions | "Here's what's possible. Pick one that matches what you're trying to build." |
| 1 | Installs first pack | `/loa` shows construct status, golden path commands appear | "You have Observer installed. Start with `/listen` — it ingests your user signals." |
| 2 | Completes first workflow loop | Construct-level "you are here" + "try this next" suggestions | "You've captured 5 canvases. Shape is next — your patterns are emerging." |
| 3 | Installs second pack, cross-construct events fire | Event bus visibility, composition suggestions | "Observer captured a sentiment reversal. Artisan can surface this in your UI." |
| 4 | Creates a pack manifest, uses construct-template | Creator tools, submission pipeline, quality gates | "Your manifest looks solid. Add a `domain` field — it helps the router match intent to expertise." |
| 5 | Pack published, installed by others | Creator analytics, feedback routing, network metrics | "3 builders installed your construct this week. One filed a friction report — here's what they hit." |

### "You Are Here" Indicator

Every construct implements a state detection function (cf. #122 golden path proposal):

```yaml
# manifest.yaml — golden_path extension
golden_path:
  commands:
    - name: "/research"    # porcelain command
      description: "Run the full Observer loop"
      truename_map:        # state → truename routing
        no_feedback: "/daily-synthesis"
        feedback_unsynthesized: "/daily-synthesis"
        canvases_stale: "/refresh"
        hypotheses_unvalidated: "/follow-up"
        canvases_ready: "/shape"
  detect_state: "scripts/detect-state.sh"
```

The Bridgebuilder reads this state and says: *"You're at `canvases_ready`. Shape is your next move. You have 8 journey patterns across 20 canvases — the strongest is accuracy-validation at 10 canvases."*

### Workflow Depth (Construct-Owned Gates)

From #129 — constructs declare their own pipeline depth. The Bridgebuilder respects this:

```yaml
# manifest.yaml — workflow extension
workflow:
  depth: light          # light | standard | deep
  gates:
    prd: skip           # FE/UI doesn't need a PRD
    sdd: skip
    sprint: condense    # auto-generate from issue body
    implement: required
    review: visual      # deploy + screenshot, not textual review
    audit: skip
```

**Bridgebuilder principle**: "Constructs with declared workflow gates are trusted to own their quality process. They've earned that trust by being installed, versioned, and maintained expertise packages."

---

## 4. Human-Centered Metrics Framework

> *"Vanity metrics are off the board. What matters is how people feel."*

### What We DON'T Measure (Anti-Vanity)

| Vanity Metric | Why It's Noise |
|---------------|---------------|
| Total installs | A number goes up. Tells you nothing about impact. |
| Total deploys | Speed without direction is drift. |
| Lines of code | More code is not better code. |
| Time to first install | Fast doesn't mean right. |
| Stars/likes | Social proof is not human proof. |

### What We DO Measure (Human-Connected)

| Metric | What It Captures | How To Measure |
|--------|-----------------|----------------|
| **Friction-to-Resolution** | Time from "I'm stuck" to "I understand why and how to fix it" | Observer friction reports (#116): track gap → issue → close cycle |
| **Flow State Duration** | How long a builder stays in productive flow before the system interrupts | Session telemetry: time between context switches, error recovery events |
| **State Transformation** | People moved from state A to desired state B | Domain-specific: health construct = lives improved, music construct = tracks shipped, community construct = members engaged |
| **Construct Depth** | How deep into a construct's workflow a builder actually goes | Golden path progression: Level 0→1→2→3 advancement per construct |
| **Compound Effect** | Cross-construct event completions — Observer → Artisan working together | Event bus consumer fulfillment rate (addresses #116 friction point #4) |
| **Builder Confidence** | Does the builder feel certain their work is sound? | Post-review sentiment, Bridgebuilder PRAISE-to-finding ratio, re-review rate |
| **Behavioral Conviction** | Are users acting with conviction in the products built with constructs? | Score API behavioral signals (from midi-interface/hub-interface) |

### YouTube-Equivalent Metrics (The Depth Mapping)

YouTube's pivot from views to watch time is the canonical anti-vanity move. Here's the construct network equivalent:

| YouTube Metric | What It Means | Construct Equivalent | What It Means |
|---------------|--------------|---------------------|--------------|
| Watch Time | Who stayed | **Workflow Depth** | How far through the pipeline (PRD→SDD→Sprint→Implement→Review→Audit→Ship) |
| Audience Retention | Where they drop off | **Step Completion Rate** | Where do users abandon a construct's golden path? |
| CTR | The promise | **First-Invocation Success** | Does trying a construct deliver on its description? |
| Engagement | Active value | **Re-invocation Rate** | Do builders return? Do they compose with other constructs? |
| "Compare to your own average" | Self-referential growth | **Personal progression** | "Your sprint velocity improved 20% vs last cycle" — not "you're top 10%" |

### The Hormozi Mapping

Alex Hormozi: *Reduce the time to the desired outcome with the least pain possible.*

For the Constructs Network:
- **Desired Outcome** = "What I built is helping real people and I understand why"
- **Time** = Friction-to-Resolution + golden path progression speed
- **Pain** = Cognitive load, rabbit holes, loss of flow state, vanity metric chasing

The Bridgebuilder reduces pain by:
1. Keeping the builder oriented (compass, not rocket)
2. Teaching the pattern, not just the fix (compounding knowledge)
3. Measuring what matters (human impact, not installs)
4. Matching disclosure to readiness (progressive, not overwhelming)

---

## 5. Integration Map

### 5.0 Codebase Reality Gap (Critical Finding)

The codebase analyst discovered that the **DB already has construct identity data that the manifest schema doesn't know about**:

**`construct_identities` table** (`apps/api/src/db/schema.ts:1133-1152`):
- `cognitiveFrame` — how the construct thinks
- `expertiseDomains` — what it's expert in
- `voiceConfig` — how it speaks
- `modelPreferences` — which models it prefers

**`formatConstructDetail()`** (`apps/api/src/routes/constructs.ts:80-117`):
- Already returns this identity data in API responses

**Explorer frontend** (`apps/explorer/lib/data/fetch-constructs.ts`):
- `APIConstruct` interface does NOT consume identity fields
- Construct detail page shows none of this

**This means**: The Bridgebuilder's identity layer is half-built. The API already serves it. The frontend just needs to consume it. And the manifest schema needs corresponding fields so this data flows from construct authoring → registry → API → explorer.

### 5.1 Manifest Schema Extensions

**File**: `packages/shared/src/types.ts:219-271`, `packages/shared/src/validation.ts:216-271`

```typescript
// Proposed additions to PackManifest
interface PackManifest {
  // ... existing fields

  // From #122: Domain declaration for MoE routing
  domain?: string[];         // e.g., ["user-research", "feedback"]
  expertise?: string[];      // high-signal tokens for intent matching

  // From #122: Golden path porcelain
  golden_path?: {
    commands: Array<{
      name: string;          // e.g., "/research"
      description: string;
      truename_map: Record<string, string>;  // state → skill routing
    }>;
    detect_state?: string;   // script path for state detection
  };

  // From #129: Workflow depth declaration
  workflow?: {
    depth: 'light' | 'standard' | 'deep';
    gates: {
      prd?: 'skip' | 'condense' | 'full';
      sdd?: 'skip' | 'condense' | 'full';
      sprint?: 'skip' | 'condense' | 'full';
      implement?: 'required';
      review?: 'visual' | 'textual' | 'both' | 'skip';
      audit?: 'skip' | 'lightweight' | 'full';
    };
  };

  // From #118: Methodology layer (separate from topology)
  methodology?: {
    references?: string[];   // external principles/materials
    principles?: string[];   // design tenets this construct follows
    knowledge_base?: string; // path to ingested domain expertise
  };

  // From #128: Capability tier
  tier?: 'L1' | 'L2' | 'L3';  // expertise-only | +UI | +orchestration
}
```

**Priority**: HIGH — this is the structural foundation everything else builds on.

### 5.2 Golden Path Extension

**File**: `.claude/scripts/golden-path.sh` (reference implementation, ~550 lines)

**Current state**: `golden_detect_workflow_state()` returns 9 states (initial, prd_created, sdd_created, sprint_planned, implementing, reviewing, auditing, complete, bug_active). `golden_format_journey()` renders a visual journey bar. `golden_menu_options()` generates AskUserQuestion choices based on state. This is **framework-level only** — no construct awareness.

**The `browsing-constructs` skill** (`.claude/skills/browsing-constructs/SKILL.md`) shows installed packs but has zero "what should I do next?" guidance. The `quick_start` field exists in manifests but the skill doesn't use it post-install.

**Extension**: Each installed construct registers its golden path commands. The `/loa` command aggregates:

```
$ /loa

Loa Framework v1.39.0 — Freeside

  Framework:  /plan ━━━━━ /build ●━━━━━ /review ─━━━━━ /ship ─
  Observer:   /listen ━━━ /see ━━━ /think ●━━━ /shape ─━━━ /speak ─
  Artisan:    /taste ●━━━ /inscribe ─━━━ /polish ─

  Next suggested: /shape — your 8 journey patterns are ready for consolidation
```

**Priority**: HIGH — this is the "you are here" indicator (#127 feedback).

### 5.3 Explorer Marketplace

**File**: `apps/explorer/app/`

Current: Construct browsing, pack details, download flow.

**Bridgebuilder extensions:**
- **Construct pairing suggestions**: "Observer pairs well with Artisan for feedback-to-UI loops"
- **Depth indicator**: Show which level (L1/L2/L3) a construct supports
- **Impact stories**: Instead of install counts, show what's been built with it
- **Progressive filtering**: New builders see simple packs first; advanced builders see composition options

**Priority**: MEDIUM — UI changes after schema + CLI are solid.

### 5.4 CLI Onboarding

**Current**: `pnpm install` + read CLAUDE.md. No progressive disclosure at any step. No expertise assessment. No "start here." No journey.

**Target** (from Hormozi Value Equation): **< 2 minutes to first valuable output.** Zero prerequisite knowledge — the system teaches as it executes. The optimal onboarding is invisible — the user doesn't realize they're being onboarded because they're already getting value.

**Roblox patterns to apply:**
- Contextual tutorials triggered by state, not scripted sequences
- One-shot hints that don't repeat once acknowledged
- Non-core features delayed until organic discovery

**Bridgebuilder first-run:**
```
$ /loa setup

  Welcome to Freeside.

  You have 0 constructs installed.
  Your project is a Next.js 15 app with Hono API.

  Suggested first construct:
    Observer — captures user feedback as hypothesis-first research
    "Start by listening to what your users actually experience."

  Install: /constructs install observer

  Or browse: /constructs
```

**Post-install** (currently missing — the browsing-constructs skill ends with a flat command list):
```
  Observer installed. 6 skills ready.

  Start here: /listen
    "Capture your first user insight. Everything else builds on this."

  Your journey: /listen → /see → /think → /shape → /speak → /grow
  You are at: Step 1 of 6
```

**Priority**: HIGH — first impression defines the relationship. As Roblox proved: completion-based triggers, not time-based.

### 5.5 Review Pipeline (Existing — Preserve)

**Files**: `.claude/data/bridgebuilder-persona.md`, `grimoires/bridgebuilder/BEAUVOIR.md`

The existing Bridgebuilder review pipeline is the archetype's highest-fidelity expression. **No changes needed.** The PRAISE / SPECULATION / REFRAME finding types already embody the philosophy. The run-bridge autonomous excellence loop already implements iterative mentorship.

**Extension opportunity**: Bridgebuilder review patterns could be offered as a construct itself — installable by any project, not just Loa-managed ones. This is the "Bridgebuilder as construct" angle.

**Priority**: LOW (already excellent) — but HIGH for the "construct-ified" version.

### 5.6 Metrics Surface

**Files**: `apps/api/src/routes/` (analytics endpoints)

Current analytics: `skill_usage`, `pack_installations`, `pack_download_attributions`

**Missing for human-centered metrics:**
- Friction event logging (from Observer field reports → API)
- Golden path progression tracking (level per construct per user)
- Cross-construct event fulfillment rate
- Builder confidence signals (post-review sentiment)
- State transformation tracking (domain-specific, construct-declared)

**Schema addition** (new table):
```sql
CREATE TABLE construct_impact_signals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  construct_slug TEXT NOT NULL,
  signal_type TEXT NOT NULL,     -- 'friction_resolved', 'level_advanced', 'state_transformed', 'flow_interrupted'
  from_state TEXT,
  to_state TEXT,
  context JSONB,                 -- domain-specific payload
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Priority**: MEDIUM — meaningful after golden path + manifest schema land.

---

## 6. Issue Resolution Map

How this archetype design advances or resolves each linked issue:

| Issue | Title | How Bridgebuilder Addresses It |
|-------|-------|-------------------------------|
| loa-finn#24 | Bridgebuilder PR review skill | **Preserved as-is.** The review persona is the archetype's highest expression. Extended to construct-level quality gates via `workflow.gates`. |
| #129 | Construct-owned workflow depth | **Directly resolved** by `workflow.gates` in manifest schema (Section 5.1). Bridgebuilder trusts constructs to own their quality process. |
| #127 | Golden path leveling | **Directly resolved** by progressive disclosure system (Section 3) + golden path extension (Section 5.2). "You are here" + "try this next." |
| #122 | MoE routing + domain declaration | **Directly resolved** by `domain` + `expertise` + `golden_path` manifest fields (Section 5.1). Constructs as routable experts. |
| #118 | Topology vs methodology separation | **Resolved** by `methodology` manifest field (Section 5.1). Knowledge layer separated from skill topology. Reference ingestion pipeline. |
| #116 | Observer field report | **Informed the design.** Friction points #1-#6 directly shaped the metrics framework (Section 4) and first-run experience (Section 5.4). |
| #119 | Envio construct proposal | **Template case.** Shows how domain-specific constructs (indexer expertise) fit the tier model. Envio would be L1 (expertise) or L2 (expertise + CLI UI). |
| #128 | Verification Gradient / composability | **Addressed** by tier field (`L1`/`L2`/`L3`) in manifest + compound effect metrics. Full composability primitives are a future phase. |

---

## 7. Implementation Priority

### Phase 1: Foundation (Near-Term — CLI Power Users)

> *"Infrastructure needs to be ready."*

| Item | What | Why First |
|------|------|-----------|
| Manifest schema extension | Add `domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier` | Everything else builds on this. Non-breaking — just metadata. |
| Golden path per construct | Extend `/loa` to show construct-level "you are here" | Directly resolves #127 feedback. Highest-impact UX improvement. |
| Workflow depth gates | Implement `workflow.gates` in constraint enforcement | Directly resolves #129. Removes friction for FE/UI/lore work. |
| State detection scripts | Each pack ships a `detect-state.sh` | Required for golden path routing. |

### Phase 2: Experience (Mid-Term — Onboarding + Metrics)

| Item | What | Why |
|------|------|-----|
| First-run Bridgebuilder | CLI onboarding with construct suggestion | First impression = relationship defined. |
| MoE intent routing | Router builds capability map from installed manifests | Resolves #122. Constructs activated by intent, not memorized commands. |
| Human-centered metrics table | `construct_impact_signals` + API endpoints | Enables non-vanity measurement. |
| Methodology ingestion | Reference pipeline for external principles | Resolves #118. Constructs absorb domain expertise cleanly. |

### Phase 3: Network DNA (Longer-Term — Marketplace + Composition)

| Item | What | Why |
|------|------|-----|
| Explorer progressive disclosure | Construct pairing, depth indicators, impact stories | UI visualization of progressive disclosure. |
| Bridgebuilder-as-construct | Package the review pipeline as an installable pack | Any project gets Bridgebuilder review, not just Loa-managed. |
| Cross-construct composition | EventBus first-class support, compound workflows | Enables L3 tier (multi-agent orchestration). |
| State transformation tracking | Domain-specific impact metrics per construct | "How many lives did your health construct improve?" |

---

## 8. Design Decisions (Resolved)

### Q1: Voice — One network-wide, not per-construct

**Decision**: One Bridgebuilder voice across the entire network.

Each construct has its own *domain expertise* (Observer knows user research, Artisan knows design systems), but the voice — the warmth, the rigor, the analogies, the teachable moments — is the same everywhere. This is the network's character. Builders should feel the same mentor whether they're in Observer or Artisan or a third-party construct they just installed.

Constructs can declare their own `cognitiveFrame` (already in `construct_identities` table) for domain-specific reasoning. But the Bridgebuilder voice wraps that cognition in a consistent, trustworthy delivery.

### Q2: Builder Wellbeing — Health awareness + drift detection

**Decision**: Two mechanisms, both rooted in caring for the builder's mental state.

**Mechanism 1: Health Awareness ("Take a break")**

Like games that detect prolonged play sessions and surface a gentle reminder. The Bridgebuilder notices:
- Extended session duration without breaks
- Signs of fatigue (increasing error rates, context switch frequency)
- Late-night sessions that may benefit from fresh eyes

Voice: *"You've been building for 3 hours straight. The best code gets written after the walk, not before it. Your progress is saved — Freeside will be here when you get back."*

**Mechanism 2: Drift Detection ("This diverged from your goal")**

The rabbit hole problem: AI scatters across tangents. The Bridgebuilder tracks the original stated goal and surfaces when work has diverged:
- Topic drift from the stated objective
- Scope creep beyond what was planned
- Circular work (revisiting the same files/patterns without progress)

Voice: *"You started this session to fix the auth flow. The last 40 minutes have been in the styling layer. Your auth fix is still open — want to return to it?"*

**Implementation surface**: Session-level telemetry — goal statement captured at session start (from sprint plan, issue body, or explicit `/loa` goal), periodic drift check against recent tool invocations and file paths.

### Q3: Tier/Pricing — Deferred

Not thinking about this yet. L1/L2/L3 tiers exist as metadata for capability classification, not pricing.

### Q4: Minimum Golden Path — Fully optional, with nudges

**Decision**: All progressive disclosure fields (`domain`, `golden_path`, `workflow`, `methodology`, `tier`) are optional. Zero required fields for new constructs.

When a construct is installed with no golden_path declared, the Bridgebuilder adapts:

```
  Custom construct installed. 4 skills ready.
  No guided path declared — you're exploring freely.

  Available commands:
    /skill-one — does X
    /skill-two — does Y

  Tip: Add a golden_path to your manifest to enable
  "you are here" navigation for your users.
```

This preserves zero-barrier entry while gently encouraging richer manifests. As the ecosystem matures, constructs with golden paths will naturally outperform those without — the progressive disclosure system itself becomes the incentive.

### Q5: Neuromancer Naming — Aesthetics yes, namespace collisions no

**Decision**: Neuromancer-flavored naming is encouraged for cognitive lift and meme energy, but construct categories MUST NOT collide with actual repo/product names.

**Taken names** (these are real repos in the `loa-` prefix namespace):
- `loa-freeside` — Multi-tenant SaaS platform for token-gated onchain communities
- `loa-finn` — Agent orchestration runtime
- `loa` — Framework core
- `loa-constructs` — This repo (registry + marketplace)

**Safe for construct categories**: Neuromancer concepts NOT used as repo names. Examples:
- **The Matrix** — agent-native constructs (constructs that coordinate AI agents)
- **The Sprawl** — infrastructure constructs (deployment, monitoring, databases)
- **Wintermute** — intelligence constructs (analysis, research, reasoning)
- **ICE** — security constructs (auditing, hardening, threat modeling)
- **Simstim** — experience constructs (UI, UX, design, motion)

This keeps the naming coherent with the ecosystem's Neuromancer DNA while avoiding confusion between category labels and actual products. The key principle: **names should help both humans and agents make sense of the overall picture.**

---

## 9. Next Steps

This design document is ready for implementation planning. The recommended sequence:

1. **File this as an RFC** on `loa-constructs` referencing all 8 linked issues
2. **Start with Section 5.0** — connect the existing `construct_identities` API data to the explorer frontend (smallest effort, proves the identity layer)
3. **Then Section 5.1** — manifest schema extensions (non-breaking, metadata-only)
4. **Then Section 5.2** — golden path extension (the "you are here" backbone)
5. **Parallel: Section 8 Q2** — design the drift detection + health awareness telemetry

---

*"The best code review leaves the author knowing something they will carry for the rest of their career. The best network does the same for its builders."*
