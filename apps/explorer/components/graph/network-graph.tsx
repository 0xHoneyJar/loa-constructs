'use client';

import { useMemo } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';
import { computeLayout, scalePositions } from '@/lib/data/compute-layout';
import { GraphNode } from './node';
import { GraphEdge } from './edge';
import { ThreeGroup } from './three-primitives';
import type { GraphData } from '@/lib/types/graph';

interface NetworkGraphProps {
  data: GraphData;
}

export function NetworkGraph({ data }: NetworkGraphProps) {
  const {
    hoveredNodeId,
    stackNodeIds,
    activeCategories,
    searchResults,
    setHoveredNode,
    toggleStackNode,
  } = useGraphStore();

  // Filter nodes by active categories
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => activeCategories.has(node.category));
  }, [data.nodes, activeCategories]);

  // Filter edges to only include those between visible nodes
  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
    );
  }, [data.edges, filteredNodes]);

  // Compute layout positions
  const positions = useMemo(() => {
    const layout = computeLayout(filteredNodes, filteredEdges);
    return scalePositions(layout);
  }, [filteredNodes, filteredEdges]);

  // Create node lookup for edges
  const nodeMap = useMemo(() => {
    return new Map(filteredNodes.map((n) => [n.id, n]));
  }, [filteredNodes]);

  // Determine which nodes/edges are highlighted
  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>();

    if (hoveredNodeId) {
      ids.add(hoveredNodeId);
      // Add connected nodes
      for (const edge of filteredEdges) {
        if (edge.source === hoveredNodeId) ids.add(edge.target);
        if (edge.target === hoveredNodeId) ids.add(edge.source);
      }
    }

    // Add stack nodes
    for (const id of stackNodeIds) {
      ids.add(id);
    }

    // Add search results
    for (const id of searchResults) {
      ids.add(id);
    }

    return ids;
  }, [hoveredNodeId, stackNodeIds, searchResults, filteredEdges]);

  const handleNodeClick = (id: string) => {
    toggleStackNode(id);
  };

  return (
    <ThreeGroup>
      {/* Render edges first (behind nodes) */}
      {filteredEdges.map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);
        const sourceNode = nodeMap.get(edge.source);

        if (!sourcePos || !targetPos || !sourceNode) return null;

        const isHighlighted =
          highlightedNodeIds.has(edge.source) ||
          highlightedNodeIds.has(edge.target);

        return (
          <GraphEdge
            key={edge.id}
            edge={edge}
            sourcePosition={[sourcePos.x, sourcePos.y, 0]}
            targetPosition={[targetPos.x, targetPos.y, 0]}
            sourceCategory={sourceNode.category}
            isHighlighted={isHighlighted}
          />
        );
      })}

      {/* Render nodes */}
      {filteredNodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const isHovered = hoveredNodeId === node.id;
        const isInStack = stackNodeIds.has(node.id);
        const isSearchMatch = searchResults.includes(node.id);
        const hasStackItems = stackNodeIds.size > 0;

        return (
          <GraphNode
            key={node.id}
            node={node}
            position={[pos.x, pos.y, 0]}
            isHovered={isHovered || isSearchMatch}
            isSelected={isInStack}
            hasStackItems={hasStackItems}
            onHover={setHoveredNode}
            onClick={handleNodeClick}
          />
        );
      })}
    </ThreeGroup>
  );
}
