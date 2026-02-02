'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWebGL } from '@/lib/hooks/use-webgl';
import { useGraphStore } from '@/lib/stores/graph-store';
import { GraphSkeleton } from './skeleton';
import { CategoryFilter } from './category-filter';
import { HoverTooltip } from './hover-tooltip';
import { GraphFallback } from './fallback';
import { StackComposerHud } from './stack-composer-hud';
import { CommandPalette } from '@/components/search/command-palette';
import type { GraphData } from '@/lib/types/graph';

// Dynamic import for R3F components to avoid SSR issues
const GraphCanvas = dynamic(
  () => import('./canvas').then((mod) => mod.GraphCanvas),
  { ssr: false }
);

const NetworkGraph = dynamic(
  () => import('./network-graph').then((mod) => mod.NetworkGraph),
  { ssr: false }
);

interface GraphExplorerProps {
  data: GraphData;
}

export function GraphExplorer({ data }: GraphExplorerProps) {
  const webglSupported = useWebGL();
  const setGraphData = useGraphStore((s) => s.setGraphData);

  // Initialize store with data
  useEffect(() => {
    setGraphData(data);
  }, [data, setGraphData]);

  // Use SVG fallback when WebGL is not supported
  if (!webglSupported) {
    return (
      <div className="relative flex h-full w-full flex-col">
        {/* Category filters */}
        <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] overflow-x-auto">
          <CategoryFilter categories={data.categories} />
        </div>

        {/* Stats */}
        <div className="absolute right-4 top-4 z-10 hidden items-center gap-4 font-mono text-xs text-white/40 sm:flex">
          <span>{data.meta.totalConstructs} constructs</span>
          <span>{data.meta.totalCommands} commands</span>
        </div>

        {/* SVG Fallback */}
        <div className="flex-1">
          <GraphFallback data={data} />
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-white/30">
          <span>Click to add to stack • <kbd className="rounded border border-border bg-surface px-1">⌘K</kbd> search</span>
        </div>

        {/* Stack Composer HUD */}
        <StackComposerHud nodes={data.nodes} />

        {/* Command Palette */}
        <CommandPalette nodes={data.nodes} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Category filters */}
      <div className="absolute left-4 top-4 z-10">
        <CategoryFilter categories={data.categories} />
      </div>

      {/* Stats */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-4 font-mono text-xs text-white/40">
        <span>{data.meta.totalConstructs} constructs</span>
        <span>{data.meta.totalCommands} commands</span>
      </div>

      {/* Graph canvas */}
      <div className="flex-1">
        <Suspense fallback={<GraphSkeleton />}>
          <GraphCanvas>
            <NetworkGraph data={data} />
          </GraphCanvas>
        </Suspense>
      </div>

      {/* Hover tooltip */}
      <HoverTooltip nodes={data.nodes} />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-white/30">
        <span>Scroll to zoom • Drag to pan • Click to add to stack • <kbd className="rounded border border-border bg-surface px-1">⌘K</kbd> search</span>
      </div>

      {/* Stack Composer HUD */}
      <StackComposerHud nodes={data.nodes} />

      {/* Command Palette */}
      <CommandPalette nodes={data.nodes} />
    </div>
  );
}
