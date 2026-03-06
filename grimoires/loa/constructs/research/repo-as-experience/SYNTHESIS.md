# Repo as Experience — Research Synthesis

_Generated from 6 deep research topics via gemini-3-pro-preview + Google Search + Firecrawl_
_Synthesized: 2026-03-05_

## The Core Insight

The top 0.1% of developer tool companies don't separate marketing from engineering. They treat the repository, README, CLI output, and landing page as a **single progressive disclosure experience** that performs the product's value proposition rather than describing it.

For the Constructs Network, this means: the repo must PERFORM the perceptual shift — "your agent doesn't just do more, it SEES differently" — not explain it.

---

## 5 Actionable Principles (from research)

### 1. Time-to-Dopamine < 120 seconds
The gap between landing on the repo and feeling a rush of capability must be under 2 minutes. Our current "69 seconds from template to pushed construct" is strong. But the MARKETPLACE experience (browsing constructs.network) needs the same treatment.

**Action**: Zero-config playground. A visitor should see a construct working WITHOUT installing anything. Live demo on the detail page showing before/after agent behavior.

### 2. Visual Diff > Feature List
Never list features. Show a side-by-side comparison of "Standard Agent" vs "Construct-Equipped Agent." The visual diff IS the pitch.

**Action**: Every construct README hero section should be a two-column code comparison. Left = generic agent output. Right = construct-equipped output. The code speaks.

### 3. Copy That Demonstrates, Not Describes
- "Don't prompt-engineer expertise. Install it." (best one-liner from research)
- Formula: `[Verb] [Noun] that [Superpower] without [Pain]`
- Zero adjectives. Precision builds trust, hype destroys it.
- The Armorer voice: we're not the hero, the developer is. We provide legendary weapons.

**Action**: Rewrite constructs.network hero to demonstrate, not describe. Kill all adjectives.

### 4. Containerized Intelligence (Visual Identity)
The research synthesized the visual identity as: **magic inside a reliable package**.
- Container = rigid, geometric, glass-like (infrastructure trust)
- Content = glowing, gradient-based, alive (intelligence signal)
- Primary color: Violet/Indigo (`oklch(65% 0.2 280)` / `#8B5CF6`)
- Dark-mode-first. Never pure black — chromatic dark (`#0B0C0E`)
- Inter or Geist with `cv11, cv05, tnum, zero, ss01` OpenType features
- 4px grid. Inner shadows instead of borders. Custom cubic-beziers for motion.

**Action**: Logo should embody "containerized intelligence" — geometric containment with an inner glow. The construct card component on the marketplace should use glassmorphism + inner borders (the "Linear look").

### 5. Marketplace = Talent Agency, Not Package Registry
"The Constructs Network is not a package repository; it is a talent agency for artificial intelligence."

The primary metadata shown should be:
- Cognitive Frame (how it thinks)
- Voice (how it speaks)
- Boundaries/Refusals (what it won't do — this builds trust)
- Composition graph (who it works well with)

NOT: version number, download count, file size.

**Action**: Redesign construct detail page. Lead with identity (persona, voice, boundaries), not utility (install command, version). Show "Teams that hired X also hired Y" based on co-installation data.

---

## Visual Identity Decisions (Ready for Logo)

| Element | Decision | Source |
|---------|----------|--------|
| Primary Color | Violet/Indigo `#8B5CF6` | "The bridge between blue infrastructure and purple magic" |
| Background | Chromatic Dark `#0B0C0E` | Never pure black — reduces halation |
| Surface | `#16181D` | Cards, panels, elevated areas |
| Border Style | Inner shadows (`box-shadow: inset`) | Not CSS borders — "cut glass" feel |
| Typography | Inter or Geist + OpenType features | `cv11, cv05, tnum, zero, ss01` |
| Grid | 4px base unit | All spacing in multiples of 4 |
| Border Radius | 6-8px | Modern "squircle" without looking bubbly |
| Animation | Custom cubic-bezier, not ease-in-out | "Snap": `cubic-bezier(0.23, 1, 0.32, 1)` |
| Logo Direction | Geometric container + inner radiance | Hexagon/polygon with violet inner glow |
| README Hero | SVG schematic (dark mode native) | Input -> [Construct Logic] -> Output |

---

## What You Need to Produce (Visual Assets)

1. **Logo**: Geometric container shape (hex/polygon) with inner violet glow. Must work at favicon (16px) and hero (400px+) scale. SVG format.

2. **README Hero Image**: Dark SVG showing the construct flow — Input -> [Named Expertise] -> Transformed Output. Should be a schematic, not marketing art.

3. **Before/After Demo Recording**: 15-second terminal recording showing generic agent vs construct-equipped agent solving the same problem. Use asciinema or Screen Studio.

4. **Construct Card Component**: Glassmorphism card with inner borders showing persona, voice, boundaries. Screenshot for social sharing.

---

## Copy Framework

### Tagline Options (from research synthesis)
1. "Don't prompt-engineer expertise. Install it."
2. "Named AI expertise for your coding agent."
3. "Your agent doesn't just do more. It sees differently."

### Voice (The Armorer)
- Precise, respectful of craft, slightly esoteric
- Never the hero — the developer is the hero
- We provide legendary weapons (constructs)
- Clinical and confident, never enthusiastic
- "Version 2.0 introduces..." not "We're excited to launch..."

### Banned Words
exciting, incredible, massive, revolutionary, game-changing, blazing, easy, simple, powerful, seamless, cutting-edge, next-generation, best-in-class

---

## Implementation Priority

1. **Logo + Visual Identity** — needed for everything else
2. **constructs.network hero rewrite** — demonstrate, not describe
3. **Construct detail page redesign** — talent agency framing (identity > utility)
4. **Before/After demo recording** — the 15-second proof
5. **README hero SVG** — dark-mode native schematic
6. **Changelog as marketing** — Linear-style momentum pattern for marketplace, Stripe-style utility pattern for SDK

---

## Research Files

| Topic | File | Size |
|-------|------|------|
| Discovery (10 queries) | topic-discovery.md | 77K |
| README as Tutorial Level | readme-as-tutorial-level_deep.md | 13K |
| Copy That Demonstrates | copy-that-demonstrates_deep.md | 16K |
| Visual Identity | visual-identity-dev-tools_deep.md | 15K |
| Marketplace as Experience | marketplace-as-experience_deep.md | 13K |
| Video Demo Patterns | video-demo-patterns_deep.md | pending |
| Selling Through Experience | selling-through-experience-philosophy_deep.md | pending |
