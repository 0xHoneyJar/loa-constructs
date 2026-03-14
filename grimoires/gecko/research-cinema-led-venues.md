# Deep Research Findings — Cinema Displays, LED Hardware, Venue Design

> date: 2026-03-14
> trails: 3 completed (LED hardware, cinema displays, venue/location design)
> remaining: 3 in progress (WebGL LED shaders, Gibson shops, glass case techniques)

---

## LED Display Hardware — Physical Construction

### The Three-Grid Hierarchy

real LED billboards have three nested grids:

1. **Pixel grid** — individual LEDs at pitch spacing (P6 = 6mm, P10 = 10mm)
   - each "pixel" is an SMD package containing R, G, B dies
   - sits in a **black face mask** with precisely-cut apertures
   - 87.5% of visible surface at P10 is black mask, not LED
   - the face mask IS the dominant visual material at close range

2. **Module grid** — PCB boards (typically 320×160mm) containing 32×16 pixels
   - modules butt-join with <0.5mm gap
   - slight brightness variation at edge rows (driver IC current differences)
   - PCB traces visible through mask apertures at extreme close range (copper/solder lines)

3. **Cabinet grid** — aluminum enclosures (960×960mm or 1280×960mm)
   - 0.5–3mm gap between cabinets (wider than inter-pixel gap)
   - aluminum frame edge visible (silver or powder-coated black, 2-3mm)
   - silicone gasket strip for weatherproofing
   - the break in grid rhythm that signals panel boundaries

### Fill Factor — The Key Parameter

| Pixel Pitch | LED Package | Fill Factor | Visual |
|---|---|---|---|
| P2.5 indoor | SMD 2020 | 40-60% | dense, nearly continuous |
| P6 semi-outdoor | SMD 2727 | 20-30% | visible dots in grid |
| P10 outdoor | SMD 3535 | 10-20% | dots floating in black |
| P16 billboard | DIP 546 | 8-12% | sparse bright points |

**for shader translation**: the fill factor determines how much `VOID` shows between `LED MODULE` pixels. lower fill factor = more visible grid structure = more "building-scale sign" feeling.

### Night vs Day Material Shift

**night**: face mask invisible (merges with darkness). display reads as pure floating light. bloom halos around bright pixels. black content reads as true black.

**day**: face mask becomes dominant visual element. you see the physical structure — module grid, face mask texture, LED recesses. display reads as "physical object that happens to glow." contrast drops from 5000:1 to ~100:1.

**for shader**: this is a time-of-day material system:
- `ambientLightLevel` uniform (0–1) crossfades between two treatments
- night: high bloom, zero grid visibility, pure additive light
- day: low bloom, visible grid structure, face mask material rendered as matte dark surface

### Failure Modes as Aesthetic Vocabulary

| Defect | Visual | Density | Behavior |
|---|---|---|---|
| Dead pixel | permanent black dot | 0.001-0.01% | static |
| Stuck pixel | one channel at max (bright R, G, or B) | 0.0001% | static |
| Dead module | rectangular black void (module-shaped) | 0-1 per display | static |
| Scan ghost | faint horizontal duplicate, shifted 1-2 rows | per-frame | temporal |
| Color mura | cloud-like brightness variation | per-cabinet | static |
| Brightness drift | step-function shift at cabinet boundaries | per-boundary | static |
| Moisture damage | clustered failures in bottom rows | localized | progressive |
| UV degradation | face mask graying, contrast reduction | regional | progressive |

### Power/Data Infrastructure ("The Pipes")

