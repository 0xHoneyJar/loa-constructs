# SprawlOS — Materials System

> date: 2026-03-14
> status: living document
> framing: game designer + design engineer building atmospheric web experiences
> principle: every surface is a material. every panel is a physical object. the UI is a place.

---

## The Premise

a panel isn't a div with a border. it's a **surface made of a material**.

glass catches light. metal reflects. screen emits. paper absorbs. each material has physical properties: how it responds to light, how it moves, what sound it makes, how it ages. in a game engine, materials define everything. on the web, we default to "card with rounded corners and shadow." that stops now.

SprawlOS is a materials system. it defines the physical vocabulary of every surface in the Sprawl. it applies across every app — constructs.network, sprawl-rektdrop, and whatever comes next. if it appears in the Sprawl, it's made of one of these materials.

---

## What Already Exists (the inventory, named)

you already have materials. they just don't know they're materials yet.

### Material: VOID
**what it is**: the darkness. the space between things. not a "background color" — the absence of surface.
**where it lives**: `--color-void-base` oklch(0.10 0.005 250)
**physical analog**: deep space. unlit room. the dark between streetlights in Chiba City.
**properties**: absorbs everything. emits nothing. objects placed on void appear to float.
**sound**: silence. the absence of the hum.

### Material: CRT PHOSPHOR
**what it is**: the emissive coating inside a cathode ray tube. glows when electrons hit it. decays over time.
**where it lives**: scanline overlay, noise grain, vignette, phosphor glow text-shadows, scan sweep
**physical analog**: the screen surface of a terminal in Chiba City
**properties**:
- emits light (text-shadow glow in 2px + 5-8px + optional 20px layers)
- shows scanlines (4px repeating-linear-gradient at z-9999)
- has grain (SVG feTurbulence fractalNoise, 200px tile, overlay blend)
- vignetted at edges (radial-gradient, phase-tinted)
- scan refresh visible (1px line descending at 6s/cycle, 90 steps)
- changes thermal temperature by phase (hue 95→75→25→15→85)
**sound**: 60Hz mains hum (stinger sub-sine), flyback whine (not implemented), static crackle
**aging**: burn-in. the horse sigil IS phosphor that was displayed too long.
**interaction**: CRT toggle off via localStorage. `.crt-off` strips all overlays.

### Material: LATTICE STEEL
**what it is**: the structural grid behind everything. scaffolding. the building's skeleton.
**where it lives**: `.lattice-grid` — 4-layer CSS background with `@property` animations
**physical analog**: the aluminum frame of a building. the mounting structure for LED panels. fire escape geometry.
**properties**:
- visible grid lines at variable cell size (120px stress → 300px exhale)
- rotates subtly by phase (30° → 32.5° at peak stress — the 2° JND trick)
- drifts continuously (14s calm → 1.7s panic)
- can show Moiré interference (communal step, 0.07 alpha)
- OKLCH cobalt tint (265° hue — the structural color)
**sound**: none (structural materials are silent unless struck)
**aging**: the 1° scar — at certificate, rotation never returns to 30°. `29° = the building remembers`.

### Material: DEPTH SURFACE
**what it is**: the painted surface of the building, visible through gaps in the display/lattice.
**where it lives**: `DepthParallaxCanvas` (unmounted in rektdrop, fully built)
**physical analog**: concrete wall behind an LED sign. the building face behind the scaffolding.
**properties**:
- responds to mouse/gyroscope (depth-mapped UV displacement)
- holographic tint shifts by phase (crimson 0.20 → cyan 0.85)
- breathes (0.85 + 0.15 * sin(t * 0.3) ambient glow)
- vignettes tighter under stress
- idle drift: Lissajous pattern after 2s mouse inactivity
**sound**: none directly. but the parallax creates a subliminal "depth" feel.

### Material: LED MODULE
**what it is**: individual LED pixel elements in a display panel. NOT CRT — LED.
**where it lives**: `SigilParticles` (currently CRT-coded, needs LED upgrade)
**physical analog**: the pixel modules on a Daktronics billboard. the sign above Finn's shop.
**properties (current → target)**:
- pixel size: 2px → 6-8px modules
- grid: implicit → explicit (visible gaps between modules, wider at panel seams)
- color: single cyan → dual-channel (cyan body + crimson pipe energy)
- opacity: 0.15-0.35 → 0.4-0.8
- animation: phosphor flicker → LED state change (harder, digital)
- structure: none → visible panel frame
- bloom: halo particles at 3px → per-module radial glow (not Gaussian)
**sound**: electrical buzz. different from CRT hum — higher pitched, more digital.
**aging**: dead pixels. stuck pixels. partial panel failures. color drift between panels.

