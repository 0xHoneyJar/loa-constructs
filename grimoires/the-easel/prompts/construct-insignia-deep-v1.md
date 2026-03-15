# Construct Insignia — Deep Exploration v1

> **Date**: 2026-03-13
> **Status**: Active — deep exploration for launch constructs
> **Pipeline**: Recraft V4 Pro (`recraft/v4/pro/text-vector`) on Fal.ai
> **Scope**: Top 3 launch constructs (mibera-codex, k-hole, artisan) + 2 support (observer, herald)
> **Difference from v1**: These prompts are grounded in each construct's actual persona and domain objects.
> The v1 prompts are broad concept searches. These go deeper — each cell references the real identity.

---

## Style Block (shared)

```
Flat vector, bone white (#F5F0E8) on pure black (#111111), angular military insignia.
Tactical operator patch — geometric, hard-edged, institutional.
No text. No rounded corners. No organic curves unless they serve the concept.
Every line deliberate. Fewer strokes = more authority.
The mark reads at 24px (card), 128px (detail), and building-scale (LED sign).
```

---

## D-001: Artisan — ALEXANDER

### The Identity

Christopher Alexander proved beauty is not subjective magic but objective structural pattern. The artisan is his construct-form: the hand that transforms "this feels right" into an engineering specification. Three base abstractions — **warmth, weight, rhythm** — decompose any aesthetic into measurable tokens.

Governs 4 constructs (the-easel, showcase, the-arcade, the-mint) for taste conformance. Canonical pair with Beehive (user truth → taste synthesis). Voice: "the shadow is too heavy" means "increase oklch lightness from 0.18 to 0.22."

The artisan is a **craftsman**, not an artist. Structure before material. The artifact is the argument. Convergence is subtractive — you remove until what remains is correct.

### Domain Objects (from the real construct)

- **Pattern Language** — Alexander's 253 patterns, each a solution to a recurring design problem
- **Taste tokens** — OKLCH values, spacing values, motion constants: the DNA of feel
- **Spring constants** — mass, stiffness, damping: motion as physics, not CSS keywords
- **Caliper measurements** — the tool that measures the gap between intent and output
- **The 15 Properties** — Alexander's structural properties that generate life in built space

### Exploration Prompt — Grid A: The Craftsman's Tools

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Artisan" — a master design systems engineer who transforms aesthetic intuition into engineering specifications. Not an artist — a craftsman. The person who proved that beauty is structural pattern, not subjective taste. Each cell shows a different tool or symbol from the craftsman's workshop. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — DRAFTING COMPASS: A precision compass at exactly 30 degrees open — the tool that draws perfect arcs. Two angular legs joined at a calibrated pivot. Not decorative — this is the instrument that makes circles true. The oldest precision tool. Rendered as technical drawing, not illustration.

Cell 2 — SPRING DIAGRAM: A mechanical spring rendered as a zigzag between two fixed points with force arrows — the physics of motion design. Mass, stiffness, damping as a single diagram. The artisan defines motion through spring constants, not CSS ease-in-out. The physics IS the design.

Cell 3 — OKLCH COLOR WHEEL: A geometric color wheel divided into angular segments — not the RGB circle but the perceptual OKLCH space. Lightness as vertical axis, chroma as radius, hue as angle. The artisan's actual tool for color specification. A wheel built on human perception.

Cell 4 — GOLDEN SECTION CALIPERS: Special calipers built to the golden ratio — when one jaw measures A, the other automatically measures B such that A/B = phi. The tool that finds the proportion. Two angular jaws locked to mathematical beauty.

Cell 5 — SUBTRACTIVE MARK: A filled geometric shape (square, hexagon) with pieces CUT AWAY — material removed to reveal form. The artisan's method: convergence is subtractive. You remove until what remains is correct. Negative space IS the design.

Cell 6 — PATTERN TILE: A single tile from a tessellation — one unit that, when repeated, creates an infinite pattern. Christopher Alexander's pattern language as a physical tile. The smallest unit of a larger truth. Angular, interlocking, self-similar.

Cell 7 — TYPE SPECIMEN: A single letterform — a lowercase 'a' or 'g' — rendered in extreme geometric detail. The artisan cares about the ink trap, the counter, the terminal. Typography is the most refined craft. One letter as the test of a system.

