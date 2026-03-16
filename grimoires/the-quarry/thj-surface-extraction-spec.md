# thj-surface Extraction Spec

> Construct-level learnings from thj-surface that need to be upstreamed to the network.

## Source
`/Users/zksoju/Documents/GitHub/thj-surface/`

## Extraction Targets

### 1. WebGL Particles Construct — upstream these patterns
- **PMA blending recipe** (blendSrc: ONE, blendDst: ONE_MINUS_SRC_ALPHA)
- **Sub-pixel energy conservation** (trueArea / renderedArea multiplier)
- **Oklab color interpolation** GLSL functions (linearToOklab, oklabToLinear, oklabMix)
- **70/30 edge/fill split** for SVG sampling + curvature-weighted MeshSurfaceSampler
- **Attractor field library** (Lorenz, Clifford, Thomas, Convergence, Prism, Timeline, Crystallize)
- **GLB → particles pipeline** (matrixWorld application, per-mesh importance/brightness maps)
- **AlphaCleanupEffect** — required for compositing particles over transparent backgrounds

### 2. VFX Playbook Construct — upstream these techniques
- **PHI-ratio irrational breathing** system (3-layer sine, aliveTime modulation)
- **Biological motion library** (minimumJerk, twoThirdsPower, bioLifeCurve)
- **Spray paint GLSL system** (sprayDots, spray, applySpray — composable shape-to-paint)
- **Tanaka illuminated contours** (dFdx/dFdy gradient → light dot product)
- **ContentFocus distortion masking** (limits effects to visible content area)
- **Stepped film grain at 24fps** (timeAccumulator pattern)
- **Documented failures**: light shaft removal, color temp cycling removal, SDF rejection sampling rejection

### 3. Artisan Construct — upstream these patterns
- **Static lighting system** (3 CSS card lighting patterns with exact values)
- **DataSubstrate component** (concave mode, churn mechanism, IntersectionObserver)
- **ScreenEffects** (SVG feTurbulence grain, warm tint feColorMatrix, radial vignette)
- **Zone B design system** (paint ON concrete philosophy, spray paint composability)

### 4. Sigil Improvements — apply to constructs.network
- PHI-ratio breathing (replace single sine)
- PMA blending (replace NormalBlending)
- Model-space scanline (replace screen-space)
- Cabinet seam hierarchy (pixel → module → cabinet grid)

## Key Files in thj-surface
- `components/three/shaders/particle-anim.ts` — GLSL library
- `components/three/MorphShowcase.tsx` — hero morph system
- `components/three/BentoParticles.tsx` — 24+ card variants
- `components/three/ZoneBVisual.tsx` — spray paint + surface treatments
- `components/three/effects/` — GrainEffect, AlphaCleanupEffect, CRTEffect, LensEffect
- `grimoires/the-easel/constructs/visual-pipeline/CONVENTIONS.md` — Ezura pipeline
- `grimoires/vfx-playbook/applied/thj-hero-section.md` — failure docs