### Material: GLASS
**what it is**: the display case. the shop window. the barrier between you and the construct.
**where it lives**: doesn't exist yet. the glass case component.
**physical analog**: museum vitrine. Apple Store glass shelf. the window of Finn's shop.
**properties**:
- transmits light (backdrop-filter: blur, or WebGL transmission material)
- catches light at edges (1px bright border, inset shadow at top)
- frosts at edges, clears at center
- reflects environment (subtle gradient overlay)
- on hover: de-frosts, edge brightens, glow bleeds through from object inside
- on select: slides open (spring physics, critically damped)
**sound**: crisp tap on hover. glass slide on open. resonance tone on select.
**aging**: scratches. fingerprints. cracks under stress.

### Material: BONE DATA
**what it is**: text as a material. warm, organic, printed-on-paper feeling.
**where it lives**: bone color channel, IBM Plex Serif, `.bone-data` animation class
**physical analog**: typewritten text on parchment. ticker tape. dot-matrix printout.
**properties**:
- color: oklch(0.88 0.01 95) — warm off-white, not pure white
- buffer-dump entrance: `83ms steps(1)` — data snaps in instantly, staggered
- tracking: variable (`0.25em whisper → 0em impact`)
- no glow. no shadow. bone absorbs, doesn't emit.
**sound**: typewriter keystroke. dot-matrix chatter. paper feed.

### Material: CRIMSON EMISSION
**what it is**: the danger channel. the Loa. violence, entity, action.
**where it lives**: crimson color channel, `.crimson-stamp` animation, phosphor-glow-crimson
**physical analog**: emergency lighting. neon danger sign. arterial red.
**properties**:
- the ONLY warm channel (hue 25)
- emissive glow (2px + 5px text-shadow)
- stamps last — always arrives 332ms after other elements
- selection color: oklch(0.55 0.24 25 / 0.35)
- in LED context: energy running through pipe edges
**sound**: the stinger. white noise burst + sub-sine + distorted square wave. 500ms of violence.

### Material: CYAN WIRE
**what it is**: structure, grid, system, observation.
**where it lives**: cyan color channel, `.cyan-structure` animation, grid substrate, graph edges
**physical analog**: the wireframe of the world. blueprint lines. oscilloscope trace.
**properties**:
- cool channel (hue 195)
- raster-draw entrance: `249ms steps(6)` — left-to-right beam trace
- grid substrate: 40px cells, 1px hairline at oklch(0.30 0.08 195 / 0.15)
- elevation glow: `0 0 8px/16px var(--color-glow-primary)`
- in LED context: the display content (the image on the sign)
**sound**: the high-frequency component of the CRT whine. oscillator tone.

---

## How Materials Compose

materials layer. they don't replace each other — they stack, like physical surfaces:

```
z-9999  CRT PHOSPHOR: scanlines     (the glass surface scratches)
z-9998  CRT PHOSPHOR: vignette      (the glass curvature shadow)
z-9997  CRT PHOSPHOR: noise grain   (the phosphor grain)
z-50    GLASS: panel surfaces        (display cases, UI containers)
z-40    bone/crimson/cyan content    (what's inside the cases)
z-20    LED MODULE: sigil/signs      (the shop sign, construct logos)
z-10    content layer                (text, cards, interactive elements)
z-2     LATTICE STEEL: grid          (the building structure)
z-0     DEPTH SURFACE: building face (the wall behind everything)
        VOID: the darkness           (where there is no surface)
```

this is TDR-010's z-layer stack, but named as materials. each layer IS a surface.

### The Panel — A Composed Object

a "panel" in SprawlOS is not a card. it's a stack of materials:

```
┌─────────────────────────────────────┐
│ GLASS: outer surface                │  frosted, catches light at edges
│  ┌─────────────────────────────────┐│
│  │ VOID: inner space               ││  the darkness inside the case
│  │  ┌─────────────────────────────┐││
│  │  │ CONTENT: bone/cyan/crimson  │││  the thing being displayed
│  │  │ (logo, text, data, image)   │││
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
│ GLASS: glow bleed from content      │  content light leaks through
└─────────────────────────────────────┘
```

