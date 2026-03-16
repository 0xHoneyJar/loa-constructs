# thj-surface Learnings — WebGL Particles Construct

> Battle-tested patterns extracted from `thj-surface` production deployment.
> Source: `/Users/zksoju/Documents/GitHub/thj-surface/`
> Extraction date: 2026-03-15

---

## 1. PMA Blending Recipe

**Source**: `components/three/BentoParticles.tsx:53-61`, `components/three/MorphShowcase.tsx:51-59`, `components/three/DataVizScene.tsx:59-62`

**What it is**: Premultiplied-Alpha blending. Fragment shader outputs `vec4(color * alpha, alpha)` instead of `vec4(color, alpha)`. The blend equation uses `ONE` for source and `ONE_MINUS_SRC_ALPHA` for destination.

**Why it works**: Standard `NormalBlending` produces dark halos around overlapping semi-transparent particles because the blending hardware multiplies color by alpha twice — once in the shader, once in the blend unit. PMA eliminates this by pre-multiplying in the shader and using `ONE` as the source factor, so the hardware just adds the pre-multiplied result. Overlapping particles glow additively (brighter, not muddier).

**Three.js material config**:
```typescript
const PMA_BLEND = {
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
};
```

**Fragment shader output** (the critical line):
```glsl
// PMA: color pre-multiplied by alpha
gl_FragColor = vec4(finalColor * alpha, alpha);
```

**When to use PMA vs Normal blending** (from `BentoParticles.tsx:52-71`):
- **PMA** (`depthWrite: false`): Abstract/ethereal variants — particles are luminous points that glow when overlapping. No back-face occlusion needed.
- **Normal** (`depthWrite: true`): Solid/procedural 3D variants — particles represent surface marks. The depth buffer occludes back-side particles; blending only handles edge softness.

```typescript
// Solid variant: standard blending for 3D forms
const SOLID_BLEND = {
  transparent: true,
  depthWrite: true,
  depthTest: true,
  blending: THREE.NormalBlending,
};
```

Fragment shader conditional (from `BentoParticles.tsx:3208-3217`):
```glsl
if (uBearMode > 0.5) {
    // Standard blending (non-PMA): output vec4(color, alpha).
    // No additive accumulation — overlapping particles blend, not add.
    // Clamp HDR to prevent bloom blowout at overlap regions.
    finalColor = min(finalColor, vec3(1.2));
    gl_FragColor = vec4(finalColor, alpha);
} else {
    // PMA blending: output vec4(color * alpha, alpha) for additive glow.
    gl_FragColor = vec4(finalColor * alpha, alpha);
}
```

---

## 2. Sub-Pixel Energy Conservation

**Source**: `components/three/shaders/morph.ts:207-213`, `components/three/BentoParticles.tsx:3044-3050`, `components/three/DataVizScene.tsx:776-778`

**What it is**: When a particle is too small to be visible at 1:1 pixel size, `gl_PointSize` is clamped to a minimum (1.2px). But the clamped particle is now "bigger than it should be" — so its alpha is reduced proportionally to preserve the total energy (visual brightness) the particle should contribute.

**Why it works**: Without this, distant particles that should be sub-pixel suddenly appear as full-brightness 1.2px dots, creating a noisy "popcorn" effect at depth. The energy multiplier dims them proportionally, so distance still reads as fade-out.

**Vertex shader** (identical pattern in all three files):
```glsl
// Calculate desired projected size
float projectedSize = uPointSize * aSize * sizePulse * excitedSize * (22.0 / -mvPosition.z);
// Clamp to minimum renderable size
float clampedSize = max(projectedSize, 1.2);
gl_PointSize = clampedSize;

// Energy conservation: dim particles that were clamped up
float trueArea = projectedSize * projectedSize;
float renderedArea = clampedSize * clampedSize;
vEnergyMultiplier = min(trueArea / renderedArea, 1.0);
```

