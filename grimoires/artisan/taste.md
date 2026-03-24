# Taste Tokens

> Extracted from 77 practitioners across dsaints.com (666 curated)
> Source: `grimoires/the-easel/research/dsaints-craft-synthesis.md`
> Date: 2026-03-24

---

## Warmth

Warmth is a specifiable material property — not a mood, not a vibe. It is border-radius values, spring constants, typeface metrics, color temperature offsets, and whitespace ratios.

### Tokens

| Token | Value | Source | Rationale |
|-------|-------|--------|-----------|
| `--warmth-radius` | `0.625rem` (10px) | Fukasawa R2.5 | Edges tuned to skin-softness mapping. Not rounded-for-rounded's-sake. |
| `--warmth-radius-sm` | `0.375rem` (6px) | Fukasawa | Smaller elements, proportional softness. |
| `--warmth-radius-lg` | `1rem` (16px) | Fukasawa | Cards, panels — the "held object" radius. |
| `--warmth-spring-tension` | `170` | Emil Kowalski | Default spring stiffness. Responsive but not snappy. |
| `--warmth-spring-friction` | `26` | Emil Kowalski | Higher friction = more deliberate feel. Not bouncy. |
| `--warmth-spring-mass` | `1` | Emil Kowalski | Default mass. Increase for heavy elements. |
| `--warmth-typeface` | Humanist sans | Spiekermann | Open counters, rounded terminals, calligraphic origins. FF Meta principle. |
| `--warmth-color-shift` | `+5 hue toward orange on warm surfaces` | Schoger | Programmatic warm color offset in oklch. |
| `--warmth-line-height` | `1.6` | Santa Maria | "Adequate margins allow text to breathe." Generous, not packed. |

### Principles

1. **Warmth is engineered.** Specify it in tokens. If you can't parameterize it, you don't understand it yet. (Spiekermann, Fukasawa, Emil)
2. **Precision is the container for warmth.** Swiss precision and warmth are not opposites — the tension between rigor and personality is THE generative force. (Eisenberg)
3. **Beautiful defaults, full escape hatch.** Choose well for the user. Caring is opinionation. (Emil/Sonner)
4. **Subliminal coherence.** Works like background music — generating mood without conscious registration. If users think about the warmth, it's too loud. (Spiekermann)
5. **Accessibility IS warmth.** Respecting `prefers-reduced-motion` isn't compliance — it's caring. (Comeau, Soueidan)

### Anti-Patterns

