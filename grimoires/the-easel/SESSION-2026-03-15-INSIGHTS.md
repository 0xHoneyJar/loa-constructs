# Session Insights — 2026-03-15

## The Big Session: From Blockout to 713-Object Festival Venue

### What We Built
- Started with 32-object Blender scene (terrain + cliffs + tiny stonehenge)
- Ended with 713 objects across 14 Codex-canonical zones
- 5 named stages, all connected with fenced paths and speaker systems
- Full festival infrastructure: entrance gate, backstage, bars, food stalls, portaloos, graveyard, art installations
- K-Hole visual-review.ts pushed to main with Gemini 3.1 Pro support
- Interactive HTML prototype with pan/zoom + SVG zone overlays

### What Worked
1. **Flux → Trellis pipeline** for AI-generated 3D assets — 30 seconds per asset, proper geometry
2. **K-Hole visual review** as iterative eyes — caught every gap, guided improvements
3. **Expanding terrain from 16x16 to 40x40** — solved claustrophobia immediately
4. **Zone color patches on ground** — first time zones had visual identity
5. **3/4 camera tilt** — showed building facades, transformed readability
6. **Festival color injection** — magenta/cyan/amber/violet pops broke the brown monotone

### What Didn't Work
1. **AI img2img paintover** — Flux img2img at strength 0.45-0.65 hallucinated wood-grain textures and nonsense
2. **Hyper3D Rodin via FAL** — generation succeeds but download times out ("downstream service unavailable"). Trellis works perfectly.
3. **High-poly Trellis meshes as final assets** — 45K vertex cave rock is invisible from top-down. The detail is wasted.
4. **Adding more objects without fixing structure** — went from 157 to 353 objects with no quality improvement. Structure > quantity.

### Key Research Findings

#### Illustrated Map Pipeline (confirmed)
The professional standard is **Hybrid 3D Blockout → 2D Paintover**:
- Blender/Maya for spatial accuracy (greybox/perspective rig)
- Hand-painted or AI-assisted final illustration on top
- Studios: Supergiant (Jen Zee), Riot Games (Lydia Zanotti)
- Web delivery: **Leaflet.js tile maps** (256px tiles, infinite zoom) or **SVG hotspots** (Rod Hunt / Boomtown festival)
- Zone boundaries defined by **"Lynchian" urban planning**: Edges (walls/rivers), Districts (color zones), Nodes (landmarks)

#### Gemini Spatial Reasoning
Gemini can't ingest .blend files directly, but operates via **Proxy Workflow**:
- Reads **Blender Python (bpy) code** to understand scene construction
- Processes **multi-view renders + depth maps** as "Visual Proxies"
- Outputs **3D bounding boxes** [x, y, z, w, h, d, roll, pitch, yaw]
- The "bpy Middleware Pattern": generate Blender Python instead of mesh data
- Tools: Gemini2Blend addon, Spline Hana editor
- This is EXACTLY what we're doing with the Blender MCP — we're already in the right pattern

#### Tool Assessment: Is Blender the Move?
**Yes, for the blockout.** Every professional pipeline starts with 3D for spatial accuracy.
**No, for the final illustration.** The "No-Render Rule" — use 3D as perspective rig, never as final render.
**The gap**: We've been trying to make the 3D render BE the illustration. It can't. The render is the GUIDE for the illustration.

### The 5 Structural Gaps (from Gemini 3.1 Pro comparison)
1. **Camera** — strict top-down makes buildings unrecognizable → 3/4 perspective (FIXED)
2. **Ground is a void** — one infinite beige → color-coded zone floors (PARTIALLY FIXED)
3. **Nothing anchored** — no contact shadows → objects float (NOT FIXED)
4. **No boundaries** — zones implied by scatter → need continuous fences/tree lines (PARTIALLY FIXED)
5. **No value contrast** — everything mid-tones → need true darks and bright highlights (NOT FIXED)

### Where We're Stuck (Honest)
The Blender toon render has a ceiling. We've hit it. 713 objects, good spatial layout, zone colors, path network — but it still reads as "3D prototyping" not "illustrated map." The next quality leap requires leaving Blender and entering a 2D/paintover phase.

**Three paths forward:**
1. **Vector illustration** — take the render as underlay, trace zone boundaries in Figma/Illustrator with clean vector shapes. SVG-native. This is the Rod Hunt / festival map approach.
2. **AI paintover with ControlNet** — render depth map, use ControlNet-conditioned SDXL with specific "Riot concept art" style training. Needs better conditioning than our Flux attempt.
3. **Tile-based Leaflet map** — accept the toon render as "good enough for v1," slice into tiles, add SVG overlays for interactivity. Ship the blockout, refine later.

### Construct Pipeline Vision
The user wants this workflow distilled into a construct — a Unix pipeline:
```
/blockout (Blender spatial layout)
  → /style (AI paintover or manual illustration)
  → /overlay (SVG zones + labels)
  → /deliver (Leaflet tiles or pan/zoom component)
```
Each stage is a construct skill with clear inputs/outputs. The Blender MCP + K-Hole visual review + FAL Trellis pipeline are already the first three tools in this chain.

### Next Session Priorities
1. Decide: vector trace vs AI paintover vs ship-as-is
2. If vector: create Figma file with zone boundaries traced from render
3. If AI: set up proper ControlNet depth conditioning with SDXL (not Flux img2img)
4. If ship: update the interactive HTML prototype with current render + all 14 zones
5. Commit K-Hole visual-review model update to main
