# SprawlOS Direction Handover — Comprehensive Context Transfer

> date: 2026-03-14
> session: gecko + artisan deep research on environment, world-building, materials, operator framing
> artifacts produced: grimoires/gecko/sprawlos-materials.md, grimoires/gecko/glass-case-research.md, grimoires/gecko/research-cinema-led-venues.md
> status: research phase complete, implementation spec next

---

## Use This Prompt To

Pick up the SprawlOS visual direction for constructs.network and sprawl-rektdrop. This document captures a full session of deep research and design thinking about what the Sprawl ecosystem looks like, feels like, and how it should be built. You are continuing from a defined position — the research is done, the direction is set, what follows is specification and implementation.

---

## The Sprawl — What It Is

The Sprawl is a cyberpunk ecosystem of web applications that share a visual identity, material system, and world-building vocabulary. It is named after William Gibson's Sprawl trilogy (Neuromancer, Count Zero, Mona Lisa Overdrive). Everything in the Sprawl exists as a location, event, or entity within a coherent fictional world.

### Two Locations (So Far)

**constructs.network** — The shop. A marketplace and roster of AI agent constructs. Think: Finn's shop in Chiba City where you buy reconditioned cyberdecks under the counter. Or the Afterlife bar in Cyberpunk 2077 where the drinks are named after dead legends. 23 constructs, each an elite specialist in their domain. The shop sign is a massive LED horse-mark billboard on the building facade. Inside: a roster board displaying operator standings.

**sprawl-rektdrop** (renaming from rektdrop-interface) — The arena. A location in the Sprawl where you go to have your crypto losses measured, certified, and turned into social currency. The experience is a 5-step state machine (scanning → computing → tier → loss → certificate) wrapped in a CRT terminal aesthetic with phase-driven visuals and sound. The building has its own facade with a crimson-tinted version of the horse mark.

Both locations share the same visual DNA but have different temperature:
- constructs.network = cyan dominant (observation, system, structure)
- sprawl-rektdrop = crimson dominant (the Loa, danger, confrontation)

They are in the same city. You can see one building's sign from the other.

---

## The Color Palette — Hard Constraints

Four colors. That's it. No exceptions.

| Channel | OKLCH | Role | Usage |
|---|---|---|---|
| **Bone** | oklch(0.88-0.97 0.005-0.01 95) | Data, text, insignia, logos | ALL construct logos are bone on void. All text is bone. |
| **Cyan** | oklch(0.85 0.15 195) | Structure, grid, system, observation | Wireframes, grid lines, glow (constructs.network accent) |
| **Crimson** | oklch(0.55 0.24 25) | The Loa, danger, active state, entity | Active deployment indicator, the stinger, hover state (rektdrop accent) |
| **Void** | oklch(0.08-0.10 0.005 250) | Background, absence, the dark | The room itself. Where there is no surface. |

**What this means:**
- No graduation colors. No green for stable, no amber for beta, no orange for experimental. Graduation status is communicated through TREATMENT (opacity, density, visual weight), not color.
- Construct logos are bone. Period. Monochrome. Like subdued tactical patches worn in the field.
- Crimson appears ONLY for active/danger states. A construct currently deployed pulses faintly crimson. Otherwise, everything is bone + cyan + void.
- The cyan/crimson balance shifts by location: constructs.network is cooler (cyan), rektdrop is hotter (crimson).

---

## The Operator Frame — Constructs as Elite Specialists

Constructs are NOT products in a catalog. They are **operators** — elite specialists, each the absolute best at their domain. The UI should feel like a mercenary roster board, a bounty hunter guild, a special forces ready room.

### Vocabulary

| Don't say | Say instead |
|---|---|
| install | deploy |
| use | engage |
| product | operator / construct |
| compose with | deploy alongside |
| depends on | requires support from |
| governed by | reports to / follows doctrine of |
| skills (noun) | capabilities / specializations |
| domain | theater of operations |
| version | mark (Mk. I, Mk. II, Mk. III) |
| deprecated | decommissioned |
| experimental | field-testing |
| beta | operational |
| stable | combat-proven |

### The Roster Board (Primary View)

