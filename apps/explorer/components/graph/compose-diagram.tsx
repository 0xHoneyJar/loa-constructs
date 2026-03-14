'use client';

import { memo, useMemo } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type ColorMode,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConstructTile } from './construct-tile';
import type { ConstructNode } from '@/lib/types/graph';

/** Ghost node — a redaction bar. No visible handles. The network extends. */
const GhostNode = memo(function GhostNode(props: NodeProps) {
  const w = (props.data as { w?: number })?.w ?? 64;
  return (
    <>
      {/* @ts-expect-error React 19 type mismatch */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      {/* @ts-expect-error React 19 type mismatch */}
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div style={{ width: w, height: 40, backgroundColor: 'oklch(0.12 0.005 250)' }} />
    </>
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { constructTile: ConstructTile, ghost: GhostNode };
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

    // Ghost nodes — redaction bars, the network extends beyond what's shown
    flowNodes.push({
      id: 'ghost-1',
      type: 'ghost',
      position: { x: 600, y: 40 },
      data: { w: 72 },
      draggable: false,
      selectable: false,
    });
    flowNodes.push({
      id: 'ghost-2',
      type: 'ghost',
      position: { x: 540, y: 180 },
      data: { w: 52 },
      draggable: false,
      selectable: false,
    });

    const flowEdges: Edge[] = [
      { id: 'e-art-obs', source: 'artisan', target: 'observer', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-obs-cru', source: 'observer', target: 'crucible', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-kh-mc', source: 'k-hole', target: 'mibera-codex', type: 'smoothstep', style: { stroke: 'oklch(0.65 0.12 195)', strokeWidth: 1 } },
      { id: 'e-obs-kh', source: 'observer', target: 'k-hole', type: 'smoothstep', style: { stroke: 'oklch(0.30 0.04 195)', strokeWidth: 1 } },
      // Ghost edges — dashed, trailing off into the network
      { id: 'e-cru-g1', source: 'crucible', target: 'ghost-1', type: 'smoothstep', style: { stroke: 'oklch(0.15 0.02 250)', strokeWidth: 1, strokeDasharray: '4 6' } },
      { id: 'e-mc-g2', source: 'mibera-codex', target: 'ghost-2', type: 'smoothstep', style: { stroke: 'oklch(0.15 0.02 250)', strokeWidth: 1, strokeDasharray: '4 6' } },
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
