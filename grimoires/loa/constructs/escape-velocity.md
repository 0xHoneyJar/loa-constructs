# Escape Velocity — Constructs Network Growth Strategy

> *"This feels like when All Might hands down his All For One power to Deku."*

**Status**: Active
**Date**: 2026-03-05
**Grounded in**: Deep Research (192 sources), Artisan audit, Template gap analysis, Bridgebuilder ARCHETYPE.md
**Research config**: `construct-deep-research/scripts/research-config-escape-velocity.ts`

---

## TL;DR — The Thesis in 5 Bullets

1. **Constructs are power transfers, not plugins.** They change how developers *see*, not just what they *do*. The perceptual shift is the product.
2. **The template is the tutorial level.** It must teach construct authoring through worked examples, progressive disclosure, and intentional friction — not placeholder text and TODOs.
3. **Artisan needs a dual identity layer.** Machine routing (YAML) for the runtime, narrative invocation (ALEXANDER.md) for the human. Both exist now.
4. **CI gates should teach, not just block.** Graduated validation (L0 dev → L1 quality → L2 publish) matches the author's growth. Placeholders fail at L0. Publishing requires real content at L2.
5. **Measure what matters.** Friction-to-Resolution, Flow State Duration, Behavioral Conviction — not installs, not stars. (See ARCHETYPE.md §4 for the full metrics framework.)

---

## 1. Situation

The Constructs Network is reaching escape velocity. Early adopters are experiencing transformative results — one user described receiving a construct as a power transfer moment. The leads are coming from pain points (frontend struggles, wanting expert-level help that compounds). The question isn't whether constructs work — it's whether we can make the experience reproducible, discoverable, and progressively disclosed for the next wave.

### What We Know Works

- **Artisan construct**: 14 skills, taste-as-engineering-discipline. When someone embodies ALEXANDER.md, it transforms their workflow.
- **The Bridgebuilder archetype**: Review + mentorship philosophy. Generous, rigorous, educational.
- **Construct-as-power-transfer**: The mental model clicks when a developer installs a construct and immediately feels more capable — not because the tool does more, but because they see differently.

### What's Broken or Missing

| Gap | Severity | Evidence |
|-----|----------|----------|
| **Template teaches nothing** | Critical | SKILL.md gets 4 lines of skeleton. CLAUDE.md is all TODOs. CI passes placeholder text. |
| **No first-run experience** | Critical | `pnpm install` → silence. No "you are here," no suggested next step. |
| **Artisan identity diverged** | High | persona.yaml/expertise.yaml replaced ALEXANDER.md. The narrative power transfer moment is lost for new users. |
| **No progressive disclosure** | High | Template dumps everything at once. README has 15 sections but Mermaid shows 4 steps. |
| **Install path is broken** | High | Template says `constructs-install.sh` but doesn't link to it or explain how to get it. |
| **No intentional friction** | Medium | Everything is either too easy (passes CI with placeholders) or too hard (no guidance on SKILL.md). No designed challenge moments. |
| **Schemas unused in CI** | Medium | persona.schema.yaml and expertise.schema.yaml exist but CI never invokes them. |

---

## 2. Design Philosophy — Game Design Meets Developer Tools

### The Raph Koster Principle

> "Fun is just another word for learning."

A construct template isn't a scaffold — it's a **tutorial level**. Each file the author touches should teach them something about the construct mental model, and the act of filling it in should feel like progression, not paperwork.

### The Jenova Chen Flow Channel

```
                  Anxiety
                 /
                /
        [Sweet Spot] ← Keep authors HERE
               \
                \
                 Boredom
```

The template must dynamically match complexity to the author's demonstrated capability:
- **Level 0**: Single skill, minimal identity → ship something that works
- **Level 1**: Multiple skills, persona defined → the construct has a voice
- **Level 2**: Events, dependencies, golden path → the construct composes with others
- **Level 3**: Custom scripts, methodology, MCP integration → the construct is an ecosystem citizen

### The Dark Souls Principle — Intentional Friction

Not all friction is bad. Git's staging area is intentional friction. Stripe's test mode is a safe failure space. The best developer tools have **designed challenge moments** where the difficulty teaches.

Where to add intentional friction in the construct authoring journey:

| Moment | Friction Type | What It Teaches |
|--------|--------------|-----------------|
| **First SKILL.md** | Creative constraint | "What does your construct actually DO? Write it as instructions to an agent, not as documentation for a human." |
| **First test invocation** | Reality check | "Run your construct against a real project before publishing. Does it actually help?" |
| **Identity definition** | Self-reflection | "Who is your construct? Not what it does — who it IS. What does it believe? What does it refuse?" |
| **Publishing gate** | Quality threshold | CI blocks publishing until: skills have real content, identity is non-placeholder, at least one test invocation logged. |

