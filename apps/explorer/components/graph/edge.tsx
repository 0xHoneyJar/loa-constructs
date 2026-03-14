'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { ConstructEdge, EdgeRelationship } from '@/lib/types/graph';
import { getCategoryColor } from '@/lib/utils/colors';

/** Edge styling by relationship type (cycle-051) */
const EDGE_STYLES: Record<EdgeRelationship, { color: string; opacity: number; highlightOpacity: number }> = {
  contains: { color: '#888888', opacity: 0.2, highlightOpacity: 0.6 },
  depends_on: { color: '#4ecdc4', opacity: 0.3, highlightOpacity: 0.8 },
  composes_with: { color: '#a8e6cf', opacity: 0.25, highlightOpacity: 0.7 },
  connected_via: { color: '#ffd93d', opacity: 0.2, highlightOpacity: 0.6 },
  governs: { color: '#ff6b6b', opacity: 0.3, highlightOpacity: 0.8 },
};

interface GraphEdgeProps {
  edge: ConstructEdge;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  sourceCategory: string;
  isHighlighted: boolean;
}

export function GraphEdge({
  edge,
  sourcePosition,
  targetPosition,
  sourceCategory,
  isHighlighted,
}: GraphEdgeProps) {
  const style = EDGE_STYLES[edge.relationship];
  // Use relationship-specific color for new edge types, category color for legacy
  const color = (edge.relationship === 'connected_via' || edge.relationship === 'governs')
    ? style.color
    : getCategoryColor(sourceCategory);

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

  // Governance edges are slightly thicker to convey authority
  const baseWidth = edge.relationship === 'governs' ? 1.5 : 1;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isHighlighted ? baseWidth + 1 : baseWidth}
      transparent
      opacity={isHighlighted ? style.highlightOpacity : style.opacity}
      // Dashed rendering for governance and connected_via edges
      dashed={edge.relationship === 'governs' || edge.relationship === 'connected_via'}
      dashScale={edge.relationship === 'governs' ? 8 : 12}
      dashSize={edge.relationship === 'governs' ? 0.3 : 0.2}
      gapSize={edge.relationship === 'governs' ? 0.15 : 0.1}
    />
  );
}