**Fragment shader** — applied as a final alpha multiplier:
```glsl
float alpha = excitedAlpha * circle * vEnergyMultiplier;
```

The `min(..., 1.0)` clamp prevents particles that are already larger than the minimum from getting an energy boost (which would cause bright flickers on close-up particles).

---

## 3. Oklab Perceptual Color Interpolation

**Source**: `components/three/shaders/particle-anim.ts:100-133`

**What it is**: GPU-native conversion between linear RGB and the Oklab perceptual color space (Björn Ottosson, 2020). Three functions: `linearToOklab`, `oklabToLinear`, `oklabMix`.

**Why it works**: Standard RGB `mix()` causes hue shifts and muddy browns when interpolating warm colors through dark values (the Bezold-Brücke effect). Oklab maintains perceptual uniformity — amber stays amber through brightness changes, it doesn't shift toward brown/gray.

**GLSL implementation** (copy verbatim — these matrix coefficients are the standard Oklab specification):
```glsl
vec3 linearToOklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    float l_ = pow(l, 0.3333333);
    float m_ = pow(m, 0.3333333);
    float s_ = pow(s, 0.3333333);
    return vec3(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

vec3 oklabToLinear(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;
    return vec3(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec3 oklabMix(vec3 a, vec3 b, float t) {
    return oklabToLinear(mix(linearToOklab(a), linearToOklab(b), t));
}
```

**Production usage** — three distinct applications in thj-surface:

1. **Base color interpolation** (`morph.ts:246`): `oklabMix(uColorBase, uColorEnd, t)` — spatial color variation across the particle field without hue drift.

2. **Excitement color shift** (`morph.ts:249`): `oklabMix(baseColor, uColorEnd, vExcitement * 0.15)` — interactive warm push on hover that stays perceptually consistent.

3. **Shadow-to-lit shading** (`BentoParticles.tsx:3120`): `oklabMix(shadowColor, litColor, lightCurve)` — holographic lighting where shadow side shifts hue toward deep bronze (not gray) for perceptual depth (the "Unione technique").

---

## 4. Edge/Fill Split with Curvature-Weighted Sampling

**Source**: `components/three/data/glb-to-particles.ts:16-17`, `components/three/data/procedural-to-particles.ts:23-25`

**What it is**: Surface sampling splits into two pools — 70-80% of particles go to high-curvature regions (edges, creases, silhouettes), 20-30% distribute uniformly as fill. Edge particles are weighted by a computed per-vertex curvature attribute.

**Why it works**: Human visual recognition depends on edges (Gestalt closure principle). A uniform particle distribution wastes density on flat areas that don't contribute to shape recognition. Concentrating particles on curvature edges makes the object legible at lower particle counts.

**Constants**:
```typescript
// glb-to-particles.ts
const EDGE_WEIGHT = 0.7;      // 70% edge, 30% fill
const CURVATURE_POWER = 2.5;  // Sharp concentration on highest-curvature vertices

// procedural-to-particles.ts
const EDGE_WEIGHT = 0.8;      // 80% edge, 20% fill (procedurals need more edge definition)
const CURVATURE_POWER = 2.5;
const MIN_PARTICLES_PER_MESH = 2000;
```

**Curvature computation** (identical in both files — `glb-to-particles.ts:329-397`):

The algorithm computes per-vertex curvature as the average dihedral angle between adjacent face normals:

