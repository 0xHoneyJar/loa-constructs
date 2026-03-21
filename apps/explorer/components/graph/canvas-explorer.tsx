'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ColorMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '@/lib/stores/graph-store';
import { setCategoryCache, getCategoryColor } from '@/lib/utils/colors';
import { ConstructTile } from './construct-tile';
import { CanvasHud } from './canvas-hud';
import { CanvasTooltip } from './canvas-tooltip';
import type { GraphData, ConstructNode, ConstructEdge } from '@/lib/types/graph';

/* ── Node types registration (must be stable reference) ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = { constructTile: ConstructTile };

/* ── Layout constants ── */
const SNAP_GRID: [number, number] = [80, 80];
const COLOR_MODE: ColorMode = 'dark';

const TILE_W = 160; // tile width + gap
const TILE_H = 120; // tile height + gap

/* ── Category territory grid ── */
// Each category gets a territory origin. Constructs fill a mini-grid within it.
// Laid out as a 4×2 territory grid, left-to-right, top-to-bottom.
// Order determines spatial position — intentional, not alphabetical.
const TERRITORY_ORDER = [
  'security',
  'development',
  'operations',
  'infrastructure',
  'design',
  'analytics',
  'marketing',
  'documentation',
];

const TERRITORY_COLS = 4;
const TERRITORY_GAP_X = TILE_W * 4; // horizontal space between territory origins
const TERRITORY_GAP_Y = TILE_H * 3; // vertical space between territory rows
const INNER_COLS = 3; // max constructs per row within a territory

function computeGridLayout(nodes: ConstructNode[]): Map<string, { x: number; y: number }> {
  // Group by category
  const groups = new Map<string, ConstructNode[]>();
  for (const node of nodes) {
    const cat = node.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(node);
  }

  // Sort within each group alphabetically
  for (const group of groups.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name));
  }

  const positions = new Map<string, { x: number; y: number }>();

  // Place each category in its territory
  for (const [cat, group] of groups) {
    let territoryIndex = TERRITORY_ORDER.indexOf(cat);
    if (territoryIndex === -1) territoryIndex = TERRITORY_ORDER.length; // unknown → end

    const tCol = territoryIndex % TERRITORY_COLS;
    const tRow = Math.floor(territoryIndex / TERRITORY_COLS);
    const originX = tCol * TERRITORY_GAP_X;
    const originY = tRow * TERRITORY_GAP_Y;

    // Place constructs in a mini-grid within the territory
    for (let i = 0; i < group.length; i++) {
      const col = i % INNER_COLS;
      const row = Math.floor(i / INNER_COLS);
      positions.set(group[i].id, {
        x: originX + col * TILE_W,
        y: originY + row * TILE_H,
      });
    }
  }

  return positions;
}

/* ── Edge styling ── */
const EDGE_COLORS: Record<string, string> = {
  depends_on: 'oklch(0.65 0.15 195)',
  composes_with: 'oklch(0.60 0.08 155)',
  connected_via: 'oklch(0.50 0.06 85)',
  governs: 'oklch(0.60 0.18 15)',
  contains: 'oklch(0.35 0 0)',
};

function buildEdgeStyle(relationship: string) {
  const color = EDGE_COLORS[relationship] ?? 'oklch(0.35 0 0)';
  const isDashed = relationship === 'governs' || relationship === 'connected_via';
  return {
    stroke: color,
    strokeWidth: relationship === 'governs' ? 1.5 : 1,
    strokeDasharray: isDashed ? '6 4' : undefined,
  };
}

/* ── Convert graph data to React Flow format ── */

function toFlowNodes(nodes: ConstructNode[]): Node[] {
  const layout = computeGridLayout(nodes);

  return nodes.map((node): Node => {
    const pos = layout.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      type: 'constructTile',
      position: { x: pos.x, y: pos.y },
      data: { ...node } as Record<string, unknown>,
    };
  });
}

function toFlowEdges(edges: ConstructEdge[]): Edge[] {
  return edges.map((edge): Edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: buildEdgeStyle(edge.relationship),
    animated: false,
  }));
}