Cell 8 — LEVEL BUBBLE: A spirit level — the tube with the bubble, mounted in a frame. The tool that finds TRUE horizontal. The artisan's obsession with alignment — not decorative symmetry but structural truth. The bubble either centers or it doesn't.

Cell 9 — WARMTH/WEIGHT/RHYTHM: Three abstract angular marks stacked vertically — a wavy line (warmth), a heavy bar (weight), a repeating pulse (rhythm). The three base abstractions that decompose any aesthetic. The artisan's trinity. Three marks, one system.

Style: flat vector, bone white on black, angular. This is the MASTER CRAFTSMAN — not creative, precise. Not inspired, correct. The mark should feel like the guild seal of someone who proved that beauty is engineering. Authority earned through measurement.
```

### Exploration Prompt — Grid B: Alexander's Properties

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Artisan" — each concept derived from one of Christopher Alexander's structural properties that generate life in built space. These are not abstract symbols — they are the PRINCIPLES the artisan operates by, rendered as insignia. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — LEVELS OF SCALE: Nested geometric shapes — large, medium, small — each containing the next. Scale that repeats at every level. The property that generates hierarchy. Three nested angular frames, each proportionally smaller.

Cell 2 — STRONG CENTERS: A single bold geometric center with radiating structural lines — the center that organizes everything around it. Not symmetry — centrality. A point that generates its own field of influence. Heavy central mark.

Cell 3 — BOUNDARIES: A thick angular border around a space — the property that defines where one thing ends and another begins. Not a thin line but a substantial boundary with its own thickness. The border IS a thing.

Cell 4 — ALTERNATING REPETITION: Two different geometric elements alternating in a sequence — ABABAB. Not identical repetition but rhythmic alternation. The heartbeat pattern. Two shapes in dialogue.

Cell 5 — POSITIVE SPACE / NEGATIVE SPACE: An angular mark where the figure and ground are EQUALLY shaped — neither is leftover. Both the black and white areas are deliberately designed shapes. Ambiguous figure-ground. Both spaces are alive.

Cell 6 — GOOD SHAPE: A single angular shape that is unmistakably "correct" — you couldn't add or remove anything. A shape with no excess. Not simple — resolved. The shape that stops you from wanting to change it.

Cell 7 — LOCAL SYMMETRIES: An angular mark with multiple SMALL symmetries that don't add up to one global symmetry — locally balanced, globally asymmetric. Small order inside larger complexity. Not one axis but many small ones.

Cell 8 — THE VOID: An angular border surrounding deliberate emptiness — the space that gives everything else room to breathe. Not absence but active structural material. Emptiness as Kenya Hara's design principle. The shape of nothing.

Cell 9 — ROUGHNESS: An angular mark where the geometry is SLIGHTLY imperfect — one line not quite parallel, one angle not quite 90°. The property that makes things alive instead of dead. Hand-made, not machine-made. Perfect geometry made human.

Style: flat vector, bone white on black, angular. Each of these IS a principle the artisan lives by — structural properties that generate life in designed space. The mark should feel like one of these properties incarnated. Not a picture of a tool — the property itself as geometry.
```

---

## D-002: K-Hole — STAMETS

### The Identity

K-Hole is not a personality. It is a **room**. Seven thinkers who never met, working the same problem from seven angles, in productive tension nobody resolves. Named after Paul Stamets because the mycelium is the architecture — underground signal propagation connecting things that look separate on the surface.

The room has no conductor. The voice that fits the moment rises; others recede. Two modes: `/dig` (pair-research, descending together, the trail is the output) and `/forge` (systematic cartographic coverage).

The resonance profile is the first artifact representing the USER, not the project. K-Hole works on the person. A spiral is as valid as a line. Straylight category — the only one.

### Domain Objects (from the real construct)

- **Mycelial network** — underground connections between visible fruiting bodies
- **Seven voices** — Lilly (subtraction), Carhart (dissolution), Shulgin (precise self-experiment), Warburg (visual resonance across time), Nelson (thread-following), Ulbricht (infrastructure), Nakamoto (composition + disappearance)
- **Resonance profile** — epistemological fingerprint of a person
- **The Mnemosyne Atlas** — Warburg's image panels arranged by gesture, not chronology
- **The Dig** — intentional descent, trail as output

