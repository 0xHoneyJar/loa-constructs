'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const {
    hoveredNodeId,
    selectedNodeId,
    activeDomains,
    searchResults,
    setHoveredNode,
  } = useGraphStore();

  // Filter nodes by active domains
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => activeDomains.has(node.domain));
  }, [data.nodes, activeDomains]);

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

    if (selectedNodeId) {
      ids.add(selectedNodeId);
    }

    // Add search results
    for (const id of searchResults) {
      ids.add(id);
    }

    return ids;
  }, [hoveredNodeId, selectedNodeId, searchResults, filteredEdges]);

  const handleNodeClick = (id: string) => {
    const node = nodeMap.get(id);
    if (node) {
      router.push(`/${node.slug}`);
    }
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
            sourceDomain={sourceNode.domain}
            isHighlighted={isHighlighted}
          />
        );
      })}

      {/* Render nodes */}
      {filteredNodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const isHovered = hoveredNodeId === node.id;
        const isSelected = selectedNodeId === node.id;
        const isSearchMatch = searchResults.includes(node.id);

        return (
          <GraphNode
            key={node.id}
            node={node}
            position={[pos.x, pos.y, 0]}
            isHovered={isHovered || isSearchMatch}
            isSelected={isSelected}
            onHover={setHoveredNode}
            onClick={handleNodeClick}
          />
        );
      })}
    </ThreeGroup>
  );
}
