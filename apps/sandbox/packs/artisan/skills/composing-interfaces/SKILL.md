---
name: composing-interfaces
description: Design philosophy and interface composition grounded in perceptual science
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Composing Interfaces

Design philosophy and interface composition grounded in perceptual science. This skill teaches **how to think** about UI composition — not specific values, but the reasoning process behind decisions that make interfaces feel cohesive, readable, and intentional.

Every principle here is backed by established research in perception, cognition, and information theory. These are not opinions — they are observable properties of how human visual systems process interfaces.

## Trigger

```
/compose                        ← loads aesthetic profile (or runs interview if none exists)
/compose --profile <name>       ← loads a specific named profile variant
/compose --update               ← re-run interview to update existing profile
```

**On invocation:** Check for `grimoires/aesthetic-profile.yaml`. If found, load it and confirm with the user. If not found, run the guided interview (Phase 1b) to create one. All subsequent component generation derives from the loaded profile.

## Overview

Use this skill when:

- Bootstrapping a design system for a new app
- Deciding how to structure layouts and component hierarchy
- Making components feel related without being identical
- Determining what to show vs. hide on a page
- Choosing where color, spacing, and emphasis belong
- Diagnosing why something "feels off" but you can't articulate why

## Quick Decision Tree

```
Is this a new project without an established design system?
└── YES → Start at Phase 1: Design System Bootstrap

Do you have a vague theme/vibe but can't articulate it precisely?
└── YES → Apply Phase 1b: Aesthetic DNA Profile (decompose into dimensions)

Does the app need a distinct identity/world beyond flat SaaS?
└── YES → Apply Phase 10: Environmental Theming (Material Language)

Does the page feel cluttered or overwhelming?
└── YES → Apply Phase 5: Progressive Disclosure + Phase 8: Viewport Budget

Do components on the same page feel disconnected?
└── YES → Apply Phase 3: Component Families (check for shared DNA)

Does everything look the same and nothing stands out?
└── YES → Apply Phase 7: Focus Items (Von Restorff)

Is there too much text visible at once?
└── YES → Apply Phase 5: Progressive Disclosure + Phase 9: Content Density

Are you unsure how big/small elements should be relative to each other?
└── YES → Apply Phase 2: Hierarchy Ratios (Weber-Fechner)

Need to handle a "no data" or "nothing here yet" state?
└── YES → Apply Phase 11: Empty States

Need to show content while data is loading?
└── YES → Apply Phase 12: Loading States
```

---

## Phase 1: Design System Bootstrap

### The Process: Outside-In, Big-to-Small, Iterative

**Scientific basis:** Brad Frost's Atomic Design methodology — build from atoms (tokens) to molecules (components) to organisms (sections) to templates (pages). This mirrors how human perception works: we perceive the whole first (Gestalt), then decompose into parts.

### Step sequence:

```
1. Brand Direction & References
   └── Gather visual references that capture the target vibe/theme
   └── Identify the emotional register (playful, tactical, minimal, etc.)

1b. Aesthetic DNA Profile (Phase 1b)
   └── Decompose vague direction into precise dimensional profile
   └── "Cyberpunk" → retro-futuristic, post-apocalyptic, mechanical, melancholic, weathered, cool
   └── Profile drives every subsequent token and component decision

2. Extract Design Tokens
   └── Fonts (typically one primary family for unity)
   └── Color palette (from references, not from a preset system)
   └── Animation timing presets (defined globally, used everywhere)

3. Build Large Layout Components First
   └── Section containers (header + subtext + content area)
   └── Navigation structures
   └── Page-level grid/flex patterns

4. Build Small Specific Components
   └── Buttons, cards, tags, badges, inputs
   └── Each inherits the token system from step 2

5. See the Result, Tweak, Iterate
   └── Taste is validated by looking, not by rules
   └── Adjust until the gestalt feels right
   └── This step cannot be skipped or automated
```

### Why big-to-small works

**Gestalt's Law of Pragnanz** — the brain organizes visual input into the simplest, most stable form possible. When you establish the large structures first, you create the perceptual scaffolding that all smaller components slot into. Building small components first and then trying to arrange them is like writing sentences before deciding what the paragraph is about.

### Key principle: One font family