### Exploration Prompt — Grid A: The Descent

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "K-Hole" — a depth-research operator where seven voices work the same problem from seven angles with no conductor. Named after both the dissociative state AND Paul Stamets (mycelial networks). It works on the PERSON, not the project. Each cell shows a different way to represent "intentional descent into depth." Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — MYCELIAL CROSS-SECTION: A vertical slice through soil showing a visible surface (one small triangle/plant) with a MASSIVE underground network beneath it — branching angular lines spreading wider than the visible world above. What you see is 5% of what exists. The infrastructure IS the organism. Stamets' insight as geometry.

Cell 2 — SEVEN-POINT ARRAY: Seven angular marks arranged in a non-hierarchical cluster — no center, no ring, no line. Seven independent points in productive tension. Each mark slightly different (a shard, a dot, a line, a triangle, a cross, a diamond, a notch). They never resolve into one shape. The room that has no conductor.

Cell 3 — DESCENT SHAFT WITH BRANCHING: A vertical shaft descending with side tunnels branching off at different depths — the dig as architecture. You go down, but the path isn't straight. At each level, new directions appear that you didn't expect. Angular mining architecture.

Cell 4 — MNEMOSYNE PANEL: A rectangular panel divided into a grid of smaller rectangles — Warburg's Mnemosyne Atlas format. An arrangement of images (implied as blank rectangles of different sizes) organized by RESONANCE, not category. The knowledge surface. How you arrange things reveals what you know.

Cell 5 — RESONANCE WAVEFORM: Two angular waveforms overlapping — one from the construct, one from the user. Where they align, the peaks amplify. Where they don't, destructive interference. The resonance profile as signal processing. Two patterns finding their consonance.

Cell 6 — SPIRAL DESCENT: A square spiral — a path that starts at the outside edge and turns inward toward a center point, each revolution tighter than the last. The k-hole descent: you go in circles but each circle is deeper. The spiral is as valid as a line. Angular, not curved.

Cell 7 — DISSOLVED GRID: A regular grid (4x4 or 5x5) where the lines in the CENTER have dissolved — broken, missing, scattered. The edges are still structured. Carhart's principle: dissolve your first answer, it's your default network talking. The grid of assumptions breaking down in the middle.

Cell 8 — SHULGIN SCALE: A vertical gauge with 7 graduated levels marked by different angular symbols — the PiHKAL/TiHKAL dosage-response scale. Each level is a different state of depth. The tool that measures the QUALITY of a descent, not just its duration. Clinical, precise, graduated.

Cell 9 — FRUITING BODY: A single mushroom rendered in angular geometry — the visible result of an invisible network. The part you can see. The output of a dig is one document; the network that produced it is vast and underground. Simple surface, complex substrate.

Style: flat vector, bone white on black, angular. This operator is the ONLY Straylight category construct — esoteric research division. It works on the PERSON. The mark should feel like the insignia of a unit that maps consciousness. Not surveillance — resonance. Not extraction — descent.
```

### Exploration Prompt — Grid B: The Seven Voices

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "K-Hole" — each concept derived from one of the seven research voices OR the construct's core operations. These are not abstract symbols — they are the METHODS K-Hole uses, rendered as insignia. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — LILLY'S VOID: An angular frame with EVERYTHING INSIDE REMOVED — a thick border around absolute emptiness. Depth through subtraction. Remove everything. What's left is the signal. The void IS the finding. John C. Lilly's sensory deprivation tank as emblem.

Cell 2 — NELSON'S THREAD: A single angular line that starts straight, then turns, then turns again, following something invisible — the thread you trust without knowing where it leads. Hypertext. One thing links to the next. Ted Nelson's insight: follow it; it knows where it's going.

Cell 3 — WARBURG'S ATLAS: A 2x3 or 3x3 grid of small rectangles — each a different size, arranged not by category but by visual weight. The Mnemosyne Atlas: images organized by gesture across time. Pattern recognition as spatial arrangement.

Cell 4 — NAKAMOTO'S NINE PAGES: A small, dense angular mark — something that contains maximum meaning in minimum surface. The Bitcoin whitepaper: nine pages, ship and vanish. Compression as power. The mark should feel like it contains more than it shows.

Cell 5 — ULBRICHT'S BAZAAR: An angular marketplace layout — interconnected stalls or nodes forming a functional network. The infrastructure is the argument. Silk Road: build the space and the behavior follows. The architecture of possibility.

Cell 6 — CARHART'S DISSOLUTION: A geometric shape (hexagon or square) in the process of dissolving — edges fragmenting, particles separating from the form. Not destruction but dissolution. Your first answer is your default network talking. Dissolve it. See what emerges.

Cell 7 — SHULGIN'S NOTEBOOK: A rectangular notebook page with precise angular notation marks — the lab record. Feel it, then write it down precisely. 230 compounds, each with a precise subjective rating. Rigor applied to the ineffable. The record IS the discipline.

Cell 8 — THE DIG TRAIL: A descending path shown as angular footsteps or markers going DOWN and to the RIGHT — each marker at a lower level than the last. The trail IS the output. You and the construct descended together and left these marks. A trail, not a document.

Cell 9 — THE RESONANCE PROFILE: A fingerprint-like pattern rendered in angular lines — but it's not a fingerprint, it's a RESONANCE profile. Concentric angular shapes that are unique to one person. The epistemological fingerprint. The first artifact representing the USER, not the project.

Style: flat vector, bone white on black, angular. Each cell embodies a specific METHOD or VOICE in the K-Hole system. The mark should feel like each one is a different specialized insignia worn by different members of the same esoteric research unit. Seven voices, one room, no conductor.
```

