'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { ConstructEdge } from '@/lib/types/graph';
import { getCategoryColor } from '@/lib/utils/colors';

interface GraphEdgeProps {
  edge: ConstructEdge;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  sourceCategory: string;
  isHighlighted: boolean;
}

export function GraphEdge({
  sourcePosition,
  targetPosition,
  sourceCategory,
  isHighlighted,
}: GraphEdgeProps) {
  const color = getCategoryColor(sourceCategory);

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
