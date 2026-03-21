'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useMemo, memo } from 'react';
import { SovereigntyTierBadge } from './sovereignty-tier-badge';

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-cyan-base';
  if (score >= 50) return 'text-graduation-beta';
  return 'text-crimson-base';
};

export const PulseStrip = memo(function PulseStrip() {
  const health = useQuery(api.healthObservations.current);
  const counts = useQuery(api.signals.statusCounts);
  const sovereignty = useQuery(api.signals.getSovereigntyState, {});

  const tierDistribution = useMemo(() => {
    if (!sovereignty || !Array.isArray(sovereignty)) {
      return { autonomous: 0, standard: 0, constrained: 0 };
    }
    const dist = { autonomous: 0, standard: 0, constrained: 0 };
    for (const state of sovereignty) {
      if (state.scope === 'global') continue;
      if (state.tier in dist) {
        dist[state.tier as keyof typeof dist]++;
      }
    }
    return dist;
  }, [sovereignty]);

  return (
    <div
      className="shrink-0 flex items-center gap-8 px-4 border-b border-void-border bg-void-base"
      style={{
        height: 'var(--obs-pulse-height)',
        fontVariantNumeric: 'tabular-nums',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Health Score */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
          Health
        </span>
        {health ? (
          <div className="flex items-baseline gap-1">
            <span
              className={`font-mono text-[20px] font-semibold leading-none ${scoreColor(health.healthScore)}`}
            >
              {health.healthScore}
            </span>
            {health.healthDelta !== 0 && (
              <span
                className={`font-mono text-[10px] ${
                  health.healthDelta > 0
                    ? 'text-node-green'
                    : 'text-crimson-base'
                }`}
              >
                {health.healthDelta > 0 ? '+' : ''}
                {health.healthDelta}
              </span>
            )}
          </div>
        ) : (
          <div className="w-8 h-5 bg-void-raised animate-pulse" />
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-void-border" />

      {/* Active Incidents */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
          Critical
        </span>
        {counts ? (
          <span
            className={`font-mono text-[14px] font-semibold ${
              counts.totalCritical > 0 ? 'text-crimson-base' : 'text-bone-ghost'
            }`}
          >
            {counts.totalCritical}
          </span>
        ) : (
          <div className="w-4 h-4 bg-void-raised animate-pulse" />
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-void-border" />

      {/* New Signals */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
          New
        </span>
        {counts ? (
          <span
            className={`font-mono text-[14px] font-semibold ${
              counts.totalNew > 0 ? 'text-cyan-base' : 'text-bone-ghost'
            }`}
          >
            {counts.totalNew}
          </span>
        ) : (
          <div className="w-4 h-4 bg-void-raised animate-pulse" />
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-void-border" />

      {/* Sovereignty Distribution */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
          Sovereignty
        </span>
        <div className="flex items-center gap-2">
          <SovereigntyTierBadge tier="autonomous" count={tierDistribution.autonomous} compact />
          <SovereigntyTierBadge tier="standard" count={tierDistribution.standard} compact />
          <SovereigntyTierBadge tier="constrained" count={tierDistribution.constrained} compact />
        </div>
      </div>
    </div>
  );
});
