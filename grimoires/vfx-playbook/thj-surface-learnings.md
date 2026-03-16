# thj-surface Learnings — Battle-Tested VFX Patterns

> Extracted from `thj-surface` (THJ B2B landing page). Every pattern here survived production. Every failure is documented with WHY it was removed.
>
> Source: `/Users/zksoju/Documents/GitHub/thj-surface/`
> Extracted: 2026-03-15

---

## Table of Contents

1. [PHI-Ratio Irrational Breathing System](#1-phi-ratio-irrational-breathing-system)
2. [Biological Motion Library](#2-biological-motion-library)
3. [Spray Paint GLSL System](#3-spray-paint-glsl-system)
4. [Ezura Post-Processing Pipeline](#4-ezura-post-processing-pipeline)
5. [Stepped Film Grain at 24fps](#5-stepped-film-grain-at-24fps)
6. [Content-Focused Distortion Masking](#6-content-focused-distortion-masking)
7. [Alpha Channel Cleanup (Bloom Fix)](#7-alpha-channel-cleanup-bloom-fix)
8. [Lens Effect (Barrel + Chromatic Aberration)](#8-lens-effect-barrel--chromatic-aberration)
9. [Zone B Philosophy](#9-zone-b-philosophy)
10. [Tanaka Illuminated Contours](#10-tanaka-illuminated-contours)
11. [Oklab Perceptual Color Interpolation](#11-oklab-perceptual-color-interpolation)
12. [Documented Failures](#12-documented-failures)
13. [Motion Vocabulary](#13-motion-vocabulary)
14. [Performance Patterns](#14-performance-patterns)

---

## 1. PHI-Ratio Irrational Breathing System

**Source**: `components/three/shaders/particle-anim.ts` (vertex shader library), `components/three/ZoneBVisual.tsx` (zone B preamble)

**Why this matters**: Single-sine breathing loops are "solved" by the brain in ~3 cycles and stop registering as alive. PHI-spaced frequencies create a signal that mathematically never repeats, so the brain never tunes it out.

### Vertex Shader Version (for particles)

Used in holographic particle systems. Position-aware — different particles breathe differently.

```glsl
#define PHI 1.61803398875

float irrationalBreath(float time, float seed, vec3 worldPos) {
    float b1 = sin(time * 0.11 + seed * 2.0) * 0.5 + 0.5;
    float b2 = sin(time * 0.11 * PHI + seed * 3.5 + 1.5) * 0.5 + 0.5;
    float b3 = sin(time * 0.11 * PHI * PHI + worldPos.y * 1.5 + worldPos.x) * 0.5 + 0.5;
    return mix(mix(b1, b2, 0.4), b3, 0.3);
}
```

**Key parameters**:
- Base frequency: `0.11` (very slow — ~57 second pseudo-period)
- Layer 2: `0.11 * PHI` = ~0.178 (incommensurable with layer 1)
- Layer 3: `0.11 * PHI^2` = ~0.288 (incommensurable with both)
- Mix ratio: `mix(mix(b1, b2, 0.4), b3, 0.3)` — NOT equal weighting. Layer 1 dominates (~42%), layer 2 at ~35%, layer 3 at ~23%.

### Fragment Shader Version (for surface treatments)

Used in Zone B visuals. Simpler — no worldPos dependency since it's fullscreen.

```glsl
float breath(float t, float seed) {
    float b1 = sin(t * 0.13 + seed) * 0.5 + 0.5;
    float b2 = sin(t * 0.13 * PHI + seed * 1.7 + 1.3) * 0.5 + 0.5;
    float b3 = sin(t * 0.13 * PHI * PHI + seed * 2.9 + 3.1) * 0.5 + 0.5;
    return mix(mix(b1, b2, 0.4), b3, 0.3);
}
```

### Alive Time — Breathing Modulates Time Itself

Instead of linear `uTime`, this gives ebb-and-flow quality to ALL downstream motion.

```glsl
float aliveTime(float t, float speed, float seed) {
    float base = t * speed;
    float pulse = breath(t, seed) * 0.3; // +/-15% speed variation
    return base + pulse;
}
```

**Usage**: Replace `uTime * speed` with `aliveTime(uTime, speed, seed)` in any animation to make it feel organic.

### Spatial Breath — Varies Across Surface

Prevents uniform pulsing across the entire surface. Different areas breathe at different phases.

```glsl
float spatialBreath(vec2 p, float t, float seed) {
    float b = breath(t, seed);
    float spatial = snoise(vec3(p * 1.5, t * 0.04 + seed)) * 0.5 + 0.5;
    return mix(b, spatial, 0.4);
}
```

**The hierarchy**:
| Function | Use case |
|----------|----------|
| `breath()` | Global pulse (single value for whole surface) |
| `aliveTime()` | Organic time for downstream animations |
| `spatialBreath()` | Position-varying pulse (different areas breathe differently) |
| `irrationalBreath()` | Per-particle pulse (vertex shader, uses worldPos) |

---

## 2. Biological Motion Library

**Source**: `components/three/shaders/particle-anim.ts`

These motion profiles trigger the brain's "life detector" (posterior superior temporal sulcus / pSTS). Based on motor control research by Flash & Hogan (1985) and Lacquaniti (1983).

### Minimum Jerk Trajectory

The trajectory that biological limbs follow. Smooth acceleration and deceleration — the brain recognizes this as "a living thing moved."

```glsl
float minimumJerk(float t) {
    float t3 = t * t * t;
    float t4 = t3 * t;
    float t5 = t4 * t;
    return 6.0 * t5 - 15.0 * t4 + 10.0 * t3;
}
```

**Input**: `t` in [0, 1]. **Output**: [0, 1] with zero velocity and acceleration at both endpoints.

### Two-Thirds Power Law

Biological motion follows curvature: organisms slow down on curves and speed up on straight paths. This is involuntary — it's hardwired.

```glsl
float twoThirdsPower(float curvature, float baseSpeed) {
    return baseSpeed * pow(max(curvature, 0.001), -0.333);
}
```

**Usage**: Feed path curvature → get biologically plausible speed. Higher curvature = slower.

### Bio Life Curve (Attack/Release Envelope)

An asymmetric life envelope: fast attack (15% of duration), sustained plateau, gradual release (last 30%).

```glsl
float bioLifeCurve(float t) {
    float attack = smoothstep(0.0, 0.15, t);
    float release = 1.0 - smoothstep(0.7, 1.0, t);
    return attack * release;
}
```

**Use for**: Particle lifetimes, effect intensities, transition envelopes. The asymmetry (fast in, slow out) reads as organic — symmetric envelopes read as mechanical.

---

## 3. Spray Paint GLSL System

**Source**: `components/three/ZoneBVisual.tsx` (zoneBPreamble)

A composable system that converts ANY shape mask (0-1) into spray-painted texture. Physically models aerosol particles deposited on a wall surface: dense center, scattered dots at edges, overspray halo.

### The System (3 functions)

#### 1. `sprayDots` — Hash-based dot field

```glsl
float sprayDots(vec2 p, float res) {
    return hash21(floor(p * res));
}
```

#### 2. `spray` — Core shape-to-paint conversion

```glsl
float spray(vec2 p, float shape) {
    // Dense core -- most dots land here
    float coreDots = sprayDots(p, 180.0);
    float core = step(1.0 - shape * 0.95, coreDots) * smoothstep(0.05, 0.2, shape);

    // Medium spray -- fills in gaps
    float medDots = sprayDots(p + 7.7, 250.0);
    float med = step(1.0 - shape * 0.7, medDots) * smoothstep(0.1, 0.35, shape);

    // Scattered overspray -- individual dots beyond the main shape
    float overDots = sprayDots(p + 13.3, 120.0);
    float overspray = step(0.92, overDots) * smoothstep(-0.05, 0.15, shape);

    // Build up: multiple spray passes create opacity
    float paint = core * 0.7 + med * 0.25 + overspray * 0.15;

    // Thick center, thin edges (like real paint buildup)
    paint *= smoothstep(0.0, 0.3, shape) * 0.85 + 0.15;

    return clamp(paint, 0.0, 1.0);
}
```

**Key insight**: Three density layers at different resolutions (180, 250, 120) with offset positions (`p + 7.7`, `p + 13.3`) prevent alignment artifacts between layers.

#### 3. `applySpray` — Surface integration

```glsl
vec3 applySpray(vec2 p, float shape, vec3 paintColor, vec3 surface) {
    float coverage = spray(p, shape);
    // Surface grain shows through thin paint
    float surfaceGrain = snoise(vec3(p * 60.0, 1.0)) * 0.015;
    vec3 tinted = mix(surface + surfaceGrain, paintColor, coverage * 0.92);
    return tinted;
}
```

#### Transparent variant (for alpha compositing):

```glsl
vec4 sprayAlpha(vec2 p, float shape, vec3 paintColor) {
    float coverage = spray(p, shape);
    return vec4(paintColor, coverage * 0.92);
}
```

### Usage Pattern

The system is designed as **shape-first, then paint**:

1. Define a shape mask (voronoi, circles, lines, gauge marks — any SDF or procedural shape)
2. Modulate with breathing: `shape *= 0.88 + spatialBreath(p, uTime, seed) * 0.12`
3. Pass to `spray()` or `applySpray()` for paint rendering

**Proven variants** (all in `ZoneBVisual.tsx`):
| Variant | Shape | Technique |
|---------|-------|-----------|
| `inlay` | Radial flow lines (tributary pattern) | `sin(aWarped * N)` for angular channels |
| `relief` | Stenciled dot grid (census scatter) | Grid cell hashing + Gaussian density fields |
| `score` | Gauge/instrument face (concentric rings + ticks) | Polar coordinates, modular tick marks |
| `fossil` | Network graph (nodes + connections) | Grid-based node placement + segment distance |

### Paint Palette

```glsl
#define PAINT_DARK vec3(0.10, 0.09, 0.085)   // dark institutional stencil paint
#define PAINT_MID  vec3(0.18, 0.16, 0.15)     // mid-tone for secondary marks
```

---

## 4. Ezura Post-Processing Pipeline

**Source**: `grimoires/the-easel/constructs/visual-pipeline/CONVENTIONS.md`

Named after Hisashi Ezura (Production I.G. VFX Supervisor, Ghost in the Shell: Innocence). Replaces single-pass bloom with cinematic multi-tier halation.

### 6-Stage Architecture

```
Scene render
  -> 1. Bright Pass Extraction (threshold >= 1.0, HDR only)
  -> 2. Kawase Downsample Pyramid (4-5 passes to 1/16 resolution)
  -> 3. Kawase Upsample & Blend (4 passes back up, per-tier blend modes)
  -> 4. Depth Atmosphere (Beer-Lambert fog between Z-layers)
  -> 5. Velocity-Masked Chromatic Aberration (motion-reactive RGB split)
  -> 6. Film Grain + ACESFilmic Tone Mapping
```

### Multi-Tier Halation (replaces single bloom)

| Tier | Blur Radius | Blend Mode | Opacity | Purpose |
|------|-------------|------------|---------|---------|
| 1 (Core) | ~10px | Add | 1.0-1.2 | Tight bright center |
| 2 (Inner Glow) | ~40px | Screen | 0.8-1.0 | Soft halo around bright elements |
| 3 (Outer Spread) | ~80px | Screen | 0.6-0.8 | Wide ambient glow |
| 4 (Atmospheric) | ~160px | Lighten | 0.3-0.5 | Room-filling light scatter |

**Why this matters**: Standard bloom uses uniform Gaussian at one radius. Halation layers tight + wide blurs for physically accurate light scatter — the difference between a flashlight and a candle.

### Kawase Dual Filter GLSL

More efficient than Gaussian. 13-tap downsample + 9-tap tent upsample.

**Downsample (13-tap):**
```glsl
vec4 sum = texture(u_texture, v_uv) * 0.125;
sum += texture(u_texture, v_uv - u_texelSize * 1.5) * 0.125;
sum += texture(u_texture, v_uv + u_texelSize * 1.5) * 0.125;
sum += texture(u_texture, v_uv + vec2(u_texelSize.x, -u_texelSize.y) * 1.5) * 0.125;
sum += texture(u_texture, v_uv - vec2(u_texelSize.x, -u_texelSize.y) * 1.5) * 0.125;
// + 4 half-offset taps at 0.0625 weight each
```

**Upsample (9-tap tent):**
```glsl
vec4 lowRes = vec4(0.0);
lowRes += texture(u_lowRes, v_uv + vec2(-1, -1) * u_texelSize) * 0.25;
lowRes += texture(u_lowRes, v_uv + vec2( 1, -1) * u_texelSize) * 0.25;
lowRes += texture(u_lowRes, v_uv + vec2(-1,  1) * u_texelSize) * 0.25;
lowRes += texture(u_lowRes, v_uv + vec2( 1,  1) * u_texelSize) * 0.25;
vec4 highRes = texture(u_highRes, v_uv);
fragColor = vec4((lowRes.rgb * u_tintColor) + highRes.rgb, 1.0);
```

### Core Matte (Preventing Additive Washout)

When stacking 5+ transparent layers, additive blending washes out to white.

```glsl
float coreMatte = smoothstep(0.8, 0.2, fresnel); // opaque center, transparent edge
float finalAlpha = mix(0.1, 1.0, coreMatte);
```

### Depth Atmosphere (Beer-Lambert Z-Fog)

Tinted fog BETWEEN depth layers, not globally:

```glsl
float linearDepth = getLinearDepth(depthTexture, vUv);
float fogAmount = 1.0 - exp(-atmosphereDensity * linearDepth);
vec3 fogColor = vec3(0.03, 0.03, 0.04); // tinted obsidian, NOT white
color = mix(color, fogColor, fogAmount * 0.3); // subtle, never opaque
```

### Velocity-Masked Chromatic Aberration

RGB split only activates on moving elements:

```glsl
vec2 velocity = texture(tVelocity, vUv).rg;
float speed = length(velocity);
float mask = smoothstep(0.1, 0.15, speed);
vec2 offset = normalize(velocity) * speed * maxOffset * mask;
float r = texture(tDiffuse, vUv + offset).r;
float g = texture(tDiffuse, vUv).g;
float b = texture(tDiffuse, vUv - offset).b;
```

- Max offset: 1.5-3.0 pixels
- Deceleration persistence: 0.90 factor (fades over 5-6 frames)

### Performance Budget

| Stage | Time (mid-range GPU) |
|-------|---------------------|
| Bright pass | 0.1ms |
| Kawase downsample (5 passes) | 0.3-0.6ms |
| Kawase upsample (4 passes) | 0.3-0.5ms |
| Depth atmosphere | 0.1-0.2ms |
| Chromatic aberration | 0.2-0.3ms |
| Film grain + tone map | 0.15-0.3ms |
| **Total** | **~1.2-1.9ms** |

### Render Target Requirements

- **HalfFloatType** (16-bit) for bloom pipeline — enables HDR values > 1.0
- Emissive intensity: 10.0-20.0 to push into bloom range
- Bloom threshold: 1.0 (not 0.8 — selective bloom only)

---

## 5. Stepped Film Grain at 24fps

**Source**: `components/three/effects/GrainEffect.ts`

Film grain that updates at 24fps (cinematic frame rate), not every frame. Uses a `timeAccumulator` pattern.

### The Pattern

```typescript
class GrainEffect extends Effect {
  private timeAccumulator: number = 0;

  update(_renderer, _inputBuffer, deltaTime?: number) {
    this.timeAccumulator += deltaTime ?? 0;
    if (this.timeAccumulator >= 1 / 24) {
      this.uniforms.get("time")!.value += 10.0;
      this.timeAccumulator %= 1 / 24;
    }
  }
}
```

**Key**: Time jumps by `10.0` (not 1/24) — this makes the hash function produce completely different grain patterns each step. Small time increments would create similar-looking frames.

### GLSL Shader

```glsl
uniform float opacity;   // 0.08 default
uniform float grainSize; // 2.0 default
uniform float time;

const vec3 weights = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p, float seed) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031 + seed);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float screenScale = resolution.y / 1080.0;
    vec2 grainUV = floor(uv * resolution / (grainSize * screenScale));

    float n = hash(grainUV, time) * 2.0 - 1.0;
    vec3 noise = vec3(n);

    // Luma-aware masking -- grain visible on mid-tones, not shadows
    float luma = dot(inputColor.rgb, weights);
    float mask = smoothstep(0.005, 0.05, luma);

    // Dropout -- occasional dark specks (like real film damage)
    float dropout = step(0.92, hash(grainUV, time + 13.7));
    float dropoutMask = 1.0 - dropout * mask * 0.6;

    vec3 finalColor = (inputColor.rgb + noise * opacity * mask) * dropoutMask;
    outputColor = vec4(finalColor, inputColor.a);
}
```

**Key details**:
- `screenScale = resolution.y / 1080.0` — grain size is resolution-independent
- Luma mask: grain only visible on mid-tones, not pure black (preserves deep blacks)
- Dropout: 8% chance of dark specks per grain cell — simulates film damage

### Grain Opacity Guidelines

| Visual Density | Grain Opacity |
|---|---|
| Solid surface (terrain, matrix) | 0.08 (very subtle) |
| Medium density (flow, census) | 0.20-0.25 |
| Sparse (network, particles) | 0.30 (strong grain fills empty space) |

---

## 6. Content-Focused Distortion Masking

**Source**: `components/three/effects/CRTEffect.ts`

All distortion effects (barrel, scanlines, aperture mask) are masked by a `contentRadius` uniform that limits effects to visible content area. Prevents effects from wasting GPU on empty regions.

### The Masking Pattern

```glsl
uniform float uContentRadius;

vec2 curve(vec2 uv, float curvature, float contentRadius) {
    float aspect = resolution.x / resolution.y;
    vec2 centeredUV = (uv - 0.5) * vec2(aspect, 1.0);
    float distFromCenter = length(centeredUV);
    float contentFocus = smoothstep(contentRadius * 2.5, 0.0, distFromCenter);

    vec2 uvN = (uv - 0.5) * 2.0;
    vec2 offset = abs(uvN.yx) / vec2(curvature);
    vec2 curved = uvN + uvN * offset * offset * contentFocus;
    return curved * 0.5 + 0.5;
}
```

**CRT scanline masking** — only applies to pixels with visible content:

```glsl
float luma = dot(color, vec3(0.299, 0.587, 0.114));
float contentMask = smoothstep(0.0, 0.04, luma);

// Scanline intensity scales with content presence
float beamWidth = mix(uScanIntensity, uScanIntensity * 0.5, luma);
color *= mix(1.0, scanline, contentMask);

// Aperture mask only where content exists
color *= mix(vec3(1.0), mask, contentMask);
```

**Why**: Without content masking, scanlines and aperture patterns are visible on empty black regions, which looks broken. Content masking ensures effects only appear where there's something to distort.

---

## 7. Alpha Channel Cleanup (Bloom Fix)

**Source**: `components/three/effects/AlphaCleanupEffect.ts`

**Problem**: Bloom's blur kernels average RGBA, spreading non-zero alpha across the entire buffer. The ADD blend then uses `max(dst.a, src.a)`, making even empty areas opaque black instead of transparent.

**Solution**: Derive alpha from luminance — where there's no visible content, the pixel becomes transparent.

```glsl
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float cleanAlpha = smoothstep(0.0, 0.008, lum);
    outputColor = vec4(inputColor.rgb, cleanAlpha);
}
```

**CRITICAL**: This effect MUST use `BlendFunction.SRC` (not NORMAL) — it replaces the alpha channel entirely.

**When you need this**: Any time you composite particles/bloom over a transparent canvas (e.g., WebGL overlaying HTML content).

---

## 8. Lens Effect (Barrel + Chromatic Aberration)

**Source**: `components/three/effects/LensEffect.ts`

Content-focused barrel distortion + chromatic aberration + vignette.

```glsl
uniform float uDistortion;     // 0.08
uniform float uAberration;     // 0.006
uniform float uVignetteSize;   // 0.5
uniform float uVignetteSmooth; // 0.5
uniform float uContentRadius;  // 0.45

vec2 distortUV(vec2 uv, float k, vec2 center) {
    vec2 d = uv - center;
    float r2 = dot(d, d);
    return uv + d * (k * r2);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 center = vec2(0.5);
    float aspect = resolution.x / resolution.y;
    vec2 centeredUV = (uv - 0.5) * vec2(aspect, 1.0);
    float distFromCenter = length(centeredUV);
    float contentFocus = 1.0 - smoothstep(0.0, uContentRadius * 2.0, distFromCenter);

    float localDistortion = uDistortion * contentFocus;
    float localAberration = uAberration * contentFocus;

    // Per-channel UV distortion for chromatic aberration
    vec2 rUV = distortUV(uv, localDistortion + localAberration, center);
    vec2 gUV = distortUV(uv, localDistortion, center);
    vec2 bUV = distortUV(uv, localDistortion - localAberration, center);

    vec4 rS = texture2D(inputBuffer, rUV);
    vec4 gS = texture2D(inputBuffer, gUV);
    vec4 bS = texture2D(inputBuffer, bUV);

    float finalAlpha = max(rS.a, max(gS.a, bS.a));

    // Content-aware vignette
    float vigDist = distFromCenter / (uContentRadius * 1.5);
    float vignette = 1.0 - smoothstep(uVignetteSize, uVignetteSize + uVignetteSmooth + 0.3, vigDist);
    float luma = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float contentMask = smoothstep(0.0, 0.03, luma);
    vignette = mix(1.0, vignette, contentMask);

    // Dither to prevent banding
    float noise = (fract(sin(dot(uv * resolution, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.004;

    vec3 color = vec3(rS.r, gS.g, bS.b) * vignette + noise;
    outputColor = vec4(color, finalAlpha);
}
```

---

## 9. Zone B Philosophy

**Source**: `components/three/ZoneBVisual.tsx` (file header + design comments)

> These are NOT screens. They are physical surface treatments on warm off-white panels: bronze inlay, blind emboss, ink wash, scored lines, embedded fossils. Light comes from above. Visibility comes from shadow and material difference, not glow.

### Core Principle: Paint ON Concrete, Not Light FROM Within

Zone B visuals are defined by what they are NOT:
- NOT emissive (no glow, no bloom, no additive blending)
- NOT digital (no scanlines, no aperture masks, no CRT effects)
- NOT floating (everything is physically ON a surface)

They ARE:
- **Physical surface treatments** — spray paint, ink wash, embossing, etching
- **Revealed by light** — shadow and material difference create visibility
- **Warm material palette** — off-white surface, bronze, warm shadow, ink

### Zone B Palette

```glsl
#define SURFACE     uSurface                       // configurable, default #F5F3EF
#define BRONZE_DEEP vec3(0.298, 0.239, 0.180)      // darkest bronze
#define BRONZE_BODY vec3(0.463, 0.384, 0.298)      // mid bronze
#define BRONZE_CATCH vec3(0.588, 0.522, 0.431)     // light catch on bronze
#define SHADOW_WARM vec3(0.867, 0.835, 0.792)      // warm shadow
#define INK_BODY    vec3(0.118, 0.106, 0.098)      // near-black ink
#define INK_WASH    vec3(0.325, 0.298, 0.271)      // diluted ink
```

### 10 Proven Variants

| Variant | Shape System | Rendering |
|---------|-------------|-----------|
| `inlay` | Radial tributary flow lines | Spray paint (transparent) |
| `relief` | Gaussian density zones + dot grid | Spray paint (transparent) |
| `wash` | 4-layer noise thresholding + edge bleed | Ink-on-paper (opaque) |
| `score` | Concentric rings + tick marks + sweep | Spray paint (transparent) |
| `fossil` | Grid-based node network + connections | Spray paint (transparent) |
| `topography` | Multi-octave noise → contour lines | Bronze + shadow (opaque) |
| `circuit` | Anisotropic noise thresholding | Copper patina (opaque) |
| `ripple` | Multi-source expanding rings | Ink-on-wet-paper (opaque) |
| `weave` | Over-under fiber interlocking | Material shadow (opaque) |
| `erosion` | Sedimentary strata + wind channels | Depth layer reveal (opaque) |

---

## 10. Tanaka Illuminated Contours

**Source**: `components/three/ZoneBVisual.tsx` (topography variant)

Uses `dFdx`/`dFdy` gradient calculation with a light direction to create illuminated contour lines — contours facing the light are brighter, those facing away are darker.

```glsl
// Light direction for Tanaka illuminated contours
vec2 lightDir = normalize(vec2(0.5, -0.6));
vec2 gradH = vec2(dFdx(elevation), dFdy(elevation));
float gradLen = length(gradH);
float slopeLight = gradLen > 0.001 ? dot(normalize(gradH), lightDir) : 0.0;
float tanakaBright = mix(0.5, 1.2, slopeLight * 0.5 + 0.5);
```

Also used for trace shadow/catch in the circuit variant:

```glsl
vec2 ld = normalize(vec2(0.4, -0.6));
float traceGrad = dFdx(trace) * ld.x + dFdy(trace) * ld.y;
float traceShadow = max(-traceGrad, 0.0) * 0.25 * lightBreath;
float traceCatch = max(traceGrad, 0.0) * 0.1 * lightBreath;
```

**Key insight**: Multiplying shadow/catch by `breath()` gives the illusion of shifting light source without actually moving anything.

---

## 11. Oklab Perceptual Color Interpolation

**Source**: `components/three/shaders/particle-anim.ts`

Standard `mix()` in sRGB space causes amber to shift toward brown/muddy on dark backgrounds (Bezold-Brucke effect). Oklab interpolation preserves hue through brightness changes.

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

**Rule**: Always use `oklabMix()` for color interpolation in amber/warm color ranges. Standard `mix()` is only safe for grayscale or very narrow hue ranges.

---

## 12. Documented Failures

### REMOVED: Light Shaft

**What**: `.hero-light-shaft` — linear gradient from upper right, 15s flicker animation (0.4-0.9 opacity).

**Why removed**: Felt decorative. Violated Hard Rule #6 from the Design DNA: "NEVER decorative animation." Every animation must build trust or demonstrate capability. A flickering light shaft did neither — it just looked cinematic without earning its place.

### REMOVED: Color Temperature Cycling Overlay

**What**: `.hero-color-cycle` — 45s full-scene overlay cycling warm amber shifts. Screen blend mode.

**Why removed**: Added complexity without demonstrating capability. The overlay required an extra DOM element (L5 div) and GPU compositor layer for an effect so subtle it was "purely subconscious." The cost/benefit didn't hold — subtle is good, but invisible-yet-expensive is waste.

### REMOVED: L5 Overlay Div

**What**: Extra DOM element for the color cycling overlay.

**Why removed**: Unnecessary DOM element. When the effect it served was removed, the container had no purpose.

### TUNED: Atmospheric Dust Motes

**Before**: 30 particles, 1.5-5.5px, "dust motes" metaphor.

**After**: 20 particles, 1-3.5px, "amber data residue" — institutional energy discharge, not nature dust.

**Why**: The original felt like a forest scene. The brand is institutional/facility. Smaller, data-like particles align with "where information moves" rather than "where trees grow."

### TUNED: Bokeh Circles

**Before**: 5 circles, 12-32px, 2-6% opacity.

**After**: 3 circles, reduced opacity, "industrial haze circles."

**Why**: 5 bokeh circles read as camera lens effect (cinematic). 3 at lower opacity read as industrial atmosphere (facility). The metaphor matters even for barely-visible elements.

### TUNED: Breathing Glow

**Before**: 8s/12s cycles, 0.5-1.0 opacity, 5% scale.

**After**: 10s/14s cycles, 0.6-1.0 opacity, 3% scale, renamed "reactor hum."

**Why**: Faster breathing = anxious. Slower = institutional patience. Narrower range = more controlled. The glow should feel like equipment humming, not a creature breathing.

### REJECTED: SDF Rejection Sampling

**Context**: Considered for spray paint dot placement (Zone B).

**Why rejected**: Hash-based placement with density modulation is cheaper and produces equivalent visual quality. SDF-based rejection sampling adds computational cost for precision that's invisible in a spray paint aesthetic where imperfection IS the point.

### Performance Optimizations Applied

| Before | After | Why |
|--------|-------|-----|
| Object allocation per frame | `Float32Array` for all particle state | Zero GC pressure |
| Per-frame radial gradient + blur | Pre-rendered bokeh sprite (one offscreen canvas) | 10x cheaper |
| `canvas.filter = "blur(...)"` | Blur baked into sprite at creation | Eliminated GPU readback |
| Bare elements | `will-change: opacity, transform` on CSS glow layers | GPU compositor, no repaint cascade |
| Full DPR | DPR capped at 1.5 for atmospheric effects | Dust doesn't need retina |
| 30 dust + 5 bokeh | 20 dust + 3 bokeh | Noise-driven opacity creates perceived density |

---

## 13. Motion Vocabulary

**Source**: `grimoires/the-easel/constructs/visual-pipeline/MOTION-VOCABULARY.md`

### Core Motion Types

| Motion | Behavior | Best For |
|--------|----------|----------|
| `spin-y` | Turntable Y-axis rotation | Symmetric objects |
| `tumble` | Multi-axis slow tumble | Asymmetric objects |
| `rock` | Pendulum sway | Flat/frontal objects |
| `drift-z` | Approach/retreat + scale breathing | Elongated objects |
| `sweep` | Rotating scan line | Monitoring/tracking |
| `converge` | Many-to-one flow | Collection/aggregation |
| `radiate` | One-to-many expansion | Broadcasting/growth |
| `breathe` | Rhythmic scale/intensity pulse | Idle states |
| `cascade` | Sequential activation wave | Boot sequences |

### APS Rhythm (Anticipation / Payoff / Settle)

| Beat | Duration | What Happens |
|------|----------|-------------|
| Anticipation | 10-20% | Pull-back, gather energy, dim before bright |
| Payoff | 20-30% | Main action, fast, overshoots slightly |
| Settle | 50-70% | Damped return to rest. **NEVER bouncy.** |

### Adjacent Motion Rule

No two adjacent cards on a page may share the same primary motion type. Verify at least 3 distinct motion types visible simultaneously.

### GITS Digital Motion Types (new)

| Motion | Behavior | GLSL Pattern |
|--------|----------|--------------|
| `scan-line-reveal` | Constant-velocity directional wipe, 60-120Hz flicker at edge | `step(threshold, vWorldPosition.y + noise * 0.1)` |
| `data-cascade` | Constant-velocity downward flow, 33-50ms tick rate | `mod(pos.y - floor(uTime * 24.0) / 24.0 * speed, range)` |
| `voxel-stutter` | Geometry snaps to 3D grid | `floor(pos * gridRes) / gridRes` with stepped time |
| `phosphor-flash` | Spike emissive 100% for 1-2 frames on completion | `emissive *= step(0.98, uProgress) * flash` |
| `state-snap` | Instantaneous 1-frame shift, no easing | Step interpolation, no tweening |

### Temporal Quantization Pattern

```glsl
float quantizeTime(float time, float fps) {
    return floor(time * fps) / fps;
}
// Holographic: 12fps (on-twos)
// Matrix: 8fps (on-threes)
// Topographic/Oscillographic: full 60fps
```

### Anti-Patterns

- **Never** apply spring easing to digital motion (springs imply mass)
- **Never** use ease-in-out for scan-line-reveal (must be constant velocity)
- **Never** fade opacity smoothly for digital dissolution (use step/blink-out)
- **Never** sync digital motion to physical element timing

---

## 14. Performance Patterns

**Source**: `grimoires/vfx-playbook/techniques/performance-budgeting.md`, `applied/thj-hero-section.md`

### Frame Budget

| Device | Frame Budget | Particle Budget | Draw Calls |
|--------|-------------|----------------|------------|
| Desktop (M1+) | 16ms | 50-100 particles | < 40/frame |
| Mobile (mid-tier) | 10ms | 15-25 particles | < 20/frame |
| Low-end mobile | 10ms | Skip atmospheric layer | 0 |

### GPU Budget Per Instrument

| Mode | Target | Key Cost Driver |
|------|--------|----------------|
| Holographic (particles) | <4ms GPU | Point rendering + soft disc fragment |
| Topographic (terrain) | <4ms GPU | Vertex displacement + contour fragment |
| Oscillographic (signal) | <3ms GPU | Trail geometry + persistence buffer |
| Matrix (dots) | <2ms GPU | Point rendering (simplest) |

### Proven Optimizations

1. **Float32Array** for particle state — zero GC pressure, no object allocation per frame
2. **Pre-rendered sprites** — one offscreen canvas for blurred shapes, `drawImage()` per frame
3. **No canvas.filter** — bake blur into sprites at creation time
4. **will-change** on CSS glow layers — GPU compositor, no repaint cascade
5. **DPR cap at 1.5** for atmospheric effects
6. **20 particles + noise variation** > 200 particles at constant opacity
7. **IntersectionObserver** culling — pause loops when offscreen

### Alpha/Visibility Tiers

| Tier | Alpha Range | Reads As |
|------|-------------|----------|
| Invisible | < 0.02 | Edge falloff, discard zone |
| Ghost/substrate | 0.02-0.12 | Barely visible, sensed not read |
| Subtle | 0.12-0.25 | Background elements, connection lines |
| Readable | 0.25-0.45 | Secondary elements, mid-importance |
| Prominent | 0.45-0.70 | Primary elements, main particles |
| Intense | 0.70-1.0 | Focal points, peaks |

**Common mistake**: Setting "dim" elements at 0.06a makes them invisible on screen. Ghost elements need at least 0.08-0.12a to register.

### Color System (Dark Zone)

| Constant | Value | Usage |
|----------|-------|-------|
| `COLOR_BRIGHT` | `#E8912A` | Primary amber — active elements |
| `COLOR_DIM` | `#C4722A` | Secondary — mid-elevation, dimmed |
| `COLOR_SHADOW` | `#6B3A1A` | Hue-shifted shadow (not grey) |
| `COLOR_HIGHLIGHT` | `#D4A017` | Honey accent — contour lines |
| `BG_OBSIDIAN` | `#060608` | Background |

**Color multiplier ranges** in fragment shaders: Dim 0.2-0.4x, Mid 0.5-0.8x, Bright 1.1-1.4x, Peak 1.5x (sparingly).