### The Nintendo Kishōtenketsu

Every file in the template follows the 4-act structure:
1. **Introduction** (ki) — What this file is and why it exists
2. **Development** (shō) — The core content, with worked examples
3. **Twist** (ten) — The non-obvious insight that separates good from great
4. **Conclusion** (ketsu) — The payoff, connecting back to the whole

---

## 3. Artisan Remediation Plan

### Current State (construct-artisan repo)

- 14 skills, all healthy and in sync with registry
- Identity split into `persona.yaml` + `expertise.yaml` (structured, machine-readable)
- `CLAUDE.md` is the runtime-facing summary
- No `ALEXANDER.md` — the identity narrative that creates the "power transfer" moment

### The Problem

The structured identity files (persona.yaml, expertise.yaml) are correct for machine routing but wrong for human onboarding. When the user in the conversation said "embody @ALEXANDER.md," that narrative invocation is what created the transformative experience. The YAML files can't do that.

### The Fix: Dual Identity Layer

```
identity/
  persona.yaml      ← Machine routing (model selection, domain matching)
  expertise.yaml    ← Machine routing (capability boundaries)
  ALEXANDER.md      ← Human invocation (the power transfer narrative)
  README.md         ← Human discovery (what is this construct?)
```

**ALEXANDER.md** is NOT documentation. It is a **persona invocation prompt** — the text a developer puts in their session to become the construct. It should:

1. Establish the construct's worldview in 2-3 sentences
2. Define what it sees that others don't (the unique lens)
3. Declare its standards (what it refuses to accept)
4. Name its tools (the skills, as capabilities, not commands)
5. Set the tone (how it speaks, what analogies it uses)

The key insight: **the construct doesn't help you do something — it helps you SEE something.** Artisan doesn't write CSS. Artisan sees that the button feels heavy because the shadow is fighting the border radius. That perceptual shift is the power transfer.

### Artisan Quick Start Remediation

Current `quick_start.command: /iterate-visual` is correct for power users but wrong for first contact. The first experience should be:

```
quick_start:
  command: /taste
  description: "Show me what your project tastes like. Start here."
  follow_up: /inscribe
  follow_up_description: "Then apply what you've discovered."
```

The progression: `/taste` (observe) -> `/inscribe` (apply) -> `/iterate-visual` (refine) -> `/decompose` (when something feels off).

---

## 4. Template Remediation Plan

### Minimum Viable Construct (5 minutes to ship)

The template needs a clear "Level 0" path:

```
1. gh repo create my-construct --template 0xHoneyJar/construct-template
2. Edit construct.yaml (name, slug, description — 3 fields)
3. Edit skills/my-skill/SKILL.md (write the actual instructions)
4. Edit identity/persona.yaml (archetype + one sentence disposition)
5. git push → CI validates → you're a construct author
```

Everything else (events, dependencies, methodology, golden path) is Level 1+.

### SKILL.md — The Most Important File Gets the Most Guidance

Current: 4-line skeleton with `TODO:` placeholders.

Needed: A worked example that teaches by showing, not telling. The example skill should be a real, functional skill (not a generic placeholder) that demonstrates:
- Clear trigger and usage section
- Specific workflow steps (numbered, concrete)
- Boundaries (what the skill does NOT do)
- Output format specification
- Error handling guidance

The template should ship with TWO example skills:
1. `skills/example-simple/` — A minimal skill (10 lines of SKILL.md) that actually works
2. `skills/example-full/` — A complete skill showing every pattern

### CLAUDE.md — The Runtime Identity

Current: All TODOs.

Needed: A filled-in example that shows how the runtime-facing identity differs from documentation:

```markdown
# My Construct

You are [name], a [archetype] specialized in [domain].

## What You See
- [Unique perceptual lens — what does this construct notice that others miss?]

## How You Work
- [Primary workflow — the default behavior when invoked]

## What You Refuse
- [Hard boundaries — what this construct will NOT do]

## Your Tools
- `/skill-one` — [what it does, in action terms]
- `/skill-two` — [what it does, in action terms]
```

### CI — Quality Gates That Teach

Current: Warnings only. Placeholder text passes.

Needed: Graduated CI that matches the progressive disclosure model:

| Gate | Level 0 (Required) | Level 1 (Recommended) | Level 2 (Publishing) |
|------|-------------------|---------------------|---------------------|
| `construct.yaml` valid | name, slug, version, description non-placeholder | skills array non-empty, identity files valid | events declared, quick_start defined |
| `SKILL.md` non-trivial | > 20 lines, no `TODO:` strings | Has workflow section, has boundaries section | Has worked examples, has error handling |
| `CLAUDE.md` filled | > 10 lines, no `TODO:` strings | Has "What You See" + "What You Refuse" sections | Full identity with tools listing |
| Identity files | persona.yaml passes schema | expertise.yaml has real domains | At least one domain at depth 4+ |
| Test invocation | N/A | N/A | Evidence of at least one real invocation |

