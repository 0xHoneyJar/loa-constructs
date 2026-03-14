'use client';

import Link from 'next/link';
import { useGraphStore } from '@/lib/stores/graph-store';
import type { GraphData } from '@/lib/types/graph';

interface CanvasHudProps {
  data: GraphData;
}

export function CanvasHud({ data }: CanvasHudProps) {
  const { activeCategories, toggleCategory, setAllCategories } = useGraphStore();
  const allActive = activeCategories.size === data.categories.length;

  return (
    <>
      {/* Top-left: logo + back */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/"
          className="font-display text-lg uppercase tracking-display text-bone-dim hover:text-bone-bright transition-colors"
        >
          Constructs
        </Link>
      </div>

      {/* Top-right: meta */}
      <div className="fixed top-4 right-4 z-50 font-mono text-xs text-bone-ghost">
        {data.meta.totalConstructs} constructs · {data.meta.totalCommands} commands
      </div>

      {/* Bottom-left: category filter + legend + instructions */}
      <div className="fixed bottom-4 left-4 z-50 space-y-3 max-w-[calc(100vw-2rem)]">
        {/* Category filter — muted pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAllCategories(!allActive)}
            className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-bone-ghost hover:text-bone-dim transition-colors"
          >
            {allActive ? 'Clear' : 'All'}
          </button>
          {data.categories.map((cat) => {
            const isActive = activeCategories.has(cat.slug);
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors"
                style={{
                  color: isActive ? cat.color : 'oklch(0.35 0 0)',
                  opacity: isActive ? 0.7 : 0.4,
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="font-mono text-[10px] text-bone-ghost">
          Scroll to zoom · Drag to pan · Click to view
        </div>
      </div>
    </>
  );
}
