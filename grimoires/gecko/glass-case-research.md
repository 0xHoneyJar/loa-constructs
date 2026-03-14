# The Glass Case — Constructs Network as Sprawl Tech Shop

> research status: IN PROGRESS — 6 dig trails active
> date: 2026-03-14
> framing: gecko (ecosystem intelligence) + artisan (material feel)
> trigger: conversation about LED billboard horse, pivoted to "this is a shop in the sprawl"

---

## The Reframe

constructs.network was being built as a **registry** — a database with a UI. the logos, the product catalog reference, and the "location in the Sprawl" framing change what it is:

**constructs.network is Finn's shop.** the place in Chiba City where Case goes to buy reconditioned Ono-Sendai cyberdecks under the counter. glass cases, items on display, each one with a mark, a story, a personality. the constructs ARE the Neuromancer weapons and technology.

| Neuromancer Product | Construct Equivalent | Why |
|---|---|---|
| Ono-Sendai Cyberspace 7 (cyberdeck) | observer (29 skills) | the instrument you jack in with — it sees everything |
| Cobra (spring-loaded baton) | hardening | a weapon of defense — compact, deployable, decisive |
| Braun Microdrone (arachnid sentry) | crucible | walks around testing everything, autonomous QA |
| Yeheyuan cigarettes | k-hole | not a tool — a consumable experience that changes your state |
| Dixie Flatline ROM construct | mibera-codex | consciousness ported to storage — knowledge that persists after death |
| Hosaka computer | protocol | the infrastructure everything else runs on |
| Microsoft (knowledge chip) | any skill-pack construct | slot it in, gain the knowledge, pull it out |

the product catalog images show the FORMAT: brand mark + illustration + description + context. each item has a story about who uses it and where you find it. black and white, high-contrast, technical illustration quality.

---

## Three Scales of the Shop

### 1. Street View — The Approach (LED Billboard)

you're walking through the Sprawl. three blocks away, you see the **horse mark** on the side of a building. massive. LED panels. cyan-blue glow spilling onto the wet street below. that's constructs.network — the shop.

**this is what the explorer's SigilParticles becomes.** not a CRT burn-in anymore. a building-scale LED sign. visible from across the district. from other parts of the Sprawl (rektdrop), you can see this building's sign on the skyline.

implementation notes:
- upgrade from 2px phosphor particles → 6-8px LED pixel modules
- visible grid structure between modules (the panel frame)
- multi-color: cyan body (passive/display mode) + crimson accent (energy running through pipe edges)
- the `BackgroundLattice` CSS grid reframed as the structural steel behind the LED panels
- `DepthParallaxCanvas` (currently unmounted in rektdrop) could be the building surface BEHIND the sign — you see the concrete wall through the gaps between LED modules
- scale: the horse should feel MONUMENTAL. not subtle. not discovered. visible from the street.

### 2. Shop Window — The Browse (Glass Cases)

you walk up to the shop front. floor-to-ceiling glass. inside, constructs are displayed in individual cases. each one lit from above. each one has its logo/mark on the case — geometric, monochrome, bone-on-void. you can see the shape of the thing inside.

**this is the construct catalog page.** the current card grid becomes glass display cases.

each case shows:
- the construct's **logo mark** (like the tier logos: Tessier, Flatline, Console Cowboy, etc.)
- the construct's **name** in its own typographic treatment
- a **one-line description** of what it does (the Neuromancer catalog copy style)
- a **glow state**: cyan = dormant/display, crimson = active/selected/hovered
- the glass surface itself: frosted edges, subtle reflection, the light catching differently at the borders

the tier logos provide the design language:
- **geometric** — hard edges, no unnecessary curves. Tessier's X, Wintermute's compass, Tourist's grid cube
- **monochrome** — bone on void. single color accepting tint
- **iconographic** — the mark represents ESSENCE, not literal function
- **typographically unique** — each logo has its own type. Console Cowboy's distressed condensed ≠ Tessier's clean serif ≠ Panther Modern's bold block
- **scale-independent** — work at 24px (card) and building-scale (LED sign)

### 3. Counter View — The Inspect (Product Detail)

you tap on the glass. the case opens. now you're at the counter with the construct in front of you. the Neuromancer catalog layout: illustration + brand + specs + story.

**this is the construct detail page.** the current detail view becomes a product inspection.

