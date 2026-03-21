'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useMemo } from 'react';

interface OverrideRateChartProps {
  appSlug?: string;
}

export function OverrideRateChart({ appSlug }: OverrideRateChartProps) {
  const overrides = useQuery(api.signals.getOverrides, {
    appSlug,
    limit: 100,
  });

  const weeklyBuckets = useMemo(() => {
    if (!overrides || overrides.length === 0) return [];

    // Group overrides by week
    const buckets = new Map<string, number>();
    for (const override of overrides) {
      const date = new Date(override.timestamp);
      // ISO week start (Monday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const key = weekStart.toISOString().substring(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8) // Last 8 weeks
      .map(([week, count]) => ({ week, count }));
  }, [overrides]);

  if (overrides === undefined) {
    return <div className="h-12 animate-pulse bg-void-raised" />;
  }

  if (weeklyBuckets.length === 0) {
    return (
      <div className="font-mono text-[9px] text-bone-ghost">
        No overrides recorded
      </div>
    );
  }

  const maxCount = Math.max(...weeklyBuckets.map((b) => b.count));

  return (
    <div className="space-y-1">
      <div className="font-mono text-[8px] text-bone-ghost uppercase tracking-widest">
        Override Frequency (weekly)
      </div>
      <div className="flex items-end gap-1 h-10">
        {weeklyBuckets.map((bucket) => {
          const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          const color =
            bucket.count === 0
              ? 'bg-void-raised'
              : bucket.count <= 2
                ? 'bg-node-green'
                : bucket.count <= 5
                  ? 'bg-[var(--color-severity-medium)]'
                  : 'bg-crimson-base';
          return (
            <div
              key={bucket.week}
              className="flex-1 flex flex-col items-center gap-0.5"
              title={`${bucket.week}: ${bucket.count} overrides`}
            >
              <div
                className={`w-full ${color} transition-all`}
                style={{
                  height: `${Math.max(height, 4)}%`,
                  minHeight: '2px',
                }}
              />
              <span className="font-mono text-[6px] text-bone-ghost">
                {bucket.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
