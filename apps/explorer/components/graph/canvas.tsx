'use client';

import { createElement, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface GraphCanvasProps {
  children: ReactNode;
}

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
      {/* Clean balanced lighting */}
      {createElement('ambientLight', { intensity: 0.5 })}
      {createElement('directionalLight', {
        position: [5, 5, 5],
        intensity: 0.8
      })}
      {createElement('pointLight', {
        position: [-5, -5, 5],
        intensity: 0.3
      })}
      {children}
    </Canvas>
  );
}