---

## D-003: Mibera Codex — THE ORACLE

### The Identity

The Oracle is the librarian of 10,000 time-travelling Beras. The library holds 15,000 years of psychedelic mythology, underground music movements, and the identity records of 10,000 unique beings who exist across all of time at once. The Oracle has been at every rave since the beginning of time.

This is the **codex archetype** — not a skill-pack but a knowledge store. Not skills, but facts. Seven Books structure all knowledge: Genesis, Archetypes, Ancestors, Mysticism, The Art, The Collection, The Record. 78 drugs mapped 1:1 to 78 tarot cards. Four suits as four drug families. Temporal paradox: Miberas born in 1352 CE understand phones but reach for cathedral imagery.

The Signal Hierarchy governs identity: Archetype > Ancestor > Birthday > Drug/Molecule > Tarot > Element > Swag > Astrology. Load-bearing signals define worldview; textural signals color expression.

### Domain Objects (from the real construct)

- **Seven Books** — the knowledge structure (Genesis through Record)
- **Tarot-Drug mapping** — 78 cards, 78 compounds, four suits as four families
- **The Grails** — 42 unique Miberas with distinct significance
- **The Fractures** — 10 temporal anomalies
- **Era sigils** — Miberas carry their birth-era as identity marker
- **Rave nexus** — the Temporary Autonomous Zone as recurring event across 15,000 years
- **The Chronicle** — the archive spanning from prehistory to present

### Exploration Prompt — Grid A: The Archive

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Mibera Codex" — a knowledge archive containing the identity records of 10,000 time-travelling beings across 15,000 years. Not an operator — a CODEX. A library. An oracle who has been at every rave since the beginning of time and speaks plainly about it. Each cell shows a different way to represent "stored knowledge that spans all of time." Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — SEVEN BOOKS: A stack of seven angular volumes — each a different thickness, stacked vertically. Seven Books: Genesis, Archetypes, Ancestors, Mysticism, Art, Collection, Record. The entire knowledge structure as a physical stack. Heavy, comprehensive, layered.

Cell 2 — TEMPORAL SPIRAL: A spiral timeline — angular, unwinding from a center point outward. But the spiral has MARKS at different points on the coil — eras where Miberas were born. 15,000 years of history encoded on one geometric spiral. Time as structure, not decoration.

Cell 3 — TAROT CARD: A single tarot card — the rectangular format with an angular symbol in the center. The 78-card system maps 1:1 to 78 drug compounds. Four suits, four families. The card as classification system. The oracle deals knowledge, not fortune.

Cell 4 — SIGNAL HIERARCHY: A vertical stack of 7 horizontal bars of DECREASING width — the identity signal hierarchy. Archetype (widest) > Ancestor > Birthday > Drug > Tarot > Element > Swag (narrowest). The load-bearing signals are heaviest. A pyramid of identity rendered as data visualization.