---

## 5. Team Composition

### The Team We Need

Based on the pain points, the research domains, and the work ahead, here's the team:

| Role | Construct | Focus | Why |
|------|-----------|-------|-----|
| **Lead / Architect** | Bridgebuilder | Orchestration, quality gates, progressive disclosure design | The mentor who coordinates. Embodies ARCHETYPE.md — every decision is a teachable moment. |
| **Template Craftsman** | Artisan | Template UX/DX, file structure, visual polish of CLI output | The aesthete who makes the template FEEL right. Not just correct — delightful. |
| **Research Engine** | Deep Research | Domain discovery, source synthesis, pattern extraction | Grounds every decision in real-world patterns. 192 sources and counting. |
| **Frontend Specialist** | Artisan (extended) | construct-artisan remediation, ALEXANDER.md narrative, taste system | Direct response to the conversation — help the incoming dev with frontend using the construct. |
| **DX Engineer** | Protocol (adapted) | CI gates, schema validation, install path, publishing pipeline | The quality gate engineer. Makes sure placeholder text never ships. |

### Agent Team Structure

```
Lead: Bridgebuilder (orchestration + quality)
  |
  +-- Artisan Agent (template UX + artisan remediation)
  |     Focus: SKILL.md guidance, CLAUDE.md template, ALEXANDER.md narrative
  |     Output: Updated construct-template, updated construct-artisan
  |
  +-- DX Agent (infrastructure + gates)
  |     Focus: CI pipeline, schema enforcement, install path, publishing
  |     Output: Updated validate.yml, new publish gate, install docs
  |
  +-- Research Agent (continuous grounding)
        Focus: Deep research pipeline, pattern synthesis, gap identification
        Output: Research documents in grimoires/loa/constructs/research/
```

---

## 6. Execution Phases

### Phase 1: Foundation (Complete)

- [x] Install construct-deep-research
- [x] Run discovery phase (192 sources, 8 domains)
- [x] Run full deep research (6 topics, synthesis produced)
- [x] Create team with TeamCreate (escape-velocity team)
- [x] Artisan: ALEXANDER.md narrative identity (already on main — v1.1.0)
- [x] Template: Two worked SKILL.md examples (simple + full)
- [x] Template: CLAUDE.md filled with Code Review Assistant identity
- [x] Template: 3-level graduated CI with security hardening
- [x] Template: JSON Schema for construct.yaml
- [x] GPT review: Artisan PR APPROVED, Template PR CHANGES_REQUIRED → fixed → merged
- [x] Bridgebuilder review: All 3 targets reviewed (artisan, template, strategy doc)
- [x] Strategy doc: Addressed gecko-strategy feedback (TL;DR, ARCHETYPE.md mapping, grounding claims)

### Phase 2: Progressive Disclosure (Next)

- [ ] Template: Implement graduated CI gates
- [ ] Template: Create Level 0/1/2 paths in README
- [ ] Artisan: Update quick_start to taste -> inscribe -> iterate flow
- [ ] Explorer: Add construct pairing suggestions
- [ ] CLI: First-run Bridgebuilder voice

### Phase 3: Ecosystem (Following)

- [ ] Publishing pipeline with quality gates
- [ ] Construct pairing recommendations engine
- [ ] Impact stories instead of install counts
- [ ] Bridgebuilder-as-construct (installable review expertise)

---

## 7. Research Domains (Deep Research In Progress)

| Domain | Status | Key Question |
|--------|--------|-------------|
| Progressive Disclosure Mechanics | Complete | How do CLI tools detect user readiness and reveal features? |
| Game Design as DevEx | Complete | What game mechanics translate to developer tool UX? |
| Intentional Friction Design | Complete | Where does difficulty teach vs frustrate in dev tools? |
| Creator Ecosystem Zero-to-One | Complete | How did Roblox/Figma bootstrap from 0 to 100 creators? |
| Best-in-Class Template Design | Complete | What's the minimum viable template that ships in 5 minutes? |
| AI Agent Ecosystem Patterns | Complete | What construct-like patterns are emerging organically? |

Full research output: `grimoires/loa/constructs/research/`

---

## 8. The Bridgebuilder Voice for This Work

Every piece of this work follows the Bridgebuilder principles:

1. **Orient before acting.** We mapped the territory (research), assessed what exists (artisan audit, template audit), and identified the gaps before writing code.
2. **Teach the pattern, not just the fix.** The template remediation doesn't just fix TODOs — it teaches construct authoring through worked examples.
3. **Celebrate the real.** The "All Might" moment in the conversation is real. We're engineering more of those moments, not manufacturing fake ones.
4. **Name the trap.** Placeholder text that passes CI is a trap. We're closing it.
5. **Trust the builder.** Progressive disclosure means we trust authors to grow. Level 0 exists because not everyone needs Level 3 on day one.

