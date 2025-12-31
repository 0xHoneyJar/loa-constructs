/**
 * Skill Filters Component
 * @see sprint.md T6.3: Skill Browser - SkillFilters component
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SkillFilters {
  category: string | null;
  tier: string | null;
  tags: string[];
}

interface SkillFiltersProps {
  filters: SkillFilters;
  onFiltersChange: (filters: SkillFilters) => void;
  categories: string[];
  availableTags: string[];
  className?: string;
}

const tiers = ['free', 'pro', 'team', 'enterprise'];

export function SkillFiltersPanel({
  filters,
  onFiltersChange,
  categories,
  availableTags,
  className,
}: SkillFiltersProps) {
  const hasActiveFilters = filters.category || filters.tier || filters.tags.length > 0;

  const clearFilters = () => {
    onFiltersChange({ category: null, tier: null, tags: [] });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full justify-start">
          <X className="h-4 w-4 mr-2" />
          Clear all filters
        </Button>
      )}

      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Category</Label>
        <div className="space-y-1">
          <button
            onClick={() => onFiltersChange({ ...filters, category: null })}
            className={cn(
              'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
              !filters.category
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            )}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onFiltersChange({ ...filters, category })}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors capitalize',
                filters.category === category
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tier</Label>
        <div className="space-y-1">
          <button
            onClick={() => onFiltersChange({ ...filters, tier: null })}
            className={cn(
              'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
              !filters.tier
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            )}
          >
            All Tiers
          </button>
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => onFiltersChange({ ...filters, tier })}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors capitalize',
                filters.tier === tier
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
              )}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                'px-2 py-1 text-xs rounded-full border transition-colors',
                filters.tags.includes(tag)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile-friendly filter bar
export function SkillFiltersBar({
  filters,
  onFiltersChange,
  categories,
}: Omit<SkillFiltersProps, 'availableTags' | 'className'>) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.category || ''}
        onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || null })}
        className="h-9 px-3 text-sm border rounded-md bg-background"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={filters.tier || ''}
        onChange={(e) => onFiltersChange({ ...filters, tier: e.target.value || null })}
        className="h-9 px-3 text-sm border rounded-md bg-background capitalize"
      >
        <option value="">All Tiers</option>
        {tiers.map((tier) => (
          <option key={tier} value={tier} className="capitalize">
            {tier}
          </option>
        ))}
      </select>

      {(filters.category || filters.tier || filters.tags.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({ category: null, tier: null, tags: [] })}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