The main constructs.network view is a roster board, not a product grid. Each entry shows:
- **Bone insignia** (the construct's logo mark)
- **Callsign** (the construct name, display type)
- **Theater** (domain — surveillance, design, security, etc.)
- **Capability count** (number of skills)
- **Deployment bar** or density indicator (visual weight communicating standing)

Standing is communicated through DENSITY, not color:
- **Combat-proven** (veteran): full bone insignia at 1.0 opacity, crisp edges, full data density, all dossier fields populated, faint cyan ambient glow
- **Field-testing** (new): thinner strokes at 0.6 opacity, minimal data, blank dossier fields where track record will go, no glow — hasn't earned luminance
- The emptiness IS the status. A veteran card is full. A new card has space where the record will go.

### The Dossier (Detail View)

When you click/inspect a construct, you get a dossier — not a product page. The dossier contains:
- Insignia (large), callsign, domain, status
- **Service record**: deployment count, success rate, first deployed date, last active date, governance (who it reports to)
- **Proven pairs**: other constructs it has successfully deployed alongside (with co-deployment counts)
- **Supply lines**: what it writes to and reads from (grimoire paths)
- **Capabilities roster**: skill list organized by category
- Deploy / Inspect actions

### The Composition View (Mission Planning)

When composing multiple constructs, the view becomes a mission briefing:
- Selected operators laid out on a briefing surface
- Supply lines between them (paths.writes → paths.reads connections)
- Composition compatibility shown as proven deployment history
- Governance/doctrine relationships (who reports to whom)

### Three Logo Reads

The same bone SVG insignia reads three ways depending on context:
1. **Brand mark** (shop window / roster entry) — "this is a construct called Observer"
2. **Operator insignia** (dossier / mission planning) — "this is the surveillance specialist, callsign OBSERVER"
3. **Reputation seal** (deployment history / certificates) — "this mark means 29 capabilities across 8 theaters, combat-proven"

---

## The Materials System — SprawlOS

Every surface in the Sprawl is defined by a physical material. A panel is not a div with a border — it's a surface made of a material that catches light, responds to interaction, makes a sound, and ages.

### Named Materials

| Material | Physical Analog | Where It Appears |
|---|---|---|
| **VOID** | deep space, unlit room | background everywhere, the absence of surface |
| **CRT PHOSPHOR** | terminal screen coating | scanlines, noise grain, vignette, phosphor glow text-shadows, scan sweep |
| **LATTICE STEEL** | building skeleton, display frame | `.lattice-grid` CSS background with phase-driven animation |
| **DEPTH SURFACE** | concrete wall behind a sign | `DepthParallaxCanvas` (built, unmounted in rektdrop) |
| **LED MODULE** | billboard pixel elements | `SigilParticles` (needs upgrade from CRT to LED treatment) |
| **GLASS** | display case, shop window | NOT YET BUILT — the missing material for browse view |
| **METAL PLATE** | brushed steel dossier card | NOT YET BUILT — the material for operator dossier view |
| **BONE DATA** | typewritten parchment | bone color + IBM Plex + buffer-dump animation |
| **CRIMSON EMISSION** | emergency neon, arterial warning | crimson channel + stamp delay + stinger audio |
| **CYAN WIRE** | wireframe blueprint | cyan channel + raster-draw + grid substrate |

### Material Properties

Each material has: surface appearance, light response, sound, aging behavior, and interaction states. Full specifications in `grimoires/gecko/sprawlos-materials.md`.

### The 83ms Quantum

Everything in SprawlOS ticks at 83ms (12fps). This is the atomic clock:
- 83ms = 1 quantum (buffer-dump snap, counter frame)
- 166ms = 2 quanta (passage fade, beam-draw)
- 332ms = 4 quanta (crimson stamp, step exit, EvaFlash)
- 664ms = 8 quanta (cursor blink, signal flicker)

**No cubic-bezier.** Everything is `steps(N)`. The interface clicks, it doesn't ease. Two exceptions: `DepthParallaxCanvas` (physical parallax is smooth) and spring physics for panel interactions (physical springs earn their smooth curve).

### Materials By View

| View | Primary Material | Metaphor |
|---|---|---|
| Roster board (browse) | GLASS cases + VOID | operators displayed in a dark room |
| Dossier (detail) | METAL PLATE + CRT SCREEN | personnel file on a briefing table |
| Mission planning (composition) | CRT PHOSPHOR + CYAN WIRE | holotable / mission briefing display |
| Facade / hero | LED MODULE | building-scale sign visible from the street |

---

## The Horse Sign — LED Billboard Upgrade

The horse-mark sigil on the constructs.network homepage needs to evolve from CRT burn-in (current, TDR-006) to LED billboard (proposed). This is the shop sign — visible from across the Sprawl.

### Current State (sigil-particles.tsx)
- ~8,000 particles sampled from horse-mark.svg at 2px density
- 2px hard square particles, single cyan channel
- Phosphor flicker animation (organic, sinusoidal)
- Alpha range 0.15-0.35 (too dim — barely visible on laptop)
- Positioned [-2.1, 0.5, 0], 40% off left edge

### Implemented State (2026-03-14)
The horse evolved through several iterations in this session. The final form:
- **Structural mark, not LED sign** — dark cyan `vec3(0.08, 0.18, 0.20)` at 0.75 alpha. Reads as a mark pressed into the wall surface, not a projecting display. Embossed, not emissive.
- 5px modules with face mask grid (8% border discard)
- Single color — no dual-channel, no crimson. The direction explicitly avoids color as status.
- Scroll parallax (3% camera offset, lerped) — proves the mark shares spatial system with content
- Ambient dust (40 particles, 12% alpha, additive) — the air between you and the wall
- Subtle breathing (±6%) and per-module variation — alive but not performative
- The key insight: **"the death of the layer"** — don't think background/foreground. The mark exists in the same world as the content. Spatial anchoring > opacity.

### What Didn't Work (lessons)
- **Bright LED treatment** — vibrant cyan at 0.65 alpha competed with content. Felt decorative.
- **Dual-color (cyan + crimson edges)** — didn't fit the four-color constraint. Felt forced.
- **Background texture layers** (grid, grain, glow, vignette) — each one individually was "too much." The void IS the environment. Don't fill it.
- **Opacity as subtlety tool** — dimming a bright thing ≠ making a dark thing. The fix was changing the material color, not the transparency.

### Reference Research
Full LED hardware specs, cinema display analysis, and shader techniques documented in:
- `grimoires/gecko/research-cinema-led-venues.md` — physical LED construction, GITS/BR2049/Akira/Blade Runner displays, venue design
- Previous session research in `grimoires/artisan/inspiration/neotokyo-analysis.md`, `direction.md`, `moodboard-analysis.md`

---

## The Rektdrop Connection

sprawl-rektdrop (renaming from rektdrop-interface) is a location in the Sprawl. The experience architecture:

### Current State
- Single-viewport state machine: scanning → computing → tier → loss → certificate
- CRT terminal aesthetic with full phase-driven degradation (scanlines, noise, vignette tighten/loosen by phase)
- Background: `BackgroundLattice` (CSS grid lines, phase-driven) — no WebGL
- `DepthParallaxCanvas` exists but is UNMOUNTED — complete parallax shader with phase-driven holographic tint
- Stem mixer: 3-stem vertical remix (drums-bass, pads-textures, reverb-tail) with zone recipes per experience phase
- Stinger: synthesized 3-layer audio burst (white noise + 60Hz sub + distorted square wave) at tier reveal
- No approach/facade — you spawn directly inside the experience

### Future Direction
- Rename to sprawl-rektdrop
- Add facade/approach sequence before the current state machine
- The horse mark on the building facade as an LED billboard (crimson-tinted, not cyan — this is the danger location)
- `DepthParallaxCanvas` mounted as building surface behind the LED sign
- `BackgroundLattice` reframed as structural steel of the building/display
- Connection to constructs.network visible from the building (the other shop's cyan glow on the skyline)

---

## What Exists in the Codebase

### constructs.network (apps/explorer)
- `sigil-particles.tsx` — WebGL horse mark particle system (Three.js Points + custom shader)
- `globals.css` — OKLCH tokens, motion tokens (83ms quantum), elevation system (glow-based), grid substrate
- Graph view with Three.js nodes + edges (categories, dependencies, governance)
- 38 routes including construct detail pages
- API: Hono on Railway, PostgreSQL on Supabase, Convex for realtime

### rektdrop-interface
- Full CRT degradation system (phase-driven scanlines, noise, vignette, spotlight)
- `BackgroundLattice` — 4-layer CSS grid with phase-driven `@property` animations
- `DepthParallaxCanvas` — complete WebGL parallax shader (UNMOUNTED)
- `StemMixer` — 3-stem vertical remix audio engine
- `Stinger` — synthesized Web Audio burst
- `BioscanScanner` — Canvas 2D choreographed FUI sequence
- Phase taxonomy: `.cyan-structure` (raster-draw), `.bone-data` (buffer-dump), `.crimson-stamp` (delayed stamp)

### Artisan Design Artifacts
- `grimoires/artisan/inspiration/taste.md` — taste tokens (colors, typography, spacing, motion, shadows)
- `grimoires/artisan/inspiration/direction.md` — design direction with Neo Tokyo translation key
- `grimoires/artisan/inspiration/neotokyo-analysis.md` — full OKLCH decomposition of Neo Tokyo frames
- `grimoires/artisan/inspiration/moodboard-analysis.md` — 6 moodboard images analyzed
- `grimoires/the-easel/tdr/TDR-006-sigil-particle-treatment.md` — current CRT burn-in spec (NEEDS REVISION to LED)

---

## Design Philosophy

### Materials First
Every surface is a material. UI decisions start with "what is this panel made of?" not "what border-radius should this have?" The material determines: how it catches light, how it responds to interaction, what sound it makes, how it ages, how heavy it feels.

### Density Is Rank
Status is communicated through information density, not color. A veteran construct's dossier is FULL — every field populated, proven pairs listed, supply lines mapped. A new construct has blank space. The emptiness is the status.

### The Sprawl Doesn't Perform For You
The environment exists whether you're there or not. The lattice grid at certificate phase never returns to 30° — it stays at 29°, the 1° scar. The building was always there. The roster updates based on deployment reality, not curation. Nothing bounces, nothing begs for attention. Things are present, waiting to be found.

### Constructs Are Lego Blocks
From the user (2026-03-13): "Constructs are Lego blocks — open-ended, minimal prescription. Our job is sync, packaging, integration scaffolding. NOT prescribing form/contents." The roster board DISPLAYS excellence. It does not define or prescribe what constructs should be. The operators prove themselves through deployment.

### One Sprawl, Many Locations
All Sprawl apps share the same materials, colors, quantum timing, and typography. They differ in temperature (cyan vs crimson dominance), CRT intensity (cleaner shop vs grittier terminal), and primary material (glass cases vs CRT screen). Same game engine, different level parameters.

---

## Operator Visual Design Principles (from deep research)

Seven rules distilled from Rainbow Six Siege, Metal Gear Solid, Mandalorian, WH40K, Destiny, XCOM, real military SOF, and expertise marketplace research:

1. **The icon must communicate function, not just identity.** R6 Siege: Thermite's icon = breach charge. SEAL trident's three prongs = three domains. If you can't tell what the construct DOES from its mark alone, the mark fails.

2. **Layered identity: mark + role + tier + history.** WH40K: left shoulder = chapter (identity), right shoulder = squad role, trim = company, knee = campaigns. Four signals on one surface. For constructs: insignia = identity, domain = role, visual weight = standing, deployment count = history.

3. **Readable at every scale.** WH40K's rule: "if you can't recognize it from across a battlefield, it's too complicated." The mark must work at 16px (favicon) and 200px (hero display).

4. **Status is encoded, not stated.** Mandalorian armor color declares values without a label. Boba Fett's helmet dent is a battle scar left unrepaired as trophy. WH40K: senior officers accumulate personal heraldry over years of service — "basic rank markings superseded by a mass of details and decoration."

5. **Marks are earned, not assigned.** Mandalorian signets forged after demonstrated deeds. MGS emblems earned through behavioral consistency (Eagle = 90% headshots). Challenge coins issued by commanding officers as personal recognition. XCOM nicknames not allowed until Sergeant rank.

6. **The team composition is the product.** XCOM strength aggregation bar shows the TEAM as a unit. Mass Effect squad select updates combined capabilities when you add a member. A.Team presents pre-composed teams, not just individual profiles. The connections between constructs matter as much as the constructs themselves.

7. **Scarcity IS status.** Toptal: "Top 3% of freelancers" is the headline. 23 active operators, not thousands of plugins. The roster is small because the bar is high.

### The Dossier Card Layout (synthesized from all sources)

| Zone | Content | Reference |
|---|---|---|
| Top-left | Insignia (bone monochrome glyph) | R6 operator icon, Destiny class geometry |
| Top-right | Status (deployed/available) | XCOM roster, CP2077 fixer availability |
| Center | Callsign + theater of operations | All systems |
| Stats block | Capability count, deployment count | WH40K campaign badges, XCOM lifetime stats |
| Proven pairs | Other constructs deployed alongside | XCOM squad composition, A.Team team formation |
| Supply lines | Grimoire paths written/read | WH40K supply chain, MGS intel network |
| Bottom | Deploy action + inspect link | Universal |

---

## What Needs Building (Priority Order)

1. **Roster board component** — The primary constructs.network browse experience. Bone insignia + callsign + theater + capability count + density indicator. Replaces the current card grid.

2. **Metal plate dossier** — The construct detail view as operator personnel file. Brushed steel material treatment, monospace data, dense layout, service record format.

3. **LED billboard sigil upgrade** — Revise `sigil-particles.tsx` from CRT phosphor to LED module treatment. Bigger pixels, visible grid hierarchy, dual-color, pipe energy in frame edges.

4. **Glass case material** — The missing material for the browse view container. CSS `backdrop-filter` + edge catch + glow bleed. Wraps each roster entry.

5. **Mission planning view** — Composition as deployment briefing. Selected operators on a briefing surface with supply lines between them.

6. **Approach/facade sequence** — For both constructs.network and sprawl-rektdrop. The building sign before you enter.

---

## Technical Notes

### The dig-search script
The k-hole construct provides `scripts/dig-search.ts` — a Gemini-powered grounded search engine that returns structured findings in ~30 seconds. **Always use this instead of manual WebSearch/WebFetch for research tasks.** The installed pack at `.claude/constructs/packs/k-hole/` was synced on 2026-03-14 to fix a stale `.env` walker bug. Invocation:
```bash
npx tsx .claude/constructs/packs/k-hole/scripts/dig-search.ts --query "<thread>" --depth 1-4
```
Requires `GOOGLE_API_KEY` in `.env` (confirmed present).

### Pack sync
The installed packs at `.claude/constructs/packs/` can go stale. The canonical source for each construct is the standalone repo at `~/Documents/GitHub/construct-{name}/`. When in doubt, diff and sync from canonical.

---

## Research Artifacts (Read These)

| File | Contents |
|---|---|
| `grimoires/gecko/sprawlos-materials.md` | Complete materials system — named materials, composition rules, panel philosophy, 83ms quantum, cross-app portability |
| `grimoires/gecko/glass-case-research.md` | The shop reframe — three scales (street/window/counter), construct logo system, environment design, LED vs CRT, glass case component |
| `grimoires/gecko/research-cinema-led-venues.md` | Raw research — LED hardware construction (pixel modules, panel gaps, failure modes), cinema building displays (GITS, BR2049, Akira, Blade Runner), venue approach sequences, Shibuya multi-display |
| `grimoires/artisan/inspiration/direction.md` | Design direction with Neo Tokyo translation key |
| `grimoires/artisan/inspiration/neotokyo-analysis.md` | OKLCH decomposition of Neo Tokyo animation frames |
| `grimoires/artisan/inspiration/moodboard-analysis.md` | Full analysis of 6 moodboard reference images |
| `grimoires/the-easel/tdr/TDR-006-sigil-particle-treatment.md` | Current CRT burn-in spec (to be revised to LED) |

---

## The Tone

The Sprawl is not playful. It is not corporate. It is not minimalist-clean. It is:

- **Present** — things exist, waiting to be found. not marketed, not hidden.
- **Dense** — information-rich but organized. military briefing, not dashboard.
- **Earned** — status is proven, not assigned. the board reflects reality.
- **Dark** — mostly void. content as islands of light in darkness.
- **Mechanical** — clicks, not eases. steps(N), not bezier. 83ms quantum.
- **Physical** — materials have weight, sound, aging. glass, metal, phosphor, void.
- **Connected** — one Sprawl, many locations. same DNA, different temperature.

*the roster isn't curated. it's earned. the board reflects who showed up and what they proved.*
