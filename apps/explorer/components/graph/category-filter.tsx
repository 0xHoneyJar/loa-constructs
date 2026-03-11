'use client';

import { useGraphStore } from '@/lib/stores/graph-store';
import type { CategoryStats } from '@/lib/types/graph';

interface CategoryFilterProps {
  categories: CategoryStats[];
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const { activeCategories, toggleCategory, setAllCategories } = useGraphStore();
  const allActive = activeCategories.size === categories.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:overflow-visible sm:pb-0">
      <button
        type="button"
        onClick={() => setAllCategories(!allActive)}
        className="bg-void-raised/50 px-3 py-2 min-h-[44px] font-mono text-xs uppercase tracking-wider text-bone-dim transition-colors hover:bg-void-raised hover:text-bone-bright"
      >
        {allActive ? 'Clear' : 'All'}
      </button>

      {categories.map((category) => {
        const isActive = activeCategories.has(category.slug);
        const color = category.color;

        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => toggleCategory(category.slug)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] font-mono text-xs uppercase tracking-wider transition-all border ${
              isActive ? '' : 'border-transparent text-bone-muted'
            }`}
            style={isActive ? {
              backgroundColor: `${color}20`,
              color: color,
              borderColor: color,
            } : undefined}
          >
            <span
              className={`h-2 w-2 rounded-full ${isActive ? '' : 'bg-bone-ghost'}`}
              style={isActive ? { backgroundColor: color } : undefined}
            />
            <span className="whitespace-nowrap">{category.label}</span>
            <span className="hidden text-bone-ghost sm:inline">({category.count})</span>
          </button>
        );
      })}
    </div>
  );
}
