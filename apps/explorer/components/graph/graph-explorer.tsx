'use client';

import { useEffect, useMemo } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';
import { setCategoryCache } from '@/lib/utils/colors';
import { CategoryFilter } from './category-filter';
import { HoverTooltip } from './hover-tooltip';
import { StackComposerHud } from './stack-composer-hud';
import { EdgeLegend } from './edge-legend';
import { TacticalGrid } from './tactical-grid';
import type { GraphData } from '@/lib/types/graph';

interface GraphExplorerProps {
  data: GraphData;
}

export function GraphExplorer({ data }: GraphExplorerProps) {
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
        <TacticalGrid data={data} />
      </div>

      <HoverTooltip nodes={data.nodes} />

      <div className="absolute bottom-4 left-4 z-10 space-y-1.5">
        <div className="hidden sm:block">
          <EdgeLegend />
        </div>
        <div className="font-mono text-xs text-bone-ghost">
          <span className="hidden sm:inline">
            Click to view • Shift+click to stack •{' '}
            <kbd className="border border-void-border bg-void-raised px-1">
              {modKey}K
            </kbd>{' '}
            search
          </span>
          <span className="sm:hidden">Tap to view • Long-press to stack</span>
        </div>
      </div>

      <StackComposerHud nodes={data.nodes} />
    </div>
  );
}
