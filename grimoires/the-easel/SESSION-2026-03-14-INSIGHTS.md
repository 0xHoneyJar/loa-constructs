# Session Insights — 2026-03-14

## Map Session: Greybox → Landmark Polish → Visual Review Loop

### Key Discoveries

**Flat planes kill toon shading from top-down.**
The single most important insight. A flat terrain plane rendered from an orthographic top-down camera produces zero shading variation through the toon pipeline — the Diffuse BSDF gets uniform lighting, ShaderToRGB outputs a uniform value, and the ColorRamp maps everything to one band. Solution: terrain needs actual topology (dune displacement via procedural sine waves). This transformed the render from flat to alive.

**Sun angle is everything for toon contrast.**
An overhead sun (3,-3,10) produced almost no shadow bands on 3D objects. Moving to a raked angle (8,-4,5) created visible shadow faces on megaliths, cave walls, and ziggurat tiers. For top-down NPR: sun should be low and to the side, not overhead.

**The Emission node at pipeline end preserves toon colors but limits interaction.**
The Riot-style pipeline (Diffuse→ShaderToRGB→ColorRamp→Emission) uses Emission to bypass any additional scene lighting effects. This means the toon colors are exactly what you designed — no unexpected ambient contamination. But it also means objects don't interact with each other's lighting in complex ways. Cast shadows work (they affect the Diffuse step), but global illumination, reflections, etc. are lost. For a top-down illustrated map, this tradeoff is correct.

**ColorRamp band positions control the light/dark split.**
Shadow_pos=0.0, base_pos=0.25-0.35, highlight_pos=0.55-0.65. Moving base_pos earlier means less of the surface is in shadow. Moving highlight_pos earlier means more highlight area. These three numbers control the entire toon character of each material.

### Creative Direction Decisions

**Stonehenge rebuilt as proper ring, not scaled mesh.**
The original megaliths had positions baked into vertices, causing messy scatter when scaled. Deleting and rebuilding as a clean R=2.2 circle with tapered cubes was the right call.

**Bear Cave = horseshoe, El Dorado = ziggurat, Owsley Lab = compound.**
Each landmark has a distinct geometric silhouette from top-down: U-shape, concentric rectangles, L-shape with chimney. This silhouette diversity is critical for zone readability.

**Camera tilt at 6° is the sweet spot.**
8° warped the composition too much (top edge clipping). 6° gives enough depth to see vertical faces on landmarks without distorting the plan view.

### Tool Insight: K-Hole Visual Review

The visual review script works as intended — it identifies the precise gap and gives specific recommendations. But scoring against a polished concept art reference will always be harsh for a greybox. The tool is most useful for:

1. **Iterative gap-finding**: run after each change, see which scores move
2. **Specific focus**: `--focus "palette warmth"` narrows the critique
3. **Self-audit**: `--mode audit` scores on absolute terms, not relative to reference
4. **Palette extraction**: `--mode palette` for color decisions

The tool should NOT be used to judge "are we done" — that's a creative decision. It should be used to identify "what should we change NEXT."

### Palette Evolution

```
v1: grey-beige flat    → desaturated, no variation
v3: slightly warmer    → still muted
v5: emission terrain   → warm but flat
v6: raked sun          → toon bands trigger, still narrow range
v7: terrain dunes      → organic light/dark variation, breakthrough
v8: bright highlights  → wider value range, dune crests pop
```

### What's Left for Production

1. **Post-processing**: The 3D render is a foundation. Final quality requires a painting/compositing pass (levels adjustment, selective warmth, painted details)
2. **SVG overlay**: Interactive zone polygons over the render
3. **Labels + leader lines**: HTML/CSS positioned over the map
4. **Pan/zoom integration**: Already have a React component
5. **Texture detail**: Optional — could add subtle noise overlay for painted quality
