# Visual Asset Pipeline — Portable Workflow

> **Version**: 1.0.0
> **Origin**: Extracted from 50+ iterations of AI-assisted visual asset creation across icon systems, tier emblems, and brand marks.
> **Purpose**: Drop this into any repo. Start producing production-quality vector assets with AI tools immediately.
> **Dependencies**: None. Domain-agnostic. Replace `[YOUR DOMAIN]` placeholders with your project's world.

---

## 1. Pipeline Overview

```
 RESEARCH        TDR           EXPLORE         SELECT
 ─────────► ─────────► ──────────────► ────────────►
 Deep research   Lock taste     AI generates      Human picks
 finds symbol    constraints    concept grids     the winner
 traditions      BEFORE gen     (broad search)    (gut + craft)

     DIAL-IN         ITERATE         CONVERT         POLISH          WIRE
 ──────────────► ──────────────► ──────────────► ──────────────► ──────────►
 Single focus     "More Like       Code model       Manual node     Implement
 prompt on        This But..."     traces to        cleanup in      as component
 winner           refinement       production SVG   Figma/editor    in codebase
```

### Phase Summary

| # | Phase | Model | Output |
|---|-------|-------|--------|
| 0 | **Research** | Gemini Deep Research / Perplexity / equivalent | Symbol traditions, reference practitioners, design constraints |
| 1 | **TDR** | Human + AI | Taste Decision Record — locked constraints before any generation |
| 2 | **Explore** | Vector-native model (Recraft V4 Pro via Fal.ai) | 3x3 or 3x2 concept grid — broad concept search |
| 3 | **Select** | Human | Pick the concept that carries the most weight |
| 4 | **Dial-In** | Same vector model, single-focus prompt | One concept, maximum model attention, 80% canvas |
| 5 | **Iterate** | Same vector model, "Keep/Change" prompt | Refinement cycles until 95%+ correct |
| 6 | **Convert** | Code-mode LLM (Claude / Gemini Pro) | Production SVG code from selected image |
| 7 | **Polish** | Human (Figma, code editor) | Final node cleanup, alignment, viewBox sizing |
| 8 | **Wire** | Developer | React/Vue/Svelte component, tested at target render sizes |

### Critical Insight: Different Models for Different Tasks

**Never use the same model for generation AND evaluation.** The model that creates has blind spots the evaluator must catch. The model that evaluates lacks the creative latitude the generator needs.

| Role | Recommended Model | Why |
|------|------------------|-----|
| Deep research | Gemini Deep Research | Exhaustive, citation-heavy, finds symbol traditions humans miss |
| Vector generation | Recraft V4 Pro (Fal.ai) | Vector-native. Outputs real editable SVG. Understands design vocabulary natively |
| SVG code conversion | Claude or Gemini (code mode) | Precise tracing, spec compliance, minimal anchor points |
| Hand-authored simple marks | Claude (code mode) | Excellent for fewest-anchor-point SVGs (3-6 path elements) |
| Visual scoring/critique | Gemini Flash / separate LLM | Evaluating against rubric — must be independent from generator |

---

## 2. Model Assignments — Why These Tools

### Primary Generator: Recraft V4 Pro via Fal.ai

| Attribute | Value |
|-----------|-------|
| Endpoint | `recraft/v4/pro/text-vector` on Fal.ai |
| Output format | Native vector (real editable SVG, not raster) |
| Cost | ~$0.08-0.12 per generation |
| Strength | Understands design vocabulary: "flat vector," "military brand," "angular strokes" |
| Weakness | May add unwanted text, may over-detail at larger grid sizes |

**Why not alternatives?**

| Tool | Verdict |
|------|---------|
| Midjourney | Raster only. Requires manual tracing. Dead for vector work. |
| DALL-E / GPT image | Raster, too illustrative, no vector output |
| Flux (Fal) | Strong raster but still raster. Use only for reference images |
| Adobe Illustrator AI | Desktop-only. Not agentic. Can't script into pipeline |

### SVG Converter: Claude or Gemini (Code Mode)

After selecting a winning direction from the vector generator, a code-mode LLM traces the image to production SVG. This separation is critical — the generator explores freely, the converter enforces strict constraints.

