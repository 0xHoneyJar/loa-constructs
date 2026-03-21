'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useObservatoryStore, type TimeRange } from '@/lib/stores/observatory-store';
import { useRef, useEffect } from 'react';

const severityOptions = [
  { value: 'critical', label: 'Critical', dotClass: 'bg-crimson-base' },
  { value: 'high', label: 'High', dotClass: 'bg-[var(--color-severity-high)]' },
  { value: 'medium', label: 'Medium', dotClass: 'bg-[var(--color-severity-medium)]' },
  { value: 'low', label: 'Low', dotClass: 'bg-cyan-base' },
] as const;

const statusOptions = [
  { value: 'new', label: 'New', dotClass: 'bg-cyan-base' },
  { value: 'triaged', label: 'Triaged', dotClass: 'bg-[var(--color-severity-medium)]' },
  { value: 'escalated', label: 'Escalated', dotClass: 'bg-crimson-base' },
] as const;

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export function ObservatoryFilters() {
  const { filters, setFilter, focusZone, setFocusZone } = useObservatoryStore();
  const sovereignty = useQuery(api.signals.getSovereigntyState, {});
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Focus the filter bar when focusZone changes to 'filters'
  useEffect(() => {
    if (focusZone === 'filters' && filterBarRef.current) {
      const firstButton = filterBarRef.current.querySelector('button, select');
      (firstButton as HTMLElement)?.focus();
    }
  }, [focusZone]);

  const appSlugs = Array.isArray(sovereignty)
    ? sovereignty.filter((s) => s.scope !== 'global').map((s) => s.scope)
    : [];

  return (
    <div
      ref={filterBarRef}
      className="shrink-0 flex items-center gap-4 px-4 py-2 border-b border-void-border bg-void-base"
      onFocus={() => setFocusZone('filters')}
    >
      {/* App Filter */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[8px] text-bone-ghost uppercase tracking-widest">
          App
        </span>
        <select
          value={filters.appSlug ?? ''}
          onChange={(e) => setFilter('appSlug', e.target.value || null)}
          className="bg-void-raised border border-void-border font-mono text-[10px] text-bone-dim px-2 py-1 focus:outline-none focus:border-cyan-dim"
        >
          <option value="">All</option>
          {appSlugs.map((slug) => (
            <option key={slug} value={slug}>{slug}</option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-void-border" />

      {/* Severity Filter */}
      <div className="flex items-center gap-1">
        {severityOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              setFilter('severity', filters.severity === opt.value ? null : opt.value)
            }
            className={`flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-terminal transition-colors border ${
              filters.severity === opt.value
                ? 'border-void-border bg-void-raised text-bone-base'
                : 'border-transparent text-bone-ghost hover:text-bone-muted'
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 ${opt.dotClass}`} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-void-border" />

      {/* Status Filter */}
      <div className="flex items-center gap-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              setFilter('status', filters.status === opt.value ? null : opt.value)
            }
            className={`flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-terminal transition-colors border ${
              filters.status === opt.value
                ? 'border-void-border bg-void-raised text-bone-base'
                : 'border-transparent text-bone-ghost hover:text-bone-muted'
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 ${opt.dotClass}`} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-void-border" />

      {/* Time Range */}
      <div className="flex items-center gap-0.5">
        {timeRangeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              setFilter('timeRange', filters.timeRange === opt.value ? null : opt.value)
            }
            className={`px-1.5 py-0.5 font-mono text-[9px] tracking-terminal transition-colors border ${
              filters.timeRange === opt.value
                ? 'border-void-border bg-void-raised text-bone-base'
                : 'border-transparent text-bone-ghost hover:text-bone-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
