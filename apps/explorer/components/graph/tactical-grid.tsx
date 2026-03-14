'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/lib/stores/graph-store';
import { computeLayout } from '@/lib/data/compute-layout';
import { getCategoryColor } from '@/lib/utils/colors';
import type { GraphData } from '@/lib/types/graph';

/* ── Grid constants ── */
const GRID = 80;
const TILE = 52;
const VB_W = 960;
const VB_H = 720;
const HALF_W = VB_W / 2;
const HALF_H = VB_H / 2;

interface Vec2 {
  x: number;
  y: number;
}

/** Snap a position to the nearest grid intersection */
function snap(v: Vec2): Vec2 {
  return {
    x: Math.round(v.x / GRID) * GRID,
    y: Math.round(v.y / GRID) * GRID,
  };
}

/** Resolve collisions: if two nodes snap to the same cell, spiral outward */
function resolveCollisions(positions: Map<string, Vec2>): void {
  const occupied = new Map<string, string>();
  const spiralOffsets: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [2, 0],
    [0, 2],
    [-2, 0],
    [0, -2],
    [2, 1],
    [1, 2],
    [-1, 2],
    [-2, 1],
  ];

  for (const [id, pos] of positions) {
    const key = `${pos.x},${pos.y}`;
    if (occupied.has(key)) {
      for (const [dx, dy] of spiralOffsets) {
        const nx = pos.x + dx * GRID;
        const ny = pos.y + dy * GRID;
        const nk = `${nx},${ny}`;
        if (!occupied.has(nk)) {
          pos.x = nx;
          pos.y = ny;
          occupied.set(nk, id);
          break;
        }
      }
    } else {
      occupied.set(key, id);
    }
  }
}

/* ── Component ── */

interface TacticalGridProps {
  data: GraphData;
}

