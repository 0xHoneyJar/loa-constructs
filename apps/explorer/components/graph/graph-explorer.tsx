'use client';

import { Suspense, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useWebGL } from '@/lib/hooks/use-webgl';
import { useGraphStore } from '@/lib/stores/graph-store';
import { setCategoryCache } from '@/lib/utils/colors';
import { GraphSkeleton } from './skeleton';
import { CategoryFilter } from './category-filter';
import { HoverTooltip } from './hover-tooltip';
import { GraphFallback } from './fallback';
import { StackComposerHud } from './stack-composer-hud';
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
  const setCategories = useGraphStore((s) => s.setCategories);

  // OS-aware modifier key
  const modKey = useMemo(() => {
    if (typeof navigator === 'undefined') return '⌘';
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl+';
  }, []);

  // Initialize store with data + categories + color cache
  useEffect(() => {
    setGraphData(data);
    setCategories(data.categories);
    setCategoryCache(data.categories);
  }, [data, setGraphData, setCategories]);

  // Loading state while WebGL detection runs
  if (webglSupported === null) {
    return (
      <div className="relative flex h-full w-full flex-col">
        <GraphSkeleton />
      </div>
    );
  }

  // Use SVG fallback when WebGL is not supported
  if (!webglSupported) {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] overflow-x-auto">
          <CategoryFilter categories={data.categories} />
        </div>

        <div className="absolute right-4 top-4 z-10 hidden items-center gap-4 font-mono text-xs text-bone-ghost sm:flex">
          <span>{data.meta.totalConstructs} constructs</span>
          <span>{data.meta.totalCommands} commands</span>
        </div>

        <div className="flex-1">
          <GraphFallback data={data} />
        </div>

        <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-bone-ghost">
          <span>Click to view • <kbd className="border border-void-border bg-void-raised px-1">{modKey}K</kbd> search</span>
        </div>

        <StackComposerHud nodes={data.nodes} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] overflow-x-auto">
        <CategoryFilter categories={data.categories} />
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-4 font-mono text-xs text-bone-ghost">
        <span>{data.meta.totalConstructs} constructs</span>
        <span>{data.meta.totalCommands} commands</span>
      </div>

      <div className="flex-1">
        <Suspense fallback={<GraphSkeleton />}>
          <GraphCanvas>
            <NetworkGraph data={data} />
          </GraphCanvas>
        </Suspense>
      </div>

      <HoverTooltip nodes={data.nodes} />

      <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-bone-ghost">
        <span className="hidden sm:inline">Scroll to zoom • Drag to pan • Click to add to stack • <kbd className="border border-void-border bg-void-raised px-1">{modKey}K</kbd> search</span>
        <span className="sm:hidden">Pinch to zoom • Drag to pan • Tap to add to stack</span>
      </div>

      <StackComposerHud nodes={data.nodes} />
    </div>
  );
}