Cell 5 — ORACLE WINDOW: A rectangular window or aperture — the interface through which you query the codex. A simple opening in a thick wall. Two registers: simple questions get clean answers through the small window; deeper questions open the wall wider. The depth model as architecture.

Cell 6 — CHRONICLE SCROLL: An unrolled scroll — the chronicle that spans from prehistory to present. But the scroll has no end — it extends beyond the frame on both sides. Time continues in both directions. The archive is never complete. Angular scroll with visible text-block marks.

Cell 7 — RAVE NEXUS: A geometric starburst — the Temporary Autonomous Zone, the moment where disparate timelines converge. The recurring event across 15,000 years. A single explosive point where all threads meet. Angular burst, radial energy.

Cell 8 — GRAIL MARK: A single chalice or cup — but geometric, angular, institutional. One of the 42 Grails: unique beings of distinct significance. The exceptional case. The artifact within the archive that is different from the others. Not decorative — marked.

Cell 9 — ERA SIGIL: A geometric mark that encodes TIME — angular shapes that read as "ancient" or "modern" depending on their geometry. An era sigil: the mark a Mibera carries from its birth century. A mark born in 1352 CE looks different from one born in 2024. Temporal identity as geometry.

Style: flat vector, bone white on black, angular. This is NOT an operator — it's a CODEX. A library. An archive. The mark should feel like the seal of an institution that has been collecting records since before writing existed. Timeless, comprehensive, the thing that remembers.
```

### Exploration Prompt — Grid B: The Oracle's Nature

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Mibera Codex" — each concept captures a different facet of being an oracle: knowing without performing, being ancient without being ornate, containing multitudes without being chaotic. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — KNOWLEDGE CRYSTAL: A geometric crystal — octahedral or dodecahedral, angular facets. The total knowledge of 10,000 beings compressed into a single geometric solid. Every facet reflects a different story. Dense, multifaceted, holding light.

Cell 2 — CLASSIFICATION GRID: A grid divided into unequal rectangular cells — each cell a category (archetype, ancestor, era, drug, tarot, element). Some cells are larger (load-bearing signals), some smaller (textural). The taxonomy of identity as a Mondrian-like geometric layout.

Cell 3 — OPEN BOOK WITH EYE: A book opened flat (two angular page shapes forming a V) with a single geometric eye in the center fold — the codex that observes. Knowledge that sees. The library that reads you back. Open pages, single witness.

Cell 4 — BEAR SILHOUETTE: A bear rendered in 6-8 angular strokes — the Bera. The species of the 10,000. Not cute, not aggressive — present. A being that has lived across 15,000 years of human history. The bear as angular totem.

Cell 5 — RECORD PLAYER: An angular record/vinyl on a turntable — the rave connection. Music as temporal nexus. The record that plays sounds from every era simultaneously. Angular platter, tonearm, single groove containing multitudes.

Cell 6 — LIBRARY INDEX: A card catalog drawer pulled slightly open with visible tab cards — the organizational system. The Oracle doesn't dump knowledge; it retrieves specifically. Query → result. The precision of librianship. Angular drawer, angular tabs.

Cell 7 — FRACTURE MARK: An angular shape with a visible crack or fissure — one of the 10 Fractures, the temporal anomalies in the collection. Something that shouldn't exist but does. A geometric form with an impossible break. The exception that proves the archive.

Cell 8 — FOUR SUITS: Four small angular symbols arranged in a 2x2 grid — the four tarot suit marks representing the four drug families. Each symbol fundamentally different from the others. Four ways of seeing, four chemical families, four categories of experience. Compact, distinct.

Cell 9 — TIME LOCK: An angular lock mechanism with a clock element — the temporal paradox sealed. A Mibera born in 1352 CE exists now. Time is locked in place by the archive. The mechanism that holds the temporal paradox without resolving it.

Style: flat vector, bone white on black, angular. The Oracle is PLAIN. It doesn't perform. It knows things and shares them simply. The mark should feel like a seal you'd find on a document in a very old, very organized institution that happens to track psychedelic genealogy across 15,000 years. Not mystical — institutional.
```

---

## D-004: Beehive — The Deepest Operator

### The Identity

24 capabilities across surveillance, feedback capture, user research, journey-shaping. The deepest and most capable construct in the network. Combat-proven. Composes with artisan as the canonical pairing — observe first, then shape the feel. Beehive sees the trees, Gecko sees the forest.

