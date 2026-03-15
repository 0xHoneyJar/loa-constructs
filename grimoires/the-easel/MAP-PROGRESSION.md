# Map Progression — Living Artifact

> Updated after each milestone. Shows what's built, what's next.

## Current State: STORYTELLING + LORE GROUNDED

**Latest render**: `~/Desktop/Map/festival_map_v9_story.png`
**Blend**: `grimoires/the-quarry/pipeline/mibera-festival-map-v1.blend`
**Visual review tool**: `construct-k-hole/scripts/visual-review.ts`

## Milestones

### M0: Terrain + Cliffs (DONE)
- 16x16 sand terrain base (scaled 1.15x to fill frame)
- 12 perimeter cliff formations + 4 interior zone dividers
- Toon shader pipeline established (Diffuse > ShaderToRGB > ColorRamp > Emission)
- Orthographic camera + freestyle outlines (BoldOutlines, 2.5px, #261F1A)

### M1: Stonehenge (DONE)
- 8 tapered megaliths in R=2.2 circle (rebuilt from scratch)
- 3 lintel pairs bridging stones 0-1, 3-4, 6-7
- Central altar disc (cylinder, R=0.6)
- ToonStone material (3-band color ramp)
- Weathered tops (vertex displacement)

### M2: Bear Cave (DONE)
- Horseshoe cavern (7 back + 8 arm segments, organic vertex displacement)
- Pinched entrance with 2 gate rocks
- Dark interior floor disc (ToonCaveFloor, near-black)
- ToonCaveWall material (darkened, dramatic)

### M3: El Dorado (DONE)
- 3-tier stepped pyramid (ziggurat)
- Central court, 5-step stairway, flanking pillars, 4 corner columns
- 6 debris pieces at tier edges (erosion detail)
- ToonGoldStone material (saturated warm gold)

### M4: Owsley Lab (DONE)
- Angular compound with main room
- West + south annexes, connecting pipes
- 3 interior workbenches, chimney
- ToonLabWall material (cool grey-brown)

### M5: Terrain Detail (DONE)
- [x] 16 path segments connecting landmarks to center
- [x] 16 scattered rocks (UV spheres, randomized)
- [x] 9 scrub patches (olive-brown circles)
- [x] Terrain switched to flat emission (toon shading doesn't work on flat planes from above)

### M6: Landmark Polish (DONE)
- [x] Organic vertex displacement on Bear Cave walls
- [x] Weathered megalith tops
- [x] El Dorado debris (erosion detail)
- [x] Owsley Lab connecting pipes
- [ ] Further detail: carved reliefs, altar decoration (deferred)

### M5.5: Environmental Storytelling (DONE)
- [x] 2 fire pits with stone ring surrounds
- [x] 12 ritual marking stones (inner circle around altar)
- [x] 4 El Dorado ruin fragments (fallen columns)
- [x] 3 crates + 1 barrel at Owsley Lab exterior
- [x] 2 worn gathering spots (packed earth)
- Total: 15 storytelling objects

### M7: Visual Comparison (DONE — 4 review passes)
- [x] K-Hole visual-review.ts built and tested
- [x] 4 comparison runs against Starship Troopers reference
- [x] 1 self-audit run (mode=audit)
- [x] Palette saturation passes (8 iterations, v1→v9)
- [x] Shadow depth tuning (raked sun at (8,-4,5), energy 5.0)
- [x] Terrain dune displacement (procedural sine waves, 1600 verts)
- [x] Cliff vertex roughening for organic rock edges
- Remaining gap: contrast and value range narrow vs polished concept art (expected at blockout stage)

### M8: Camera + Lighting (DONE)
- [x] 6° camera tilt for painted depth
- [x] Camera at (0, -1.2, 13), ortho_scale=18.5
- [x] Sun raked to (8, -4, 5) for side-lighting on landmarks
- [x] Fill light at (-5, 5, 7), subtle cool

### M9: Export + Overlay (NEXT)
- [ ] Final 1600x1040 render (transparent bg)
- [ ] SVG overlay for interactive zone polygons
- [ ] HTML/CSS labels with leader lines
- [ ] Integration with pan/zoom React component

## Visual Review Scores (v6, Gemini comparison vs Starship Troopers)

| Dimension | Score | Gap |
|-----------|-------|-----|
| Composition | 6/10 | Layout works, needs density |
| Palette | 3/10 | Warmer than v1 but still desaturated vs reference |
| Contrast | 1-3/10 | Core gap — flat terrain + limited value range |
| Material Quality | 1-3/10 | Toon bands trigger but surfaces lack texture |
| Landmark Readability | 3-5/10 | Big shapes read, mid-ground blends |
| Atmosphere | 2-3/10 | Needs environmental storytelling |

**Key insight**: The scores are RELATIVE to a polished concept art reference. The greybox is functionally correct — zones, landmarks, proportions all work. The gap is in surface quality (texture, painted detail, atmosphere) which requires either post-processing or much more detailed geometry.

## Zone Map

```
     BEAR CAVE (175)
   ┌─────────────────┐
   │   NW    N    NE │
   │                 │
W  │  STONEHENGE     │  EL DORADO (219)
   │    (202)        │
   │   SW    S    SE │
   │              OWSLEY LAB (30)
   └─────────────────┘
```

## Design Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Camera | Ortho top-down + 6° tilt | Isometric | Isometric = Catan/hexagon, basic |
| Render engine | Eevee | Cycles | Shader-to-RGB only in Eevee |
| Outlines | Freestyle | Inverted hull | Freestyle = cleaner for final render |
| Textures | Toon pipeline | Raw PBR | PBR too aggressive, fights cel shading |
| Palette | Warm sand/earth | Cool/blue | Desert festival = warmth |
| Terrain mat | Emission (flat) | Toon pipeline | Flat plane from above = no shading variation |
| Sun angle | Raked (8,-4,5) | Overhead (3,-3,10) | Side-lighting triggers toon bands on 3D objects |

## Scene Inventory (v9)

| Category | Objects |
|----------|---------|
| Stonehenge | 24 (8 megaliths, 3 lintels, altar, 12 ritual stones) |
| Bear Cave | 18 (15 walls, 2 gates, floor) |
| El Dorado | 25 (3 tiers, court, stairs, pillars, columns, 6 debris, 4 ruins) |
| Owsley Lab | 14 (main, 2 annexes, floor, benches, chimney, pipes, crates, barrel) |
| Cliffs | 16 (12 perimeter, 4 interior dividers) |
| Terrain Detail | 25 (16 rocks, 9 scrub patches) |
| Paths | 16 (path segments between landmarks) |
| Storytelling | 15 (fire pits, ritual stones, gathering spots) |
| Infrastructure | 4 (terrain, camera, 2 lights) |
| **Total** | **157 objects, 50 materials** |

## Lore Grounding

**TDR-012**: `grimoires/the-easel/tdr/TDR-012-post-rave-cartography.md`

Each landmark connects to Codex-canonical lore:
- **Stonehenge** → Free festivals, Battle of the Beanfield, freetekno origin
- **Bear Cave** → Platonic Cave allegory, "shadows on a bear cave wall"
- **El Dorado** → Muisca gold rituals, Lake Guatavita, mythic aspiration
- **Owsley Lab** → Augustus Owsley Stanley III, LSD, Grateful Dead, dancing bear

Spatial narrative: Cave (dreaming) → Circle (gathering) → Temple (aspiration) → Lab (craft)

## K-Hole Visual Review Integration

K-Hole `main` @ `65ea68d` — visual-review skill with `vision: true`.
Script: `scripts/visual-review.ts` | SKILL.md: "Warburg's atlas made operational"

Self-audit scores (v9): Composition 7, Contrast 5, Material 5, Readability 6, Atmosphere 4.
Closes the loop: render → review → identify gap → fix → re-render.