export function TacticalGrid({ data }: TacticalGridProps) {
  const router = useRouter();
  const activeCategories = useGraphStore((s) => s.activeCategories);
  const searchResults = useGraphStore((s) => s.searchResults);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const setHoveredNode = useGraphStore((s) => s.setHoveredNode);
  const toggleStackNode = useGraphStore((s) => s.toggleStackNode);
  const stackNodeIds = useGraphStore((s) => s.stackNodeIds);

  /* ── Filter by active categories ── */
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((n) => activeCategories.has(n.category));
  }, [data.nodes, activeCategories]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter(
      (e) => ids.has(e.source) && ids.has(e.target)
    );
  }, [data.edges, filteredNodes]);

  /* ── Layout: force-directed → normalize to bounds → grid-snap → collision resolve ── */
  const positions = useMemo(() => {
    const raw = computeLayout(filteredNodes, filteredEdges);
    if (raw.size === 0) return new Map<string, Vec2>();

    // Compute actual bounds of force layout
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pos of raw.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Fit into viewBox with padding for labels + tiles
    const padX = HALF_W - GRID * 2.5;
    const padY = HALF_H - GRID * 2.5;
    const scale = Math.min((padX * 2) / rangeX, (padY * 2) / rangeY);

    const snapped = new Map<string, Vec2>();
    for (const [id, pos] of raw) {
      const mapped: Vec2 = {
        x: (pos.x - centerX) * scale,
        y: (pos.y - centerY) * scale,
      };
      snapped.set(id, snap(mapped));
    }

    resolveCollisions(snapped);

    // Clamp to viewBox bounds (with room for tile + label)
    const clampX = HALF_W - TILE;
    const clampY = HALF_H - TILE - 16;
    for (const pos of snapped.values()) {
      pos.x = Math.max(-clampX, Math.min(clampX, pos.x));
      pos.y = Math.max(-clampY, Math.min(clampY, pos.y));
    }

    return snapped;
  }, [filteredNodes, filteredEdges]);

  const nodeMap = useMemo(() => {
    return new Map(filteredNodes.map((n) => [n.id, n]));
  }, [filteredNodes]);

  /* ── Category sector labels — centroid of each category cluster ── */
  const categoryLabels = useMemo(() => {
    const clusters = new Map<string, Vec2[]>();
    for (const node of filteredNodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      if (!clusters.has(node.category)) clusters.set(node.category, []);
      clusters.get(node.category)!.push(pos);
    }

    const labels: Array<{ category: string; x: number; y: number; color: string }> = [];
    for (const [cat, points] of clusters) {
      if (points.length === 0) continue;
      const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
      // Place label above the topmost node in the cluster
      const minY = Math.min(...points.map((p) => p.y));
      labels.push({
        category: cat,
        x: cx,
        y: minY - TILE / 2 - 28,
        color: getCategoryColor(cat),
      });
    }
    return labels;
  }, [filteredNodes, positions]);

  const handleClick = useCallback(
    (slug: string, nodeId: string, e: React.MouseEvent) => {
      if (e.shiftKey) {
        toggleStackNode(nodeId);
      } else {
        router.push(`/constructs/${slug}`);
      }
    },
    [toggleStackNode, router]
  );

  const half = TILE / 2;

  return (
    <div className="relative h-full w-full overflow-hidden bg-void-base">
      <svg
        viewBox={`${-HALF_W} ${-HALF_H} ${VB_W} ${VB_H}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Minor grid — every 80px */}
          <pattern
            id="tac-minor"
            width={GRID}
            height={GRID}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={GRID}
              y1={0}
              x2={GRID}
              y2={GRID}
              stroke="oklch(0.22 0.008 240)"
              strokeWidth="0.5"
            />
            <line
              x1={0}
              y1={GRID}
              x2={GRID}
              y2={GRID}
              stroke="oklch(0.22 0.008 240)"
              strokeWidth="0.5"
            />
          </pattern>

          {/* Major grid — every 4 cells (320px) */}
          <pattern
            id="tac-major"
            width={GRID * 4}
            height={GRID * 4}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={GRID * 4}
              height={GRID * 4}
              fill="url(#tac-minor)"
            />
            <line
              x1={GRID * 4}
              y1={0}
              x2={GRID * 4}
              y2={GRID * 4}
              stroke="oklch(0.28 0.012 240)"
              strokeWidth="1"
            />
            <line
              x1={0}
              y1={GRID * 4}
              x2={GRID * 4}
              y2={GRID * 4}
              stroke="oklch(0.28 0.012 240)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect
          x={-HALF_W}
          y={-HALF_H}
          width={VB_W}
          height={VB_H}
          fill="url(#tac-major)"
        />

        {/* Origin cross-hairs */}
        <line
          x1={-HALF_W}
          y1={0}
          x2={HALF_W}
          y2={0}
          stroke="oklch(0.30 0.015 240)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
        />
        <line
          x1={0}
          y1={-HALF_H}
          x2={0}
          y2={HALF_H}
          stroke="oklch(0.30 0.015 240)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
        />

        {/* ── Edges ── */}
        <g>
          {filteredEdges.map((edge) => {
            const sp = positions.get(edge.source);
            const tp = positions.get(edge.target);
            if (!sp || !tp) return null;

            const srcNode = nodeMap.get(edge.source);
            const isHovered =
              hoveredNodeId === edge.source || hoveredNodeId === edge.target;
            const isSearchHit =
              searchResults.includes(edge.source) ||
              searchResults.includes(edge.target);
            const color = srcNode
              ? getCategoryColor(srcNode.category)
              : 'oklch(0.5 0 0)';
            const isDashed =
              edge.relationship === 'governs' ||
              edge.relationship === 'connected_via';

            return (
              <line
                key={edge.id}
                x1={sp.x}
                y1={sp.y}
                x2={tp.x}
                y2={tp.y}
                stroke={color}
                strokeWidth={isHovered ? 1.5 : 0.5}
                strokeOpacity={
                  isHovered ? 0.7 : isSearchHit ? 0.4 : 0.2
                }
                strokeDasharray={isDashed ? '4 3' : undefined}
                className="transition-[stroke-opacity] duration-150"
              />
            );
          })}
        </g>

        {/* ── Category sector labels ── */}
        <g>
          {categoryLabels.map((label) => (
            <text
              key={label.category}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              fill={label.color}
              fillOpacity={0.35}
              fontSize={7}
              fontFamily="var(--font-mono)"
              letterSpacing="0.12em"
              className="select-none uppercase"
            >
              {label.category}
            </text>
          ))}
        </g>

        {/* ── Nodes ── */}
        <g>
          {filteredNodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const color = getCategoryColor(node.category);
            const isHovered = hoveredNodeId === node.id;
            const isSearchHit = searchResults.includes(node.id);
            const isInStack = stackNodeIds.has(node.id);
            const isActive = isHovered || isSearchHit || isInStack;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => handleClick(node.slug, node.id, e)}
                role="link"
                tabIndex={0}
                aria-label={`${node.name} — ${node.description}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') router.push(`/constructs/${node.slug}`);
                }}
              >
                {/* Tile */}
                <rect
                  x={pos.x - half}
                  y={pos.y - half}
                  width={TILE}
                  height={TILE}
                  fill={color}
                  fillOpacity={isHovered ? 0.35 : isActive ? 0.2 : 0.12}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1.5}
                  strokeOpacity={isHovered ? 1 : isActive ? 0.7 : 0.55}
                  className="transition-all duration-150"
                />

                {/* Center mark */}
                <rect
                  x={pos.x - 3}
                  y={pos.y - 3}
                  width={6}
                  height={6}
                  fill={color}
                  fillOpacity={isActive ? 1 : 0.8}
                  className="transition-[fill-opacity] duration-150"
                />

                {/* Stack indicator — corner tick */}
                {isInStack && (
                  <rect
                    x={pos.x + half - 8}
                    y={pos.y - half}
                    width={8}
                    height={3}
                    fill={color}
                    fillOpacity={0.9}
                  />
                )}

                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + half + 13}
                  textAnchor="middle"
                  fill={isHovered ? 'oklch(0.92 0 0)' : 'oklch(0.52 0 0)'}
                  fontSize={8}
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.06em"
                  className="transition-[fill] duration-150 select-none uppercase"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Scanline overlay — static, very subtle */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.08 0 0 / 0.06) 2px, oklch(0.08 0 0 / 0.06) 4px)',
        }}
      />
    </div>
  );
}
