'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/lib/stores/auth-store';
import { HealthScoreCard } from '@/components/dashboard/health/health-score-card';
import { SubScoreBar } from '@/components/dashboard/health/sub-score-bar';
import { HealthTrendChart } from '@/components/dashboard/health/health-trend-chart';
import { IssuesPanel } from '@/components/dashboard/health/issues-panel';

const CONVEX_AVAILABLE = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function HealthDashboard() {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-xs text-bone-muted">
          Network health requires admin access
        </div>
      </div>
    );
  }

  if (!CONVEX_AVAILABLE) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-[10px] text-bone-ghost">
          Health dashboard unavailable
        </div>
        <div className="mt-1 font-mono text-[8px] text-bone-ghost">
          Set NEXT_PUBLIC_CONVEX_URL to enable
        </div>
      </div>
    );
  }

  return <HealthDashboardInner />;
}

function HealthDashboardInner() {
  const [days, setDays] = useState<number>(30);
  const current = useQuery(api.healthObservations.current);
  const trends = useQuery(api.healthObservations.trends, { days });

  if (current === undefined) {
    return <LoadingSkeleton />;
  }

  if (current === null) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-xs text-bone-muted">
          No health data yet
        </div>
        <div className="mt-1 font-mono text-[10px] text-bone-ghost">
          Gecko patrol has not pushed observations
        </div>
      </div>
    );
  }

  const totalVerified = Object.entries(current.verificationTiers as Record<string, number>)
    .filter(([tier]) => tier !== 'UNVERIFIED')
    .reduce((sum, [, count]) => sum + count, 0);
  const totalConstructs = Object.values(current.verificationTiers as Record<string, number>)
    .reduce((sum, count) => sum + count, 0);
  const verifiedPercent = totalConstructs > 0
    ? `${Math.round((totalVerified / totalConstructs) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-3">
          Network Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <HealthScoreCard
            label="Score"
            value={current.healthScore}
            delta={current.healthDelta}
          />
          <HealthScoreCard
            label="API"
            value={current.apiStatus}
            subValue={`${current.apiResponseMs}ms`}
          />
          <HealthScoreCard
            label="Categories"
            value={`${8 - current.emptyCategories.length}/8`}
          />
          <HealthScoreCard label="Verified" value={verifiedPercent} />
        </div>
      </div>

      <div className="border border-void-border bg-void-base p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] text-bone-muted uppercase tracking-widest">
            Trend
          </span>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`font-mono text-[9px] px-2 py-0.5 transition-colors ${
                  days === d
                    ? 'text-cyan-base bg-cyan-dim/10'
                    : 'text-bone-muted hover:text-bone-base'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <HealthTrendChart data={trends} />
      </div>

      <div>
        <h2 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-3">
          Sub-Scores
        </h2>
        <div className="space-y-2">
          {Object.entries(current.subScores).map(([key, value]) => (
            <SubScoreBar key={key} label={key} score={value as number} />
          ))}
        </div>
      </div>

      <IssuesPanel
        emptyCategories={current.emptyCategories}
        staleConstructs={current.staleConstructs}
        verificationTiers={current.verificationTiers as Record<string, number>}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="animate-pulse bg-void-raised h-3 w-24 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-void-border bg-void-base p-4">
              <div className="animate-pulse bg-void-raised h-2 w-12 mb-2" />
              <div className="animate-pulse bg-void-raised h-6 w-10" />
            </div>
          ))}
        </div>
      </div>
      <div className="border border-void-border bg-void-base p-4">
        <div className="animate-pulse bg-void-raised h-2 w-12 mb-3" />
        <div className="animate-pulse bg-void-raised h-[120px]" />
      </div>
      <div>
        <div className="animate-pulse bg-void-raised h-3 w-16 mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-void-raised h-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