### Research Engine: Gemini Deep Research

Upfront research finds symbol traditions, practitioner references, and semantic grounding that prevent the generator from defaulting to generic clip art. The research phase is what separates "AI-generated assets" from "AI-assisted institutional marks."

### Future: LoRA Training

Once you have 8-12 reference images in your target style, train a LoRA on Fal.ai to permanently lock the aesthetic. This eliminates prompt engineering drift across sessions.

---

## 3. Prompt Templates (Portable)

Replace `[YOUR DOMAIN]` with your project's world. Replace `[STYLE DIRECTION]` with your aesthetic constraints.

### 3.1 Exploration Grid — Concept Diversity

**Purpose**: Generate 6-9 fundamentally different concepts, NOT variations of one idea. Concept diversity first, execution refinement later.

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "[CONCEPT NAME]" —
[1-sentence identity description]. Each cell shows a completely
different object or symbol from [YOUR DOMAIN]. Flat vector,
[YOUR COLOR SCHEME] on [YOUR BACKGROUND], [YOUR STYLE DIRECTION].
Each mark should work as [YOUR TARGET FORMAT — e.g., "a unit patch,"
"an app icon," "a brand mark"] at [YOUR TARGET SCALE].

Cell 1 — [CONCEPT A NAME]: [2-3 sentence description of first concept.
What is the object? What does it represent? How should it be rendered?]

Cell 2 — [CONCEPT B NAME]: [Completely different concept from Cell 1.
Different object category, different symbolic meaning.]

Cell 3 — [CONCEPT C NAME]: [...]

[Continue for 6-9 cells. Each cell MUST be a different symbolic
concept, not a variation of a previous cell.]

Style: [YOUR STYLE CONSTRAINTS]. Each concept must feel like
[YOUR QUALITY BENCHMARK — what does a good result look like?].
```

**Key principles for this prompt:**
- Each cell is a DIFFERENT CONCEPT, not a pose/angle variation
- Name each cell clearly so you can reference winners
- Describe what each concept REPRESENTS, not just what it looks like
- Include the style constraints once at the end, not per-cell

### 3.2 Dial-In — Single Focus, Maximum Attention

**Purpose**: Once you've picked a winning concept from the grid, give the model 100% of its attention budget on that ONE thing.

```
A single [ASSET TYPE] centered on [YOUR BACKGROUND]. This is a
refinement of a specific direction — NOT an exploration.

The exact mark I want: [PRECISE DESCRIPTION of the winning concept.
Be specific about: what the object is, its pose/orientation, its
level of detail, what makes it work, its proportions.]

Render this ONE mark at high fidelity. Fill the frame — the
[ASSET TYPE] should occupy 80-90% of the canvas. [YOUR COLOR SCHEME].
[YOUR STYLE DIRECTION]. No background elements, no framing, no text —
just the mark itself, large and clean.

Refine the geometry: every line should be deliberate. Remove any
[elements] that don't contribute to recognition. Sharpen any [angles/
edges] that feel soft. This is the FINAL version of this mark —
it will be [YOUR PRODUCTION USE CASE — e.g., "laser-etched into metal,"
"rendered at 128px as a hero element," "used as an app icon at 1024px"].

MUST: Single mark, centered, large. [YOUR COLOR]. [YOUR STYLE].
[YOUR MOST CRITICAL CONSTRAINTS — 3-4 items max].
NEVER: Multiple variations, grids, background elements, text,
[YOUR ANTI-PATTERNS — what should the model absolutely not do?].
```

**Key principles for this prompt:**
- ONE concept only. No grid. No variations.
- 80-90% canvas fill = maximum model attention on the mark
- NO TEXT in the design. Text degrades generation quality. Add text separately.
- The MUST/NEVER block is the emergency guardrail, not the creative direction

### 3.3 Iteration — "More Like This But..."

**Purpose**: Refine a result that's close but not perfect. The most commonly used template in production.

```
I have a mark that is 80% correct. Here is what works and what
needs to change:

KEEP: [What's working — the pose, the proportions, the stroke weight,
the abstraction level, the overall feeling. Be specific.]