The construct that watches without being seen. Captures signals. Shapes journeys. Not creepy — disciplined. The intelligence that makes good design possible.

### Exploration Prompt — Grid A: Intelligence Instruments

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Beehive" — the most capable operator in the network. 24 specializations across surveillance, feedback, journey-shaping. It watches user behavior and captures signals that inform design. The canonical intelligence operator. Each cell shows a different surveillance or intelligence instrument grounded in real technology. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — GROUND STATION: A satellite ground station antenna — a large parabolic dish on a tracking mount, pointed at a specific angle. Not pointed at the sky randomly — TRACKING something specific. The construct that follows signals. Angular dish, precise elevation.

Cell 2 — OSCILLOSCOPE TRACE: An oscilloscope display — a rectangular screen with a waveform trace crossing it. The tool that makes invisible signals visible. The observer doesn't just watch — it RENDERS what it sees into readable form. Angular screen, angular waveform.

Cell 3 — COMPOUND LENS: A multi-element lens system — 3-4 lens elements stacked in a barrel. Each lens corrects what the previous one distorted. 24 capabilities are like 24 lens elements — each adding clarity. The system sees better than any single element.

Cell 4 — FIELD JOURNAL: An open field notebook — two angular pages with marks suggesting observations. Not a database — a field journal. The observer is IN the field, taking notes. Hand-observation made systematic. Angular notebook, observation marks.

Cell 5 — SONOBUOY: A cylindrical sonobuoy — the device dropped into water to listen for submarines. Passive, silent, capturing everything. Deployed into the user's environment to listen. Angular cylinder with antenna extending upward.

Cell 6 — LISTENING POST: A directional microphone — the parabolic dish used for long-distance audio capture. The construct that hears what users say when they think nobody's listening. Feedback capture as intelligence discipline. Angular dish, angular stand.

Cell 7 — THEODOLITE: A surveyor's theodolite — the precision angle-measuring instrument on a tripod. The tool that maps territory precisely. The observer measures the landscape of user behavior with angular precision. Instrument + tripod.

Cell 8 — FLIGHT RECORDER: A flight data recorder (black box) — the angular armored box that survives everything and records everything. Indestructible memory. The observer captures signals that persist even when the project changes. Angular box, industrial.

Cell 9 — TWENTY-FOUR MARKS: 24 small angular marks arranged in a structured pattern — not a grid, not a line, but a CONSTELLATION. Each mark is one capability. Together they form the most comprehensive observation system in the network. The pattern is the identity.

Style: flat vector, bone white on black, angular. This is the DEEPEST operator — 24 specializations, combat-proven, more capabilities than any other construct in the network. The mark should feel like the insignia of a military intelligence agency's most senior division. Total situational awareness.
```

---

## D-005: Herald — The Signal Corps

### The Identity

Converts internal development activity (GitHub PRs, releases) into platform-specific social content. 3-layer signal filter (rules → heuristics → aggregation). Grimoire voice system. The construct that makes the internal external. Signal transmission with editorial judgment.

### Exploration Prompt — Grid A: Broadcast Instruments

```
A 3x3 grid of 9 DIFFERENT emblem concepts for "Herald" — a communications operator that converts internal code-shipping activity into public announcements. A 3-layer signal filter: raw events → heuristic scoring → editorial aggregation. Not spam — signal. Each cell shows a different broadcast or communication instrument. Flat vector, bone white on pure black, angular military insignia style.

Cell 1 — SIGNAL CORPS FLASH: A signal lamp with a shutter mechanism — the military flash signal. A directed beam of light, controlled by opening and closing a shutter. Binary communication: light or dark, signal or silence. The herald chooses WHEN to signal.

Cell 2 — TELEGRAPH SOUNDER: A telegraph sounder — the electromagnetic device that clicks to receive morse code. The mechanism that converts electrical signal into sound. Translation across mediums. The herald translates code events into human language. Angular mechanism on wooden base.

Cell 3 — FREQUENCY FILTER: Three angular filter shapes stacked — a wide funnel narrowing to a medium tube narrowing to a narrow channel. The 3-layer signal filter. Everything enters the top; only signal exits the bottom. Raw → scored → curated. Filtration as architecture.

