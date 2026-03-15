# Festival Map Pipeline

> Blender blockout → Illustrated style → SVG overlay → Web delivery

## The Four Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  /blockout   │ →  │   /style     │ →  │  /overlay    │ →  │  /deliver    │
│             │    │             │    │             │    │             │
│  Blender    │    │  Illustrate  │    │  SVG zones   │    │  Leaflet/   │
│  3D spatial │    │  2D paintover│    │  Labels      │    │  React      │
│  rig        │    │  or vector   │    │  Hitboxes    │    │  Pan/zoom   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     ↓                   ↓                  ↓                  ↓
  .blend             .png/.svg          zones.json         page.tsx
  depth map          illustrated        coordinates        interactive
  camera spec        final render       hover states       deployed
```

## Stage 1: /blockout (DONE)

**Tool**: Blender 5.0 + MCP
**Output**: `mibera-festival-map-v1.blend` (713 objects, 14 zones, 5 stages)

What it provides:
- Spatial accuracy (perspective rig)
- Camera spec (25° tilt, ortho scale 35)
- Zone positions (world coordinates → pixel mapping)
- Depth map for ControlNet conditioning
- Material/color identity per zone

**Renders**: `~/Desktop/Map/festival_v15_fullconnect.png` (latest)

## Stage 2: /style (NEXT)

**Options** (ranked by quality ceiling):

### Option A: Vector Trace (Figma/Illustrator)
- Import render as underlay
- Trace zone boundaries with clean vector shapes
- Apply MiDi design system (oklch palette, bone/void tokens)
- Crisp lines, clear segmenting, blueprint aesthetic
- **Best for**: MiDi app integration, web-native SVG, infinite resolution
- **Matches**: Snack NYE festival map style, Rod Hunt approach
- **Time**: Medium (manual but precise)

### Option B: AI Paintover (ControlNet + SDXL)
- Render depth map from Blender
- ControlNet depth conditioning → SDXL with style prompt
- Multiple passes with inpainting for each zone
- **Best for**: Painted illustration quality, concept art feel
- **Matches**: Riot Games / Supergiant style
- **Time**: Fast generation, slow iteration to get right
- **Risk**: Hallucination, style inconsistency between passes

### Option C: Hybrid
- Vector trace for zone boundaries (clean, crisp)
- AI-generated texture fills within each zone
- Hand-placed landmark illustrations (Flux-generated, curated)
- **Best for**: Clean structure + rich texture
- **Matches**: Both the blueprint clarity AND the illustrated warmth

### Recommendation: Option C (Hybrid)
The MiDi app needs crisp, clickable zones (vector). But the visual warmth of illustration is what makes it feel like a place. Do both.

## Stage 3: /overlay

**Tool**: Hand-crafted SVG or generated from Blender coordinates
**Output**: `zones.json` + `overlay.svg`

```json
{
  "zones": [
    {
      "id": "stonehenge",
      "name": "Stonehenge",
      "count": 202,
      "polygon": [[x1,y1], [x2,y2], ...],
      "accent": "oklch(0.72 0.04 70)",
      "lore": "Where the solstice gatherings began"
    }
  ]
}
```

Prototype exists: `grimoires/the-quarry/pipeline/interactive-map.html`

## Stage 4: /deliver

**Tool**: Next.js + Leaflet.js or custom React pan/zoom
**Output**: `(canvas)/map/page.tsx` in the explorer app

Options:
- **Leaflet.js tiles** — slice illustrated render into 256px tiles, infinite zoom (League of Legends approach)
- **React + SVG overlay** — single image + SVG polygons (current prototype approach)
- **React Flow** — already in the explorer, could repurpose for map nodes

## Files

```
grimoires/the-quarry/
  pipeline/
    PIPELINE.md                    ← this file
    WORLD-BRIEF.md                 ← environment artist bible
    mibera-festival-map-v1.blend   ← Blender scene (713 objects)
    interactive-map.html           ← web prototype
  FOUNDATION.md                    ← NPR pipeline DNA

grimoires/the-easel/
  MAP-PROGRESSION.md               ← living tracker
  SESSION-2026-03-14-INSIGHTS.md   ← first session learnings
  SESSION-2026-03-15-INSIGHTS.md   ← second session learnings
  tdr/TDR-012-post-rave-cartography.md ← lore grounding

~/Desktop/Map/
  festival_v15_fullconnect.png     ← latest render
  depth_map.png                    ← for ControlNet
  starship-troopers-ref.png        ← palette/composition reference
  snack-nye-ref.png                ← zone clarity reference
```

## Zone Registry

| Zone | Position | Miberas | Stage | Accent |
|------|----------|---------|-------|--------|
| Stonehenge | center | 202 | Main Stage | magenta |
| Bear Cave | N | 175 | Cave Stage | cyan |
| El Dorado | E | 219 | Pyramid Stage | amber |
| Owsley Lab | SE | 30 | Lab Stage | violet |
| Castle Morton | NW | — | Sound System | cyan |
| Peyote Desert | SW | — | Ceremony | amber |
| Acid Test | NE | — | Projection | violet |
| Factory/Haçienda | W | — | Club | lime |
| Graveyard | W | — | Ambient | — |
| Record Store | E | — | — | — |
| HÖR Berlin | S | — | Streaming | — |
| Techno City | E | — | — | — |
| Newgrange | N | — | Ceremonial | — |
| Fyre Festival | S | — | (collapsed) | — |
