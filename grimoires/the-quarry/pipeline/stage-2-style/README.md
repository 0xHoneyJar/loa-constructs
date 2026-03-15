# Stage 2: /style

> Blender blockout → illustrated final

## Input
- `../mibera-festival-map-v1.blend` (perspective rig)
- `~/Desktop/Map/festival_v15_fullconnect.png` (latest render)
- `~/Desktop/Map/depth_map.png` (ControlNet conditioning)

## Output
- Illustrated map image (PNG, 1600x1040 or larger)
- Clean zone boundaries visible
- MiDi design system compatible (oklch, bone/void)

## Approach: Hybrid (Vector boundaries + AI texture fills)

### Step 1: Vector zone boundaries
- Import render into Figma
- Trace each zone with clean polygon shapes
- Apply oklch accent colors at low opacity
- Export as SVG (feeds into Stage 3)

### Step 2: Illustrated fills
- Generate zone-specific textures via Flux/SDXL
- Or hand-paint key landmarks
- Composite within vector boundaries

### Step 3: Final composite
- Vector boundaries provide the crisp, clickable structure
- Illustrated fills provide the warmth and character
- Export final PNG for web delivery

## Reference Style
- Snack NYE festival map (zone clarity)
- MiDi app design system (oklch, structural materials)
- Riot Games concept art (painted warmth)

## Files
Place work-in-progress here. Final goes to `../` root.
