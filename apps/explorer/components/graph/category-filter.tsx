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
        className="rounded-md bg-surface/50 px-2 py-1 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:bg-surface hover:text-white"
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
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              backgroundColor: isActive ? `${color}20` : 'transparent',
              color: isActive ? color : '#ffffff60',
              borderWidth: 1,
              borderColor: isActive ? color : 'transparent',
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: isActive ? color : '#ffffff30',
              }}
            />
            <span className="whitespace-nowrap">{category.label}</span>
            <span className="hidden text-white/40 sm:inline">({category.count})</span>
          </button>
        );
      })}
    </div>
  );
}
