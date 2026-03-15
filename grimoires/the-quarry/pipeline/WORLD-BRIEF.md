# Mibera Festival Map — World Brief

> The environment artist's bible. Every decision traces here.

## Concept

Top-down illustrated terrain map of the Mibera Dimensions festival site. Each landmark is a Codex-canonical location where Miberas are born. The map is the world where daemons will eventually live — it must feel like a PLACE, not a diagram.

## Palette Lock

| Role | Hex | oklch | Usage |
|------|-----|-------|-------|
| Sand Base | #C4B8A8 | oklch(0.78 0.025 75) | Terrain fill |
| Cliff Dark | #4A3E34 | oklch(0.35 0.03 60) | Perimeter cliffs, shadows |
| Stone Warm | #B8A68C | oklch(0.72 0.035 70) | Stonehenge megaliths |
| Cave Shadow | #382E28 | oklch(0.26 0.025 55) | Bear Cave interior |
| Gold Ochre | #C79E60 | oklch(0.72 0.08 75) | El Dorado terraces |
| Lab Cool | #8C8578 | oklch(0.60 0.015 80) | Owsley Lab compound |
| Outline | #261F1A | oklch(0.20 0.02 60) | Freestyle lines |
| Highlight | #D9CCB8 | oklch(0.85 0.025 75) | Top-lit surfaces |

## Camera Spec

- **Type**: Orthographic, top-down
- **Location**: (0, 0, 12)
- **Rotation**: (0, 0, 0) — straight down
- **Ortho Scale**: 18.0 (captures full 16x16 terrain + margins)
- **Render**: 1600x1040px, Eevee
- **Future**: Slight tilt (~80deg from horizontal) for painted depth. Flat-down first.

## Material Pipeline (Riot-style 2D-in-3D)

```
Diffuse BSDF → Shader-to-RGB → Color Ramp (CONSTANT, 3 bands)
  → shadow / base / highlight
  → Emission node (flat output, no additional lighting effects)
```

Shader-to-RGB only works in Eevee. CONSTANT interpolation = hard cel edges.

## Freestyle Outlines

- Lineset: BoldOutlines
- Select: Silhouette + Border + Crease
- Color: #261F1A (warm dark brown)
- Thickness: 2.5px
- Only visible in final render (F12), not viewport

## Terrain Layout

16x16 base plane centered at origin. Cliff formations define zone boundaries:

```
        N1(-2,5.5)  N2(1.5,6)  N3(4,5.2)
    W1(-6,2)                          E1(6,3)
    W2(-6.2,-1)     [center]         E2(6.5,0)
    W3(-5.5,-3.5)                    E3(5.8,-3)
        S1(-2,-5.5) S2(2,-5.8) S3(5,-5)
```

Interior dividers: NE(3,3), NW(-3,2.5), SE(3.5,-2.5), SW(-3.5,-2)

## Landmark Specs

### Stonehenge (Center) — 202 Miberas
- 8 tapered standing stones in circle, R=2.2
- 3 lintel pairs bridging stones 0-1, 3-4, 6-7
- Central altar disc (cylinder, R=0.6)
- Material: ToonStone (warm grey-brown)

### Bear Cave (North, y=4.0) — 175 Miberas
- Horseshoe cavern: 7 back wall segments + 4 per arm
- Pinched entrance facing south (2 gate rocks)
- Dark interior floor disc (ToonCaveFloor)
- Material: ToonCaveWall (dark warm rock)
- "Shadows on a bear cave wall"

### El Dorado (East, x=4.0 y=1.0) — 219 Miberas
- 3-tier stepped pyramid (ziggurat)
- Central court plane on top tier
- 5-step stairway extending west
- 2 flanking pillars + 4 corner columns
- Material: ToonGoldStone (warm ochre/gold)
- "Mythical city of gold"

### Owsley Lab (SE, x=3.5 y=-3.0) — 30 Miberas
- Main rectangular compound
- West annex + south annex
- 3 interior workbenches
- Chimney cylinder
- Material: ToonLabWall (cool grey-brown)
- "Alchemical workshop"

## Technical Notes

- Blender 5.0 — render engine is BLENDER_EEVEE (not BLENDER_EEVEE_NEXT)
- .blend saved at: grimoires/the-quarry/pipeline/mibera-festival-map-v1.blend
- Test renders at: ~/Desktop/Map/
- PolyHaven textures: run through toon pipeline, not raw PBR
- Hyper3D Rodin: text-to-3D for scaffolding, connection can be flaky