```typescript
function computeVertexCurvature(
  geometry: THREE.BufferGeometry,
): THREE.Float32BufferAttribute {
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const vertCount = pos.count;
  const curvature = new Float32Array(vertCount);

  // 1. Compute face normals
  const triCount = index ? index.count / 3 : pos.count / 3;
  const faceNormals: THREE.Vector3[] = [];
  const faceVertices: [number, number, number][] = [];
  // ... (triangle iteration, cross product for each face normal)

  // 2. Build vertex → face adjacency
  const vertexFaces: number[][] = Array.from({ length: vertCount }, () => []);
  for (let f = 0; f < triCount; f++) {
    const [v0, v1, v2] = faceVertices[f];
    vertexFaces[v0].push(f);
    vertexFaces[v1].push(f);
    vertexFaces[v2].push(f);
  }

  // 3. Average dihedral angle between all adjacent face pairs at each vertex
  for (let v = 0; v < vertCount; v++) {
    const faces = vertexFaces[v];
    if (faces.length < 2) {
      curvature[v] = 1.0;  // Boundary vertices get max curvature
      continue;
    }
    let totalAngle = 0;
    let pairs = 0;
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const dot = faceNormals[faces[i]].dot(faceNormals[faces[j]]);
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
        totalAngle += angle;
        pairs++;
      }
    }
    const avgAngle = pairs > 0 ? totalAngle / pairs : 0;
    // Power-law sharpening: CURVATURE_POWER=2.5 concentrates on sharpest edges
    curvature[v] = Math.pow(avgAngle / Math.PI, CURVATURE_POWER) + 0.01;
  }

  return new THREE.Float32BufferAttribute(curvature, 1);
}
```

**Two-sampler pattern** using Three.js `MeshSurfaceSampler`:
```typescript
// Edge sampler: curvature-weighted — particles cluster on creases/silhouettes
const edgeSampler = new MeshSurfaceSampler(samplingMesh)
  .setWeightAttribute("curvature")
  .build();

// Fill sampler: uniform — volumetric body presence
const fillSampler = new MeshSurfaceSampler(samplingMesh).build();
```

**Curvature values assigned to sampled particles** (for variable sizing in the shader):
- Edge particles: `0.5 + Math.random() * 0.3` (moderate-high)
- Fill particles: `0.05 + Math.random() * 0.2` (low)

---

## 5. GLB-to-Particles Pipeline

**Source**: `components/three/data/glb-to-particles.ts:32-255`

**What it is**: Complete pipeline to convert a GLB 3D model into a particle cloud with per-particle metadata for shading.

**Pipeline steps**:

1. **Load GLB** → Traverse scene, collect all `Mesh` nodes with `updateMatrixWorld(true)`
2. **Compute surface areas** with `matrixWorld` applied (world-space measurement)
3. **Importance weighting** — `getMeshImportance(name)` returns 1.0-8.0x multiplier per mesh name. Face/accessories get dramatically more particles than body.
4. **Particle budget allocation** — Each mesh gets particles proportional to `area * importance`, floored at `MIN_PARTICLES_PER_MESH = 1200`
5. **Two-pass sampling** per mesh:
   - Clone geometry, apply `matrixWorld`, compute vertex normals
   - Compute curvature attribute
   - Sample `EDGE_WEIGHT` fraction with curvature weighting
   - Sample remainder uniformly
6. **Merge** edge + fill pools
7. **Center and normalize** — compute bounding box, center at origin, scale to fit viewport (`scale = 2.8` default)

**Output format** (`GLBParticleData`):
```typescript
interface GLBParticleData {
  positions: Float32Array;     // xyz per particle
  normals: Float32Array;       // surface normal per particle (for Lambert shading)
  curvatures: Float32Array;    // 0-1 curvature per particle (for variable sizing)
  colors: Float32Array;        // rgb per particle (mesh-based brightness)
  meshIndices: Float32Array;   // per-particle mesh index (for debug toggling)
  meshNames: string[];         // mesh name for each index
  sizeMultipliers?: Float32Array; // per-particle size multiplier
}
```

---

## 6. Procedural-to-Particles Pipeline

**Source**: `components/three/data/procedural-to-particles.ts:56-216`

**What it is**: Same pipeline as GLB-to-particles, but takes programmatic Three.js geometry (Lathe, Extrude, CSG) instead of loaded models. Returns identical `GLBParticleData` format.