the infrastructure that feeds the sign:
- **conduit runs**: rigid metal tubes (1-2" dia), silver/gray, running vertically up building
- **junction boxes**: square metal boxes at every direction change (~every 3m)
- **cable trays**: perforated U-shaped metal channels (6-12" wide), behind the display
- **cable bundles**: zip-tied clusters of red/black power + gray data cables
- **transformer**: large gray box at base of structure
- **material palette**: galvanized steel (silvery, slightly reflective), matte black corrugated flex tubing, flat gray junction box faces with visible screw heads

---

## Cinema Building Displays — Hardware-First Visual Reference

### Ghost in the Shell (1995) — The Gold Standard

Oshii's team photographed real Hong Kong before painting. the technology in GITS feels real because it IS real — photographed and painted over.

**five key principles from the canal/market sequence**:
1. **depth layering**: signs at 4-5 distinct depth planes. foreground = sharp with visible mounting hardware. background = desaturated, blue-shifted through atmospheric haze
2. **scale heterogeneity**: signs range from 1-2m shopfront to multi-story. NOT uniform.
3. **mounting hardware visible**: steel brackets, draped cables, cantilevered arms. every sign has a plausible mounting method
4. **color temperature stratification**: warm (amber, orange) at street level → cool (blue, white) at higher elevation
5. **light bleed**: signs cast colored light onto adjacent surfaces. wet surfaces double as secondary reflectors

**shader-relevant**: GITS signs use visible gradient emission (brighter at center, dimming at edges). fluorescent tubes create linear bright zones. atmospheric fog between layers reduces saturation with depth.

### Blade Runner 2049 — The Joi Hologram

**the display is NOT flat** — volumetric projection extending from building surface.
- visible horizontal scanlines at 2-3 pixel spacing relative to the face
- RGB color fringing at silhouette edges (chromatic aberration at oblique angles)
- **rain interaction**: individual drops pass THROUGH projection but each catches and scatters light, creating momentary bright points. rain creates a volumetric scattering field.
- structural frame: visible steel/concrete grid beneath. projection emanates from within the grid.
- scale: 15-20 stories tall. individual pixels visible from street.

**the Las Vegas deteriorated displays**:
- **failed panels**: rectangular dark blocks following cabinet boundaries (entire driver board death)
- **color drift**: remaining panels show shifted temperatures, some stuck on single color
- **structural exposure**: physical frame visible where panels fell away — steel cabinet structure, mounting rails, empty cable conduits
- **intermittent flicker**: capacitor failure pattern, irregular on/off

**Deakins' lighting**: lit the film with practical LED sources. building display light was simulated on-set with large LED panels. the light-spill is physically accurate — large area source, soft but directional, color-shifted from display content.

### The Critical Translation Table

| Cinema Element | Shader Implementation |
|---|---|
| Pixel grid | point particles with size < spacing; dark bg between |
| Module seams | conditional darkening every 32nd row/column |
| Structural frame | geometry border with shadow/parallax depth |
| Failed panels | zero-out emission in rectangular blocks |
| Color drift | per-module color temperature offset |
| Scanlines | `sin(uv.y * lineCount) * 0.5 + 0.5` brightness modulation |
| Light bleed/bloom | post-process bloom on bright pixels, additive composite |
| Rain/particle interaction | particle system with emission color sampled from display |
| Surface reflection | mirror plane with vertical blur and Fresnel opacity |
| Atmospheric depth | per-particle saturation reduction + blue shift proportional to z-depth |

### Five Principles Across All Cinema References

1. **imperfection is authenticity** — every work shows technology that fails, degrades, behaves imperfectly. perfect displays look fake.
2. **the display is not the content** — the HARDWARE (frame, grid, modules, mounting) is what makes a display feel physical. content is secondary to structure.
3. **light is a material** — display light has mass (fills space), behavior (scatters in atmosphere), and consequence (alters everything it touches).
4. **scale changes meaning** — below ~60° FOV, a display is a sign. above ~60°, it becomes environment/sky. the transition zone is where cyberpunk lives.
5. **wet surfaces double everything** — rain/water creates secondary display surfaces that stretch, distort, and color-shift.

---

## Venue/Location Design — Five Principles of Destination

### 1. The Approach Builds Anticipation Through Contrast

- **Anor Londo** after Blighttown — gold city after sewers. one of gaming's most celebrated reveals.
- **New Vegas** after the Mojave — neon hallucination in the desert. Fallout Season 1 recreated this exact shot.
- **Berghain**: 45-meter vertical facade, tiny unsuspecting door on the southwest side.
- the greater the contrast between journey and arrival, the more powerful the destination.

### 2. The Entrance is a Ritual, Not a Doorway

- **Berghain**: queue → bag search → phone sticker → "small cramped spaces" → "opening up of felt space" as sound grows louder
- Christopher Alexander: *"Whatever is holy will only be felt as holy if it is hard to reach, if it requires layers of access, waiting, levels of approach, a gradual unpeeling."*
- **Cyberpunk 2077**: bouncers, stat checks, lifepath dialogue, alternative entry (climbing dumpsters, shooting latches, hacking elevators). the building is simultaneously destination and skill check.
- **teamLab Borderless**: anamorphic text at entrance, no map, deliberate disorientation. *"Wander, Explore, and Discover."*
- **Meow Wolf**: refrigerator portal. the threshold crossing IS the first act.

### 3. The Facade IS the Identity

- **Blade Runner**: neon-as-architecture. the display replaces the building surface.
- **Tokyo Shibuya/Shinjuku**: LED screens serving AS building facades, not mounted ON them
- **The Sphere**: 580,000 sqft LED exterior, 1.2 million pixel units, 4000+ nits. the building IS the screen.
- **Skyfall jellyfish billboard**: 7 minutes 27 seconds of screen time. "almost demands its own entry in the cast list." the facade becomes a character.
- in cyberpunk, the sign is not on the building. the sign IS the building.

### 4. Depth Increases With Penetration

- **Afterlife**: three successive chambers, growing darker and more dangerous. deeper = more elite.
- **Altered Carbon**: Grounders (gritty), Twilight (middle), Aerium (ultra-rich above clouds). altitude = wealth.
- **Continental Hotel**: mundane exterior ("C" awning, pedestrian building), extraordinary interior. contrast between shell and content.
- Night City's four architectural eras stacked vertically (Entropism → Kitsch → Neo-Militarism → Neo-Kitsch).

### 5. The Venue Exists Without You

- **Chatsubo**: regulars, Ratz the robot-armed bartender, specific beers. *"you could drink there for a week and never hear two words in Japanese."*
- **Afterlife**: names drinks after dead legends. every Solo dreams of posthumous menu entry.
- **Berghain**: Studio Karhard: *"Our part was to preserve what was there and not destroy the old structure."* the architecture predates the venue.
- a destination has history, rituals, and social codes that existed before the visitor arrived.

---

## Shibuya Multi-Display: What Creates "PLACE"

the key qualities that make Shibuya feel like a place rather than a collection of screens:

1. **content desynchronization** — each screen runs its own loop at its own refresh rate. visual polyrhythm — no two screens align temporally.
2. **brightness variation** — different ages, technologies, calibrations. adjacent screens noticeably different white points and contrast ratios.
3. **scale variation** — 3-meter storefront to 20-meter facade, visible simultaneously.
4. **vertical stacking** — displays at different heights and angles. canyon effect wrapping the visual field.
5. **color bleed mixing** — each screen casts colored light. multiple screens MIX on surfaces — a face lit blue from left and red from above simultaneously.
6. **information overload** — fashion, music, news, transit, weather, branded animation. the defining quality.

**Shinjuku 3D cat**: two screens at 90° create a dihedral angle. anamorphic projection exploits the corner geometry. the cat appears to exist IN the building corner.

---

*sources: over 80 web fetches across Architizer, IndieWire, Screen Rant, Radio Design, Creative Applications Network, Level Design Book, Fextralife, Film and Furniture, Domus, William Gibson Wiki, ArchDaily, and production design interviews.*