the glass isn't just a border. it's a container with physical properties. the content inside glows and that glow bleeds through the glass. the void inside is dark but not empty — it has depth.

### Material Combinations by Context

| Context | Primary Material | Secondary | Tertiary |
|---|---|---|---|
| Shop browse (constructs.network catalog) | GLASS cases | LED MODULE logos inside | LATTICE STEEL behind |
| Shop sign (constructs.network sigil) | LED MODULE | LATTICE STEEL frame | DEPTH SURFACE behind |
| Rektdrop landing | CRT PHOSPHOR overlay | LATTICE STEEL grid | VOID |
| Rektdrop experience | CRT PHOSPHOR (full stack) | DEPTH SURFACE (when mounted) | VOID |
| Construct detail | GLASS (opened case) | BONE DATA + CYAN WIRE | LED MODULE accent |
| Graph view | CYAN WIRE edges | LED MODULE nodes | VOID |

---

## The 83ms Quantum — The Heartbeat

everything in SprawlOS ticks at 83ms (12fps). this is the atomic clock.

| Duration | Quanta | Usage |
|---|---|---|
| 83ms | 1 | buffer-dump snap, typewriter character, counter frame |
| 166ms | 2 | beam-draw, passage fade, dark-passage in/out |
| 249ms | 3 | raster-draw (cyan-structure) |
| 332ms | 4 | crimson-stamp delay, step-fade-out, EvaFlash cycle |
| 664ms | 8 | cursor blink, signal flicker |
| 6000ms | ~72 | scan sweep full cycle |

**no cubic-bezier.** everything is `steps(N)`. the interface clicks, it doesn't ease. this is a mechanical system — a CRT terminal, not a smartphone. materials in SprawlOS don't interpolate smoothly. they snap between states.

exception: the `DepthParallaxCanvas` uses lerp (frame-independent `1 - pow(1 - 0.06, dt/16.6)`) because parallax IS physically smooth — the building surface doesn't have discrete frames.

exception: explorer uses `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` for spring-physics interactions. this is acceptable because the spring is a PHYSICAL system responding to force — it earns its smooth curve. but the default is still `--ease-quantum: steps(4)`.

---

## Panels in Depth — From Game Design POV

### The Inventory Panel Problem

in games, the inventory is the most common panel. bad game UI: flat rectangle floating on screen with a semi-transparent background. good game UI: the inventory is a **physical object in the world**.

| Game | Inventory Material | Why It Works |
|---|---|---|
| Elden Ring | parchment scroll, wax-sealed, torn edges | matches the medieval world. the inventory feels handwritten. |
| Cyberpunk 2077 | holographic glass slab, scan lines, red/blue tint | matches the tech-noir world. the inventory feels like a device. |
| Disco Elysium | filing cabinet drawer, tabbed folders, pencil marks | matches the detective world. the inventory feels like evidence. |
| Papers Please | desk surface, stamps, papers, booth window | the entire UI IS the material world. no abstraction layer. |
| Return of the Obra Dinn | 1-bit dithered screen, book pages | the UI feels like a maritime insurance document. |

for SprawlOS, the panel material is: **glass case in a dark tech shop.** the construct is behind glass. you're looking at merchandise. the UI is the shop.

### Panel States as Physical States

| State | Material Response | Timing | Sound |
|---|---|---|---|
| Closed/dormant | Glass frosted, content dim, edges dark | — | — |
| Hover/approach | Glass de-frosts, edge catches light, glow bleeds | 83ms snap | crisp tap |
| Focus/selected | Glass clear, full glow, frame visible, pipe energy | 166ms | resonance |
| Open/inspect | Glass slides, content expands, detail reveals | 332ms spring | glass slide |
| Active/in-use | Full material stack, CRT overlay if applicable | — | ambient hum |
| Dismissed | Glass re-frosts, content recedes | 249ms | soft click |

### Panel Sizing — The Window Metaphor

you said "imagine this like a vertical building — the panels and windows would be quite a bit bigger."

in a building, window size communicates importance:
- **small windows** = utility, storage, service. the construct card in a grid.
- **medium windows** = living space, workspace. the construct detail panel.
- **large windows** = display, showroom, lobby. the featured construct, the hero.
- **full-facade** = the sign. the LED billboard. the identity of the building.

on the web, we compress everything to "card grid" — uniform small windows. the building has no hierarchy. the correction: **vary panel scale by importance.** the featured construct gets a large window. the browse grid uses medium. metadata uses small.