shows:
- the construct's logo, large, with its full typographic treatment
- the technical illustration (currently: we could render the logo in particles, or show skill-tree diagrams)
- the "product description" (expertise_summary, skill_details, domain tags)
- the "composition" (what it works with — compose_with, paths.writes/reads)
- the "provenance" (who made it, when, version history)
- the purchase/install action

---

## Construct Logos — The 23-Mark System

each construct needs a logo mark in the same system as the tier logos. the tier logos already demonstrate the vocabulary:

| Tier Logo | Design DNA | Translatable Quality |
|---|---|---|
| TESSIER | Geometric X/cross, clean serif | Precision, symmetry, institutional |
| FLATLINE | Skull + heartbeat, hexagonal frame | Death-persistence, medical-technical |
| PANTHER MODERN | Prowling silhouette + slash marks | Predatory motion, street-level |
| CONSOLE COWBOY | Wireframe room, distressed condensed | Matrix-native, technical depth |
| WINTERMUTE | Low-poly face OR compass/star | AI consciousness, omnidirectional |
| K-HOLE | Isometric maze cube | You can get lost in here — recursive depth |
| TOURIST | Grid box, clean block type | Entry-level, structured, readable |

for the 23 constructs, each mark should:
1. be **geometric** — SVG paths, hard edges, grid-aligned where possible
2. be **monochrome** — works in bone-on-void, accepts cyan/crimson tint
3. represent the **essence** — not the function, the FEELING of what this construct is
4. have its own **typography** — the logotype treatment is part of the identity
5. work at **all scales** — 24px favicon, 64px card, 400px detail, building-scale LED

proposed marks (sketch — these need design iteration):

| Construct | Essence | Mark Concept |
|---|---|---|
| observer | the eye that watches | radar sweep / concentric circles |
| artisan | the hand that shapes | geometric tool / compass rose |
| k-hole | the depth you fall into | isometric maze cube (already exists) |
| hardening | the shield that holds | angular shield / geometric lock |
| protocol | the wire that connects | codec bars / signal waveform |
| crucible | the fire that tests | crucible vessel / geometric flame |
| herald | the voice that carries | angular megaphone / signal flag |
| beacon | the light that guides | lighthouse geometry / radial burst |
| the-easel | the surface that holds | geometric frame / canvas border |
| mibera-codex | the knowledge that persists | open book / stacked hexagons |
| dynamic-auth | the gate that permits | angular keyhole / split gate |
| gtm-collective | the crowd that moves | networked nodes / swarm |
| webgl-particles | the light that dances | particle scatter / point cloud |
| vocabulary-bank | the words that govern | stacked text / dictionary mark |
| the-mint | the coin that creates | dual-face coin / forge stamp |
| the-speakers | the sound that resonates | waveform / speaker geometry |
| social-oracle | the mirror that reflects | angular mirror / reflection split |
| construct-base | the template that spawns | empty frame / scaffold |

---

## The Environment — What World Does This Shop Live In

### Gibson's Sprawl Material Palette

the Sprawl is not clean. not polished. not Apple Store. it's:
- **layered** — old buildings with new tech bolted on. displays mounted on concrete. neon over rust.
- **dense** — signage stacked on signage. multiple shops in a corridor. information overload.
- **wet** — the street reflects everything. light doubles through puddles.
- **warm and cool** — neon cyan/crimson reflected in warm concrete surfaces
- **noisy** — the CRT hum, the crowd, the beeping. but inside the shop, it's quieter. focused.

### The Shop Interior vs. The Street

| Quality | The Street (approach) | The Shop (browse) |
|---|---|---|
| Lighting | LED spill, neon, harsh | Focused spots, glass diffusion, controlled |
| Density | High — signs, people, noise | Medium — curated, each case has space |
| Color | Full palette — cyan, crimson, phosphor | Restrained — void bg, bone text, accent on selection |
| Audio | Ambient hum + crowd | Quieter — maybe a low synthesizer drone |
| Interaction | Passive — you're looking at the building | Active — you're browsing, hovering, selecting |

### rektdrop as Another Location

sprawl-rektdrop is a different venue in the same city. if constructs.network is the tech shop, rektdrop is the... arena? the fighting pit? the place where your losses get measured and certified.

from the constructs.network shop, you can see the rektdrop building's sign on the skyline (the horse mark, rendered differently — crimson instead of cyan, because rektdrop IS the danger channel).

from rektdrop, you can see the constructs.network building's glow in the distance (the cyan LED spill).