---

---

## 9. Relationship to ARCHETYPE.md

This strategy inherits, extends, and defers specific patterns from `grimoires/bridgebuilder/ARCHETYPE.md`:

| ARCHETYPE.md Pattern | Section | This Strategy |
|---------------------|---------|---------------|
| **Human-Centered Metrics** (§4) | 7 metrics: Friction-to-Resolution, Flow State Duration, State Transformation, Construct Depth, Compound Effect, Builder Confidence, Behavioral Conviction | **Inherited wholesale.** These are the metrics for measuring escape velocity success. Not installs. Not stars. |
| **Progressive Disclosure / Leveling Model** (§3) | L0 Discovery → L5 Mastery, "You Are Here" indicator | **Extended.** Template Levels 0-3 (Section 4) are the construct-authoring specialization of the network-wide L0-L5. |
| **Golden Path State Detection** (§3) | `golden_path.detect_state` YAML schema, porcelain → truename routing | **Deferred.** Template Level 2+ feature. The artisan PR noted this gap — `golden_path` stanza needed in construct.yaml but not blocking for initial authoring. |
| **Drift Detection** (§8 Q2) | "You've been in this rabbit hole for 40 minutes" | **Deferred.** Requires runtime integration (loa-finn Layer 3). Acknowledged as valuable but out of scope for template/construct remediation. |
| **Health Awareness** (§8) | Session duration monitoring, flow state protection | **Deferred.** Same as drift detection — runtime concern, not authoring concern. |
| **Workflow Depth / Construct-Owned Gates** (§3) | `workflow.depth`, `workflow.gates` declarations | **Inherited.** The graduated CI (L0/L1/L2) is the template-authoring equivalent. Constructs with declared gates own their quality process. |
| **Creator Journey** (§3) | CONSUME → COMPOSE → CREATE → CONTRIBUTE | **Extended.** This strategy focuses on the CREATE → CONTRIBUTE transition — making it possible for new authors to reach that stage. |

### Known Gaps from Research

The deep research synthesis identified 7 knowledge gaps. Status:

| Gap | Status | Reasoning |
|-----|--------|-----------|
| Quantifying flow state / pattern recognition fun | **Deferred** | Requires instrumentation not yet built. ARCHETYPE.md §4 metrics are the proxy. |
| Advanced AI agent composition | **Deferred** | Level 3+ concern. Current focus is Level 0-1 authoring. |
| Monetization for construct authors | **Out of scope** | NowPayments integration planned but separate from authoring DX. |
| Scalability of Bridgebuilder mentorship | **Active concern** | This is the core tension. Bridgebuilder-as-construct (Section 6 Phase 3) is the proposed answer — make the review expertise installable. |
| Security in shared agent configs | **Partially addressed** | Path traversal protection in CI, pinned dependencies. Full threat model is a separate workstream. |
| User segmentation for progressive disclosure | **Partially addressed** | Template Levels 0-3 are a rough segmentation. Finer-grained detection requires runtime signals. |
| Construct identity versioning | **Deferred** | ALEXANDER.md v1.1.0 already versions. Schema-level versioning is a registry concern. |

---

## 10. Grounding Claims

### "5 Minutes to Ship" — Status: Grounded

Timed against the merged template (v1.0.0): **69 seconds** from `gh repo create --template` to pushed construct with custom identity, custom skill, and CI validation.

Breakdown:
- Clone from template: 6 seconds
- Edit `construct.yaml` (name, slug, description, author, repo URL): ~15 seconds
- Write `SKILL.md` (custom perf profiler skill, 35 lines): ~30 seconds
- Write `CLAUDE.md` (custom identity, 30 lines): ~15 seconds
- Commit + push: 3 seconds

The bottleneck is the creative work — writing the skill instructions and identity. That's intentional. The template removes all structural friction (no boilerplate to figure out, no config to debug, examples to read and replace) so the author spends 100% of their time on the thing that matters: articulating their expertise.

**"5 minutes" is conservative.** The structural path is ~1 minute. A thoughtful author spending 5 minutes is spending 4 of those minutes on the creative work of naming their expertise — which is exactly where time should be spent.

### Research Agent Role — Termination Signal

The "Research Agent (continuous grounding)" in Section 5 has completed its initial mandate: 192 sources discovered, 6 deep reports generated, synthesis produced. Its role transforms:

- **Initial phase** (complete): Discovery + deep research across 6 domains
- **Ongoing phase**: Triggered by specific questions during implementation, not continuous polling
- **Termination**: When the strategy moves from planning to execution, research becomes on-demand, not autonomous

---

*"The best construct doesn't help you do something — it helps you SEE something. The perceptual shift is the power transfer."*
