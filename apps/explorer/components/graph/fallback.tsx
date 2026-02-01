'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useGraphStore } from '@/lib/stores/graph-store';
import { computeLayout, scalePositions } from '@/lib/data/compute-layout';
import { Badge } from '@/components/ui/badge';
import type { GraphData, Domain } from '@/lib/types/graph';

const DOMAIN_COLORS: Record<Domain, string> = {
  gtm: '#FF44FF',
  dev: '#44FF88',
  security: '#FF8844',
  analytics: '#FFDD44',
  docs: '#44DDFF',
  ops: '#4488FF',
};

interface GraphFallbackProps {
  data: GraphData;
}

export function GraphFallback({ data }: GraphFallbackProps) {
  const { activeDomains, searchResults } = useGraphStore();

  // Filter nodes by active domains
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => activeDomains.has(node.domain));
  }, [data.nodes, activeDomains]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
    );
  }, [data.edges, filteredNodes]);

  // Compute positions (scaled for SVG viewBox)
  const positions = useMemo(() => {
    const layout = computeLayout(filteredNodes, filteredEdges);
    return scalePositions(layout, 1); // No scaling for SVG
  }, [filteredNodes, filteredEdges]);

  // Create node lookup
  const nodeMap = useMemo(() => {
    return new Map(filteredNodes.map((n) => [n.id, n]));
  }, [filteredNodes]);

  const viewBox = '-350 -250 700 500';

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <svg
        viewBox={viewBox}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        <g className="edges">
          {filteredEdges.map((edge) => {
            const sourcePos = positions.get(edge.source);
            const targetPos = positions.get(edge.target);
            const sourceNode = nodeMap.get(edge.source);

            if (!sourcePos || !targetPos || !sourceNode) return null;

            const color = DOMAIN_COLORS[sourceNode.domain];
            const isHighlighted =
              searchResults.includes(edge.source) ||
              searchResults.includes(edge.target);

            return (
              <line
                key={edge.id}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke={color}
                strokeWidth={isHighlighted ? 1.5 : 0.5}
                strokeOpacity={isHighlighted ? 0.6 : 0.15}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {filteredNodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const color = DOMAIN_COLORS[node.domain];
            const isHighlighted = searchResults.includes(node.id);
            const radius = node.type === 'pack' ? 12 : node.type === 'bundle' ? 14 : 8;

            return (
              <Link key={node.id} href={`/${node.slug}`}>
                <g
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                >
                  {/* Glow */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 4}
                    fill={color}
                    fillOpacity={isHighlighted ? 0.3 : 0.1}
                  />
                  {/* Node */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={color}
                    fillOpacity={isHighlighted ? 1 : 0.8}
                  />
                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y + radius + 14}
                    textAnchor="middle"
                    className="fill-white/60 font-mono text-[8px] uppercase"
                  >
                    {node.name}
                  </text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 rounded-md border border-border bg-surface/80 p-3 backdrop-blur-sm">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
          Legend
        </div>
        <div className="flex flex-wrap gap-2">
          {data.domains.map((domain) => (
            <Badge key={domain.id} variant={domain.id as Domain} className="text-[10px]">
              {domain.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