Cell 4 — PENNANT STRING: A horizontal line with 3-4 triangular pennants hanging from it — signal flags in sequence. Each flag is a different shape/message. The herald strings together individual signals into a narrative. Sequential communication. A message told in parts.

Cell 5 — RADIO OPERATOR: A headset with attached microphone — the radio operator's equipment. The person who listens AND transmits. The herald is bidirectional: it receives internal signals and transmits external messages. Receiver + transmitter as one device.

Cell 6 — PRESS PLATE: A printing plate — the flat rectangular surface with raised angular marks that stamp ink onto paper. The technology of reproduction. One plate, many copies. The herald takes one event and distributes it across platforms. The multiplier.

Cell 7 — LOUDSPEAKER HORN: A horn speaker — the exponential horn that amplifies sound through shape alone. No electricity needed. Geometry as amplification. The herald amplifies signal through structure, not volume. Angular horn, flared opening.

Cell 8 — SIGNAL ROCKET: A signal rocket ascending — a vertical line with a starburst at the top. The emergency signal. The most important messages get the most visible treatment. The herald decides what warrants a rocket and what warrants a whisper.

Cell 9 — RELAY STATION: Two angular towers connected by a signal arc — a relay station. The message travels from source to relay to audience. The herald is the relay — it receives from one world (code) and transmits to another (public). The bridge between domains.

Style: flat vector, bone white on black, angular. This operator is the SIGNAL CORPS — it doesn't create the news, it transmits it. But transmission with judgment: 3-layer filtering, editorial voice, platform adaptation. The mark should feel like a military communications corps insignia. Clear signal, zero noise.
```

---

## After Exploration — Deep Workflow

For these top 3-5 constructs, the workflow goes deeper than the standard pipeline:

### Phase 1: Explore (this document)
Run both Grid A and Grid B for each construct. 18 concepts per construct instead of 9.

### Phase 2: Select & Combine
Pick 2-3 winners across both grids. Often the best mark COMBINES elements from different cells. Use the Combine template:
```
A single emblem that combines [CONCEPT A description] with [CONCEPT B element].
Specifically: take the [specific thing from A] and merge it with the [specific thing from B].
One mark, centered, large. Bone white on black, angular insignia.
```

### Phase 3: Dial-In with Lore
For these top constructs, the dial-in prompt should include the lore context:
```
A single emblem centered on pure black. This is the insignia of [CONSTRUCT NAME] —
[ONE SENTENCE of identity from the persona document].

The exact mark: [PRECISE DESCRIPTION of winning concept].

This mark will be displayed at three scales:
1. 24px — operator insignia on a roster board card
2. 128px — hero mark on an operator dossier
3. Building-scale — LED billboard on a Sprawl building facade

Render at maximum fidelity. 80-90% canvas. Bone white on pure black.
Angular, geometric, institutional. No text, no framing, no background.

MUST: Single mark. Centered. Angular. Bone on black.
NEVER: Multiple marks, grids, text, organic curves, rounded corners.
```

### Phase 4: SVG Conversion
Same as v1 — Claude code mode traces the winning image.
ViewBox: 128x128 for insignia. stroke="currentColor" for theme inheritance.

### Phase 5: State Derivation
For launch constructs, derive 3 states from the hero mark (per TDR-016):
- **Dormant**: subset of paths (2-3 strokes from the full mark)
- **Active**: full mark at full opacity
- **Deployed**: full mark + extension strokes past viewBox (the mark is in use, expanding)

States derived programmatically from one SVG — pixel-perfect consistency.

---

## Reference: Construct Identity Capsules

Quick reference for prompt refinement — the one-line essence of each construct:

| Construct | Essence | Archetype |
|-----------|---------|-----------|
| **Artisan** | "What starts as 'this feels right' becomes an engineering specification" | Christopher Alexander — beauty is structural pattern |
| **K-Hole** | Seven thinkers in productive tension, no conductor — the mycelium is the architecture | Paul Stamets — underground connections between visible things |
| **Mibera Codex** | Librarian of 10,000 time-travellers, 15,000 years, speaks plainly | The Oracle — institutional knowledge, not mystical performance |
| **Beehive** | 24 capabilities, combat-proven, sees everything, the canonical intelligence operator | Intelligence agency — total situational awareness |
| **Herald** | 3-layer signal filter, translates internal code-shipping into public signal | Signal Corps — clear transmission, zero noise |