**Key difference from GLB pipeline**: Importance is set per-part directly (not name-based lookup), and it controls particle proportion directly (not as a multiplier on surface area). This ensures thin diagnostic features (needle handles, small indicators) get enough particles regardless of their tiny surface area.

**Input format**:
```typescript
interface ProceduralMeshPart {
  geometry: THREE.BufferGeometry;
  importance?: number;        // 1.0 = normal, directly controls particle proportion
  brightness?: number;        // 0-1, used for Lambert shading
  sizeMultiplier?: number;    // 1.0 = normal, 1.3+ for diagnostic geons
  name?: string;
}
```

---

## 7. Attractor Field Library

**Source**: `components/three/data/attractor-generators.ts:1-619`

**What it is**: Seven mathematical attractor generators that produce particle distributions directly from dynamical systems (no mesh sampling needed). Each generates positions, velocity-derived normals, and normalized speeds.

**Interface**:
```typescript
interface AttractorData {
  positions: Float32Array;
  normals: Float32Array;   // Velocity tangent (trajectory direction) for shading
  speeds: Float32Array;    // Normalized 0-1 — faster regions get different treatment
}
```

### 7a. Lorenz Attractor
Iconic butterfly/double-scroll. Chaotic but deterministic. `sigma=10, rho=28, beta=8/3`, `dt=0.003`. 2000-step warm-up to reach the attractor before sampling.

### 7b. Clifford Attractor
Dense swirling 2D pattern extended to 3D. Mandala-like forms. `a=1.7, b=1.7, c=0.6, d=1.2, e=0.8, f=1.4`. No warm-up needed (discrete map, not ODE).

### 7c. Thomas Attractor
Smooth, symmetric 3D looping trajectories. `b=0.208186`, `dt=0.05`. 2000-step warm-up.

### 7d. Convergence Field
Many-to-One spiral. Power-law radial distribution (`r^0.45`), 5 spiral arms, density increases toward center. Communicates "collection."

### 7e. Prism Field
One-to-Many decomposition. 30% in dense input stream, 70% in 7 diverging branches. Communicates "analysis."

### 7f. Timeline Field
S-curve ribbon with 4 density nodes at "decision points." Particles cluster at nodes, sparse between them. Cross-section frame built from tangent/binormal/normal.

### 7g. Crystallize Field
40% chaotic outer cloud + 60% crystalline core on octahedral lattice. Inner particles snapped toward octahedral faces with organic imperfection (`snapStrength = 0.6 + random * 0.3`).

**Registry** (for runtime lookup):
```typescript
const ATTRACTOR_CONFIGS: Record<AttractorType, {
  generator: (count: number, scale?: number) => AttractorData;
  count: number;   // default particle count
}> = {
  lorenz:       { generator: generateLorenzAttractor,    count: 45000 },
  clifford:     { generator: generateCliffordAttractor,  count: 45000 },
  thomas:       { generator: generateThomasAttractor,    count: 45000 },
  convergence:  { generator: generateConvergenceField,   count: 50000 },
  prism:        { generator: generatePrismField,         count: 50000 },
  timeline:     { generator: generateTimelineField,      count: 45000 },
  crystallize:  { generator: generateCrystallizeField,   count: 50000 },
};
```

All generators follow the same pattern: generate → center at origin → scale to fit viewport.

---

## 8. AlphaCleanupEffect (Post-Processing)

**Source**: `components/three/effects/AlphaCleanupEffect.ts:1-31`

**What it is**: A `postprocessing` Effect that fixes alpha channel corruption caused by bloom. Required for compositing particles over transparent backgrounds (HTML content behind the canvas).

**Why it's needed**: Bloom's blur kernels average RGBA together, spreading non-zero alpha across the entire framebuffer — even where there are no particles. The ADD blend then uses `max(dst.a, src.a)`, making empty areas appear opaque black instead of transparent.

**How it works**: Derives alpha from luminance — where luminance is near zero (no visible content), the pixel becomes fully transparent.

