'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Ambient Dust — Atmospheric Depth Particles ─────────────────
// Tiny floating motes that drift slowly through the void.
// They catch the cyan light from the sigil, suggesting air/atmosphere.
// Without these, the void is dead. With them, it breathes.

const PARTICLE_COUNT = 40;

const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Slow drift — each particle has its own speed and phase
    pos.x += sin(uTime * aSpeed * 0.3 + aPhase) * 0.15;
    pos.y += cos(uTime * aSpeed * 0.2 + aPhase * 1.7) * 0.08;
    pos.y -= mod(uTime * aSpeed * 0.02 + aPhase, 4.0) - 2.0; // gentle downward drift, wrapping

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (2.0 / -mvPosition.z);

    // Fade based on distance from center — particles at edges are dimmer
    float dist = length(pos.xy);
    vAlpha = smoothstep(3.0, 1.0, dist) * 0.12;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    // Soft circle
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, d) * vAlpha;

    // Faint cyan tint — catching light from the sign
    vec3 color = vec3(0.4, 0.85, 0.9);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function AmbientDust() {
  const ref = useRef<THREE.ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spread across the viewport area
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      sizes[i] = 1.5 + Math.random() * 2.5;
      speeds[i] = 0.3 + Math.random() * 0.7;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    return {
      geometry: geo,
      uniforms: { uTime: { value: 0 } },
    };
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={ref}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