Using a single font family across the entire interface creates **perceptual unity** (Gestalt's Law of Similarity). Typography variations should come from weight, size, case, and tracking — not from switching typefaces. Every additional font family introduces a new visual "voice" that the brain must reconcile.

### Key principle: Use the framework's design system for structural values

When using a utility framework like Tailwind, stay within its built-in scale for all structural values — text sizes (`text-xs`, `text-sm`, `text-base`, `text-lg`), spacing (`p-3`, `gap-4`, `mb-2`), tracking (`tracking-wider`, `tracking-widest`), font weights (`font-light`, `font-medium`), and breakpoints (`xl:`, `2xl:`).

```
USE the design system scale for:
├── Text sizing (text-xs through text-9xl)
├── Padding and margin (p-1 through p-12+)
├── Gap and spacing (gap-1 through gap-8+)
├── Letter spacing (tracking-tight through tracking-widest)
├── Font weights (font-light, font-normal, font-medium, font-bold)
├── Border radius (rounded-none through rounded-full)
└── Breakpoints (sm:, md:, lg:, xl:, 2xl:)

DO NOT hardcode pixel values for:
├── Font sizes (use text-sm not text-[13px])
├── Padding/margin (use p-3 not p-[12px])
├── Gaps (use gap-2 not gap-[8px])
└── Tracking (use tracking-wider not tracking-[0.06em])

ACCEPTABLE to use inline styles for:
├── Dynamic colors from props (color-mix, CSS variable interpolation)
├── Accent borders with dynamic colors
├── Unique shadow effects on focus items (Phase 7)
└── Anything that requires runtime prop values Tailwind can't handle
```

This keeps the design system consistent — all components align to the same spacing grid and type scale without drift. Hardcoded pixel values bypass the grid and create subtle inconsistencies that accumulate.

---

## Phase 1b: Aesthetic DNA Profile

### Scientific basis: Semantic Differential (Osgood, 1957) + Design Space Theory

**Semantic differential** measures meaning by rating concepts along bipolar scales (warm/cold, rough/smooth, heavy/light). Charles Osgood demonstrated that any concept — including visual aesthetics — can be precisely located in a multidimensional space using independent axes. A single label like "cyberpunk" collapses dozens of independent dimensions into one word, losing massive amounts of information.

### The problem: Vocabulary compression

When someone says "I want a cyberpunk theme," they're compressing a complex vision into one word. But "cyberpunk" contains at least 50 valid interpretations:

```
"Cyberpunk" could mean:
├── Blade Runner → neon-soaked, rainy, warm, noir, dense, decaying
├── Nier Automata → muted, mechanical, melancholic, sparse, post-apocalyptic
├── Cyberpunk 2077 → flashy, colorful, loud, maximalist, gritty
├── Ghost in the Shell → clean, cool, cerebral, minimal, sterile
├── Akira → chaotic, energetic, red-heavy, analog-tech, rebellious
│
These are all "cyberpunk" but share almost no visual properties.
A single theme label is not enough information to design from.
```

### The Aesthetic DNA Profile

Decompose any vague direction into **10 independent dimensions**. Each dimension is a spectrum, not a binary. The combination creates a unique fingerprint that's precise enough to derive material language, color palette, animation feel, and typography from.

### The 10 Dimensions

Walk through each dimension and place the target aesthetic on the spectrum:

```
DIMENSION 1: ERA — When does this world exist?
├─────────────────────────────────────────────────────────────────────┤
Ancient    Medieval    Victorian    Mid-century    Contemporary    Near-future    Far-future    Post-collapse
│
What this determines: typography style, decoration complexity, tech level of UI patterns


DIMENSION 2: TECHNOLOGY — What's the tech level?
├─────────────────────────────────────────────────────────────────────┤
Primitive    Analog    Mechanical    Digital    Cybernetic    Organic-tech    Post-digital
│
What this determines: interaction patterns, animation precision, border treatment


DIMENSION 3: CONDITION — Is the world new or worn?
├─────────────────────────────────────────────────────────────────────┤
Pristine    Polished    Lived-in    Weathered    Worn    Decaying    Ruined
│
What this determines: texture treatment, border roughness, shadow quality, noise levels


DIMENSION 4: TEMPERATURE — Warm or cool?
├─────────────────────────────────────────────────────────────────────┤
Frozen    Cool    Neutral    Warm    Hot
│
What this determines: color palette base, shadow tint, accent color direction


DIMENSION 5: WEIGHT — Heavy or light?
├─────────────────────────────────────────────────────────────────────┤
Weightless    Light    Balanced    Heavy    Monumental
│
What this determines: spring physics (mass parameter), shadow depth, border thickness, animation speed


DIMENSION 6: DENSITY — Minimal or rich?
├─────────────────────────────────────────────────────────────────────┤
Stark    Minimal    Balanced    Detailed    Ornate    Maximalist
│
What this determines: decoration level, atmospheric accents, texture complexity, information density


DIMENSION 7: MOVEMENT — How does the world move?
├─────────────────────────────────────────────────────────────────────┤
Static    Deliberate    Precise    Fluid    Rhythmic    Chaotic
│
What this determines: animation curves, transition timing, spring damping, interaction feel


DIMENSION 8: MOOD — What's the emotional register?
├─────────────────────────────────────────────────────────────────────┤
Melancholic    Contemplative    Calm    Neutral    Energetic    Playful    Aggressive
│
What this determines: animation speed, contrast levels, pacing of reveals, interaction intensity


DIMENSION 9: FORMALITY — How structured is it?
├─────────────────────────────────────────────────────────────────────┤
Rigid    Structured    Ordered    Relaxed    Organic    Freeform
│
What this determines: grid strictness, alignment patterns, border-radius, layout geometry


DIMENSION 10: LIGHT — How is the world lit?
├─────────────────────────────────────────────────────────────────────┤
Dark/Shadowed    Dim    Neutral    Bright    Glowing    Neon-lit
│
What this determines: background darkness, contrast ratio, glow effects, shadow direction
```

### How to use the profile

**Step 1: Rate each dimension** for the target aesthetic. Use the reference material (games, movies, apps, art) to ground the ratings — don't guess in the abstract.

**Step 2: Write the profile as a phrase.** Concatenate the key positions:

```
Example — Nier Automata:
Era: Far-future + Post-collapse
Technology: Mechanical + Digital
Condition: Weathered
Temperature: Warm (despite being mechanical — the beige creates warmth)
Weight: Balanced (not heavy, not light)
Density: Minimal
Movement: Precise + Fluid (mechanical precision but smooth continuity)
Mood: Melancholic + Contemplative
Formality: Structured
Light: Dim

Profile phrase: "A far-future post-collapse world with weathered mechanical-digital
technology. Warm despite its sterility. Minimal, structured, precisely fluid.
Melancholic and dim."

This profile is infinitely more useful than "cyberpunk."
```

```
Example — Blade Runner:
Era: Near-future
Technology: Analog + Digital (retro-future)
Condition: Decaying
Temperature: Warm (neon warmth against cold rain)
Weight: Heavy
Density: Dense + Detailed
Movement: Slow + Deliberate
Mood: Melancholic + Contemplative
Formality: Organic (nothing is neat)
Light: Dark + Neon-lit

Profile phrase: "A near-future decaying world with retro analog-digital technology.
Warm neon against cold surfaces. Heavy, dense, slow-moving. Melancholic noir
with organic disorder. Dark with neon punctuation."

Same "cyberpunk" label. Completely different design.
```

```
Example — Fortnite:
Era: Contemporary + Near-future
Technology: Digital
Condition: Pristine + Polished
Temperature: Neutral to Warm
Weight: Light
Density: Balanced to Detailed
Movement: Energetic + Playful
Mood: Playful + Aggressive
Formality: Relaxed
Light: Bright + Glowing

Profile phrase: "A polished contemporary-future world with clean digital technology.
Bright, lightweight, energetically playful. Relaxed structure with bold expression.
Everything glows and bounces."

Not cyberpunk at all — but equally precise.
```

### From profile to material language

Each dimension maps to specific design decisions:

```
Dimension → Design Decision:

Era + Technology       → Material type (Phase 10)
                         Far-future mechanical → Metal
                         Medieval primitive → Stone + Wood
                         Contemporary digital → Glass or Paper

Condition              → Texture treatment
                         Pristine → clean, no noise, sharp edges
                         Weathered → subtle noise, worn borders, muted contrast
                         Decaying → heavy texture, irregular borders, visible damage

Temperature            → Color palette base
                         Cool → blue-gray neutral spectrum
                         Warm → amber-beige neutral spectrum
                         Neutral → true gray spectrum

Weight                 → Spring physics + shadows
                         Light → low mass, subtle shadows, fast transitions
                         Heavy → high mass, deep shadows, slow transitions

Density                → Atmospheric accents + decoration
                         Minimal → no decoration, clean surfaces
                         Detailed → corner accents, texture overlays, divider treatments

Movement               → Animation curves
                         Precise → high stiffness, high damping, ease-out-expo
                         Fluid → medium stiffness, low damping, ease-in-out
                         Chaotic → variable timing, unpredictable easing

Mood                   → Contrast + pacing
                         Melancholic → low contrast, slow reveals, muted tones
                         Energetic → high contrast, fast reveals, bold accents

Formality              → Layout geometry
                         Rigid → strict grid, sharp corners, precise alignment
                         Organic → flowing layout, rounded shapes, natural spacing

Light                  → Background + glow effects
                         Dark → dark backgrounds, subtle light sources
                         Bright → light backgrounds, minimal shadow
                         Neon → dark bg + bright accent glows, bloom effects
```

### Reference decomposition workflow

When a user provides a reference (a game, movie, brand, or app they want to draw from), decompose it before designing:

```
User says: "I want it to feel like [reference]"

Step 1: Ask (or research) — What specific qualities of [reference] appeal to you?
        (The user may only want certain aspects, not the whole aesthetic)

Step 2: Rate the reference across all 10 dimensions

Step 3: Write the profile phrase

Step 4: Identify which dimensions are non-negotiable vs. flexible
        ("It MUST feel weathered and melancholic, but the weight and density are open")

Step 5: Derive material language from the profile (Phase 10)

Step 6: Derive behavioral properties from weight + movement + mood dimensions

Step 7: Validate coherence — do all derived properties tell the same story?
```

### Profile evolution

The profile is not permanent. As the design develops and is reviewed, dimensions may shift:

```
Initial profile:      "Dark, heavy, mechanical, melancholic"
After first review:   "Actually too heavy — lighten the weight, keep the mood"
Updated profile:      "Dark, balanced, mechanical, melancholic"
→ Reduce shadow depth, increase animation speed, keep muted palette

The profile is a living document that gets refined through iteration.
It gives you language to describe what changed and why.
```

### Aesthetic Profile: The complete input capture

The Aesthetic DNA dimensions above capture the *world*. But to generate actual UI components, the agent also needs **material specifications** and **effect observations** from the user. The Aesthetic Profile combines everything into one persistent file.

#### Guided interview flow

When a user invokes `/compose` for a new project (or no profile file exists), walk them through this interview. Help them — don't just dump questions. Suggest options based on their references.

```
PHASE A — References & Vibe (get the raw input)
├── "What game, film, app, or visual reference captures the feel you want?"
│   Accept: name, screenshots, mood boards, links
├── "What specifically about that reference appeals to you?"
│   (They may only want certain aspects — the lighting but not the layout)
└── "Any references for what you DON'T want?"
    (Anti-references are equally useful for narrowing the space)

PHASE B — Aesthetic DNA (10 dimensions)
├── Walk through each dimension using the reference as grounding
├── Don't ask all 10 as a list — cluster related ones:
│   ├── World: Era + Technology + Condition
│   ├── Feel: Temperature + Weight + Mood
│   ├── Structure: Density + Formality + Movement
│   └── Atmosphere: Light
├── Suggest positions based on the reference they named
│   "Cyber City Oedo 808 feels retro-futuristic, cybernetic, lived-in — sound right?"
└── Let the user adjust — their interpretation is the truth, not yours

PHASE C — Materials (the highest-signal input)
├── "If the main panels/containers were a physical material, what would they be?"
│   Suggest based on DNA: "Given the retro-future tech feel, maybe brushed steel
│   or matte composite? Or something else?"
├── "How does the surface interact with light?"
│   Options: emissive (glows), reflective (shines), matte (absorbs), backlit (lit from behind)
├── "Is there a secondary material for interactive elements?"
│   (Optional — buttons, inputs, modals might feel different from containers)
└── For each material, capture: noun + surface adjective + light behavior
    Example: "weathered brushed steel, matte with subtle grain, reflective"

PHASE D — Effects (what the user notices)
├── "Looking at your reference, what 2-3 visual effects stand out?"
│   Guide with examples:
│   ├── "Do panels seem to glow or emit light?"
│   ├── "Is there any texture/grain visible on surfaces?"
│   ├── "Do bright elements have halos or light bleed?"
│   ├── "Are there scan lines, grid lines, or overlay patterns?"
│   ├── "Does text glow or have any shadow treatment?"
│   └── "Is there vignetting (darker edges)?"
└── Capture as plain-language descriptions, not CSS

PHASE E — Palette (optional — can be derived)
├── If the user has specific colors from their reference, capture them
├── If not, derive from Temperature + reference material
└── Capture: dominant neutral, 1-2 accent colors, intensity level
```

#### Persistent storage format

Store the completed profile as YAML in the project's grimoire directory. This file persists across sessions — the agent loads it on return instead of re-interviewing.

**Storage path:** `grimoires/aesthetic-profile.yaml`

```yaml
# Aesthetic Profile
# Generated via /compose interview
# Last updated: YYYY-MM-DD

project: "App Name"

references:
  primary:
    name: "Cyber City Oedo 808"
    type: "anime"
    appeal: "Glowing control panels, muted color palette, retro-future tactical feel"
  anti_references:
    - "Generic flat SaaS — no atmosphere"
    - "Over-the-top neon cyberpunk — too loud"

aesthetic_dna:
  era: retro-futuristic
  technology: cybernetic
  condition: lived-in
  temperature: cool
  weight: medium
  density: medium
  movement: controlled
  mood: focused
  formality: tactical
  light: dim-neon
  profile_phrase: >
    A retro-futuristic lived-in world with cybernetic technology.
    Cool-toned, medium weight, controlled movement. Focused and tactical.
    Dim ambient lighting with neon-lit accent panels.

materials:
  primary:
    name: "brushed steel"
    surface: "matte with micro-texture"
    light_behavior: "reflective"
  secondary:
    name: "emissive glass display"
    surface: "smooth, backlit"
    light_behavior: "emissive"

effects:
  - "Panels glow from within and cast light outward"
  - "Subtle scan line overlay across all surfaces"
  - "Bright text has a soft halo around it"

palette:
  dominant_neutral: "#1a1c2e"
  accents:
    primary: "#2a8a9e"
    secondary: "#b8344a"
  intensity: "muted warm glow — saturated but softened through bleed"

# Updated after iteration — record what changed and why
revision_notes:
  - date: "YYYY-MM-DD"
    change: "Reduced weight from heavy to medium — shadows felt too dominant"
```

#### Load-on-return behavior

When `/compose` is invoked and a profile already exists:

```
AGENT BEHAVIOR ON SESSION START:

1. Check: does grimoires/aesthetic-profile.yaml exist?
   ├── YES → Load it. Confirm with user: "I found your aesthetic profile
   │         ([project name] — [profile phrase]). Working from this.
   │         Want to update anything before we start?"
   │   ├── User says "looks good" → proceed with loaded profile
   │   └── User says "update X" → modify the specific dimension/material,
   │         save the updated file, then proceed
   │
   └── NO  → Run the guided interview (Phase A–E above)
             Save the result to grimoires/aesthetic-profile.yaml

2. With profile loaded, ALL subsequent component generation uses it:
   ├── Material derivation pulls from materials.primary / .secondary
   ├── Effect decisions pull from effects list
   ├── Color decisions pull from palette
   ├── Intensity calibration pulls from aesthetic_dna.condition + .light
   └── Every CSS property traces back to the profile — nothing is guessed

3. When the user iterates ("make it less heavy," "warmer tones"):
   ├── Update the relevant dimension in the profile
   ├── Save the updated file with a revision note
   └── Re-derive affected CSS properties from the updated profile
```

#### Multiple profiles

Some projects may have multiple distinct aesthetics (e.g., a game with different zone themes, or an app with light/dark modes that go beyond color swaps). Store additional profiles as:

```
grimoires/aesthetic-profile.yaml          ← default / primary
grimoires/aesthetic-profiles/zone-a.yaml  ← variant
grimoires/aesthetic-profiles/zone-b.yaml  ← variant
```

The user specifies which profile to use: `/compose` loads the default, `/compose --profile zone-a` loads a variant.

---

## Phase 2: Hierarchy Ratios

### Scientific basis: Weber-Fechner Law

Ernst Weber (1834) and Gustav Fechner (1860) established that **perceived difference is proportional to the logarithm of the stimulus ratio**, not the absolute difference. A 2px size increase on a 12px label is noticeable. A 2px increase on a 72px heading is invisible.

### What this means for UI

The ratio between elements determines perceived hierarchy, not the absolute sizes.

```
Hierarchy Perception by Size Ratio:

< 1.5:1  → Elements feel like peers (same level)
  1.5:1  → Subtle hierarchy (subtext under a title)
  2:1    → Clear hierarchy (section header vs. body text)
  3:1    → Strong hierarchy (page title vs. labels)
  4:1+   → Dominant hierarchy (hero stat vs. supporting tags)
  6:1+   → Maximum separation (primary number vs. fine print)
```

### Decision tree: Choosing ratios

```
Is this the single most important number/element on the page?
└── YES → 6:1+ ratio against supporting text (hero treatment)

Is this a section title with body content below?
└── YES → 2:1 to 3:1 ratio (clear but not dominant)

Are these peer elements that should feel equal?
└── YES → Keep within 1.5:1 (same visual weight)

Is this a label describing an adjacent element?
└── YES → The label should be noticeably smaller — at least 1.5:1 below the element it describes
```

### Applied example

A stat card showing a score:
- The score number is the hero → largest element (e.g., 6x the tag size)
- The tag/label ("Total Score") → smallest visible text
- This 6:1 ratio creates unmistakable hierarchy — the eye goes to the number first, always

**Why this ratio works (Stevens' Power Law):** Stanley Stevens (1957) refined Weber-Fechner to show that perceived magnitude follows a power function. For visual area, the exponent is ~0.7 — meaning you need *more* than a linear increase in size to produce a proportional increase in perceived importance. A 2:1 ratio feels like a 1.6:1 perceived difference. This is why small ratio differences (1.2:1) feel negligible and you need to push to 3:1+ for clear hierarchy.

---

## Phase 3: Component Families

### Scientific basis: Just-Noticeable Difference (JND)

Ernst Weber's foundational finding: the smallest detectable difference between two stimuli is a constant proportion of the original stimulus (the Weber fraction). For visual properties like size, spacing, and border treatment, the JND is roughly **10-15%**.

### The family rule

Components within the same interface should share DNA — same spacing system, same border language, same animation curves, same color token system. Variety comes from **subtle changes in layout and minor accent shifts** — not from breaking the underlying system.

```
Component Family Spectrum:

0% variation   → Clone (same component reused — appropriate for identical purposes)
10-20% change  → Sibling (same family, different shape — appropriate for related but distinct content)
30-50% change  → Cousin (recognizably related but clearly different — different section, different purpose)
50%+ change    → Unrelated (different visual language — avoid within the same page)
```

### What to vary vs. what to keep constant

```
KEEP CONSTANT (family DNA):
├── Animation easing curves
├── Border radius values
├── Color token system
├── Spacing base unit
└── Typography scale

VARY FOR SIBLINGS (10-20%):
├── Layout direction (horizontal vs. vertical arrangement)
├── Which accent is applied (border-left vs. border-top)
├── Content density (stat+tag vs. stat+tag+subtitle)
└── Aspect ratio of the container

NEVER VARY WITHIN A PAGE:
├── Animation timing functions (all elements should move the same "way")
├── The spacing base unit itself
└── Border treatment language (if you use hairline borders, use them everywhere)
```

### Why this works: Gestalt's Law of Similarity

Elements sharing visual properties are perceived as belonging together. When your card components share spacing, border radius, animation, and typography but differ slightly in layout, the brain reads them as "same system, different content" — which is exactly right. If they share nothing, the brain reads them as unrelated, making the page feel fragmented.

### When to fork vs. extend

```
Has the user already built a mental model of this component?
(e.g., "stat cards look like THIS")
└── YES → Create a sibling, not a clone
         The user remembers "cards that look like X show stats"
         Reusing the exact same card for non-stat content confuses the mental model
         Instead: same family DNA, different layout/accent → "related but different purpose"

└── NO  → Reuse the existing component
          If no mental model exists yet, cloning is fine
```

**Cognitive science basis:** Schema theory (Bartlett, 1932) — users build mental schemas for interface elements. Reusing a component for a different purpose violates the schema. Creating a sibling preserves the schema category while signaling "this is a different item in the same category."

---

## Phase 4: Spacing and Density

### Scientific basis: Gestalt's Law of Proximity

Elements that are closer together are perceived as belonging to the same group. This is not a preference — it is a property of human visual processing (Wertheimer, 1923).

### The spacing hierarchy

Spacing must create clear grouping. Three levels of spacing create three levels of relationship:

```
Spacing Hierarchy:

Tight  (within a component)  → Elements inside a card, label next to a value
Medium (between siblings)    → Gap between cards in a grid, between list items
Wide   (between sections)    → Space between major page sections

Rule: Each level should be at least 2x the previous level.
      Tight: N,  Medium: 2N,  Wide: 4N+
      This creates unambiguous grouping at each level.
```

### Why generous internal padding matters

**Figure-ground separation (Edgar Rubin, 1915):** Content (figure) is only perceivable when it has sufficient negative space (ground) surrounding it. When a card has tight padding, the content merges with the card boundary and readability collapses. Generous padding isolates the content, making each element — a stat number, a tag — a distinct perceptual object.

The padding *is* what makes content readable, not just the font size.

### Density diagnosis

```
Does the section feel cramped or stressful to look at?
├── YES → Internal padding is too low relative to content count
│         Fix: Increase padding inside containers
│         Fix: Reduce number of visible items
│         Fix: Increase gap between items
│
└── NO, but it feels empty/wasted →
          Padding is too high relative to content importance
          Fix: Reduce padding or add content that earns the space
```

### Cross-type element gap

When two **different types** of elements are adjacent (an icon next to text, a graphic next to a label column), they need more gap than two elements of the same type. Different visual types are different "figures" — the brain needs extra space to parse them as separate objects working together rather than overlapping.

```
Same-type adjacency (text next to text, card next to card):
└── Standard gap from the spacing hierarchy is sufficient

Cross-type adjacency (icon next to text column, graphic next to label):
└── Increase gap by at least 1.5-2x the standard tight spacing
    A graphic element and a text block at tight spacing feel fused/cramped
    More gap lets each element breathe and be perceived independently
```

### Relationship between padding and gap

Internal padding and external gap serve different Gestalt functions:
- **Padding** creates figure-ground for the component itself
- **Gap** creates proximity grouping between components

When `gap ≈ padding`, components feel like one continuous surface (appropriate for tightly related items). When `gap > padding`, components feel like distinct objects (appropriate for items that should be individually perceived).

---

## Phase 5: Progressive Disclosure

### Scientific basis: Cognitive Load Theory (Sweller, 1988) + Signal-to-Noise Ratio (Shannon, 1948)

Working memory handles approximately **4 chunks simultaneously** (Cowan, 2001 — refined from Miller's original 7+/-2). Every visible element on screen competes for those 4 slots. Progressive disclosure manages cognitive load by controlling how many elements compete at any given moment.

### The signal-to-noise principle

Information theory (Shannon, 1948) defines signal clarity as the ratio of meaningful information to background noise. In UI terms:

```
Signal = The primary content users need (stats, actions, key data)
Noise  = Supporting content that aids comprehension but isn't primary

Signal-to-noise on main surface should be HIGH:
├── Show: Primary stats, key actions, critical status
├── Show: Section titles + brief context subtexts (advance organizers)
├── Hide: Explanatory paragraphs → tuck into dialogs, hover states, expandable areas
├── Hide: Edge-case information → tuck into "learn more" or info icons
└── Hide: Configuration/settings → tuck into dedicated sections or modals
```

### The advance organizer pattern

**Scientific basis:** Ausubel's Advance Organizer Theory (1960) — presenting an organizing framework before detailed content improves comprehension and retention.

The pattern:
```
Section Title          → Names the category (1-4 words)
Subtitle/description   → Frames what the user is about to see (1 sentence)
Content                → The actual data/components
```

This is NOT noise. The subtitle serves a structural purpose: it primes the brain's interpretive framework so the content below is processed faster. Subtitles under section titles are one of the few places where a full sentence is appropriate at the main surface level.

### Where to hide content

```
Content Type                    → Disclosure Method

Detailed explanation of a stat  → Hover tooltip or click-to-expand
Full description of a card item → Flip card, dialog, or drawer
Configuration options           → Dedicated settings section or modal
Historical data / audit trail   → Expandable section or separate page
Help text / onboarding          → Info icon with popover, not inline text
```

### Why users don't read (and what to do about it)

**F-pattern scanning (Nielsen, 2006):** Eye-tracking research shows users scan in an F-shape — they read the first line, then scan down the left edge, occasionally darting right. Dense paragraphs in card grids are never fully read because the scanning pattern skips them.

**Solution:** Replace paragraphs with scannable elements — a number, a tag, an icon. These register during F-pattern scanning. The explanatory text is still available but behind an interaction for the users who want depth.

---

## Phase 6: Color as Signal

### Scientific basis: Shannon's Information Theory (1948) + Chromatic Adaptation

In information theory, the information content of a signal is inversely proportional to its frequency. **Rare signals carry more information.** Applied to color in UI:

```
If 95% of the interface is neutral → Color means something when it appears
If 50% of the interface is colored → Color is noise, nothing stands out
If 100% is colored → Color carries zero information (maximum entropy)
```

### Color budget

```
Color Usage Hierarchy:

Neutrals (90-95% of surface)
├── Backgrounds
├── Text (all text should be neutral — variations of black/white based on background)
├── Borders
└── Shadows

Color accents (5-10% of surface)
├── Icon backgrounds or fills
├── Accent border lines
├── Status indicators (active/inactive)
├── Data visualization elements (charts, heatmaps)
└── Interactive state highlights (selected tab, active filter)

NEVER use color for:
├── Body text (decreases readability — text should contrast with background, not compete with it)
├── Large surface fills (unless it's a deliberate brand moment)
└── Multiple simultaneous accent colors competing for attention
```

### Extracting color from reference material

The Temperature dimension gives you a **direction** (warm vs. cool) and the material framework gives you a **palette shape** (neutral spectrum, muted accents). But when a user provides visual references — screenshots, art, films, games — you need to extract the **actual colors** from those references, not derive abstractly from dimension labels alone.

```
The problem with abstract derivation:

Temperature says "Cool" → you pick generic blue-grays
The reference shows → muted teal, desaturated coral, warm amber indicators

The abstract derivation missed the specific hues that make the reference feel right.
Dimension labels point you in the right direction.
Reference material gives you the actual destination.
```

**Color extraction workflow:**

```
When reference material is available:

Step 1: Identify the dominant neutral (60-70% of the reference surface)
        This is usually not pure gray — it has a tint.
        "Cool gray with a slight blue undertone" ≠ "pure gray"
        This becomes your background/panel color family.

Step 2: Identify the accent colors (5-15% of the reference surface)
        These are the colors that carry meaning — status lights,
        active indicators, highlights, interactive elements.
        Count them. Most references use 2-4 accent colors.
        Note their saturation level — are they neon-bright or muted?

Step 3: Note the accent intensity
        ├── Neon/vibrant: saturated, high contrast against background
        ├── Muted/subtle: desaturated, close in luminance to surrounding neutral
        ├── Warm glow: saturated but softened by glow bleed into surroundings
        │
        Most sophisticated references use "warm glow" — the accent IS vivid,
        but it's embedded in the environment through glow bleed (Phase 10),
        which softens its perceived intensity. Not neon signs. Not flat color chips.
        Lights that cast warmth.

Step 4: Map accent colors to UI roles
        Each extracted accent needs a functional assignment:
        ├── Primary accent: most frequently used (active states, key borders)
        ├── Secondary accent: contrast or complement (hover states, secondary info)
        ├── Status accents: semantic meaning (success, warning, danger)
        └── Decorative accent: atmospheric only (glow sources, grid tints)

Step 5: Verify against the Aesthetic DNA Temperature
        The extracted colors should ALIGN with the Temperature dimension —
        if Temperature says Cool, your extracted accents shouldn't be
        predominantly warm. If they are, re-examine your Temperature rating.
        The reference may have revealed something the initial profile missed.
```

**When no reference material is available**, fall back to Temperature-based derivation:

```
Cool    → blue-gray neutrals, cyan/teal/blue accents
Warm    → beige-cream neutrals, amber/coral/orange accents
Neutral → true gray neutrals, desaturated any-hue accents
```

### Why solid colors over opacity

**Determinism principle:** A solid color renders identically regardless of background. An opacity-based color (`text-black/50`, `bg-white/30`) is computed against whatever is behind it — making it unpredictable across contexts.

```
Opacity-based: rgba(0,0,0,0.5) on white bg = #808080
               rgba(0,0,0,0.5) on dark bg  = much darker
               rgba(0,0,0,0.5) on colored bg = tinted

Solid color:   #808080 on any bg = #808080
```

When you need transparency effects, use `color-mix()` or explicitly defined solid colors at each opacity level. This keeps the visual result deterministic and prevents color bleed artifacts.

### Text readability rule

Text should always be a neutral color (a variation of black or white depending on the background). Colored text competes with the content it's trying to communicate. The brain processes colored text as a visual element first and readable content second, which reduces reading speed (Stroop effect, 1935).

### Subtext and supporting text must remain readable

"Muted" does not mean "invisible." Subtext needs to be visually secondary to the title — but still comfortably readable. This requires a layered approach:

```
Subtext hierarchy strategy (layered):
│
├── Layer 1: SIZE — subtext is smaller than title (e.g., text-xs vs text-base)
├── Layer 2: WEIGHT — subtext is lighter (e.g., font-light vs font-normal)
├── Layer 3: SOLID MUTED COLOR — a distinct, lighter solid color
│
│   CRITICAL: Never use opacity to mute text.
│   Opacity-based text (e.g., text-white/70) bleeds into the background,
│   reducing crispness and readability. Always use a SOLID color.
│
│   For muted text on standard backgrounds:
│   → Use the design system's dedicated muted text color
│     (e.g., text-muted, text-secondary — whatever the theme provides)
│
│   For muted text on colored/dark containers (like headers):
│   → Compute a solid intermediate color between the text and background:
│     color-mix(in srgb, var(--header-text) 60%, var(--header-bg))
│     This produces a SOLID hex color — no alpha, no bleeding.
│
├── Too little contrast (same color as title):
│   Size/weight alone may not create enough separation.
│   Title and subtext look the same visual weight.
│
├── Too much dimming (color too close to background):
│   Contrast drops below readable threshold.
│   The subtext becomes invisible noise.
│
└── Sweet spot: visually distinct from both title AND background
    The brain registers it as "available if I want it"
    rather than "demanding attention."

Rule: If title and subtext look the same weight → not muted enough.
      If you have to squint to read the subtext → too muted.
      Supporting text should feel optional to read, not impossible.
      NEVER use opacity on text — always choose a solid color.
```

Also ensure container padding accounts for subtext. When a header has both title and subtext, the vertical padding must give breathing room to both — the subtext should not feel cramped against the bottom edge of the container. Increase `py` values when subtext is present.

---

## Phase 7: Focus Items (Earned Differentiation)

### Scientific basis: Von Restorff Isolation Effect (1933)

Hedwig von Restorff demonstrated that among a group of similar items, **the item that differs from the rest is most likely to be remembered**. This is one of the most replicated findings in memory research.

### The prerequisite: System discipline

The Von Restorff effect only works when the surrounding items are consistent. If 5 out of 10 elements are "special," the effect collapses — there's no baseline to contrast against. Focus items earn their differentiation from the discipline of the system around them.

```
System Discipline Check:

Are 80%+ of components following the same visual system?
└── YES → A focus item will stand out naturally with minimal differentiation
└── NO  → Fix the system first. Adding more variation to a chaotic page makes it worse.
```

### What makes a focus item

```
Candidates for focus treatment:
├── The single most important metric on a page (e.g., a total score)
├── A unique visualization that has no siblings (e.g., a radar chart)
├── A status indicator with high user importance (e.g., tier/rank badge)
└── A primary CTA that should dominate the page

NOT candidates:
├── One of many similar items in a grid
├── Navigation elements (these should be consistent, not special)
├── Section headers (these are structural, not focal)
└── Decorative elements
```

### How to differentiate focus items

The differentiation should be **subtle but unique** — an effect or accent that appears nowhere else on the page:

```
Differentiation methods (use ONE, not multiple):
├── A unique animation not used by other components
├── A subtle glow, shadow, or border effect exclusive to this element
├── A slight break in the grid/layout that gives the element more breathing room
├── An accent color treatment not used elsewhere
└── A unique shape or proportion (while respecting the overall border radius language)

AVOID:
├── Making it dramatically larger than everything else (this is hierarchy, not focus)
├── Using a completely different visual language (this looks like a bug)
├── Adding multiple differentiators at once (one is enough — subtlety is the point)
└── Animating it continuously (see animating-motion skill — infinite animation without state purpose is decorative noise)
```

### Why subtlety works

**Perceptual pop-out (Treisman, 1980):** A single feature difference (one red item among blue items) is detected pre-attentively — the brain finds it without conscious search. But this only works for a single differentiating feature. Multiple simultaneous differences trigger serial search, which is slower and less impactful. One subtle unique accent > three loud differentiators.

---

## Phase 8: Viewport Budget

### Scientific basis: Attentional Capacity (Kahneman, 1973) + Completion Bias

Users have a finite attention budget per page load. Each section of a page consumes part of that budget. Sections that overflow their budget (endless scrolling grids, massive lists) bankrupt every section below them — users don't even know those sections exist.

### The two-row heuristic

For grids of repeated items (cards, badges, avatars, images):

```
Visible items threshold:
├── Show up to ~2 rows of items at default viewport
├── After 2 rows → collapse with a "show more" or pagination
├── Each visible item should be large enough to feel substantial and readable
│
Why 2 rows:
├── 2 rows communicates "here is a collection" without monopolizing the page
├── Users can see the section boundary → Completion bias activates
│   (seeing the end of a section creates a sense of control and orientation)
├── Sections below remain discoverable
└── Items stay large enough for visual substance (too many items forces them too small)
```

### When a section has variable item counts

```
1-6 items    → Show all (fits within 2 rows at most screen widths)
7-12 items   → Show first row + partial second row, indicate more
13+ items    → Show 2 rows + collapse control
100+ items   → Show 2 rows + search/filter + collapse
              Never render all items — it destroys page structure
```

### Viewport section budget

Each major section should aim to be visible within a partial scroll, not dominate the entire viewport:

```
Section Budget Guide:
├── Hero/primary section: up to 60-70% of viewport height
├── Secondary sections: 30-50% each
├── Supporting sections: 20-30% each
└── Total scrollable depth: aim for 3-5 viewport heights max
    (beyond this, users lose spatial orientation — "where am I on this page?")
```

**Why this matters (spatial memory):** Users build a spatial map of the page (Scarr et al., 2013). If the page is too long, the map breaks down and users can't remember where content lives. Keeping total depth reasonable preserves the spatial map.

---

## Phase 9: Content Density

### Scientific basis: Cognitive Load Theory (Sweller, 1988) + Dual Coding (Paivio, 1971)

### Per-component text budget

```
Grid of cards:
├── Per card: stat/number + tag/label (2 chunks)
├── Total cognitive load for 12 cards: ~24 chunks (manageable)
│
├── AVOID: paragraph per card
├── Total cognitive load for 12 cards with paragraphs: ~96+ chunks (overwhelming)
│
└── If a card needs explanation → hide behind hover, flip, or dialog
    The detail exists but doesn't compete with 11 other cards for attention
```

### The chunk calculation

**Cowan (2001)** refined Miller's Law: working memory holds ~4 chunks, not 7. A "chunk" is a meaningful unit — a number, a word, a label. For interface elements:

```
Chunk count per element:
├── Icon only: 1 chunk
├── Number + label: 2 chunks
├── Number + label + subtitle: 3 chunks
├── Number + label + subtitle + description: 5+ chunks (approaching capacity for a SINGLE card)
│
Visible elements on screen compete for the same 4 slots.
If each card is 2 chunks and 6 cards are visible, the brain processes them sequentially.
If each card is 5 chunks and 6 cards are visible, the brain starts dropping information.
```

### When text is appropriate at the surface level

```
Text AT the surface:
├── Section titles (1-4 words)
├── Section subtitles (1 sentence — acts as advance organizer)
├── Stat labels and tags (1-3 words)
├── Button text (1-3 words)
└── Status indicators (1-2 words)

Text BEHIND an interaction:
├── Explanatory paragraphs
├── Help text and onboarding
├── Detailed descriptions
├── Historical context
├── Edge-case information
└── Terms, conditions, legal
```

---

## Phase 10: Environmental Theming (Material Language)

### Scientific basis: Embodied Cognition (Lakoff & Johnson, 1980) + Diegetic UI Theory

**Embodied cognition** establishes that humans understand abstract concepts through physical metaphors. We don't process "border-radius: 0" as a CSS value — we unconsciously perceive it as *metal*, *mechanical*, *precise*. Every visual property maps to a material the brain already understands from physical experience.

**Diegetic UI** (from game design) distinguishes between:
- **Non-diegetic UI**: overlaid on the experience (a standard SaaS dashboard)
- **Diegetic UI**: exists *within* the world of the experience (Nier Automata's glitchy menus, Dead Space's spine health bar)

Most SaaS apps are purely non-diegetic — functional rectangles with no material identity. Environmental theming pushes toward diegetic — every element *inhabits* the world of the brand. This is what separates "a dashboard" from "an experience."

### The material framework

Define the app's material identity first. This single decision cascades into every CSS property.

**The 6 materials below are common examples, not an exhaustive list.** Any material metaphor works — ice, smoke, neon, clay, liquid mercury, leather, silk, coral, obsidian, etc. The skill is the derivation process: observe the real-world physical properties of the material, then translate them into visual and behavioral CSS properties. The examples below demonstrate this derivation so you can apply it to any material.

### Deriving visual properties from any material

Ask these questions about the material's real-world physical properties:

```
Material Property          → CSS Property:

Is the material hard or soft?      → border-radius (hard = sharp, soft = rounded)
Is the surface smooth or rough?    → border-weight and texture (smooth = thin/none, rough = thick)
Is it heavy or light?              → shadow depth (heavy = deep shadows, light = subtle/none)
Is it warm or cool?                → color temperature (warm = amber spectrum, cool = blue-gray)
Is it transparent or opaque?       → opacity, backdrop-blur (transparent = glass effects)
Is the surface reflective?         → gradients, highlights (reflective = surface shine effects)
Is it precise or organic?          → geometry (precise = grid-aligned, organic = flowing)
Does it have texture or grain?     → background patterns, noise overlays
Is it matte or glossy?             → shadow spread (matte = diffused, glossy = sharp reflections)
Does it emit light?                → panel luminosity (emissive = inner glow + outer bleed,
                                     reflective = surface highlights only, absorptive = flat/matte)
```

**Emissivity is the most impactful material property for atmosphere.** A screen, a control panel, a holographic display — these are *light sources*. They don't just display content, they cast light into the space around them. The difference between a flat card and a glowing panel is emissivity. Most themed UIs miss this entirely — they color the borders and backgrounds but forget that the surface itself should feel luminous.

### Example material derivations

```
Material → Visual Properties:

Metal / Mechanical:
├── Corners: sharp (border-radius: 0 or minimal)
├── Borders: precise, thin (1px), high-contrast
├── Shadows: flat single-direction (no soft spread)
├── Colors: cool neutrals, desaturated
├── Typography: uppercase, tracked-out, monospace accents
├── Texture: none (clean precision)
├── Animation: snappy, minimal overshoot
└── Feel: engineered, controlled, tactical

Glass / Crystal:
├── Corners: rounded (generous border-radius)
├── Borders: subtle or none (edges defined by blur/transparency)
├── Shadows: soft, multi-layered, with inner glow
├── Colors: cool with prismatic accents
├── Typography: thin weights, elegant spacing
├── Texture: backdrop-blur, transparency, light refraction
├── Animation: smooth, fluid, gentle easing
└── Feel: elegant, transparent, modern

Stone / Earth:
├── Corners: minimal rounding
├── Borders: thick (2-3px), muted contrast
├── Shadows: heavy, grounded, short distance
├── Colors: warm earth tones, muted
├── Typography: heavier weights, organic spacing
├── Texture: subtle grain, weathered effects
├── Animation: weighty, slower, no bounce
└── Feel: solid, ancient, enduring

Wood / Organic:
├── Corners: medium rounding (organic shapes)
├── Borders: warm-toned, medium weight
├── Shadows: natural, warm-tinted
├── Colors: warm palette, amber/brown spectrum
├── Typography: medium weights, comfortable spacing
├── Texture: subtle grain patterns, natural variations
├── Animation: gentle, natural easing curves
└── Feel: warm, handcrafted, approachable

Paper / Ink:
├── Corners: subtle rounding
├── Borders: minimal (defined by elevation instead)
├── Shadows: layered elevation system (Material Design)
├── Colors: clean whites/grays with ink-black text
├── Typography: classic weights, generous line height
├── Texture: flat, clean (no grain)
├── Animation: elevation changes, smooth lifts
└── Feel: clean, editorial, structured

Fabric / Soft:
├── Corners: generous rounding
├── Borders: soft, low-contrast
├── Shadows: diffused, warm
├── Colors: muted, pastel, low saturation
├── Typography: light weights, loose spacing
├── Texture: soft gradients, no hard edges
├── Animation: slow, draped, organic movement
└── Feel: gentle, comfortable, luxurious
```

### Why material choice matters

**Mise-en-scene (film theory):** Every element in a frame contributes to the mood — lighting, color, texture, props. In UI, every CSS property is a "prop" in the scene. When all properties derive from the same material, the brain reads a coherent world. When properties come from different materials (sharp metal corners with soft fabric shadows), the brain reads incoherence — it "feels off" without the user knowing why.

### How to choose a material

The material should emerge from the brand's references, not from a preset list. Start with the brand direction and ask: **"If this app were a physical object, what would it be made of?"**

```
Step 1: Look at the brand references and ask what physical world they evoke
├── A sci-fi game → Metal, circuitry, plasma
├── A medieval RPG → Stone, wood, leather, parchment
├── An ocean/nature brand → Water, coral, sand, driftwood
├── A luxury fashion brand → Silk, glass, marble
├── A cyberpunk aesthetic → Neon, chrome, holographic film
├── A cozy community app → Wood, fabric, ceramic
│
Step 2: Pick 1-2 materials that capture the essence
├── Primary: the dominant feel (what the "walls" are made of)
├── Secondary (optional): interactive element contrast
│
Step 3: Derive visual + behavioral properties using the questions above
├── Ask the physical property questions for YOUR specific material
├── The 6 examples (metal, glass, stone, wood, paper, fabric) show the derivation pattern
├── Apply the same derivation to ANY material: ice, smoke, neon, clay, obsidian, silk, etc.
│
Step 4: If no clear material emerges
└── Default to Paper — clean, readable, neutral, lowest risk
```

Examples of non-standard material derivations:

```
Ice / Frost:
├── Hard but brittle → sharp corners, thin borders that feel like they could crack
├── Transparent → layered transparency, frosted backdrop-blur
├── Cold → cool blue-white palette, no warm tones
├── Slippery → low-friction drag, elements slide easily
├── Reflective → subtle surface highlights, crystalline accents
├── Cracks under pressure → press effect could show hairline fracture lines
└── Spring: medium stiffness, high damping (slides but stops clean)

Neon / Electric:
├── Glowing → border-glow effects, text-shadow for emphasis elements
├── Bright against dark → dark backgrounds mandatory, bright accent lines
├── Buzzing energy → slight vibration on hover, electric pulse animations
├── Instant → very high stiffness, instant response
├── Flickering → occasional subtle flicker animation on idle elements
├── No physical mass → low mass, no heavy shadows, elements feel weightless
└── Spring: very high stiffness, medium damping, very low mass

Smoke / Vapor:
├── Formless → very generous border-radius, no hard edges anywhere
├── Transparent → heavy use of opacity, layered translucent surfaces
├── Drifting → elements shift slowly, ambient movement
├── Dissipating → exit animations fade and spread outward
├── Weightless → no shadows, no grounding
├── Can't be grabbed → drag should feel imprecise, elements drift away from cursor
└── Spring: very low stiffness, very low damping, very low mass
```

### The flat-design trap

Modern SaaS defaults to flat design — no shadows, no texture, no material identity. This maximizes readability and usability but produces **zero atmosphere**. The result is that every SaaS app looks interchangeable.

Environmental theming adds atmosphere while preserving readability by applying material properties to the *structural* elements (borders, shadows, backgrounds, corners) while keeping content treatment clean (readable text, clear hierarchy, good spacing). The material is the container; the content inside follows all the same hierarchy and density rules from earlier phases.

```
Layer separation:
├── Material layer: borders, shadows, backgrounds, corners, accents → themed
├── Content layer: text, numbers, labels, icons → clean and readable
└── These layers are independent — you can change the material
    without changing the content hierarchy
```

### Atmospheric intensity calibration

The most common failure mode in environmental theming is making effects too subtle. A scan line at 2% opacity is invisible. A glow at 3% doesn't register. The result is: you spent effort adding atmosphere, but the user sees a flat dark page.

**The Condition and Light dimensions from Phase 1b directly control effect intensity.** "Subtle" is relative — what's subtle for a CRT monitor aesthetic is invisible for a paper aesthetic, and overwhelming for a glass aesthetic.

```
Condition → Base effect intensity:

Pristine    → Effects at 1-3% strength. Barely perceptible.
              Sharp edges, clean surfaces, minimal noise.
              The atmosphere comes from precision and absence.

Polished    → Effects at 3-5% strength. Clean but present.
              Smooth gradients, gentle highlights.

Lived-in    → Effects at 5-10% strength. Clearly visible.
              Visible texture, noticeable shadows, readable patterns.
              This is the minimum for "atmospheric" to register.

Weathered   → Effects at 8-15% strength. Prominent.
              Heavy texture, deep shadows, strong patterns.
              The surface tells a story of use and age.

Decaying    → Effects at 12-20% strength. Dominant.
              Aggressive texture, visible damage patterns.
              Atmosphere competes with content for attention.
              Content hierarchy must be extra strong to compensate.

Light dimension → Glow/contrast multiplier:

Dark + Neon → High contrast. Bright accents MUST glow visibly.
              Glow effects at 10-25% of accent color.
              Scan lines / grid lines should be perceptible.

Dim         → Medium contrast. Soft atmospheric glows.
              Effects at 5-10%.

Bright      → Low contrast. Subtle depth through shadows, not glow.
              Effects at 2-5%. Atmosphere comes from shadow, not light.
```

**Dark background intensity trap**: On a near-black background (#080a12), even 5% opacity produces ~1-2 RGB values of visible difference — essentially invisible to the human eye. Dark backgrounds absorb light, so effect values that would be clearly visible on a light background (3-5%) disappear entirely on dark ones. Compensate by doubling or tripling intensity values for dark-themed UIs.

```
The same visual effect at different background lightness:

Light bg (#d4c8b8):  3% effect opacity → clearly visible
Medium bg (#404040): 5% effect opacity → visible
Dark bg (#0a0c14):   5% effect opacity → INVISIBLE
Dark bg (#0a0c14):  10% effect opacity → barely visible
Dark bg (#0a0c14):  15-25% effect → actually registers

Rule: Start at the Condition-based percentages above,
      then multiply by the background darkness factor:
      Light backgrounds: 1x (use values as-is)
      Medium backgrounds: 1.5x
      Dark backgrounds: 2-3x
      Near-black backgrounds: 3-4x
```

**The test**: Squint at the page from arm's length. If you can't tell it has atmosphere — if it looks like any generic dark/light UI — the effects are too subtle. Push them until they're visible, then pull back 10-20%.

### Gamification through environmental theming

What makes a game UI feel immersive is that even utilitarian elements (health bars, inventory grids, menu buttons) are rendered in the game's material language. A health bar in Nier looks like a mechanical gauge. An inventory in Runescape looks like a stone tablet.

Apply this to app UI:

```
Standard SaaS:
├── Loading: spinner
├── Empty state: generic illustration
├── Buttons: rounded rectangles
└── Cards: white boxes with shadows

Environmentally themed (e.g., Metal/Tactical):
├── Loading: custom animation that matches the world (scan lines, boot sequence)
├── Empty state: icon + concise text in the same visual language
├── Buttons: sharp-cornered, tracked-out uppercase, precise borders
└── Cards: panel-style containers with material-appropriate borders and shadows

The functionality is identical. The experience is not.
```

### Unique accents for atmosphere

Small design details that reinforce the material world without affecting readability:

```
Atmospheric accent types:
├── Grid-breaking decorative elements (see "Controlled imperfection" below)
├── Floating background icons (subtle, low-opacity, positioned at edges)
├── Material-specific dividers (scan lines for metal, organic curves for wood)
├── Accent borders on one edge only (left or top — not full border)
├── Subtle texture overlays (noise for metal, grain for wood — very low opacity)
├── Custom cursor styles matching the material
└── Themed scrollbar treatment in contained elements

Rules:
├── These are decorative → pointer-events: none
├── These are non-essential → never carry information
├── These are subtle → low opacity, positioned at edges, not center
└── These reinforce → they match the material, never contradict it
```

### Controlled imperfection (Advanced — use sparingly)

> **Status: This concept is recognized but not yet fully systematized.** The principles below describe the *direction* — what makes accents feel crafted vs. template-y. However, the specific rules for placement, sizing, and variation are still being developed. Until this section matures, prefer clean atmospheric accents (texture, depth, glow bleed, vignette) over decorative grid-breaking elements. A clean interface with good atmosphere is always better than one with poorly placed decorative accents.

The most common failure in atmospheric accents is making them too formulaic. Identical corner elements on every card. Perfectly symmetric decorative marks. The result looks like a UI template, not a hand-crafted experience. The opposite failure — placing random shapes and lines without a system — looks arbitrary and messy.

**The observation:** Real atmospheric environments are not perfectly symmetric. A control panel in a film has indicator lights at uneven intervals. A HUD overlay has grid lines that extend past their containing box. The controlled imperfection is what separates "themed template" from "inhabited world." But "controlled" is the key word — without a clear system governing placement, it reads as noise.

```
Common cliches to avoid:
├── L-bracket / angle-bracket corner frames on every card
│   (the most overused cliche in themed UI — instantly reads as "template")
├── Identical accent in every corner of every card
├── Random geometric shapes scattered with no clear logic
├── Decorative elements that compete with content for attention
└── Mixing too many accent types without visual coherence

The direction (when this concept matures):
├── Accents that break out of the container's padding box
├── Asymmetric, selective placement (some components, not all)
├── Varied decorative vocabulary (not one shape everywhere)
├── Elements that suggest a larger coordinate system
└── The taste test: noticed in absence more than in presence

For now: skip decorative accent elements and invest that
effort into the atmospheric compositing stack instead.
Texture + depth + glow bleed + vignette creates more
atmosphere than any decorative element can.
```

### Implementation: CSS techniques for atmospheric surfaces

The difference between a flat UI and an atmospheric one is entirely in these CSS layers. Without them, even a well-structured interface feels like a wireframe.

```
CRITICAL: Every panel, card, and section MUST have at least 2-3 of these:

1. TEXTURE (background-image)
   ├── Noise overlay: SVG feTurbulence as background-image (paper, metal, concrete)
   ├── Grid pattern: repeating-linear-gradient for technical/HUD feel
   ├── Grain: fine noise pattern for organic materials (wood, fabric)
   └── Combined: noise + grid layered via multiple background-image values

2. DEPTH (box-shadow)
   ├── Inset shadows: create recessed/engraved surfaces (inset 2px 2px 4px)
   ├── Offset layers: stacked flat shadows (2px 2px 0, 4px 4px 0)
   ├── Edge highlights: inset 0 1px 0 rgba(255,255,255,0.06) — light catch
   ├── Drop shadows: soft ambient shadow beneath panels
   └── Layer multiple: combine inset + edge highlight + drop shadow

3. LIGHTING (gradients + pseudo-elements)
   ├── Top-edge highlight: 1px gradient line across top (simulates overhead light)
   ├── Bottom-edge shadow: 1px dark line or inset shadow at bottom
   ├── Directional gradient: very subtle top-to-bottom tint on panels
   └── Text shadows: offset shadows on large text (not body text)

4. SURFACE TREATMENT (borders)
   ├── Use design system border colors, not opacity-based borders
   ├── Vary border weight by edge: heavier on top, lighter on sides
   ├── Accent borders: single-edge colored border for emphasis
   └── Panel styles: top-only, top+bottom, left-accent (match material)

5. GLOW BLEED (box-shadow + radial-gradient)
   ├── Bright accent colors don't just sit on the surface — they cast light
   ├── An accent border should bleed a soft glow into the panel behind it:
   │   box-shadow: 0 0 20px <accent-color> at 10-15% strength
   ├── A highlighted number or element should illuminate its surroundings:
   │   Overlay a radial-gradient centered on the bright element, fading out
   ├── The glow color matches the accent, never white
   ├── Intensity scales with the Condition dimension:
   │   Pristine: no glow (clean surfaces don't emit)
   │   Lived-in: subtle glow (5-10% of accent)
   │   Neon-lit: strong glow (10-25% of accent, visible bleed radius)
   └── Without glow bleed, bright elements look painted ON the surface
       rather than embedded IN it. Glow makes them feel like light sources.

6. VIGNETTE / DEPTH FRAMING (radial-gradient overlay)
   ├── Real screens and surfaces are never uniformly lit
   ├── Edges are slightly darker than the center
   ├── This creates the feeling of looking INTO a space rather than AT a wall
   ├── CSS implementation:
   │   Overlay a radial-gradient on the page or section:
   │   radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15-0.4) 100%)
   ├── For screen/monitor aesthetics: stronger vignette (0.2-0.4 edge darkness)
   ├── For natural/organic aesthetics: gentle vignette (0.05-0.15)
   ├── For clean/modern aesthetics: no vignette (uniform lighting)
   └── The vignette sits on top of everything as a pointer-events:none overlay.
       It subtly directs focus toward the center of the content.

7. LUMINOUS SURFACES (panel-as-light-source)
   ├── The most impactful atmospheric technique for screen/tech/sci-fi aesthetics.
   ├── A control panel in a cockpit doesn't just display data — it EMITS LIGHT.
   ├── The panel surface itself glows, and that glow bleeds outward into the
   │   surrounding space. Content on the panel is brighter than the surface.
   │
   ├── Three layers create luminosity:
   │
   │   a) INNER LUMINOSITY — the panel surface glows from within
   │      ├── Background gradient: slightly brighter at center, subtle tint
   │      │   background: radial-gradient(ellipse at 50% 50%,
   │      │     <panel-color-bright> 0%, <panel-color-base> 100%)
   │      ├── The tint color comes from the panel's accent or the dominant palette
   │      ├── Intensity: barely perceptible (2-8%) — the surface should feel
   │      │   "alive" without looking like a colored rectangle
   │      └── This replaces flat backgroundColor on emissive panels
   │
   │   b) OUTER GLOW — the panel casts light into surrounding space
   │      ├── box-shadow with large spread and low opacity:
   │      │   box-shadow: 0 0 30px 10px <accent-color> at 8-15% strength
   │      ├── The glow color matches the panel's dominant accent
   │      ├── Glow radius should be 15-40px beyond the panel edge
   │      ├── This is what makes panels look like light sources vs flat cards
   │      └── On dark backgrounds: very visible. On light backgrounds: subtle
   │          but still creates a "halo" effect via soft colored shadow
   │
   │   c) CONTENT BRIGHTNESS — content is brighter than the surface
   │      ├── Text/numbers on a luminous panel should feel like they're
   │      │   projected or lit from behind, not just sitting on a surface
   │      ├── Achieved through text-shadow with accent tint:
   │      │   text-shadow: 0 0 12px <accent-color> at 15-30%
   │      ├── Key numbers or values get stronger glow than labels
   │      └── The hierarchy: content glows > surface glows > glow bleeds out
   │
   ├── Emissivity scales with the Light + Technology dimensions:
   │   ├── Neon-lit + Cybernetic/Digital: maximum emissivity (strong glow, visible outer bleed)
   │   ├── Dim + Digital: medium emissivity (noticeable inner glow, subtle outer)
   │   ├── Bright + Digital: gentle emissivity (soft inner luminosity, minimal outer
   │   │   because the bright environment already provides ambient light)
   │   ├── Any + Analog/Mechanical: low emissivity (warm indicator-light glow only)
   │   └── Any + Primitive/Natural: zero emissivity (surfaces don't emit light)
   │
   ├── Dark backgrounds amplify emissivity — maximum contrast between
   │   the dark surroundings and the glowing panel. This is why sci-fi
   │   cockpits use dark environments: the panels ARE the light source.
   │
   ├── Light backgrounds reduce visible emissivity — you can't see glow against
   │   brightness. Compensate with:
   │   ├── Subtle colored inner gradient (panel has a faint tint suggesting backlight)
   │   ├── Colored outer box-shadow (creates a soft halo even on light bg)
   │   ├── Stronger text-shadow on content (makes text feel projected)
   │   └── The effect is gentler but still creates the "this panel is active/alive" feel
   │
   └── Without luminous surfaces: panels feel like paper cards with colored borders.
       WITH luminous surfaces: panels feel like active displays — they inhabit
       the world rather than sitting on top of it.

Without texture → wireframe
Without depth → flat paper cutouts
Without lighting → no sense of physical space
Without surface treatment → generic boxes
Without glow bleed → bright elements feel painted on, not luminous
Without vignette → the page feels like a flat wall, not a space you look into
Without luminous surfaces → panels feel like passive containers, not active displays

The atmospheric layer sits UNDER the content layer.
Content (text, numbers, icons) stays clean and readable.
The container around it is what carries the material identity.
```

### The atmospheric compositing stack

Individual effects in isolation are invisible. Atmosphere is the **sum of multiple layers** composited together. Just like film uses lighting + color grading + lens effects + set design simultaneously, UI atmosphere requires stacking 3-5 effect layers on top of each other.

```
The compositing mindset:

WRONG approach: "I'll add one subtle scan line effect"
→ Result: indistinguishable from no effect at all

RIGHT approach: "I'll stack texture + depth + lighting + glow + vignette"
→ Result: each effect is individually subtle, but together they create atmosphere

Think of it like audio mixing:
├── One instrument at low volume = silence
├── Five instruments each at low volume = ambient music
├── Each layer doesn't need to be loud — they reinforce each other

For a page with atmosphere, expect:
├── Layer 1: Page-level texture (noise, grid, or grain — fills empty surface)
├── Layer 2: Page-level vignette (darker edges — frames everything)
├── Layer 3: Panel-level depth (inset shadows + edge highlights on every panel)
├── Layer 4: Accent-level glow bleed (bright elements cast light)
├── Layer 5: Detail-level accents (divider treatments, scanlines)
├── Layer 6: Panel luminosity (emissive panels glow from within + cast light outward)
│            Only for emissive materials (screens, tech displays, holographics).
│            This is what transforms "themed cards" into "active displays."

All layers active simultaneously. Each layer is subtle on its own.
Together they create a space that feels PHYSICAL rather than digital.

Layer 6 (luminosity) is the highest-impact single layer for tech/sci-fi aesthetics.
If you could only add one effect to transform flat panels into atmospheric ones,
luminous surfaces would give the most return. It works because it changes
the fundamental relationship between the panel and its environment — the panel
stops being a passive container and becomes an active element in the scene.
```

**How Condition dimension maps to the stack:**

```
Pristine (clean/modern):
├── Layers 1-2: skip or barely present
├── Layer 3: clean shadows only (no inset, just drop shadow)
├── Layer 4: skip (no glow)
├── Layer 5: minimal (clean dividers only)
└── Total: 1-2 layers active. Atmosphere from precision, not effects.

Lived-in (functional/used):
├── Layer 1: subtle texture (noise or grid visible on close inspection)
├── Layer 2: gentle vignette
├── Layer 3: inset shadows + edge highlights
├── Layer 4: subtle glow on accents
├── Layer 5: corner accents, themed dividers
└── Total: 3-4 layers active. Clearly atmospheric.

Weathered/Decaying (gritty/heavy):
├── All 5 layers active at medium-high intensity
├── Layer 1: prominent texture (clearly visible patterns)
├── Layer 2: strong vignette (dark corners)
├── Layer 3: deep inset shadows, heavy edge treatment
├── Layer 4: strong glow bleed (accent colors illuminate surroundings)
├── Layer 5: dense decorative detail
└── Total: All 5 layers. Unmistakably atmospheric.
```

### Material-to-CSS translation frameworks

The gap between "this should feel like brushed metal" and actual CSS properties is a translation problem. These frameworks provide systematic methods for that translation — turning physical-world material properties into specific, implementable CSS values.

#### Three-point lighting model

Film and 3D rendering use three light sources to create depth on any surface. The same model translates directly to CSS shadow and highlight placement:

```
Three-point lighting → CSS mapping:

KEY LIGHT (primary, directional):
├── The dominant light source — creates the main shadow
├── CSS: box-shadow with clear offset in one direction
│   box-shadow: 4px 6px 12px rgba(0,0,0,0.25)
├── Direction should be consistent across ALL panels on the page
│   (top-left light = shadows fall bottom-right on every element)
└── This is the shadow that creates depth and "lifts" the panel

FILL LIGHT (secondary, ambient):
├── Softer light that fills shadows — prevents pure black darkness
├── CSS: second box-shadow, opposite side, softer and lighter
│   box-shadow: -2px -2px 8px rgba(0,0,0,0.08)
├── Or: subtle ambient shadow with no offset
│   box-shadow: 0 0 20px rgba(0,0,0,0.1)
└── This is what prevents the "cutout" look of single-shadow panels

RIM LIGHT (edge, separation):
├── Bright edge that separates the subject from the background
├── CSS: inset highlight along the edge facing the "light"
│   box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)
├── Or: subtle border on the lit side only
│   border-top: 1px solid rgba(255,255,255,0.05)
└── This is the thin bright line that makes panels feel 3-dimensional

All three combined on one panel:
  box-shadow:
    4px 6px 16px rgba(0,0,0,0.25),       /* key light */
    -2px -2px 8px rgba(0,0,0,0.08),       /* fill light */
    inset 0 1px 0 rgba(255,255,255,0.06); /* rim light */
```

**Consistency rule:** Pick one global light direction and apply it everywhere. When key light is top-left on one panel but bottom-right on another, the brain reads two conflicting light sources — the scene feels incoherent. Real rooms have one dominant light direction.

#### PBR property mapping

Physically-Based Rendering (PBR) in 3D engines uses measurable material properties. These map to specific CSS techniques:

```
PBR Property → CSS Translation:

ROUGHNESS (0.0 smooth → 1.0 rough):
├── Controls how blurred reflections and shadows are
├── Low roughness (polished metal, glass):
│   ├── Sharp, tight shadows: box-shadow blur radius 2-6px
│   ├── Clear highlight gradients with defined edges
│   └── Visible surface reflection (linear-gradient highlight)
├── High roughness (concrete, fabric, wood):
│   ├── Diffused, wide shadows: box-shadow blur radius 12-30px
│   ├── Soft, subtle gradients without distinct edges
│   └── No visible surface reflection — matte finish
└── Rule: roughness ≈ shadow blur radius multiplier

METALNESS (0.0 dielectric → 1.0 metallic):
├── Controls gradient sharpness and reflection color
├── Non-metallic (plastic, wood, paper):
│   ├── Soft gradients, white/gray highlights
│   ├── Shadows are neutral/dark
│   └── Surface color comes from the material itself
├── Metallic (chrome, gold, brushed steel):
│   ├── Sharp linear-gradient highlights with material color in reflection
│   ├── Shadows tinted with the material's color
│   └── Environment "reflected" in surface (stronger gradient contrast)
└── Rule: metalness ≈ gradient contrast + color-tinted reflections

EMISSIVITY (0.0 passive → 1.0 full emission):
├── Already covered in Technique 7 (Luminous Surfaces)
├── Controls inner glow intensity + outer light bleed
└── Key addition: emissive surfaces OVERRIDE key/fill shadow rules
    — a glowing panel doesn't cast the same shadow as a passive one

NORMAL/BUMP (surface micro-detail):
├── Controls perceived surface texture at small scale
├── CSS: background noise/grain overlays at low opacity
│   ├── Smooth (low bump): no texture overlay, or very fine noise at 1-2%
│   ├── Medium (light bump): visible grain at 3-5%
│   └── Rough (heavy bump): prominent texture at 6-10%
└── This is the texture layer in the compositing stack
```

#### Layered shadow system

Single-shadow elements look flat. Real-world objects cast complex shadows that change with distance from the surface. Stack multiple shadows to simulate this:

```
Layered shadow approach:

WHY: A single box-shadow creates one uniform blob. Real shadows have:
├── A tight, dark shadow close to the object (contact shadow)
├── A wider, softer shadow further from the surface (cast shadow)
├── And potentially an ambient shadow (global diffuse light)

TECHNIQUE: Stack 3-5 box-shadows with consistent offset ratios:

  /* Elevation level 1 (resting on surface) */
  box-shadow:
    0 1px 2px rgba(0,0,0,0.12),     /* contact: tight, dark */
    0 2px 4px rgba(0,0,0,0.08),     /* near: slightly wider */
    0 4px 8px rgba(0,0,0,0.04);     /* ambient: widest, lightest */

  /* Elevation level 2 (slightly raised) */
  box-shadow:
    0 2px 4px rgba(0,0,0,0.12),
    0 4px 8px rgba(0,0,0,0.08),
    0 8px 16px rgba(0,0,0,0.04);

  /* Elevation level 3 (floating) */
  box-shadow:
    0 4px 8px rgba(0,0,0,0.12),
    0 8px 16px rgba(0,0,0,0.08),
    0 16px 32px rgba(0,0,0,0.04);

RULES:
├── Each layer doubles the blur radius of the previous
├── Each layer halves the opacity of the previous
├── Offset ratios stay consistent (same direction, proportional distance)
├── Shadow color should be tinted by the surface color, not pure black
│   On warm bg: rgba(60,40,20, ...) instead of rgba(0,0,0, ...)
│   On cool bg: rgba(20,30,50, ...) instead of rgba(0,0,0, ...)
├── More layers = more realistic = more expensive to render
└── 3 layers is the sweet spot for most UI elements
```

#### Bloom and multi-layer glow

Bloom in photography/games is when bright light bleeds past object edges. In CSS, this is achieved by stacking glow layers at different radii:

```
Multi-layer bloom → CSS:

Single glow (flat, unconvincing):
  box-shadow: 0 0 20px rgba(0,150,255,0.3);
  → reads as a colored blur, not as light emission

Multi-layer bloom (convincing light source):
  box-shadow:
    0 0 4px rgba(0,150,255,0.6),     /* core: tight, bright */
    0 0 12px rgba(0,150,255,0.3),    /* inner bloom: medium */
    0 0 30px rgba(0,150,255,0.12),   /* outer bloom: wide, faint */
    0 0 60px rgba(0,150,255,0.04);   /* atmospheric: widest, barely visible */

WHY IT WORKS:
├── Real light doesn't cut off at a single blur radius
├── It falls off gradually: intense at source, fading with distance
├── Each glow layer captures a different zone of that falloff
├── The "core" glow establishes the light color and intensity
├── The outer layers create the atmospheric "haze" that makes it feel real

APPLYING TO TEXT (headline glow):
  text-shadow:
    0 0 4px currentColor,            /* core: tight around letters */
    0 0 12px rgba(accent, 0.4),      /* inner bloom */
    0 0 30px rgba(accent, 0.15);     /* outer bloom */

APPLYING TO BORDERS (glowing edge):
  /* Use an inset shadow for internal glow edge */
  box-shadow:
    inset 0 0 4px rgba(accent, 0.4),
    inset 0 0 12px rgba(accent, 0.15),
    0 0 20px rgba(accent, 0.1);      /* external bleed */

INTENSITY BY AESTHETIC:
├── Neon/Cyberpunk: 4 layers, high opacity core (0.6+)
├── Sci-fi/Tech: 3 layers, medium opacity core (0.3-0.5)
├── Fantasy/Magic: 3 layers, warm-tinted, medium opacity
├── Clean/Modern: 2 layers only, very subtle (0.1-0.2 core)
└── No glow: skip entirely for paper, stone, wood materials
```

#### Physicalized flat design (Kijima principle)

The Nier: Automata UI designer Hisayoshi Kijima achieved physical depth without skeuomorphic textures — flat design elements placed onto a surface with physical screen artifacts. The principle: the interface is flat, but the *medium displaying it* has physical properties.

```
Kijima's approach:

The interface elements are clean and flat (no bevels, no faux textures).
The SCREEN displaying them has physical properties:
├── Grid lines: fine pixel grid visible across the surface
├── Edge darkening: vignette from the display's viewing angle
├── Scan artifacts: subtle horizontal banding from the display technology
├── Color bleed: colors slightly bleeding past their container edges
├── Phosphor glow: bright elements have a subtle halo from phosphor excitation

This works because it separates two concerns:
├── CONTENT: clean, readable, modern typography and layout
├── MEDIUM: the physical surface that content appears ON
│
├── The user reads the content clearly (it's flat/clean)
├── But feels they're looking at a physical device (the medium has texture)
└── Result: readability of flat design + atmosphere of a physical world

CSS implementation:
├── Content: standard clean CSS (no shadows on text, clean borders)
├── Medium (page-level overlay, pointer-events: none):
│   ├── Repeating-linear-gradient for fine grid lines (0.5-1px, very low opacity)
│   ├── Radial-gradient vignette (darker edges)
│   ├── Optional: repeating horizontal lines at 2-3px intervals (scan lines)
│   └── Optional: very slight hue shift at extreme edges (color fringe)
│
├── This is a "free" atmospheric technique — it adds zero complexity
│   to individual components. All the atmosphere comes from ONE overlay
│   on the page or section container.
└── Best used for: tech, sci-fi, retro-computing, HUD, tactical aesthetics
```

### Material behavior: How materials MOVE and RESPOND

**Scientific basis: Cross-modal Correspondence (Spence, 2011) + Kinesthetic Empathy (Reynolds & Reason, 2012)**

Visual properties define how a material **looks**. Behavioral properties define how it **feels** when you interact with it. Cross-modal correspondence shows that humans naturally assign physical properties (weight, elasticity, friction) to motion patterns. Kinesthetic empathy means observing motion triggers a felt sense in the observer's body — a bouncy animation makes you *feel* the bounce.

**Spring physics parameters map directly to material properties:**

```
stiffness → how quickly the material responds to force
damping   → how quickly the material settles after being disturbed
mass      → how heavy the material feels when moved

These three numbers define the entire interaction feel.
The same element with different spring parameters feels like a completely different material.
```

### Deriving behavioral properties from any material

Ask these questions about the material's real-world physics:

```
Physical Property              → Interaction Property:

How heavy is the material?     → mass parameter (heavy = slow to start/stop, light = instant response)
How elastic is it?             → damping (elastic = low damping/overshoots, rigid = high damping/stops dead)
How stiff is it?               → stiffness (stiff = fast response, flexible = slow response)
Does it have friction?         → drag/scroll momentum (high friction = stops quickly, low = drifts)
Does it deform under pressure? → press behavior (deformable = visible compression, rigid = minimal movement)
Does it spring back?           → release behavior (elastic = bounces back, plastic = stays deformed)
Does it flow or hold shape?    → transition curves (flows = ease-in-out, holds = ease-out with hard stop)
```

### Example material behavior derivations

```
Material → Spring Parameters → Interaction Feel:

Water / Fluid:
├── Spring: low stiffness, low damping, medium mass
├── Hover: elements shift and ripple like a disturbed surface
├── Press: press creates a spreading ripple outward
├── Release: slow recovery, element drifts back to position
├── Drag: high momentum — elements drift and settle slowly after release
├── Transitions: long duration (300-400ms), smooth ease-in-out
├── Scroll: momentum-based, content flows and decelerates gradually
└── Overall: flowing, continuous, everything feels connected like a liquid surface

Rubber / Elastic:
├── Spring: high stiffness, low damping, low mass
├── Hover: elements stretch slightly toward cursor
├── Press: element compresses visibly (scale down), snappy
├── Release: bounces past origin then settles (overshoot)
├── Drag: rubber-band resistance at boundaries, snaps back hard
├── Transitions: quick with overshoot (200-250ms), custom bounce curve
├── Scroll: overscroll bounce effect at boundaries
└── Overall: responsive, playful, everything bounces and snaps

Metal / Mechanical:
├── Spring: very high stiffness, high damping, low mass
├── Hover: precise binary state change (on/off), clean and instant
├── Press: instant depression, mechanical click feel, no softness
├── Release: snaps back to exact position, no overshoot, no drift
├── Drag: precise cursor tracking, snaps to grid positions
├── Transitions: fast (100-200ms), ease-out-expo (sharp initial response)
├── Scroll: discrete scroll-snap, clicks between positions
└── Overall: precise, controlled, everything responds instantly and stops dead

Stone / Heavy:
├── Spring: high stiffness, very high damping, high mass
├── Hover: minimal reaction — subtle shadow shift, nothing moves
├── Press: slow, deliberate sink downward, feels weighty
├── Release: slow return, no bounce, everything is deliberate
├── Drag: heavy resistance, doesn't drift — stops exactly where you release
├── Transitions: medium-slow (250-350ms), ease-out (decelerates into position)
├── Scroll: stops immediately when finger lifts, no momentum
└── Overall: heavy, grounded, everything has weight and permanence

Glass / Smooth:
├── Spring: medium stiffness, medium-high damping, medium mass
├── Hover: highlight reflection shifts across surface
├── Press: smooth clean depression, no texture
├── Release: clean return, symmetrical to press
├── Drag: slides with very low friction, glides easily
├── Transitions: medium (200-300ms), ease-in-out (symmetrical curve)
├── Scroll: smooth and frictionless, long momentum decay
└── Overall: slippery, reflective, everything slides and glides

Paper / Light:
├── Spring: medium stiffness, medium damping, low mass
├── Hover: gentle lift (translateY), subtle shadow increase
├── Press: soft depression, clean and light
├── Release: gentle return, slight float feeling
├── Drag: light and responsive, floats and settles gently
├── Transitions: medium (200-300ms), ease-out
├── Scroll: natural deceleration, moderate momentum
└── Overall: lightweight, clean, everything lifts and settles like a sheet

Fabric / Soft:
├── Spring: low stiffness, medium damping, medium mass
├── Hover: gentle surface deformation, slow ripple
├── Press: soft compression, slow and cushioned
├── Release: slow recovery, fabric springs back gradually
├── Drag: fabric pull effect — element stretches then slowly springs back
├── Transitions: slow (300-500ms), ease-out (gentle deceleration)
├── Scroll: soft momentum, slow decay, cushioned stop
└── Overall: soft, organic, everything responds gently and settles slowly
```

### The unified material principle

**Visual + behavioral = complete material identity.**

When the visual properties say "metal" (sharp corners, precise borders, flat shadows) but the animation says "rubber" (bouncy, overshooting), the brain detects incoherence. The interface feels "wrong" in a way users can't articulate because the visual signal and the motion signal contradict each other.

```
Coherence check:
├── Do the spring parameters match the visual material?
│   Metal visuals + snappy/precise motion = coherent
│   Metal visuals + bouncy/elastic motion = incoherent
│
├── Do hover effects match the material weight?
│   Stone material + minimal hover reaction = coherent
│   Stone material + stretchy hover effect = incoherent
│
├── Does scroll behavior match the material friction?
│   Glass material + frictionless smooth scroll = coherent
│   Glass material + hard scroll-snap stops = incoherent
│
└── Does drag behavior match the material mass?
    Water material + drifting momentum = coherent
    Water material + stops-on-release = incoherent
```

### Combining materials

Most apps don't use a single pure material. They combine a **primary material** (80% of the interface) with a **secondary accent material** (20%) for contrast:

```
Common material combinations:
├── Metal + Glass: tactical precision with smooth interactive elements
├── Stone + Wood: ancient/natural feel with warmth in interactive areas
├── Paper + Metal: clean editorial structure with precise interactive controls
├── Glass + Fabric: modern transparency with soft interactive comfort
│
Rules for combining:
├── Primary material defines: page structure, section containers, navigation
├── Secondary material defines: interactive elements, buttons, input fields, accents
├── Never use more than two materials — three or more creates incoherence
├── The primary material sets the "world" — the secondary adds interactive contrast
└── Transition between materials should be intentional (e.g., a button feels different
    from a panel because buttons are interactive — this contrast reinforces affordance)
```

**Affordance theory (Gibson, 1977; Norman, 1988):** Different materials suggest different interaction possibilities. A metal panel says "display." A rubber button says "press me." Using a secondary material for interactive elements creates natural affordance — the material difference between static and interactive elements teaches users what's clickable without explicit signifiers.

### Principles from world-class environmental UI design

The following principles are distilled from studying how expert game UI designers create atmospheric interfaces. These are generalizable to any themed application — they are about the *process* of environmental theming, not any specific aesthetic.

#### 1. Suggest through symbolism, never state literally

When a brand has cultural references (music, history, mythology, technology), integrate them as subtle structural motifs — not as literal imagery. Use the *shapes and patterns* of the reference domain as decorative elements in borders, dividers, corners, and spacing.

```
Literal (wrong):     Placing a musical note icon in the header of a music app
Symbolic (right):    Using staff-line spacing and bar-line dividers as structural elements
                     — users feel the musical influence without consciously identifying it

Literal (wrong):     Putting a sword icon on every button in a medieval app
Symbolic (right):    Using parchment textures, wax-seal accents, and serif typography
                     — the medieval world is felt through material, not imagery

The principle: symbolism creates atmosphere. Literalism creates decoration.
```

#### 2. Physicalize flat design with subtle screen effects

Pure flat design is clean but dimensionless. Adding faint physical artifacts to flat surfaces — subtle grid textures, slight edge distortion, vignetting, scan lines, noise — transforms flat panels into surfaces that feel like they exist on a physical display or material.

```
Techniques for physicalizing flat design:
├── Faint grid or noise texture overlay (very low opacity — felt, not seen)
├── Subtle vignette / edge darkening (suggests a physical screen boundary)
├── Slight CRT or scan-line effects (for mechanical/retro themes)
├── Paper grain or fabric weave (for organic/warm themes)
├── Frosted blur (for glass/ice themes)
│
Rules:
├── The effect should be barely perceptible — if users consciously notice it, it's too strong
├── Apply to containers/panels, not to content (text must remain perfectly clean)
├── The effect should match the material language (noise for metal, grain for paper)
└── These are atmospheric, not informational — they carry zero data
```

**Why this works (Perceptual Realism, Ferwerda, 2003):** The visual system doesn't need photorealistic detail to perceive physicality. Subtle depth cues — a faint texture, slight vignetting — are enough to trigger the brain's "this is a physical object" response. The interface stops being "pixels on a screen" and starts being "a surface in a world."

#### 3. Constrain your palette, then solve readability without color

When the brand aesthetic demands a limited color range (monochrome, single-hue, desaturated), don't fight it by adding more colors for "clarity." Instead, solve information hierarchy through other visual properties:

```
Readability without color variation:
├── Font weight variation (light vs. medium vs. bold)
├── Font size ratio (Weber-Fechner hierarchy from Phase 2)
├── Opacity/brightness variation within the palette
├── Spacing and grouping (Gestalt proximity from Phase 4)
├── Border weight and style (solid vs. dashed, thin vs. thick)
└── Position and alignment (primary content left/top, secondary right/bottom)

When color IS needed (status, categories, alerts):
├── Limit to 2-3 muted accent colors maximum
├── Each color must serve a distinct informational purpose
├── Trial-and-error is expected — test until colors are distinct within the palette
├── Colors should feel like they belong to the palette, not imported from outside
└── If a color feels jarring against the palette, it's wrong — desaturate until it fits
```

#### 4. Invisible complexity — simple surface, powerful depth

The best interfaces appear simple to new users and powerful to experienced users. Complexity should be layered, not flattened:

```
Invisible complexity pattern:
├── Surface: minimal controls, obvious actions, no learning required
├── First layer: discoverable shortcuts and advanced features
├── Deep layer: power-user customization, hidden until needed
│
This is NOT progressive disclosure (Phase 5), which is about content visibility.
This is about interaction complexity — the surface behavior is simple,
but sophisticated interaction patterns exist for those who look for them.
│
The surface should be so simple that someone unfamiliar with the domain
can navigate it. Advanced features are available but never demanded.
```

#### 5. Animations should feel "alive," not "functional"

The difference between a functional animation (element moves from A to B) and an alive animation (element *flows* from A to B) is **fluidity** — smooth, continuous motion that feels organic rather than mechanical.

```
Functional (dried out):
├── Element appears → element is visible (binary state change)
├── Menu opens → menu is open (instant or linear transition)
├── Focus moves → new element is focused (hard cut)

Alive (fluid):
├── Element emerges into view (eased entry with slight overshoot or settle)
├── Menu flows open (content pulls up with continuity, not just "appears")
├── Focus glides to new element (previous element releases as next element receives)

The distinction is continuity — alive animations have no moment where
the motion "stops and restarts." Each state flows into the next.
The material language (Phase 10) determines the CHARACTER of the fluidity
(bouncy vs. smooth vs. heavy), but fluidity itself is universal.
```

#### 6. Unified visual identity across all surfaces

Every screen, mode, sub-view, and overlay in the app should share the same color palette, material language, and animation curves. When a user encounters a modal, a settings page, a loading screen, or a mini-game — it should feel like the same world.

```
Unified identity checklist:
├── Do all screens use the same color palette?
├── Do all components use the same animation timing functions?
├── Do overlays/modals feel like they belong to the same material world?
├── Does the loading screen feel like part of the app, not a separate entity?
├── Do error states and edge cases maintain the visual language?
└── Would a screenshot of any screen be identifiable as belonging to this app?

Break points (where unity commonly fails):
├── Auth/login screens (often generic or from a template)
├── Error pages (often unstyled or default)
├── Loading states (often generic spinners)
├── Settings/admin views (often deprioritized visually)
├── Email notifications / external touchpoints
└── Third-party integrations (payment forms, OAuth screens)
```

#### 7. Intentional rule-breaking serves the experience

A disciplined system earns the right to break its own rules in moments that serve the experience. A UI that "glitches" during a dramatic moment, a color palette that shifts during a state change, an animation that behaves differently in a climactic interaction — these work *because* the system is otherwise consistent.

```
When rule-breaking works:
├── The system is 95%+ consistent (the rules are established and recognized)
├── The break serves a narrative or experiential purpose
├── The break is clearly intentional, not accidental
├── The break is temporary — the system returns to normal after
└── The break reinforces the material world (a "glitch" in a mechanical UI
    feels like the machine malfunctioning — that's diegetic, not broken design)

When rule-breaking fails:
├── The system isn't consistent enough for the break to register
├── The break seems like a bug or oversight
├── The break is permanent (the system never recovers)
└── The break contradicts the material world (organic shapes in a mechanical UI
    that aren't explained by context just look like inconsistency)
```

---

## Phase 11: Empty States

### Scientific basis: Minimal Viable Feedback + Expectation Management

An empty state is the first thing a user sees before they have data. It serves exactly two purposes: (1) confirm the section loaded correctly, and (2) communicate what will eventually appear here.

### The rule: Icon + short message, nothing more

```
Empty state composition:
├── One relevant icon (muted, not colorful)
├── One short message (under 8 words)
├── No illustrations, no mascots, no elaborate graphics
├── No multi-paragraph explanations
├── No calls-to-action unless the user needs to take action to populate the section
│
Examples:
├── "No actions recorded yet"
├── "No badges earned yet"
├── "Nothing here yet"
│
The empty state should feel like a quiet room — not an empty room with a sign
explaining what furniture will go where.
```

### Why minimal works

**Aesthetic-Usability Effect (Norman, 2004):** Users perceive clean, minimal interfaces as more functional. An elaborate empty state (illustration + paragraph + CTA) draws more attention than the empty state deserves — it's a temporary condition, not a destination. A minimal treatment keeps the empty state proportional to its importance.

**Expectation setting:** The icon hints at what content type will appear (a chart icon for analytics, a badge icon for achievements). The short message confirms "this is intentional, not broken." Together, these take about 1 second to process and the user moves on.

### Empty state anti-patterns

```
AVOID:
├── Large illustrations that dominate the section
│   (draws attention to absence instead of minimizing it)
├── Long explanatory text
│   (users don't need a manual for "no data yet")
├── Animated empty states
│   (empty states are transitional — don't invest in them)
├── Different empty state designs per section
│   (treat empty states as a component family — same DNA everywhere)
└── Emotional language ("Don't worry! Data will appear soon!")
    (patronizing — state the fact, don't manage feelings)
```

---

## Phase 12: Loading States

### Scientific basis: Change Blindness (Simons & Chabris, 1999) + Layout Stability (CLS)

**Change blindness:** Users are less likely to notice changes that occur within a stable visual frame. If the component shell is already rendered and only the data values change, the transition from loading to loaded feels seamless. If the entire component appears/reshapes on load, the change is jarring and disorienting.

### The rule: Render the shell, fill in the data

```
Loading strategy:
├── Render the full component structure immediately (borders, layout, labels, spacing)
├── Show everything that doesn't depend on fetched data (titles, static labels, decorative elements)
├── Leave data-dependent areas as neutral placeholders (subtle, not skeleton-pulsing)
├── When data arrives, fill in the values — the component doesn't reshape
│
This minimizes:
├── Cumulative Layout Shift (CLS) — component dimensions don't change
├── Perceived loading time — the user sees a "complete" interface immediately
└── Cognitive disruption — no skeleton-to-content visual jump
```

### Why NOT skeletons and spinners

```
Skeleton loaders:
├── Create a "pre-loading" visual state that looks incomplete
├── When real content replaces skeletons, the entire visual field changes
├── This triggers change detection → the brain notices and re-processes
├── The transition from skeleton to content IS the disruption you're trying to avoid

Spinners:
├── Draw attention to waiting (the spinner IS the content during loading)
├── Empty space with a spinner says "nothing is here yet"
├── Psychologically: spinner = uncertainty about what's coming
│
Shell-first loading:
├── The component looks "done" immediately — structure is visible
├── Data values appearing is a minimal change (numbers filling into existing layout)
├── Psychologically: the interface is already there, it's just populating
└── The user starts reading the structure before data even arrives
```

### Full-page loading

For initial page loads or heavy data fetches, a custom loading screen matching the app's environmental theme is appropriate:

```
Loading screen approach:
├── Design a loading animation that reinforces the material/brand
│   (scan lines for metal, ink spreading for paper, crystal forming for glass)
├── Keep it short — loading screens are not entertainment
├── Transition from loading screen to page should feel like "the world loaded"
│   not "a screen was removed to reveal another screen"
└── Use this ONLY for full-page loads, not individual component data fetches
```

### Loading state decision tree

```
Is this a full page loading for the first time?
└── YES → Custom loading screen matching the environmental theme

Is this a component waiting for data?
└── YES → Render the full shell immediately, fill data when ready

Is this a user-initiated action (button click, form submit)?
└── YES → Apply crafting-physics skill (sync strategy, timing, confirmation patterns)

Is this a background refresh (data updating behind the scenes)?
└── YES → No loading indicator at all — just swap the values silently
```

---

## Diagnostic Checklist

When reviewing a page or component, walk through these checks:

```
AESTHETIC DNA:
├── [ ] Has the aesthetic been decomposed beyond a single theme label?
├── [ ] Are all 10 dimensions rated (Era through Light)?
├── [ ] Is there a written profile phrase that captures the full aesthetic?
├── [ ] Do derived design decisions (material, color, animation) trace back to the profile?
└── [ ] Has the profile been updated after iteration/review?

HIERARCHY:
├── [ ] Is there a clear size ratio between primary and secondary elements?
├── [ ] Can you identify the most important element within 1 second?
└── [ ] Do peer elements feel equal (within 1.5:1 ratio)?

COMPONENT FAMILIES:
├── [ ] Do related components share animation, spacing, and border language?
├── [ ] Is variation between siblings subtle (10-20% range)?
└── [ ] Are components reused for the same purpose, not repurposed for different content?

SPACING:
├── [ ] Are there 3 clear spacing levels (tight/medium/wide)?
├── [ ] Does internal padding create enough figure-ground separation?
└── [ ] Does the gap between items reflect their relationship?

PROGRESSIVE DISCLOSURE:
├── [ ] Is the main surface scannable (stats, labels, icons — not paragraphs)?
├── [ ] Are section titles paired with brief orienting subtexts?
└── [ ] Is detailed explanation available behind an interaction?

COLOR:
├── [ ] Is 90%+ of the surface neutral?
├── [ ] Does color appear only where it signals something?
├── [ ] Is all text in neutral tones (no colored body text)?
├── [ ] Are colors solid (not opacity-computed)?

FOCUS:
├── [ ] Are focus items limited to 1-2 per page?
├── [ ] Does the rest of the system maintain enough consistency for focus items to stand out?
└── [ ] Is the focus differentiation subtle (one unique property, not many)?

VIEWPORT:
├── [ ] Do grid sections collapse after ~2 rows?
├── [ ] Can users see section boundaries without scrolling extensively?
└── [ ] Is total page depth within 3-5 viewport heights?

CONTENT DENSITY:
├── [ ] Are cards limited to 2-3 chunks each (stat + label, not paragraphs)?
├── [ ] Is surface-level text under ~5 words per element?
└── [ ] Are longer explanations behind interactions, not inline?

ENVIRONMENTAL THEMING:
├── [ ] Is there a defined material identity for the app?
├── [ ] Do borders, shadows, corners, and textures all derive from the same material?
├── [ ] Do spring parameters, hover effects, and transitions match the material?
├── [ ] Do visual and behavioral properties agree (no metal looks with rubber motion)?
├── [ ] Is the material layer separate from the content layer (themed structure, clean content)?
├── [ ] If two materials are used, is primary (structure) vs. secondary (interactive) clear?
├── [ ] Do atmospheric accents (decorative elements) reinforce rather than contradict the material?
├── [ ] Is the flat-design trap avoided (is there atmosphere, not just function)?
├── [ ] Is shadow direction consistent across all panels (one global light source)?
├── [ ] Do shadows use layered stacking (2-3 layers) rather than single blob shadows?
├── [ ] Are glow effects multi-layered (core + inner bloom + outer bloom)?
└── [ ] Are shadow colors tinted by the surface, not pure black?

EMPTY STATES:
├── [ ] Icon + short message (under 8 words), nothing more?
├── [ ] Consistent empty state treatment across all sections (same component family)?
└── [ ] No elaborate illustrations, animations, or emotional language?

LOADING STATES:
├── [ ] Are component shells rendered immediately before data arrives?
├── [ ] Does the component layout stay stable when data fills in (no CLS)?
├── [ ] Are skeletons and spinners avoided in favor of shell-first loading?
└── [ ] Does the full-page loading screen match the environmental theme?
```

---

## Scientific References

| Principle | Researcher(s) | Year | Application |
|-----------|---------------|------|-------------|
| Weber-Fechner Law | Weber, Fechner | 1834, 1860 | Hierarchy ratios — perceived difference is logarithmic |
| Stevens' Power Law | Stevens | 1957 | Size perception follows power function (exponent ~0.7) |
| Just-Noticeable Difference | Weber | 1834 | Component family variation threshold (10-15%) |
| Gestalt Laws | Wertheimer, Koffka, Kohler | 1912-1935 | Proximity, similarity, pragnanz — grouping and unity |
| Figure-Ground | Rubin | 1915 | Spacing creates perceptual separation |
| Cognitive Load Theory | Sweller | 1988 | Working memory limits constrain visible information |
| Working Memory Capacity | Cowan | 2001 | ~4 chunks simultaneously (refined from Miller's 7+/-2) |
| Information Theory | Shannon | 1948 | Signal-to-noise ratio — rare signals carry more information |
| Von Restorff Effect | von Restorff | 1933 | Isolated items are remembered better |
| Advance Organizers | Ausubel | 1960 | Framing context improves comprehension |
| F-Pattern Scanning | Nielsen | 2006 | Users scan in F-shape, skip dense paragraphs |
| Pre-attentive Processing | Treisman | 1980 | Single feature differences detected without conscious search |
| Stroop Effect | Stroop | 1935 | Colored text processed as visual element before readable content |
| Schema Theory | Bartlett | 1932 | Users build mental models of component purposes |
| Atomic Design | Frost | 2013 | Build from tokens → components → sections → pages |
| Aesthetic-Usability | Norman | 2004 | Attractive interfaces are perceived as more usable |
| Spatial Memory | Scarr et al. | 2013 | Users build spatial maps of page content |
| Attentional Capacity | Kahneman | 1973 | Finite attention budget per page |
| Dual Coding Theory | Paivio | 1971 | Visual + verbal processing use separate channels |
| Fitts's Law | Fitts | 1954 | Target acquisition time = f(distance, size) |
| Hick's Law | Hick | 1952 | Decision time increases with number of choices |
| Embodied Cognition | Lakoff, Johnson | 1980 | Abstract concepts understood through physical metaphors |
| Diegetic UI | Game design tradition | — | UI elements that exist within the world vs. overlaid on it |
| Mise-en-scene | Film theory | — | Every element in the frame contributes to mood |
| Change Blindness | Simons, Chabris | 1999 | Changes within stable frames go unnoticed |
| Cumulative Layout Shift | Web Vitals | 2020 | Layout stability metric — minimize reshaping on load |
| Cross-modal Correspondence | Spence | 2011 | Humans map properties across senses (visual motion → felt weight) |
| Kinesthetic Empathy | Reynolds, Reason | 2012 | Observing motion triggers felt sense in observer's body |
| Affordance Theory | Gibson, Norman | 1977, 1988 | Materials suggest interaction possibilities |
| Perceptual Realism | Ferwerda | 2003 | Subtle depth cues trigger physical object perception |
| Atmospheric Design | Kijima (PlatinumGames) | 2017 | Symbolism over literalism, physicalized flat design, constrained palettes |
| Three-Point Lighting | Film/3D tradition | — | Key + fill + rim lights create depth — maps to CSS shadow placement |
| Physically-Based Rendering | Cook, Torrance; Disney | 1982, 2012 | Material properties (roughness, metalness, emissivity) as measurable values for rendering |
| Layered Shadow Systems | Comeau | 2020 | Stacked box-shadows with consistent ratios simulate realistic light falloff |
| Bloom/Glow Falloff | HDR rendering tradition | — | Multi-layer glow at increasing radii simulates real light bleed past edges |
| Semantic Differential | Osgood | 1957 | Meaning measured along bipolar scales — maps any concept to dimensional space |

---

## Quick Reference Card

```
BOOTSTRAP:
Load profile (grimoires/aesthetic-profile.yaml) → or Interview → Tokens → Big → Small → Iterate

ON INVOCATION:
├── Profile exists? → Load it, confirm with user, proceed
├── No profile? → Run guided interview (Phases A–E), save to grimoires/
└── User says "update X" → Modify dimension/material, save, re-derive

AESTHETIC PROFILE (persistent across sessions):
├── References: what inspires, what to avoid
├── 10 DNA dimensions: Era, Technology, Condition, Temperature, Weight,
│                       Density, Movement, Mood, Formality, Light
├── Materials: primary + secondary (noun + surface + light behavior)
├── Effects: 2-3 observed effects from references
├── Palette: dominant neutral, accents, intensity
├── Profile phrase: "Far-future, weathered, mechanical, melancholic, dim"
├── Stored at: grimoires/aesthetic-profile.yaml
├── Variants: grimoires/aesthetic-profiles/<name>.yaml
└── Evolves through iteration — revision notes track changes

HIERARCHY (Weber-Fechner):
├── Peers: < 1.5:1 ratio
├── Clear: 2-3:1 ratio
├── Strong: 4:1+ ratio
└── Hero: 6:1+ ratio

COMPONENT FAMILIES (JND):
├── Clone: 0% variation (same purpose)
├── Sibling: 10-20% (related, different content)
├── Cousin: 30-50% (different section)
└── Unrelated: 50%+ (avoid on same page)

SPACING (Gestalt Proximity):
├── Three levels: tight, medium (2x), wide (4x+)
└── Padding creates figure-ground; gap creates grouping

DISCLOSURE (Signal-to-Noise):
├── Surface: stats, labels, icons, section titles
└── Hidden: paragraphs, help text, details, settings

COLOR (Information Theory):
├── 90%+ neutral surface
├── Color = signal (5-10% of surface)
├── No colored text
└── Solid colors over opacity

FOCUS (Von Restorff):
├── 1-2 focus items per page max
├── One unique property (not many)
└── Only works when the system is disciplined

VIEWPORT BUDGET:
├── Grid items: collapse after ~2 rows
├── Page depth: 3-5 viewport heights max
└── Each section earns its viewport share

CONTENT DENSITY (Cognitive Load):
├── Cards: 2-3 chunks max (number + tag)
├── Surface text: under 5 words per element
└── Long text → behind interactions

ENVIRONMENTAL THEMING (Embodied Cognition):
├── Derive material from brand references (any material, not limited to presets)
├── Visual: borders, shadows, corners, textures → from material
├── Behavioral: spring params, hover, press, drag, scroll → from material
├── Visual + behavioral must agree (metal looks + metal motion = coherent)
├── Max 2 materials: primary (structure) + secondary (interactive)
├── Material = container, Content = clean and readable
├── Atmospheric accents reinforce the world, never contradict
├── Suggest through symbolism, never state literally
├── Physicalize flat design with subtle screen effects
├── Constrain palette, solve readability without color
├── Simple surface, powerful depth (invisible complexity)
├── Animations feel alive (fluid continuity), not functional (binary states)
├── Unified visual identity across ALL screens and modes
└── Intentional rule-breaking only when system is 95%+ consistent

MATERIAL-TO-CSS TRANSLATION:
├── Three-point lighting: key (directional shadow) + fill (ambient) + rim (edge highlight)
├── PBR mapping: roughness → shadow blur, metalness → gradient sharpness
├── Layered shadows: 3+ stacked box-shadows, each doubling blur & halving opacity
├── Multi-layer bloom: core (tight/bright) + inner (medium) + outer (wide/faint)
├── Shadow color: tinted by surface, never pure black
├── Consistent light direction across all panels on the page
└── Physicalized flat design: clean content ON a textured medium (Kijima principle)

EMPTY STATES:
├── Icon + short message (< 8 words)
├── Consistent across all sections
└── No illustrations, no animations, no emotional language

LOADING STATES (Change Blindness):
├── Render shell immediately, fill data later
├── No skeletons, no spinners for component data
├── Full-page loads: themed loading screen
└── Background refreshes: silent swap, no indicator
```