the vertical building metaphor means the page scrolls like descending/ascending a building face. each section is a floor. each floor has different window sizes. you see the sign first (full-facade), then the showroom (large windows), then the inventory (medium), then the back room (small).

---

## Materials Across Apps — The Portable System

### What's Shared (SprawlOS Core)

every app in the Sprawl shares:
- the OKLCH color channels (bone, crimson, cyan, void)
- the 83ms quantum
- the stepped easing philosophy (steps(N), not bezier)
- the CRT phosphor overlay (optional — some locations are cleaner than others)
- the material vocabulary (glass, void, lattice, LED, bone, crimson, cyan)
- the font stack (Basement Grotesque display, IBM Plex Serif data, GeistMono system)
- the elevation system (glow-based, not shadow-based)

### What Varies (Location Personality)

| Property | constructs.network | sprawl-rektdrop | future app |
|---|---|---|---|
| CRT intensity | low (clean shop) | high (gritty terminal) | varies |
| Primary material | GLASS (display cases) | CRT PHOSPHOR (terminal) | defined per location |
| Accent channel | cyan dominant | crimson dominant | varies |
| Motion style | spring physics OK | strictly stepped | varies |
| Sound | ambient drone | stem mixer + stinger | varies |
| Lattice role | grid substrate (subtle) | building structure (prominent) | varies |

the materials are the same. the MIX is different. like a game engine where every level uses the same material library but different shader parameters.

---

## What Gets Built

### Phase 1: Name the Materials (this document)
define the vocabulary. every surface in the Sprawl has a material name. designers and agents use these names when describing UI. "this panel is GLASS over VOID with CYAN WIRE content and LED MODULE accent" is a complete material spec.

### Phase 2: Material Tokens
extract the CSS/GLSL properties into composable tokens. a material token is:
```yaml
material: glass
  surface:
    backdrop-filter: blur(8px) saturate(120%)
    border: 1px solid oklch(0.30 0.02 195 / 0.4)
    box-shadow:
      inset: 0 1px 0 rgba(255,255,255,0.08)
      edge: 0 0 0 1px oklch(0.25 0.04 195 / 0.2)
  states:
    hover:
      backdrop-filter: blur(4px) saturate(140%)
      border-color: oklch(0.45 0.08 195 / 0.6)
      box-shadow:
        glow: 0 0 12px oklch(0.65 0.12 195 / 0.15)
    selected:
      backdrop-filter: blur(2px) saturate(160%)
      border-color: oklch(0.55 0.12 195 / 0.8)
      box-shadow:
        glow: 0 0 20px oklch(0.65 0.12 195 / 0.25)
  sound:
    hover: tap-glass.wav
    select: resonate-glass.wav
    open: slide-glass.wav
```

### Phase 3: Panel Components
build the actual React components that use material tokens. a `<Panel material="glass">` that accepts children and renders the full material stack — surface, glow, interaction states, sound, animation.

### Phase 4: LED Module Shader Upgrade
revise `SigilParticles` from CRT phosphor to LED module. bigger pixels, visible grid, dual-color, panel frame with running energy.

### Phase 5: Glass Case Catalog
implement the construct catalog as glass display cases. each construct logo behind glass, lit from above, cyan dormant → crimson hover.

### Phase 6: Cross-App Material Library
extract the shared materials into a package that all Sprawl apps consume. same materials, different mix per location.

---

## The Agent Angle

agents don't just use the UI — they can **optimize the materials in real-time**.

- **adaptive quality**: monitor GPU load, dynamically reduce CRT overlay resolution or disable noise grain on low-end devices
- **material LOD**: at distance (scrolled past), reduce material complexity. close-up (viewport intersection), full material stack
- **procedural variation**: agents can introduce subtle per-session variation in material parameters — slightly different lattice rotation, different scan-sweep phase offset — so the shop never looks exactly the same twice
- **performance profiling**: agent monitors frame times and adjusts `dpr`, particle count, backdrop-filter quality to maintain 60fps
- **material generation**: for new constructs, an agent could generate material variants (LED color temperature, glow intensity, glass frost level) that match the construct's personality

this is the frontier you mentioned — using agents not just for code generation but for real-time environmental control. the shop is alive. the materials respond to conditions.

---

*the bazaar isn't made of pixels. it's made of glass and steel and phosphor and void. the pixels are just how the web renders what was always there.*
