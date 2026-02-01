'use client';

import { createElement, useRef, useState, forwardRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, Group } from 'three';
import type { ConstructNode, Domain } from '@/lib/types/graph';

const DOMAIN_COLORS: Record<Domain, string> = {
  gtm: '#FF44FF',
  dev: '#44FF88',
  security: '#FF8844',
  analytics: '#FFDD44',
  docs: '#44DDFF',
  ops: '#4488FF',
};

const NODE_SIZES: Record<string, number> = {
  bundle: 0.16,
  pack: 0.13,
  skill: 0.10,
};

// R3F wrapper components using createElement to avoid JSX type issues with React 19
interface ThreeGroupProps {
  children?: ReactNode;
  position?: [number, number, number];
}

function ThreeGroup({ children, position }: ThreeGroupProps) {
  return createElement('group', { position }, children);
}

const ThreeGroupRef = forwardRef<Group, ThreeGroupProps>(function ThreeGroupRef(
  { children, position },
  ref
) {
  return createElement('group', { ref, position }, children);
});

interface ThreeMeshProps {
  children?: ReactNode;
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  position?: [number, number, number];
  onPointerEnter?: (e: { stopPropagation: () => void }) => void;
  onPointerLeave?: (e: { stopPropagation: () => void }) => void;
  onClick?: (e: { stopPropagation: () => void }) => void;
}

const ThreeMesh = forwardRef<Mesh, ThreeMeshProps>(function ThreeMesh(
  { children, scale, rotation, position, onPointerEnter, onPointerLeave, onClick },
  ref
) {
  return createElement(
    'mesh',
    { ref, scale, rotation, position, onPointerEnter, onPointerLeave, onClick },
    children
  );
});

interface GeometryProps {
  type: 'sphere' | 'dodecahedron' | 'octahedron' | 'icosahedron';
  args: number[];
}

function ThreeGeometry({ type, args }: GeometryProps) {
  const elementType =
    type === 'dodecahedron'
      ? 'dodecahedronGeometry'
      : type === 'octahedron'
        ? 'octahedronGeometry'
        : type === 'icosahedron'
          ? 'icosahedronGeometry'
          : 'sphereGeometry';
  return createElement(elementType, { args });
}

interface StandardMaterialProps {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  wireframe?: boolean;
}

function ThreeStandardMaterial(props: StandardMaterialProps) {
  return createElement('meshStandardMaterial', props);
}

interface BasicMaterialProps {
  color: string;
  transparent: boolean;
  opacity: number;
  wireframe?: boolean;
  side?: number;
}

function ThreeBasicMaterial(props: BasicMaterialProps) {
  return createElement('meshBasicMaterial', props);
}

interface GraphNodeProps {
  node: ConstructNode;
  position: [number, number, number];
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

export function GraphNode({
  node,
  position,
  isHovered,
  isSelected,
  onHover,
  onClick,
}: GraphNodeProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const [localHover, setLocalHover] = useState(false);
  const color = DOMAIN_COLORS[node.domain];
  const baseSize = NODE_SIZES[node.type] || 0.10;
  const size = isHovered || isSelected ? baseSize * 1.2 : baseSize;

  // Different geometry based on type - more faceted = more 3D
  const geometryType: 'icosahedron' | 'octahedron' | 'dodecahedron' =
    node.type === 'bundle'
      ? 'icosahedron'
      : node.type === 'pack'
        ? 'dodecahedron'
        : 'octahedron';

  // Detail level for geometry (lower = more faceted/visible 3D)
  const detail = node.type === 'bundle' ? 0 : 0;

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the entire group for more dramatic 3D effect
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1;
    }

    if (meshRef.current) {
      // Pulsing scale effect on hover
      if (isHovered || isSelected) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
        meshRef.current.scale.setScalar(pulse);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <ThreeGroup position={position}>
      <ThreeGroupRef ref={groupRef}>
        {/* Main solid mesh */}
        <ThreeMesh
          ref={meshRef}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setLocalHover(true);
            onHover(node.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setLocalHover(false);
            onHover(null);
            document.body.style.cursor = 'default';
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick(node.id);
          }}
        >
          <ThreeGeometry type={geometryType} args={[size, detail]} />
          <ThreeStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isHovered || isSelected ? 0.8 : 0.4}
            metalness={0.3}
            roughness={0.4}
          />
        </ThreeMesh>

        {/* Wireframe for edge definition - white for visibility */}
        <ThreeMesh scale={1.02}>
          <ThreeGeometry type={geometryType} args={[size, detail]} />
          <ThreeBasicMaterial
            color="#ffffff"
            transparent
            opacity={isHovered || isSelected ? 0.9 : 0.6}
            wireframe
          />
        </ThreeMesh>
      </ThreeGroupRef>

      {/* Label - always visible, lower z-index */}
      <Html
        position={[0, size + 0.18, 0]}
        center
        zIndexRange={[0, 10]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className={`whitespace-nowrap font-mono text-[10px] uppercase tracking-wider transition-all ${
            localHover || isSelected
              ? 'rounded-md bg-surface/90 px-2 py-1 text-white backdrop-blur-sm'
              : 'text-white/70'
          }`}
        >
          {node.name}
        </div>
      </Html>
    </ThreeGroup>
  );
}
