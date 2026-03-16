'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── LED Billboard — Clean, Sharp, Cyberpunk ─────────────────────
// High-quality LED display. Tight pixel grid. Single cyan channel.
// Visible module structure but CRISP — not degraded.
// The sign is expensive hardware. It looks like it.

interface SigilData {
  positions: Float32Array;
  seeds: Float32Array;
  count: number;
}

function useSigilPositions(density = 3): SigilData | null {
  const [data, setData] = useState<SigilData | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/horse-mark.svg';

    img.onerror = () => {
      console.error('[SigilParticles] Failed to load /horse-mark.svg');
    };

    img.onload = () => {
      const w = 319;
      const h = 250;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;

      const pts: number[] = [];

      for (let y = 0; y < h; y += density) {
        for (let x = 0; x < w; x += density) {
          const i = (y * w + x) * 4;
          if (pixels[i + 3] > 128) {
            const gx = Math.floor(x / density) * density;
            const gy = Math.floor(y / density) * density;
            const nx = (gx / w - 0.5) * 2;
            const ny = -(gy / h - 0.5) * 2;
            pts.push(nx, ny, 0);
          }
        }
      }

      const count = pts.length / 3;
      const positions = new Float32Array(pts);

      const seeds = new Float32Array(count);
      for (let j = 0; j < count; j++) {
        const px = positions[j * 3];
        const py = positions[j * 3 + 1];
        seeds[j] = Math.abs(Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1;
      }

      setData({ positions, seeds, count });
    };
  }, [density]);

  return data;
}

// ─── Vertex Shader ──────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  #define PHI 1.61803398875

  uniform float uTime;
  uniform float uScale;
  uniform float uReducedMotion;
  attribute float aSeed;

  varying float vAlpha;
  varying float vSeed;
  varying float vModelY;

  void main() {
    vec3 pos = position;

    vec4 mvPosition = modelViewMatrix * vec4(pos * uScale, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vModelY = pos.y;

    // ─── Module Size: 5px ───
    // At 0.81 scale, 5px gives tight cohesive modules with visible grid.
    // The gap between points (from sampling density) provides the grid structure.
    // Bigger modules fragment at small scale; smaller ones blur together.
    gl_PointSize = 5.0;

    // ─── Clean LED Brightness (PHI-ratio irrational) ───
    // 3-layer golden-ratio sine. Never repeats — always alive.
    // Spatial variation via pos.y — different rows breathe differently.
    float v1 = sin(uTime * 0.8 + aSeed * 6.2831);
    float v2 = sin(uTime * 0.8 * PHI + aSeed * 6.2831 + 1.5);
    float v3 = sin(uTime * 0.8 * PHI * PHI + aSeed * 6.2831 + pos.y * 2.0);
    float variation = uReducedMotion > 0.5
      ? 0.0
      : 0.10 * mix(mix(v1, v2, 0.4), v3, 0.3);

    float baseAlpha = 0.82 + variation;

    // ─── Breathing (PHI-ratio irrational) ───
    // 3-layer golden-ratio pulse. Subperceptual but alive.
    // thj-surface: 0.2-0.5% amplitude is the sweet spot. We use 10%.
    float b1 = sin(uTime * 0.13) * 0.5 + 0.5;
    float b2 = sin(uTime * 0.13 * PHI) * 0.5 + 0.5;
    float b3 = sin(uTime * 0.13 * PHI * PHI + pos.x * 1.5) * 0.5 + 0.5;
    float breath = uReducedMotion > 0.5
      ? 1.0
      : 0.90 + 0.10 * mix(mix(b1, b2, 0.4), b3, 0.3);

    vAlpha = baseAlpha * breath;
    vSeed = aSeed;
  }
`;

// ─── Fragment Shader ────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReducedMotion;
  varying float vAlpha;
  varying float vSeed;
  varying float vModelY;

  void main() {
    // ─── Module Grid (Face Mask) ───
    // At 5px modules, 10% border = 0.5px gap per side.
    // Crisp enough to read the grid, tight enough to hold the form.
    vec2 pc = gl_PointCoord;
    float borderX = step(0.10, pc.x) * step(0.10, 1.0 - pc.x);
    float borderY = step(0.10, pc.y) * step(0.10, 1.0 - pc.y);
    float mask = borderX * borderY;
    if (mask < 0.5) discard;

    // ─── Cabinet Seam (Panel Grid) ───
    // Model-space seam tied to vertex position, not screen pixels.
    // Every ~0.25 units in model space = a panel boundary.
    float cabinetSeamX = 1.0 - 0.06 * step(0.9, fract(vModelY * 4.0));
    float cabinetSeamY = 1.0 - 0.06 * step(0.9, fract(vSeed * 8.0));

    // ─── Color: Structural Cyan ───
    // Not emissive — embossed. A mark pressed into the wall surface.
    // Dark enough to read as architecture, light enough to see the form.
    // oklch(0.22 0.06 195) — barely above void, cyan-tinted structural mark
    vec3 color = vec3(0.08, 0.18, 0.20);

    // ─── Scanline Sweep (model-space) ───
    // Clean horizontal brightness band moving down.
    // LED mux artifact — wide, subtle, not a harsh line.
    // Uses model Y so the sweep is locked to the sigil, not the viewport.
    if (uReducedMotion < 0.5) {
      float sweepPhase = fract(vModelY * 0.5 - uTime * 0.6);
      float sweep = 1.0 + 0.15 * smoothstep(0.1, 0.0, abs(sweepPhase - 0.9));
      color *= sweep;
    }

    // ─── Per-Row Brightness Modulation ───
    // Very subtle: every other row of modules is ~3% dimmer.
    // Creates the horizontal structure of an LED panel without being noisy.
    float rowDim = 1.0 - 0.03 * step(0.5, fract(gl_FragCoord.y * 0.125));
    color *= rowDim;

    // ─── Cabinet Seam Darkening ───
    color *= cabinetSeamX * cabinetSeamY;

    // ─── PMA output ───
    float alpha = vAlpha;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// ─── Component ──────────────────────────────────────────────────────

interface SigilParticlesProps {
  scale?: number;
}

export function SigilParticles({ scale = 0.5 }: SigilParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const data = useSigilPositions(2); // density 2: tight grid, maximum coverage

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: scale },
      uReducedMotion: { value: reducedMotion ? 1.0 : 0.0 },
    }),
    [scale, reducedMotion],
  );

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
    return geo;
  }, [data]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  if (!geometry) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      position={[-2.05, 0.35, 0]}
      scale={[0.81, 0.81, 1]}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
      />
    </points>
  );
}