same city. different addresses. shared visual DNA (the horse mark, the color palette, the CRT/LED hybrid aesthetic, the Basement Grotesque display font). but different *temperature* — constructs is cooler, more observational. rektdrop is hotter, more confrontational.

---

## Visual Treatment — LED Not CRT

### TDR-006 Revision: CRT Burn-In → LED Billboard

the original TDR-006 chose CRT burn-in. that was right for "a watermark you discover." it's wrong for "a shop sign visible from the street." the upgrade:

| Property | TDR-006 (CRT burn-in) | Proposed (LED billboard) |
|---|---|---|
| Metaphor | phosphor ghost | LED panel array mounted on building |
| Pixel size | 2px hard squares | 6-8px modules with visible housing |
| Grid | implicit (every 2px, uniform) | explicit — visible gaps between modules, wider gaps at panel seams |
| Color | single cyan channel | dual-channel: cyan body + crimson pipe energy |
| Opacity range | 0.15-0.35 (very dim) | 0.4-0.8 (street-visible) |
| Animation | phosphor flicker (organic) | LED state changes (digital, harder) + scan line (multiplexing artifact) |
| Structure | flat, no frame | visible panel frame — the aluminum/steel grid that holds the modules |
| Scale feeling | "it was always there" | "you can see it from three blocks away" |
| Viewing distance | intimate | architectural |
| Frame/pipe edges | none | energy conduits running along panel frames (crimson running light) |

### The Module Grid

real LED billboards have visible structure:
- **pixel modules**: each "pixel" is actually a cluster of RGB sub-LEDs in a black housing
- **module gaps**: every 8-16 pixels, a slightly wider gap where the PCB module ends
- **panel seams**: every 64-128 pixels, a structural gap where panel frames meet
- **face mask**: the black material between pixels that absorbs ambient light

in the shader, this means:
- primary grid: 6-8px modules with 1-2px black gaps (the face mask)
- secondary grid: every N modules, a wider 3-4px gap (panel seam)
- the horse mark is sampled at module resolution, not pixel resolution
- each module can have sub-pixel structure (tiny R, G, B dots within the module) at close zoom
- at page-default zoom, the modules read as solid color squares in a visible grid

### The Pipe Edges

the user described "LED pipe effects along the edges." in the LED billboard frame, this is:
- the structural frame between panels carries **power and data**
- visually: a running light effect along the horizontal and vertical panel seams
- color: crimson (the active/energy channel)
- animation: sequential illumination along the path, like Tron light-cycle trails
- speed: slow, steady, deliberate — not frantic. maybe 4-6 seconds for a full traverse
- the pipe energy makes the panel frame VISIBLE as structure, not just negative space

### Multi-Color State

the two colors serve different purposes on the LED sign:
- **cyan** (oklch(0.85 0.15 195)) = the display content. the horse mark. passive. observing.
- **crimson** (oklch(0.55 0.24 25)) = the energy. the pipe edges. the scan line. active. alive.

the ratio should be ~85% cyan, ~15% crimson. cyan IS the image. crimson IS the infrastructure that powers it.

occasional state flip: certain modules briefly flash crimson (like the CC808 insight — "color signals state, not decoration. red frame = active targeting"). this could be triggered by user interaction — hover near the sigil and some modules flip to crimson, acknowledging your presence.

---

## Glass Case Component — Construct Display

### The Physical Reference

a glass display case in a high-end tech shop or weapons dealer:
- **dark surround** — the case sits in a dark room. the void IS the room.
- **glass surface** — frosted at edges, clear in center. catches ambient light at angles.
- **spot lighting** — each case lit from above. the item inside is the brightest thing.
- **item pedestal** — the construct logo sits on a surface inside the case.
- **label plate** — small brass/chrome plate with the construct name and one-line description.
- **glow bleed** — the logo's color bleeds slightly through the glass (cyan dormant, crimson on hover).

### CSS/WebGL Approach

for the glass effect, there are multiple approaches:

