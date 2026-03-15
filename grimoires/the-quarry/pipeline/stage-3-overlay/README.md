# Stage 3: /overlay

> Illustrated map → interactive zone system

## Input
- Illustrated map from Stage 2
- Zone coordinates from Blender (world → pixel mapping)

## Output
- `zones.json` — zone registry with polygons, accents, lore
- `overlay.svg` — clickable zone polygons
- Hover states, accent colors per zone

## Prototype
`../interactive-map.html` — working pan/zoom + SVG zones + tooltips

## Zone Coordinate Source
Blender script projects world coordinates to render pixels.
Camera: ortho 35, 25° tilt, position (0, -10, 24).
