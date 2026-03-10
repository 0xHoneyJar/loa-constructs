'use client';

import { createElement, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface GraphCanvasProps {
  children: ReactNode;
}

// R3F intrinsic elements via createElement — avoids JSX.IntrinsicElements + React 18/19 type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r3f = (tag: string, props: Record<string, unknown>): any => createElement(tag, props);


export function GraphCanvas({ children }: GraphCanvasProps) {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={false}
        minDistance={2}
        maxDistance={10}
        zoomSpeed={0.5}
        panSpeed={1}
        screenSpacePanning={true}
        mouseButtons={{
          LEFT: 2,
          MIDDLE: 1,
          RIGHT: 2,
        }}
      />
      {r3f('ambientLight', { intensity: 0.5 })}
      {r3f('directionalLight', { position: [5, 5, 5], intensity: 0.8 })}
      {r3f('pointLight', { position: [-5, -5, 5], intensity: 0.3 })}
      {children}
    </Canvas>
  );
}