**Complete GLSL** (copy verbatim):
```glsl
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float cleanAlpha = smoothstep(0.0, 0.008, lum);
    outputColor = vec4(inputColor.rgb, cleanAlpha);
}
```

**Complete TypeScript**:
```typescript
import { Effect, BlendFunction } from "postprocessing";

const fragmentShader = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float cleanAlpha = smoothstep(0.0, 0.008, lum);
    outputColor = vec4(inputColor.rgb, cleanAlpha);
}
`;

export class AlphaCleanupEffect extends Effect {
    constructor() {
        super("AlphaCleanupEffect", fragmentShader, {
            blendFunction: BlendFunction.SRC,
        });
    }
}
```

**Critical detail**: Uses `BlendFunction.SRC` (not `NORMAL`) — this replaces the alpha channel entirely rather than blending with existing values.

**The threshold** (`0.008`) is calibrated for bloom with typical intensity settings. Higher values clip faint glow tails; lower values let alpha bleed persist.

---

## 9. Irrational-Frequency Breathing

**Source**: `components/three/shaders/particle-anim.ts:27-34`

**What it is**: Three-layer sine oscillation using PHI-ratio frequency spacing. Because the Golden Ratio is irrational, the combined wave never repeats — creating organic, living motion without visible looping.

**GLSL**:
```glsl
#define PHI 1.61803398875

float irrationalBreath(float time, float seed, vec3 worldPos) {
    float b1 = sin(time * 0.11 + seed * 2.0) * 0.5 + 0.5;
    float b2 = sin(time * 0.11 * PHI + seed * 3.5 + 1.5) * 0.5 + 0.5;
    float b3 = sin(time * 0.11 * PHI * PHI + worldPos.y * 1.5 + worldPos.x) * 0.5 + 0.5;
    return mix(mix(b1, b2, 0.4), b3, 0.3);
}
```

**Design decisions**:
- Base frequency `0.11` — slow enough to feel "biological" not "mechanical"
- Each layer multiplied by successive PHI powers: `0.11`, `0.11 * PHI ≈ 0.178`, `0.11 * PHI² ≈ 0.288`
- `seed` parameter (per-particle `aRandom`) ensures each particle has unique phase
- `worldPos` in layer 3 creates spatial coherence — nearby particles breathe in near-sync
- Output mixed 60/40 then 70/30 — layer 1 dominates, higher layers add complexity

---

## 10. Biological Motion Profiles

**Source**: `components/three/shaders/particle-anim.ts:135-154`

**What it is**: Three motion profiles from neuroscience research that trigger the brain's biological motion detector (pSTS area). Particles following these profiles are unconsciously perceived as "alive."

**GLSL**:
```glsl
// Flash & Hogan 1985 — smoothest possible motion profile
float minimumJerk(float t) {
    float t3 = t * t * t;
    float t4 = t3 * t;
    float t5 = t4 * t;
    return 6.0 * t5 - 15.0 * t4 + 10.0 * t3;
}

// Lacquaniti 1983 — speed inversely proportional to curvature^(1/3)
float twoThirdsPower(float curvature, float baseSpeed) {
    return baseSpeed * pow(max(curvature, 0.001), -0.333);
}