/* ── Component ── */

interface CanvasExplorerProps {
  data: GraphData;
}

const POSITIONS_KEY = 'constructs-canvas-positions';

function savePositions(nodes: Node[]) {
  try {
    const map: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) map[n.id] = n.position;
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(map));
  } catch { /* quota exceeded or SSR — ignore */ }
}

function loadPositions(): Record<string, { x: number; y: number }> | null {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CanvasExplorer({ data }: CanvasExplorerProps) {
  const router = useRouter();
  const setGraphData = useGraphStore((s) => s.setGraphData);
  const setCategories = useGraphStore((s) => s.setCategories);
  const setHoveredNode = useGraphStore((s) => s.setHoveredNode);
  const activeCategories = useGraphStore((s) => s.activeCategories);

  // Initialize store
  useEffect(() => {
    setGraphData(data);
    setCategories(data.categories);
    setCategoryCache(data.categories);
  }, [data, setGraphData, setCategories]);

  // Build initial nodes — restore saved positions if available
  const initialNodes = useMemo(() => {
    const gridNodes = toFlowNodes(data.nodes);
    const saved = loadPositions();
    if (!saved) return gridNodes;

    return gridNodes.map((n) => {
      const pos = saved[n.id];
      return pos ? { ...n, position: pos } : n;
    });
  }, [data.nodes]);

  const initialEdges = useMemo(
    () => toFlowEdges(data.edges),
    [data.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Category filter → hide/show nodes and edges
  useEffect(() => {
    if (activeCategories.size === 0) return;
    setNodes((nds) =>
      nds.map((n) => {
        const cat = (n.data as Record<string, unknown>).category as string;
        return { ...n, hidden: !activeCategories.has(cat) };
      })
    );
    // Hide edges where either endpoint is hidden
    const visibleNodeIds = new Set(
      data.nodes
        .filter((n) => activeCategories.has(n.category))
        .map((n) => n.id)
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        hidden: !visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target),
      }))
    );
  }, [activeCategories, setNodes, setEdges, data.nodes]);

  // Persist positions after drag
  const onNodeDragStop: NodeMouseHandler = useCallback(
    () => {
      // Read current nodes from the state at save time
      setNodes((current) => {
        savePositions(current);
        return current;
      });
    },
    [setNodes]
  );

  // Click navigates to construct detail
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const slug = (node.data as Record<string, unknown>).slug as string;
      if (slug) router.push(`/constructs/${slug}`);
    },
    [router]
  );

  // Hover sets store for tooltip
  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => setHoveredNode(node.id),
    [setHoveredNode]
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(
    () => setHoveredNode(null),
    [setHoveredNode]
  );

  // MiniMap node color
  const miniMapNodeColor = useCallback(
    (node: Node) => {
      const cat = (node.data as Record<string, unknown>).category as string;
      return getCategoryColor(cat ?? 'development');
    },
    []
  );

  return (
    <div className="h-screen w-screen bg-void-base">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        colorMode={COLOR_MODE}
        snapToGrid
        snapGrid={SNAP_GRID}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.15}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false }}
        nodesDraggable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        className="!bg-void-base"
      >

        <Background
          id="minor"
          variant={BackgroundVariant.Lines}
          gap={80}
          color="oklch(0.18 0.005 240)"
          lineWidth={0.5}
        />

        <Background
          id="major"
          variant={BackgroundVariant.Lines}
          gap={320}
          color="oklch(0.25 0.01 240)"
          lineWidth={1}
        />


        <Controls
          showInteractive={false}
          className="!bg-void-raised !border-void-border !shadow-none [&>button]:!bg-void-raised [&>button]:!border-void-border [&>button]:!text-bone-ghost [&>button:hover]:!text-bone-dim"
        />

        <MiniMap
          nodeColor={miniMapNodeColor}
          nodeStrokeWidth={0}
          maskColor="oklch(0.06 0 0 / 0.8)"
          className="!bg-void-base !border-void-border"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Canvas HUD overlay */}
      <CanvasHud data={data} />
      <CanvasTooltip nodes={data.nodes} />
    </div>
  );
}
