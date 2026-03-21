'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SovereigntyTierBadge } from './sovereignty-tier-badge';
import { resetCircuitBreaker } from '@/app/actions/signal-actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { OverrideRateChart } from './override-rate-chart';

export function SovereigntySection() {
  const sovereignty = useQuery(api.signals.getSovereigntyState, {});

  if (sovereignty === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-void-raised h-24 border border-void-border" />
        ))}
      </div>
    );
  }

  if (!sovereignty || !Array.isArray(sovereignty)) {
    return (
      <div className="font-mono text-[10px] text-bone-ghost">
        No sovereignty data available
      </div>
    );
  }

  const appStates = sovereignty.filter((s) => s.scope !== 'global');

  if (appStates.length === 0) {
    return (
      <div className="font-mono text-[10px] text-bone-ghost">
        No app sovereignty states configured
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {appStates.map((state) => (
        <SovereigntyCard key={state.scope} state={state} />
      ))}
    </div>
  );
}

interface SovereigntyState {
  _id: string;
  scope: string;
  tier: 'autonomous' | 'standard' | 'constrained';
  overrideRate: number;
  signalCount: number;
  overrideCount: number;
  windowDays: number;
  circuitBreakerTripped?: boolean;
  circuitBreakerTrippedAt?: number;
  consecutiveFailures?: number;
  lastTransition?: {
    from: string;
    to: string;
    timestamp: number;
    trigger: string;
  };
  manualOverride?: {
    tier: string;
    setBy: string;
    reason: string;
    expiresAt?: number;
  };
  updatedAt: number;
}

function SovereigntyCard({ state }: { state: SovereigntyState }) {
  const [resetting, setResetting] = useState(false);

  const handleResetCircuitBreaker = async () => {
    setResetting(true);
    try {
      await resetCircuitBreaker(state.scope);
      toast.success(`Circuit breaker reset for ${state.scope}`);
    } catch {
      toast.error('Failed to reset circuit breaker');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      className="border border-void-border bg-void-base p-3 space-y-2"
      aria-label={`${state.scope} sovereignty: ${state.tier}, override rate ${Math.round(state.overrideRate * 100)}%`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-bone-base uppercase tracking-terminal">
          {state.scope}
        </span>
        <SovereigntyTierBadge tier={state.tier} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <div>
          <div className="font-mono text-[8px] text-bone-ghost uppercase">Override Rate</div>
          <div className={`font-mono text-[12px] ${
            state.overrideRate > 0.4 ? 'text-crimson-base' :
            state.overrideRate > 0.15 ? 'text-[var(--color-severity-medium)]' :
            'text-node-green'
          }`}>
            {Math.round(state.overrideRate * 100)}%
          </div>
        </div>
        <div>
          <div className="font-mono text-[8px] text-bone-ghost uppercase">Signals</div>
          <div className="font-mono text-[12px] text-bone-dim">{state.signalCount}</div>
        </div>
        <div>
          <div className="font-mono text-[8px] text-bone-ghost uppercase">Window</div>
          <div className="font-mono text-[12px] text-bone-dim">{state.windowDays}d</div>
        </div>
      </div>

      {/* Circuit Breaker */}
      {state.circuitBreakerTripped && (
        <div className="flex items-center justify-between border border-crimson-base/30 bg-crimson-base/10 px-2 py-1">
          <span className="font-mono text-[9px] text-crimson-base uppercase">
            Circuit Breaker Tripped
          </span>
          <button
            type="button"
            onClick={handleResetCircuitBreaker}
            disabled={resetting}
            className="font-mono text-[8px] text-bone-ghost hover:text-bone-base uppercase tracking-terminal px-1.5 py-0.5 border border-void-border hover:border-bone-ghost transition-colors disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      )}

      {/* Manual Override */}
      {state.manualOverride && (
        <div className="border border-[var(--color-severity-medium)]/30 bg-[var(--color-severity-medium)]/5 px-2 py-1">
          <div className="font-mono text-[8px] text-[var(--color-severity-medium)] uppercase">
            Manual Override: {state.manualOverride.tier}
          </div>
          <div className="font-mono text-[8px] text-bone-ghost mt-0.5">
            {state.manualOverride.reason}
          </div>
        </div>
      )}

      {/* Override Rate Chart */}
      <OverrideRateChart appSlug={state.scope} />

      {/* Last Transition */}
      {state.lastTransition && (
        <div className="font-mono text-[8px] text-bone-ghost">
          {state.lastTransition.from} → {state.lastTransition.to}
          <span className="ml-1 text-bone-ghost/60">
            {new Date(state.lastTransition.timestamp).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