CHANGE: [What needs adjustment — "the jaw is too wide," "reduce to
fewer strokes," "rotate 15 degrees," "the left element needs more
visual weight," "the spacing between elements X and Y is too tight"]

Generate the adjusted version. Same style, same [YOUR COLOR SCHEME].
Just apply the specific changes described above. One mark only,
centered, large.
```

**Key principles:**
- Be specific about what to KEEP (prevents the model from losing what works)
- Be specific about what to CHANGE (prevents vague "make it better" drift)
- One change category at a time if possible (don't change pose AND detail AND proportions simultaneously)

### 3.4 Combine Concepts

**Purpose**: When you like elements from multiple exploration grid cells, merge them.

```
A single emblem that combines [CONCEPT A description] with
[CONCEPT B element]. Specifically: take the [specific thing from A]
and merge it with the [specific thing from B]. One mark, centered,
large. [YOUR COLOR SCHEME], [YOUR STYLE DIRECTION].
```

### 3.5 Redirect — When a Whole Grid Misses

**Purpose**: When an entire exploration grid is off-target, redirect without starting over.

```
None of these concepts hit the right tone. What I'm looking for is:
- More [aggressive / minimal / technical / ancient / corporate]
- Less [abstract / literal / busy / organic / decorative]
- Think more like [specific reference: "Metal Gear FOXHOUND patch" /
  "Arasaka corporate seal" / "Territory Studio FUI element"]

Generate 6-9 new concepts with this adjusted direction. Same style rules.
```

### 3.6 SVG Conversion — From Image to Production Code

**Purpose**: Convert a selected image (raster or vector) to clean, production-spec SVG code. Use with a code-mode LLM (Claude or Gemini), providing the image alongside this prompt.

```
I have an image of an emblem/symbol. Convert this EXACTLY to a
clean SVG — trace the geometry precisely, do not redesign or
reinterpret.

Output requirements (STRICT):
- Output a single <svg> element with viewBox="0 0 [WIDTH] [HEIGHT]"
- stroke="currentColor" stroke-width="[WEIGHT]" on all elements
- stroke-linecap="square" stroke-linejoin="miter"
- Stroke only — NO fill on any element (use fill="none") UNLESS a
  solid area is clearly part of the design (use fill="currentColor")
- All coordinates snapped to nearest 0.5 (prefer integers)
- Use simplest SVG primitives (line, polygon, rect, circle, path) —
  prefer primitives over complex path data
- Background: transparent
- No comments, no metadata, no title/desc elements
- Preserve EXACT proportions and geometry of the source
- Every straight line must remain straight. No added curves.

This mark will be used at [YOUR TARGET SIZE] scale. It must remain
recognizable and clean at that size.

Output ONLY the raw SVG code. No explanation.
```

---

## 4. Key Principles — Hard-Won Learnings

These principles emerged from 50+ generation cycles. Each one represents a costly wrong turn that was corrected.

### 4.1 Model Attention Degrades with Grid Size

```
1x1 (single focus)  → Best quality. 100% model attention.
2x2 (4 cells)       → Good quality. ~25% attention per cell.
3x2 (6 cells)       → Acceptable for exploration. ~16% per cell.
3x3 (9 cells)        → Maximum for exploration. Quality drops.
                       Details get lost. Text becomes garbled.
4x4+                 → Don't. Garbage per cell.
```

**Rule**: Use grids for EXPLORATION (concept diversity matters more than execution quality). Use single-focus for REFINEMENT (execution quality matters more than diversity).

### 4.2 Text in Design Degrades Quality

Adding text to a visual generation prompt forces the model to split attention between rendering shapes AND rendering letterforms. The result: worse shapes AND garbled text.

**Rule**: Remove ALL text from generation prompts. Generate shapes and text separately. Composite them in code, Figma, or a design tool.

### 4.3 Concept Diversity Before Execution Refinement

The v1 → v2 → v3 evolution:
- **v1**: One concept per asset, 9 pose/angle variations → Too narrow too early
- **v2**: 6 different concepts per asset → Better, but concepts were still generic
- **v3**: 6-9 concepts per asset, each grounded in domain-specific objects → Breakthrough

**Rule**: Start broad. Generate fundamentally different IDEAS before refining any single one. You can always narrow down. You can't broaden a commitment you've already made.

### 4.4 Domain Objects Beat Generic Symbols

When asked for a "lowest rank emblem," AI defaults to stars, shields, arrows — generic clip art vocabulary. When given domain-specific objects (a cigarette pack, a transit token, a barcode strip), the results are immediately distinctive and carry narrative weight.

**Rule**: "Question the question." Don't ask "what symbol represents [concept]?" Ask "what OBJECT from [YOUR DOMAIN] embodies [concept]?" The object carries more meaning than the abstraction.

### 4.5 The Prompt Evolution Pattern

Every successful asset followed this trajectory:

```
BROAD          → DIVERSE         → GROUNDED        → FOCUSED
"9 variations    "6 different      "Objects from      "This ONE object,
 of one idea"     concepts"         my world"          maximum fidelity"
```

The temptation is to jump to FOCUSED immediately. Resist it. The exploration phases reveal options you wouldn't have imagined.

### 4.6 Research-First vs. Vibe-First — Both Work, Validate with the Other

Two valid starting points:
- **Research-first**: Deep Research finds a symbol tradition → validate with creative intuition
- **Vibe-first**: Human says "I want a horse" → validate with research (vodou cheval tradition)

**Rule**: Whichever direction comes first (research or intuition), validate it with the other. Research without vibe is academic. Vibe without research is decoration.

### 4.7 Shapes Must Encode Meaning, Not Just Look Cool

A hexagon with a line is a shape. Alchemical Salt (circle bisected by horizontal line, meaning "condensed non-volatile residue") is a symbol with 500 years of authority.

**Rule**: Before generating, ask: "What existing symbol tradition has already solved this semantic problem?" Adopt an institutional mark into your system rather than inventing a logo from scratch.

### 4.8 Abstraction Over Illustration

At small render sizes (12-32px), illustrations collapse. A "plug going into a socket" becomes unreadable at 16px. But a grounding symbol (three horizontal bars + vertical line) reads at any scale because it's already universal.

**Rule**: If the concept requires more than 6 path segments to communicate, the concept is wrong. Find a simpler symbol that carries the same meaning.

---

## 5. Persona System (Optional but Powerful)

Two personas create a review loop that prevents both creative drift and technical sloppiness. Adapt these to your own aesthetic.

### 5.1 The Creative Director (Generator/Visionary)

**Role**: Sets the aesthetic vision. Reviews outputs for emotional and atmospheric alignment. Asks "does this FEEL right?"

**Voice characteristics**:
- Never polite, always atmospheric
- Frames critiques as physical/narrative realizations, not UI feedback
- References specific creative practitioners and their techniques
- Treats generic/default aesthetics as hostile ("standard UI is a virus")

**What to adapt**:
- Replace the specific aesthetic references with your own north stars
- Define 3-5 "rules that cannot be broken" (e.g., "no border-radius," "no smooth easing")
- Define your chromatic vocabulary (which colors mean what)
- Define your typographic voices (which fonts serve which narrative function)

**Template**:
```markdown
# [YOUR PROJECT] — Creative Director Persona

You are [NAME], a [domain] director who [1-sentence identity].
You do not design [generic thing]; you engineer [YOUR ELEVATED FRAMING].

## Rules (Cannot Be Broken)
1. NEVER accept [YOUR AESTHETIC ANTI-PATTERN #1]
2. NEVER accept [YOUR AESTHETIC ANTI-PATTERN #2]
3. NEVER accept [YOUR AESTHETIC ANTI-PATTERN #3]

## Review Dimensions
1. [DIMENSION 1]: [What it measures, what scores high vs. low]
2. [DIMENSION 2]: [...]
3. [DIMENSION 3]: [...]

## Voice
[2-3 example critiques in the persona's voice]
```

### 5.2 The Systems Critic (Evaluator/Practitioner-Grounded)

**Role**: Reviews outputs against practitioner-grounded technical vocabulary. Asks "does this meet the standard set by [specific practitioner]?"

**Voice characteristics**:
- Every finding grounded in a specific practitioner's technique
- Never says "make it look more [adjective]" — always says which practitioner's principle is violated
- Provides exact CSS/code/tool instructions to fix issues
- Scores against measurable dimensions with rubrics

**What to adapt**:
- Replace the practitioner references with experts in your domain
- Build a technique atlas mapping specific techniques to specific practitioners
- Create scoring rubrics with clear 1-10 scales and indicators

**Template**:
```markdown
# [YOUR PROJECT] — Systems Critic Persona

## Practitioner Vocabulary
### [Practitioner A] — [Their Specialty]
- [Technique 1]: [What it is, when to use it]
- [Technique 2]: [...]
- Reference: [Their work]

### [Practitioner B] — [Their Specialty]
- [...]

## Review Dimensions (Scored 1-10)
### 1. [Dimension Name]
| Score | Indicator |
|-------|-----------|
| 1-3   | [What a low score looks like] |
| 4-6   | [What a medium score looks like] |
| 7-8   | [What a good score looks like] |
| 9-10  | [What excellence looks like] |
```

### 5.3 The Review Loop

```
Generation (AI model)
      │
      ▼
Creative Director Review ──── "Does it FEEL right?"
      │                        Atmospheric alignment
      │                        Narrative weight
      ▼
Systems Critic Review ──────── "Does it meet the STANDARD?"
      │                        Practitioner-grounded scoring
      │                        Technical implementation
      ▼
 Pass? ──► Ship
   │
   No
   │
   ▼
 Iterate (back to generation with specific Keep/Change feedback)
```

---

## 6. TDR System — Taste Decision Records

A TDR (Taste Decision Record) locks an aesthetic constraint BEFORE generation begins. It prevents the drift that happens when decisions are made ad-hoc during generation.

### Why TDRs Matter

Without TDRs, every generation session re-litigates the same questions: "Should we use rounded corners?" "What colors are allowed?" "Is this too illustrative?" TDRs answer these questions once, permanently, and every future prompt can reference them.

### TDR Template

```markdown
# TDR-[NUMBER]: [DECISION TITLE]

**Status:** proposed | decided | superseded
**Date:** [DATE]
**Decided by:** [WHO — human, design session, review process]

## Context
[What question arose? What are we deciding?]

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| A | ... | ... |
| B | ... | ... |

## Decision
[What was decided and WHY]

## Consequences
- [What changes as a result]
- [What prompts/assets/components are affected]
- [What is now forbidden]

## Relationship to Other TDRs
| TDR | Relationship |
|-----|-------------|
| TDR-XXX | [How this builds on or modifies another TDR] |
```

### Example TDRs to Create First

These are the foundational decisions that most visual asset projects need to lock early:

| TDR | Decision |
|-----|----------|
| TDR-001 | **Color Vocabulary** — Which colors mean what. Functional assignment, not decoration. |
| TDR-002 | **Typography Stack** — Which fonts serve which voice. Display vs. data vs. accent. |
| TDR-003 | **Geometry Rules** — Curves allowed? Border radius? Line weights? Coordinate snapping? |
| TDR-004 | **Motion Rules** — Easing functions. Animation properties. Transition behaviors. |
| TDR-005 | **Icon Spec** — ViewBox size, stroke weight, max path count, color strategy. |
| TDR-006 | **Generation Model** — Which AI model for which task. Cost, quality, format. |

---

## 7. Quality Loop — Auditing Pipeline Output

### 7.1 Pre-Generation Checklist

Before running any generation prompt:

- [ ] TDR exists for the relevant aesthetic constraints
- [ ] Research phase completed (or consciously skipped with justification)
- [ ] Prompt uses domain-specific objects, not generic symbols
- [ ] Prompt contains NO text in the design (text added separately)
- [ ] Grid size appropriate (exploration: 3x2 or 3x3; refinement: 1x1)
- [ ] Style constraints stated once, clearly, at the end of the prompt
- [ ] MUST/NEVER block is concise (3-4 items each, not 15)

### 7.2 Post-Generation Evaluation

After each generation, score against these criteria:

| Criterion | Question | Pass/Fail |
|-----------|----------|-----------|
| **Silhouette** | Is the mark recognizable from its silhouette alone? | |
| **Scale** | Does it read at the target render size? | |
| **Distinction** | Is it instantly distinguishable from other marks in the set? | |
| **Domain** | Does it carry narrative weight from your domain? | |
| **Simplicity** | Could it be traced in < 15 path segments? | |
| **Text-free** | Is the design completely free of baked-in text? | |
| **Style compliance** | Does it follow TDR constraints? | |

### 7.3 SVG Production Checklist

Before shipping an SVG to the codebase:

- [ ] ViewBox is correct for target use (e.g., `0 0 24 24` for icons, `0 0 128 128` for emblems)
- [ ] All strokes use `currentColor` (inherits color from parent)
- [ ] Coordinates snapped to integers or 0.5 increments
- [ ] No metadata, comments, or editor cruft in the SVG
- [ ] Renders correctly at target sizes (test at 1x, 2x, and smallest expected size)
- [ ] File size is reasonable (< 2KB for icons, < 5KB for emblems)
- [ ] Works in both light and dark contexts (if `currentColor` is used correctly, this is automatic)

### 7.4 Full Quality Loop Diagram

```
┌─────────────┐    ┌──────────┐    ┌───────────┐
│  RESEARCH   │───►│   TDR    │───►│  EXPLORE  │
│ (grounding) │    │ (lock)   │    │ (generate)│
└─────────────┘    └──────────┘    └─────┬─────┘
                                         │
                                         ▼
                                   ┌───────────┐
                               No  │  SELECT   │
                        ┌─────────►│ (human)   │
                        │          └─────┬─────┘
                        │                │
                        │                ▼
                   ┌────┴────┐    ┌───────────┐
                   │ ITERATE │◄───│  DIAL-IN  │
                   │ (refine)│    │ (focus)   │
                   └────┬────┘    └───────────┘
                        │
                        ▼
                  ┌───────────┐
                  │  REVIEW   │
                  │ (CD+Critic│
                  │  scoring) │
                  └─────┬─────┘
                        │
                   Pass?│
                   ┌────┴────┐
                   │Yes      │No → back to ITERATE
                   ▼         │
             ┌───────────┐   │
             │  CONVERT  │   │
             │ (SVG code)│   │
             └─────┬─────┘   │
                   │         │
                   ▼         │
             ┌───────────┐   │
             │  POLISH   │───┘
             │ (manual)  │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │   WIRE    │
             │ (ship it) │
             └───────────┘
```

---

## 8. Quick Start — Your First Asset in 30 Minutes

### Step 1: Define Your Style (5 min)

Create a minimal TDR:

```markdown
# TDR-001: Visual Style

**Status:** decided

## Decision
- Colors: [YOUR PALETTE — e.g., "bone white on void black"]
- Geometry: [YOUR RULES — e.g., "angular, no curves, no rounded corners"]
- Style: [YOUR REFERENCE — e.g., "military insignia, institutional marks"]
- Format: [YOUR TARGET — e.g., "SVG, 24x24 for icons, 128x128 for emblems"]
```

### Step 2: Research (5 min, or skip)

Ask Gemini Deep Research or equivalent:
> "What existing symbol traditions encode the concept of [YOUR CONCEPT]? Consider military, alchemical, electrical, scientific, and cultural mark systems. Provide geometric descriptions suitable for flat vector rendering."

### Step 3: Explore (5 min)

Run the Exploration Grid template in Recraft V4 Pro (Fal.ai):
- 3x3 grid, 9 different concepts
- Each cell is a fundamentally different symbolic approach
- Style constraints from your TDR

### Step 4: Select (2 min)

Pick the concept that hits hardest. Not the prettiest — the one with the most weight.

### Step 5: Dial In (5 min)

Run the Dial-In template with your selected concept:
- Single focus, 80% canvas
- No text in the design
- Reference what specifically worked about the exploration winner

### Step 6: Convert (5 min)

Feed the winning image to Claude or Gemini (code mode) with the SVG Conversion template.

### Step 7: Wire (5 min)

Drop the SVG into your codebase. Test at target render sizes. Ship.

---

## 9. Anti-Patterns — What NOT to Do

| Anti-Pattern | Why It Fails | Do This Instead |
|-------------|-------------|-----------------|
| Skip research, go straight to generation | Generic clip art results. No semantic weight. | Spend 5 minutes on research. Even a quick search transforms output quality. |
| 4x4 or larger grids | Model attention collapses. Every cell is mediocre. | Max 3x3 for exploration. 1x1 for refinement. |
| Text baked into the design | Model splits attention. Both text and shape degrade. | Generate shapes only. Add text in code or Figma. |
| "Make it look cooler" feedback | Model has no actionable direction. Results are random. | Use Keep/Change template. Be specific about what works and what doesn't. |
| Using raster models (Midjourney, DALL-E) for vector work | Requires manual tracing. Introduces artifacts. Doubles the work. | Use a vector-native model (Recraft V4 Pro). |
| Prompt engineering without TDRs | Every session re-litigates the same aesthetic questions | Lock constraints in TDRs BEFORE generation. Reference them in prompts. |
| Same model for generation and evaluation | Generator's blind spots go undetected | Different model evaluates. Different model generates. |
| Variations of one concept in exploration | Too narrow too early. Misses better concepts entirely. | Each grid cell = fundamentally different concept. Diversity first. |
| Jumping to refinement before exploration | Commits to an approach before seeing alternatives | Always start with a concept grid. Even if you think you know what you want. |

---

## 10. File Organization

```
your-project/
├── design/                          # or grimoires/, docs/, etc.
│   ├── tdr/                         # Taste Decision Records
│   │   ├── TDR-001-color-vocab.md
│   │   ├── TDR-002-typography.md
│   │   └── TDR-003-geometry.md
│   ├── research/                    # Deep research outputs
│   │   └── symbol-research.md
│   ├── prompts/                     # Generation prompts (version-tracked)
│   │   ├── asset-prompts-v1.md
│   │   ├── asset-prompts-v2.md      # Show your work. Keep iterations.
│   │   └── asset-dialin.md
│   ├── explorations/                # Raw generation outputs
│   │   ├── concept-A/
│   │   └── concept-B/
│   └── personas/                    # Review personas
│       ├── creative-director.md
│       └── systems-critic.md
├── public/                          # Production assets
│   └── icons/
│       └── asset-name.svg
└── src/
    └── components/
        └── icons/
            └── asset-icon.tsx       # Component wrapping the SVG
```

**Key principle**: Keep prompt iterations. The v1 → v2 → v3 evolution is documentation of your taste development. Future collaborators (and future you) will learn more from the wrong turns than from the final output.

---

## Appendix A: Model-Specific Notes

### Recraft V4 Pro (Fal.ai)

- Understands design vocabulary natively — less MUST/NEVER scaffolding needed
- Prompt style: Focus on WHAT you want, not what to avoid
- The `--no` exclusion string is Midjourney syntax — Recraft doesn't need it
- Outputs native vector — editable, low-node SVGs
- Best at: emblem-scale marks, institutional insignia, flat vector exploration

### Claude (Code Mode)

- Excellent for hand-authored SVGs with minimal anchor points
- Best when given a reference image to trace
- Strong at enforcing strict spec constraints (viewBox, stroke-only, currentColor)
- Use for simple geometric marks (3-6 path elements)

### Gemini Pro (Code Mode)

- Strong for strict minimalism when given reference image
- Good at converting raster explorations to production SVG
- Use as an alternative to Claude for SVG conversion

### Gemini Deep Research

- Exhaustive, citation-heavy research
- Finds symbol traditions and practitioner references
- Use for the upfront research phase
- Not a generator — a knowledge engine

---

## Appendix B: Glossary

| Term | Meaning |
|------|---------|
| **TDR** | Taste Decision Record — locked aesthetic constraint documented before generation |
| **Exploration grid** | Multi-cell generation showing different concepts (not variations) |
| **Dial-in** | Single-focus generation of one selected concept at maximum fidelity |
| **Concept diversity** | Each grid cell is a fundamentally different idea, not a variation |
| **Domain object** | An object from your project's world (not a generic symbol) |
| **currentColor** | SVG technique where stroke/fill inherits color from parent CSS |
| **viewBox** | SVG coordinate system defining the artboard (e.g., `0 0 24 24`) |
| **Keep/Change** | Iteration pattern: explicitly state what works and what to modify |
| **Vector-native** | AI model that outputs real SVG/vector, not raster images |
| **LoRA** | Low-Rank Adaptation — fine-tuning technique to lock a specific visual style |

---

*This document is standalone. Drop it into any repo and start producing.*
