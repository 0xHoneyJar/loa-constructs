'use client';

import { memo } from 'react';

type Tier = 'autonomous' | 'standard' | 'constrained';

interface SovereigntyTierBadgeProps {
  tier: Tier;
  count?: number;
  compact?: boolean;
}

const tierConfig: Record<Tier, { color: string; bars: number; label: string }> = {
  autonomous: {
    color: 'var(--color-tier-autonomous)',
    bars: 3,
    label: 'Autonomous',
  },
  standard: {
    color: 'var(--color-tier-standard)',
    bars: 2,
    label: 'Standard',
  },
  constrained: {
    color: 'var(--color-tier-constrained)',
    bars: 1,
    label: 'Constrained',
  },
};

function SignalBars({ bars, color }: { bars: number; color: string }) {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <rect
        x="0" y="7" width="3" height="3"
        fill={bars >= 1 ? color : 'var(--color-void-border)'}
      />
      <rect
        x="4.5" y="4" width="3" height="6"
        fill={bars >= 2 ? color : 'var(--color-void-border)'}
      />
      <rect
        x="9" y="0" width="3" height="10"
        fill={bars >= 3 ? color : 'var(--color-void-border)'}
      />
    </svg>
  );
}

export const SovereigntyTierBadge = memo(function SovereigntyTierBadge({ tier, count, compact }: SovereigntyTierBadgeProps) {
  const config = tierConfig[tier];

  if (compact) {
    return (
      <div
        className="flex items-center gap-1"
        aria-label={`${count ?? 0} apps ${config.label}`}
      >
        <SignalBars bars={config.bars} color={config.color} />
        <span
          className="font-mono text-[10px]"
          style={{ color: config.color, fontVariantNumeric: 'tabular-nums' }}
        >
          {count ?? 0}
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-void-border"
      aria-label={`Sovereignty tier: ${config.label}`}
    >
      <SignalBars bars={config.bars} color={config.color} />
      <span
        className="font-mono text-[9px] uppercase tracking-terminal"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
});
