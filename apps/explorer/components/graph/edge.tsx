'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { ConstructEdge, Domain } from '@/lib/types/graph';

const DOMAIN_COLORS: Record<Domain, string> = {
  gtm: '#FF44FF',
  dev: '#44FF88',
  security: '#FF8844',
  analytics: '#FFDD44',
  docs: '#44DDFF',
  ops: '#4488FF',
};

interface GraphEdgeProps {
  edge: ConstructEdge;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  sourceDomain: Domain;
  isHighlighted: boolean;
}

export function GraphEdge({
  sourcePosition,
  targetPosition,
  sourceDomain,
  isHighlighted,
}: GraphEdgeProps) {
  const color = DOMAIN_COLORS[sourceDomain] || '#666666';

  const points = useMemo(() => {
    // Create a slight curve for visual interest
    const midX = (sourcePosition[0] + targetPosition[0]) / 2;
    const midY = (sourcePosition[1] + targetPosition[1]) / 2;
    const midZ = (sourcePosition[2] + targetPosition[2]) / 2 + 0.1;

    return [
      sourcePosition,
      [midX, midY, midZ] as [number, number, number],
      targetPosition,
    ];
  }, [sourcePosition, targetPosition]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isHighlighted ? 2 : 1}
      transparent
      opacity={isHighlighted ? 0.8 : 0.2}
    />
  );
}
