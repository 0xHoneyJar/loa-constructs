'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryColor } from '@/lib/utils/colors';
import type { ConstructNode } from '@/lib/types/graph';

interface StackPreviewProps {
  nodes: ConstructNode[];
}

const GRID_SIZE = 7;
const CELL_SIZE = 14;
const GAP = 2;

// Generate deterministic position from slug hash
function hashToPosition(slug: string, gridSize: number): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  return {
    x: absHash % gridSize,
    y: Math.floor(absHash / gridSize) % gridSize,
  };
}

// Get block size based on node type (packs are larger)
function getBlockSize(type: string): number {
  switch (type) {
    case 'bundle':
      return 2;
    case 'pack':
      return 1.5;
    default:
      return 1;
  }
}

interface BlockProps {
  node: ConstructNode;
  position: { x: number; y: number };
}

function Block({ node, position }: BlockProps) {
  const color = getCategoryColor(node.category);
  const size = getBlockSize(node.type);
  const blockSize = CELL_SIZE * size;
  const x = position.x * (CELL_SIZE + GAP);
  const y = position.y * (CELL_SIZE + GAP);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Glow effect */}
      <rect
        x={x - 2}
        y={y - 2}
        width={blockSize + 4}
        height={blockSize + 4}
        rx={3}
        fill={color}
        opacity={0.3}
        filter="url(#glow)"
      />
      {/* Main block */}
      <rect
        x={x}
        y={y}
        width={blockSize}
        height={blockSize}
        rx={2}
        fill={color}
        opacity={0.9}
      />
      {/* Highlight */}
      <rect
        x={x + 1}
        y={y + 1}
        width={blockSize - 2}
        height={3}
        rx={1}
        fill="white"
        opacity={0.3}
      />
    </motion.g>
  );
}

export function StackPreview({ nodes }: StackPreviewProps) {
  // Calculate positions for all blocks
  const blocksWithPositions = useMemo(() => {
    const occupiedCells = new Set<string>();

    return nodes.map((node) => {
      let position = hashToPosition(node.slug, GRID_SIZE);
      const size = Math.ceil(getBlockSize(node.type));

      // Find unoccupied position if collision
      let attempts = 0;
      while (attempts < GRID_SIZE * GRID_SIZE) {
        let occupied = false;
        for (let dx = 0; dx < size; dx++) {
          for (let dy = 0; dy < size; dy++) {
            const key = `${(position.x + dx) % GRID_SIZE},${(position.y + dy) % GRID_SIZE}`;
            if (occupiedCells.has(key)) {
              occupied = true;
              break;
            }
          }
          if (occupied) break;
        }

        if (!occupied) break;

        // Try next position
        position = {
          x: (position.x + 1) % GRID_SIZE,
          y: position.x + 1 >= GRID_SIZE ? (position.y + 1) % GRID_SIZE : position.y,
        };
        attempts++;
      }

      // Mark cells as occupied
      for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
          occupiedCells.add(`${(position.x + dx) % GRID_SIZE},${(position.y + dy) % GRID_SIZE}`);
        }
      }

      return { node, position };
    });
  }, [nodes]);

  const viewBoxSize = GRID_SIZE * (CELL_SIZE + GAP) - GAP;

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
          Empty Stack
        </span>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className="h-full w-full"
      style={{ maxWidth: viewBoxSize, maxHeight: viewBoxSize }}
    >
      <defs>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid background */}
      <g opacity={0.1}>
        {Array.from({ length: GRID_SIZE }).map((_, i) => (
          <g key={i}>
            <line
              x1={0}
              y1={i * (CELL_SIZE + GAP)}
              x2={viewBoxSize}
              y2={i * (CELL_SIZE + GAP)}
              stroke="white"
              strokeWidth={0.5}
            />
            <line
              x1={i * (CELL_SIZE + GAP)}
              y1={0}
              x2={i * (CELL_SIZE + GAP)}
              y2={viewBoxSize}
              stroke="white"
              strokeWidth={0.5}
            />
          </g>
        ))}
      </g>

      {/* Blocks */}
      <AnimatePresence>
        {blocksWithPositions.map(({ node, position }) => (
          <Block key={node.id} node={node} position={position} />
        ))}
      </AnimatePresence>
    </svg>
  );
}
