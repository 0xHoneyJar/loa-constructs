'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── TDR-006: CRT Burn-In Particle Treatment ───────────────────────
// Hard square pixels. Grid-aligned. Phosphor flicker + drift.
// Glitch displacement. Scanline sweep. Breathing pulse.
// No rotation. The billboard was always there.

function useSigilPositions(density = 2) {
  const [data, setData] = useState<{
    positions: Float32Array;
    seeds: Float32Array;
    count: number;
  } | null>(null);

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

      // Deterministic seed from position hash
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
  uniform float uTime;
  uniform float uScale;
  uniform float uReducedMotion;
  attribute float aSeed;

  varying float vAlpha;
  varying float vHue;
  varying vec2 vScreenPos;

  // Hash function for deterministic pseudo-randomness
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }

  void main() {
    vec3 pos = position;

    // ─── Phosphor Persistence Drift ───
    // Particles slowly orbit around their home positions
    // Like phosphor cells warming/cooling on a CRT
    if (uReducedMotion < 0.5) {
      float driftSpeed = 0.15 + aSeed * 0.1;
      float driftRadius = 0.004 + aSeed * 0.003;
      float driftPhase = aSeed * 6.2831;
      pos.x += sin(uTime * driftSpeed + driftPhase) * driftRadius;
      pos.y += cos(uTime * driftSpeed * 0.8 + driftPhase * 1.3) * driftRadius;
    }

    // ─── Glitch Displacement ───
    // Occasional horizontal jitter on clusters of particles
    // Triggered by a slow sawtooth — active ~5% of the time
    if (uReducedMotion < 0.5) {
      float glitchCycle = mod(uTime * 0.3 + aSeed * 17.0, 8.0);
      // Glitch window: when cycle is between 0 and 0.15 (~2% of time)
      if (glitchCycle < 0.15) {
        // Horizontal displacement: 2-6 pixels worth
        float displacement = hash(floor(uTime * 4.0) + aSeed * 100.0);
        pos.x += (displacement - 0.5) * 0.03;
      }
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos * uScale, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vScreenPos = gl_Position.xy / gl_Position.w;

    // Hard bloom: 15% of particles are the halo — 3px, dimmer
    bool isHalo = aSeed > 0.85;
    gl_PointSize = isHalo ? 3.0 : 2.0;

    // ─── Phosphor Flicker ───
    float period = 3.0 + aSeed * 5.0;
    float phase = aSeed * 6.2831;

    float flicker = uReducedMotion > 0.5
      ? 0.25
      : 0.15 + 0.20 * sin(uTime / period + phase);

    // 8% of particles: binary on/off flicker
    if (aSeed < 0.08 && uReducedMotion < 0.5) {
      float binaryPhase = sin(uTime * 2.0 + phase * 3.0);
      flicker = binaryPhase > 0.2 ? 0.35 : 0.02;
    }

    // ─── Breathing Pulse ───
    // Whole-form brightness oscillation over 10 seconds
    float breath = uReducedMotion > 0.5
      ? 1.0
      : 0.85 + 0.15 * sin(uTime * 0.628); // 0.628 = 2*PI/10

    flicker *= breath;

    vAlpha = isHalo ? flicker * 0.35 : flicker;
    vHue = aSeed;
  }
`;

// ─── Fragment Shader ────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReducedMotion;
  varying float vAlpha;
  varying float vHue;
  varying vec2 vScreenPos;

  void main() {
    // ─── Phosphor Color Variation ───
    vec3 cyanGreen = vec3(0.35, 0.95, 0.85);
    vec3 cyanBlue  = vec3(0.50, 0.85, 1.00);
    vec3 cyanBase  = vec3(0.45, 0.92, 0.95);

    vec3 color;
    if (vHue < 0.33) {
      color = mix(cyanGreen, cyanBase, vHue / 0.33);
    } else if (vHue < 0.66) {
      color = cyanBase;
    } else {
      color = mix(cyanBase, cyanBlue, (vHue - 0.66) / 0.34);
    }

    // ─── Scanline Darkening ───
    // Every other 2px band darkened by 20%
    float scanline = mod(gl_FragCoord.y, 4.0) < 2.0 ? 0.80 : 1.0;
    color *= scanline;

    // ─── Scanline Sweep ───
    // A brighter band slowly moves down through the sigil
    // like a CRT refresh beam — period ~6 seconds
    if (uReducedMotion < 0.5) {
      float sweepY = fract(uTime * 0.16); // 0-1 every ~6 seconds
      // Map to screen space (-1 to 1)
      float sweepPos = sweepY * 2.0 - 1.0;
      // Narrow bright band — sharp, not blurred
      float sweepDist = abs(vScreenPos.y - sweepPos);
      float sweep = sweepDist < 0.06 ? 1.3 : 1.0;
      color *= sweep;
    }

    gl_FragColor = vec4(color, vAlpha);
  }
`;

// ─── Component ──────────────────────────────────────────────────────

interface SigilParticlesProps {
  scale?: number;
}

export function SigilParticles({ scale = 0.5 }: SigilParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const data = useSigilPositions(2);

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
      position={[-2.1, 0.5, 0]}
      scale={[1, 1, 1]}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
