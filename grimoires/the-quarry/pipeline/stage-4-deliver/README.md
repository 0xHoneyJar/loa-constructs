# Stage 4: /deliver

> Interactive map → deployed web component

## Input
- Illustrated map image (Stage 2)
- Zone overlay system (Stage 3)

## Output
- `(canvas)/map/page.tsx` in explorer app
- Pan/zoom, clickable zones, hover tooltips
- Links to dimension browse pages on constructs.network

## Tech Options
1. **Leaflet.js tiles** — slice map into 256px tiles (League of Legends approach)
2. **React + SVG overlay** — single image + SVG polygons (current prototype)
3. **React Flow** — already in explorer deps, repurpose as map container

## Explorer App Context
- Route: `app/(canvas)/map/page.tsx`
- Stack: Next.js, Tailwind, oklch design system
- Existing: React Flow on `(canvas)/explore`, zustand state
- Package: `@xyflow/react` already installed