- Decoration without structural basis
- "Fun" animations on high-frequency actions (violates Rauno's frequency-novelty curve)
- Cheerful copy masking cold interaction patterns
- Warmth through illustration while the interface itself is sterile

---

## Weight

Weight is physics. Spring resolution, elevation, shadow depth, transform-origin, optical sizing. Elements that move like they have mass feel more trustworthy than elements that teleport.

### Tokens

| Token | Value | Source | Rationale |
|-------|-------|--------|-----------|
| `--weight-shadow-sm` | `0 1px 2px oklch(0 0 0 / 0.05)` | Schoger | Subtle elevation. Perceived depth without skeuomorphism. |
| `--weight-shadow-md` | `0 4px 6px oklch(0 0 0 / 0.07), 0 1px 3px oklch(0 0 0 / 0.04)` | Schoger | Layered shadow = perceived mass. |
| `--weight-shadow-lg` | `0 10px 15px oklch(0 0 0 / 0.1), 0 4px 6px oklch(0 0 0 / 0.05)` | Schoger | Cards that feel held. |
| `--weight-spring-heavy` | `tension:120, friction:14, mass:1.5` | Emil, Comeau | Heavy elements: slow settle, slight overshoot (2-3px). Stone doesn't ease — it settles. |
| `--weight-spring-light` | `tension:300, friction:30, mass:0.8` | Emil, Comeau | Light elements: snap quickly, high damping. |
| `--weight-transform-origin` | `from trigger` | Emil | Popovers emerge from their trigger. Spatial weight anchors to cause. |
| `--weight-z-substrate` | `0` | Duarte | Three-plane z-index: substrate / grid / content. |
| `--weight-z-grid` | `10` | Duarte | Mid-plane for structural elements. |
| `--weight-z-content` | `20` | Duarte | Foreground content sits on top. |

### Principles

1. **Structure IS surface.** Material honesty — oklch colors, structural shadows, materials that are what they appear. (Ive, Newson)
2. **Scale collapse.** Same logic at every size. Component logic holds from smallest token to largest layout. (Newson, Dye)
3. **Optical sizing.** Components adjust visual weight based on context. Classical typography redraws fonts at different sizes — components should too. (Saarinen)
4. **Performance IS weight.** Sub-100ms latency changes what components need to be. If it isn't fast, it isn't substantial. (Rogge, Fino)
5. **The feel is the brand.** Specific weight and friction act as signature, like a luxury car door closing. (Matas)

### Anti-Patterns

- Visual heaviness mistaken for weight (thick borders, dark backgrounds)
- Weight through decoration rather than structure
- Equal weight everywhere — without hierarchy, nothing has weight
- Weight that doesn't survive accessibility contexts (must be structural, not color-dependent)

---

## Rhythm

Rhythm is temporal AND spatial. When things appear matters as much as how they're spaced. Frequency-novelty determines intensity. Composition requires slots and subcomponents, not boolean props.

### Tokens

| Token | Value | Source | Rationale |
|-------|-------|--------|-----------|
| `--rhythm-space-unit` | `0.5rem` (8px) | Schoger | Base unit. Architectural modularity. |
| `--rhythm-space-related` | `1rem` (16px) | Alexander (The Void) | Between related elements — reads as grouped. |
| `--rhythm-space-unrelated` | `3rem` (48px) | Alexander (The Void) | Between unrelated sections — reads as separate. |
| `--rhythm-stagger` | `60ms` | Emil | Base stagger for sequential reveals. Noise variation: +/- 15ms. |
| `--rhythm-mount-duration` | `200ms` | Pedro Duarte | Mount animation. Scale + opacity entrance. Never scale-from-zero. |
| `--rhythm-unmount-duration` | `150ms` | Pedro Duarte | Unmount animation. Slightly faster than mount — departure is quicker. |
| `--rhythm-toast-lifecycle` | `appear→stack→hover-pause→dismiss` | Emil/Sonner | The canonical interaction arc. |
| `--rhythm-disclosure` | `progressive` | Wroblewski | Reveal complexity as competence grows. Temporal rhythm. |

### Principles

1. **Frequency-novelty curve.** The more common an action, the less animation it deserves. High-frequency actions should be near-invisible. (Rauno)
2. **Animate mount AND unmount.** Incomplete lifecycle destroys rhythm. Radix suspends unmount while animation plays. (Pedro Duarte)
3. **Noise over metronome.** Perfect timing feels robotic. Add slight variation to stagger, duration, or amplitude. (Vachhar)
4. **Rhythm requires composition.** Slots and subcomponents, not boolean props. Rhythm cannot be enforced by rigid config — it must be composed. (Frost)
5. **Emotional arc.** Map the full journey rhythm, not just within-component rhythm. "Snow White" storyboarding. (Chesky)

### Anti-Patterns

- Animating everything equally (violates frequency-novelty)
- Perfect mathematical timing (metronome, not music)
- Rhythm only in space, not in time (disclosure, loading, state transitions)
- Teleportation — elements appearing without transition (Nabors: disorients the brain)

---

## Cross-Cutting Tokens

### The 90/10 Rule (Saarinen, Teixeira, Matas)

90% of the UI is rigid system. 10% is intentional craft violation where the soul lives. The warm, soul-giving 10% must be protected FROM the system, not BY it.

### The Caliber Model (Saarinen via Linear)

Three-layer token architecture: **Primitive** (raw values) → **Semantic** (meaning-bearing) → **Component** (contextual). Warmth, weight, rhythm are complications on the caliber, not the caliber itself. The caliber is the token architecture, the type scale, the spacing grid.

### The Invisible Designer (Ive, Fukasawa, Andersson)

If users think about the design, something is wrong. The system should feel inevitable, not designed. Software as furniture — durable, functional, invisible until needed.

### Memory as Interface (Fukasawa, Dye)

Patterns should feel familiar before they're learned. The most powerful interfaces leverage what users already know. The unconscious affordance.

### Constraint as Generative Force (Wathan, Paco, Burka)

The fewer typefaces, the more each earns its place. The fewer animation curves, the more each communicates. Total freedom is the enemy of high-level craft.

---

## The Practitioner Canon

20 practitioners whose work most directly informs these tokens:

**Warmth**: Naoto Fukasawa, Emil Kowalski, Erik Spiekermann, Tina Roth Eisenberg, Josh Comeau
**Weight**: Jony Ive, Marc Newson, Karri Saarinen, Steve Schoger, Matias Duarte
**Rhythm**: Rauno Freiberg, Pedro Duarte, Brad Frost, Rachel Nabors, Luke Wroblewski
**Meta**: Rasmus Andersson, Dylan Field, Gavin Nelson, shadcn, Sara Soueidan

Full provenance: `grimoires/the-easel/research/dsaints-craft-synthesis.md`
