# Handoff: Festival Map → midi-interface

> For the next session in `/Users/zksoju/Documents/GitHub/midi-interface`

## Context

Two sessions of environment art work produced a 713-object Blender festival venue with 14 Codex-canonical zones, 5 stages, full path network. The spatial layout is correct. The visual quality is at blockout stage — good spatial truth, needs illustrated style pass.

**Critical discovery**: `midi-interface` ALREADY has a map system. It's the landing page. `MapPageClient` has views: `map`, `dimension`, `main-stage`, `agora`. Current dimensions are `og`, `nft`, `onchain`. The Agora already exists as a real-time chat panel (Convex-powered).

The festival map adds a NEW navigation layer: spatial browsing of the 74 Codex background locations (Bear Cave, El Dorado, Stonehenge, Owsley Lab, etc.). Each background is where Miberas are "born" — clicking a location on the map navigates to that dimension's page.

## What Exists

### In loa-constructs (to migrate):
- `grimoires/the-quarry/pipeline/mibera-festival-map-v1.blend` — 713-object Blender scene
- `grimoires/the-quarry/pipeline/stage-3-overlay/zones.json` — 14 zones with pixel coordinates
- `grimoires/the-quarry/pipeline/stage-4-deliver/festival-map.html` — working prototype
- `grimoires/the-quarry/pipeline/stage-4-deliver/map-render.png` — latest render
- `grimoires/the-quarry/pipeline/PIPELINE.md` — 4-stage pipeline doc
- Renders at `~/Desktop/Map/` (v1-v15)

### In midi-interface (already exists):
- `app/map/` — map route (redirects to `/`)
- `app/page.tsx` — MapPageClient as landing
- `components/midi/map-page-client.tsx` — view switcher (map/dimension/main-stage/agora)
- `components/midi/map-overview.tsx` — current map view
- `components/midi/dimension-terrain-view.tsx` — terrain visualization
- `components/midi/dimension-map-view.tsx` — dimension spatial view
- `components/midi/agora/` — full chat system (Convex, presence, oracle)
- `components/midi/main-stage-lineup.tsx` — stage view
- `app/map/dimension-actions.ts` — dimension server actions

### In construct-k-hole (pushed to main):
- `scripts/visual-review.ts` — Gemini 3.1 Pro multimodal analysis (vision: true)
- `skills/visual-review/` — registered skill with SKILL.md

## What To Do Next

### Phase 1: Integrate spatial map view into midi-interface
1. Add a new `MapView` type: `"festival"` or `"spatial-map"`
2. Create `components/midi/festival-map-view.tsx` — renders the blockout render with SVG zone overlay
3. Load zone data from `zones.json` (or inline it)
4. Each zone click → navigates to that Codex background's page
5. Agora could be pinned to a zone (Stonehenge = Agora location)

### Phase 2: Scale to 74 locations
1. Read ALL backgrounds from `construct-mibera-codex/traits/backgrounds/`
2. Assign spatial positions on the map (procedural layout or manual placement)
3. Update Blender scene with all 74 zones (or generate positions algorithmically)

### Phase 3: Style pass
1. Vector trace zone boundaries from render (Figma or code-generated SVG)
2. Apply MiDi design system (oklch, NieR aesthetic)
3. Illustrated fills within zones (AI-generated or hand-placed)

## Research Findings (from K-Hole digs)

- **Pro pipeline**: 3D blockout → 2D paintover (Supergiant, Riot)
- **Web delivery**: Leaflet.js tiles or SVG hotspots (Rod Hunt / Boomtown)
- **Zone clarity**: Kevin Lynch urban planning — Edges, Districts, Nodes
- **Gemini spatial**: can't ingest .blend but works via bpy code + depth maps
- **AI generation**: Flux→Trellis pipeline works (30s/asset on FAL). Rodin broken on FAL.
- **Gemini model**: gemini-3.1-pro-preview is latest (gemini-3-pro deprecated March 9)

## The Quarry as Construct

Consider spinning out the 3D pipeline expertise as `construct-the-quarry`:
- NPR toon shader pipeline (Riot-style 2D-in-3D)
- Blender MCP integration patterns
- AI asset generation workflow (Flux→Trellis)
- Visual review feedback loop (K-Hole integration)
- Depth map / zone coordinate extraction

This separates the CAPABILITY (construct) from the PRODUCT (midi-interface).

## Key Files to Read First

```
/Users/zksoju/Documents/GitHub/midi-interface/
  app/page.tsx                          ← landing page (map is home)
  components/midi/map-page-client.tsx   ← view switcher
  components/midi/map-overview.tsx      ← current map
  components/midi/agora/agora-panel.tsx ← chat system
  app/map/dimension-actions.ts          ← dimension data loading
```
