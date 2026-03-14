'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { SigilParticles } from './sigil-particles';

/**
 * CRT Burn-In Sigil Scene (TDR-006)
 *
 * Native resolution — the pixel aesthetic comes from the particles
 * themselves being hard 2px squares on a grid, not from canvas
 * downsampling. antialias: false keeps edges sharp.
 */
export default function SigilScene() {
  return (
    <Canvas
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'default',
      }}
      dpr={[1, 1]}
      camera={{ position: [0, 0, 3], fov: 50 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Suspense fallback={null}>
        <SigilParticles scale={0.5} />
      </Suspense>
    </Canvas>
  );
}
