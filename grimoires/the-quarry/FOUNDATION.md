# The Quarry — Foundation

> NPR environment art pipeline. Riot-style 2D-in-3D for the Mibera world.

## What This Is

The Quarry is the environment art grimoire for the Mibera Dimensions project. It holds the Blender pipeline, render artifacts, and production decisions for building the festival map and any future spatial work.

The name comes from the raw material metaphor — this is where we extract stone before it becomes architecture.

## Aesthetic DNA

### Primary References
- **Riot Games concept art** — warm, painterly, clear silhouettes from top-down
- **Fortiche (Arcane)** — toon shading with real depth, dramatic lighting
- **Arc System Works (Guilty Gear)** — cel-shaded 3D that reads as 2D illustration
- **Starship Troopers (game terrain)** — desert palette, dark canyon walls, amber warmth

### NPR Pipeline (Non-Photorealistic Rendering)
The core technique: 3D geometry rendered through a cel-shading pipeline that produces illustration-quality output.

```
Diffuse BSDF → Shader-to-RGB → Color Ramp (CONSTANT, 3 bands)
  → shadow / base / highlight
  → Emission node (bypasses scene lighting, outputs flat toon result)
```

**Why this works**: Shader-to-RGB captures the light/dark information from the Diffuse BSDF, the Color Ramp quantizes it into hard cel bands (CONSTANT interpolation = no gradients), and the Emission output bypasses any further lighting so you get exactly the toon colors you designed.

**Critical constraint**: Shader-to-RGB only works in Eevee, not Cycles. This locks us to Eevee for the entire pipeline.

### Key Techniques from Research (17 Gemini digs)
1. **Surface curvature = toon band variation** — flat planes produce no shading. The terrain needs topology (dunes, undulations) so the toon shader creates natural light/dark bands.
2. **Raked lighting** — side-angled sun creates shadow faces on 3D landmarks. Overhead lighting kills toon contrast.
3. **Color Ramp band positions** — shadow_pos=0.0, base_pos=0.25-0.35, highlight_pos=0.55-0.65. Wider separation = more visible bands.
4. **Material identity through color** — each landmark has its own material palette (gold for El Dorado, dark rock for Bear Cave, cool grey for Owsley Lab). This creates readable zone identity from top-down.

## Practitioner References

| Artist/Studio | What We Take | Link |
|---------------|-------------|------|
| Riot concept art team | Desert terrain rendering, warm palettes, illustrated top-down views | Artstation |
| Arc System Works | 3D-to-2D cel pipeline, hand-tuned toon materials | GDC 2015 talk |
| Fortiche Production | Dramatic lighting in NPR, emotional color grading | Arcane production art |
| Ian Hubert | Fast blockout → detail workflow, "lazy tutorials" | YouTube/Blender |

## Project Structure

```
grimoires/the-quarry/
  FOUNDATION.md          ← this file
  pipeline/
    WORLD-BRIEF.md       ← environment artist bible (palette, camera, specs)
    mibera-festival-map-v1.blend  ← active Blender scene
```

## Pipeline State

| Component | Status | Notes |
|-----------|--------|-------|
| Terrain base | Done | 16x16, subdivided ~1600 verts, procedural dune displacement |
| Cliff ring | Done | 12 perimeter + 4 interior dividers, vertex-roughened |
| Stonehenge | Done | 8 megaliths, 3 lintels, altar, weathered |
| Bear Cave | Done | Horseshoe cavern, organic walls, dark floor |
| El Dorado | Done | 3-tier ziggurat, stairs, columns, debris |
| Owsley Lab | Done | Compound + annexes, pipes, benches |
| Camera | Done | Ortho, 6° tilt, raked sun |
| Materials | Done | 8 toon materials, all three-band Color Ramp |
| Visual review | Done | K-Hole visual-review.ts for iterative comparison |
| Terrain texture | Gap | Flat dune variation only, no painted detail |
| Post-processing | Gap | No color grading, bloom, or paintover pass |
| SVG overlay | Not started | Interactive zone polygons for web |
