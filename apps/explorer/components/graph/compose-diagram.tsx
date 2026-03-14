'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  type ColorMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConstructTile } from './construct-tile';
import type { ConstructNode } from '@/lib/types/graph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { constructTile: ConstructTile };
const COLOR_MODE: ColorMode = 'dark';

/**
 * ComposeDiagram — a read-only React Flow graph for the about page.
 * Shows a handful of constructs and their composition edges.
 * No controls, no minimap, no interaction — just a visual.
 */
export function ComposeDiagram({ constructs }: { constructs: ConstructNode[] }) {
  const { nodes, edges } = useMemo(() => {
    // Position a subset of constructs in a loose organic layout
    const slugPositions: Record<string, { x: number; y: number }> = {
      artisan: { x: 40, y: 20 },
      observer: { x: 280, y: 10 },
      crucible: { x: 480, y: 80 },
      'k-hole': { x: 120, y: 150 },
      'mibera-codex': { x: 360, y: 160 },
    };

    const showSlugs = Object.keys(slugPositions);
    const constructMap = new Map(constructs.map(c => [c.slug, c]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flowNodes: any[] = showSlugs
      .filter(slug => constructMap.has(slug))
      .map(slug => ({
        id: slug,
        type: 'constructTile',
        position: slugPositions[slug],
        data: constructMap.get(slug)!,
        draggable: false,
        selectable: false,
      }));

    // Ghost nodes — redacted constructs, the network extends
    // No ghost nodes — the void around the real nodes IS the ghost.

    const flowEdges: Edge[] = [
      { id: 'e-art-obs', source: 'artisan', target: 'observer', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-obs-cru', source: 'observer', target: 'crucible', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-kh-mc', source: 'k-hole', target: 'mibera-codex', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-obs-kh', source: 'observer', target: 'k-hole', type: 'smoothstep', style: { stroke: 'oklch(0.30 0.04 195)', strokeWidth: 1 } },
    ];

    return { nodes: flowNodes, edges: flowEdges };
  }, [constructs]);

  return (
    <div className="border border-void-border" style={{ height: 280 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={COLOR_MODE}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        preventScrolling={false}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
