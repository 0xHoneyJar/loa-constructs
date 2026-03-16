'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { SigilParticles } from './sigil-particles';
import { AmbientDust } from './ambient-dust';

/**
 * Sigil Scene — Horse mark embedded in the wall.
 *
 * The mark is architectural, not decorative. It exists on the same surface
 * as the content — scroll parallax proves they share a space.
 * The dust is the air between you and the wall.
 */

/** Subtle scroll parallax — the scene shifts with scroll to feel spatial */
function ScrollParallax() {
  const { camera } = useThree();
  const scrollRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useFrame(() => {
    // 3% of scroll applied as vertical camera offset — subtle depth cue
    const target = scrollRef.current * 0.0003;
    camera.position.y += (target * -1 - camera.position.y) * 0.1;
  });

  return null;
}

export default function SigilScene() {
  return (
    <Canvas
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'default',
      }}
      dpr={[1, 1]}
      camera={{ position: [-1.2, 0, 3], fov: 50 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Suspense fallback={null}>
        <ScrollParallax />
        <AmbientDust />
        <SigilParticles scale={0.75} />
      </Suspense>
    </Canvas>
  );
}