// Organic life envelope: fast attack (0-15%), sustained, gentle release (70-100%)
float bioLifeCurve(float t) {
    float attack = smoothstep(0.0, 0.15, t);
    float release = 1.0 - smoothstep(0.7, 1.0, t);
    return attack * release;
}
```

**Production usage** — `minimumJerk` is applied to:
- Mouse excitement ramp-up (`morph.ts:190`): `vExcitement = minimumJerk(excitement)` — hover response feels intentional, not snappy
- Mist dart triggers (`morph.ts:59`): `minimumJerk(smoothstep(0.55, 0.85, dartNoise))` — sudden direction changes feel organic

---

## 11. Noise Functions (Simplex + Curl)

**Source**: `components/three/shaders/particle-anim.ts:50-173`

### Simplex Noise (Ashima Arts)
Standard 3D simplex noise: `snoise(vec3 v) → float` in range [-1, 1]. Used as the basis for curl noise.

### Curl Noise
Divergence-free noise field computed from simplex noise gradients via finite differences:

```glsl
vec3 curlNoise(vec3 p) {
    const float e = 0.01;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    float p_x0 = snoise(p - dx);
    float p_x1 = snoise(p + dx);
    float p_y0 = snoise(p - dy);
    float p_y1 = snoise(p + dy);
    float p_z0 = snoise(p - dz);
    float p_z1 = snoise(p + dz);
    float x = (p_y1 - p_y0) - (p_z1 - p_z0);
    float y = (p_z1 - p_z0) - (p_x1 - p_x0);
    float z = (p_x1 - p_x0) - (p_y1 - p_y0);
    return normalize(vec3(x, y, z) / (2.0 * e));
}
```

**Why curl noise**: Divergence-free means particles following the field never bunch up or spread apart — they flow smoothly without density artifacts. Perfect for ambient drift and transition turbulence.

**Production usage** (`morph.ts:167-178`):
```glsl
// Gentle ambient drift — always active
vec3 ambientDrift = curlNoise(morphedPos * 0.3 + uTime * 0.08) * 0.025;

// Transition turbulence — peaks at morph midpoint, zero at endpoints
vec3 transitionTurbulence = curlNoise(morphedPos * 0.4 + uTime * 0.12) * staggeredNoise * 0.35;
```

---

## 12. SDF Anti-Aliasing for Point Sprites

**Source**: `components/three/shaders/morph.ts:238-241`

**What it is**: Screen-space derivative-based anti-aliasing for circular point sprites. Instead of `smoothstep` with hardcoded pixel widths, the AA width is derived from `dFdx`/`dFdy` — adapting automatically to screen resolution and point size.

```glsl
vec2 coord = gl_PointCoord - 0.5;
float dist = length(coord);
float pixelWidth = length(vec2(dFdx(dist), dFdy(dist)));
float circle = clamp(0.5 - (dist - 0.4) / pixelWidth, 0.0, 1.0);
if (circle <= 0.0) discard;
```

**Why it works**: `dFdx(dist)` gives the rate of change of the distance field per screen pixel. Using this as the AA width means the edge is always exactly 1 pixel wide regardless of zoom level, resolution, or particle size. Compare to the naive approach (`smoothstep(0.5, 0.15, dist)`) which produces fuzzy edges at large sizes and aliased edges at small sizes.

---

## 13. Easing Functions

**Source**: `components/three/shaders/particle-anim.ts:17-25`

```glsl
float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
}

float elasticOut(float t) {
    return sin(-13.0 * (t + 1.0) * 1.5707963) * pow(2.0, -10.0 * t) + 1.0;
}
```

---

## 14. Stagger + Damped Spring

**Source**: `components/three/shaders/particle-anim.ts:36-48`

**Stagger** — delays each particle's animation start based on an offset, with configurable overlap between particles:
```glsl
float staggerProgress(float progress, float offset, float overlap) {
    return clamp((progress - offset * (1.0 - overlap)) / overlap, 0.0, 1.0);
}
```

**Damped Spring** — physically-based settle animation:
```glsl
float dampedSpring(float t, float freq, float decay) {
    if (t <= 0.0) return 0.0;
    if (t >= 1.0) return 1.0;
    return 1.0 - exp(-decay * t) * cos(freq * t);
}
```

---

## 15. GLSL Constants

**Source**: `components/three/shaders/particle-anim.ts:11-15`

```glsl
#define PI 3.141592653589793
#define PHI 1.61803398875
#define GOLDEN_ANGLE 2.39996322972
```

The Golden Angle (`2π / PHI²`) is useful for distributing points on a disc/sphere with minimal clustering (sunflower phyllotaxis pattern).