**CSS-first (backdrop-filter):**
- `backdrop-filter: blur(8px) saturate(120%)` for frosted glass
- thin 1px border in `oklch(0.3 0.02 195)` (very dim cyan) for the glass edge
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08)` for the top light catch
- subtle gradient overlay for glass curvature illusion
- on hover: the border brightens, the blur decreases, the glow intensifies

**WebGL (if we want physical glass):**
- three.js `MeshPhysicalMaterial` with `transmission: 0.95`, `roughness: 0.1`
- environment map for reflections
- the construct logo rendered as geometry inside the glass volume
- this is heavier but gives real glass physics — refraction, caustics, depth

**hybrid (recommended):**
- CSS glass for the card/case container
- WebGL for the logo/mark inside (rendered as particles or geometry, glowing behind the glass)
- the glass catches the logo's light — CSS responds to WebGL content

### Interaction States

| State | Glass | Logo | Frame | Audio |
|---|---|---|---|---|
| Dormant | frosted, dim edges | cyan glow, subtle flicker | invisible | silence |
| Hover | clearing, edge brightens | glow intensifies, some modules flip crimson | faint outline appears | low hum |
| Selected | clear glass, full edge glow | full brightness, cyan+crimson active | full frame visible, pipe energy running | resonance tone |
| Inspecting | glass slides open | logo expands, detail view | frame becomes page chrome | tonal shift |

---

## Implementation Layers

### What Exists and What Needs Building

| Layer | Current State | Target State |
|---|---|---|
| Horse sigil (explorer) | 2px CRT phosphor particles, cyan only, desktop only | 6-8px LED modules, cyan+crimson, responsive, building-scale |
| Background (explorer) | None behind sigil (transparent Canvas) | `DepthParallaxCanvas` as building surface visible through panel gaps |
| Lattice grid (rektdrop) | CSS grid lines, phase-driven | Reframed as structural steel/display frame |
| Construct cards (explorer) | Flat cards, grid layout | Glass display cases with logo marks |
| Construct logos | Don't exist yet (23 constructs, 0 logos) | Full mark system in tier-logo style |
| Detail page (explorer) | Standard detail layout | Product inspection / Neuromancer catalog format |
| Approach sequence (rektdrop) | None — you spawn inside | Facade → entrance → interior progression |
| Cross-location signage | No visual connection | Horse mark visible from both locations at different distances |
| ridden-by-loa.svg (rektdrop) | 40x110px CSS mask watermark | Expanded: LED sign version of the horse on the facade |

### Priority Order (my read)

1. **construct logos** — the marks are the foundation. without them, the glass cases have nothing inside.
2. **glass case component** — the CSS/WebGL hybrid for displaying constructs. this changes the whole browse experience.
3. **LED billboard sigil upgrade** — TDR-006 revision. bigger modules, visible grid, multi-color, pipe edges.
4. **approach sequence** — the facade layer for rektdrop. the building sign. the threshold.
5. **product inspection detail page** — the Neuromancer catalog format for individual constructs.
6. **cross-location signage** — the horse mark visible from rektdrop's skyline.

---

## Research Trails (pending)

1. LED display hardware — pixel modules, panel gaps, failure modes, Shibuya density, power conduit infrastructure
2. Cinema building displays — GITS '95, BR2049, Akira, Blade Runner. the hardware of the display.
3. Location/venue as interface — approach sequences, facade identity, threshold moments.
4. WebGL LED shader techniques — sub-pixel structure, panel seam rendering, LED bloom, pipe lights.
5. Gibson's shop descriptions — Finn's, Chiba City, how tech is sold in the Sprawl.
6. Glass display case techniques — frosted glass, spotlight lighting, neon through glass.

> these are running. this document will be updated with findings.

---

## Open Questions

1. **do construct logos get designed in the same session as this research, or is this a separate workstream?** the user can make them ("i uploaded... i can make more one for each construct"). the mark system needs a design brief, not implementation.

2. **how literal is the "glass case"?** is it a subtle CSS treatment on the current cards, or a full environmental shift where the page feels like you're standing in a dark room surrounded by illuminated cases?

3. **does the approach sequence replace the current rektdrop landing page, or precede it?** right now you spawn into "The Loa Demands a Vessel." does the facade come before that, or does the landing page BECOME the facade?

4. **the horse mark — one SVG or a family?** constructs.network horse = cyan LED version. rektdrop horse = crimson LED version. are they the same SVG rendered differently, or distinct marks?

5. **construct logos and tier logos — same system?** the tier logos ARE Neuromancer references (Tessier, Flatline, Console Cowboy). the construct logos would be a parallel system. do they share a design grid? a typography palette? or are they intentionally distinct?

---

*the bazaar isn't the database. the bazaar is the moment a creator's construct sits behind glass and someone on the other side thinks: i need that.*
