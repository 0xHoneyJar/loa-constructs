'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { IssuesPanel } from '@/components/dashboard/health/issues-panel';
import { SubScoreWidget } from './sub-score-widget';

const SUB_SCORE_LABELS: Record<string, string> = {
  api_liveness: 'API Liveness',
  version_freshness: 'Version Freshness',
  category_coverage: 'Category Coverage',
  identity_drift: 'Identity Drift',
  composition_density: 'Composition Density',
  verification_flow: 'Verification Flow',
};

export function HealthSection() {
  const [days, setDays] = useState(30);
  const current = useQuery(api.healthObservations.current);
  const trends = useQuery(api.healthObservations.trends, { days });
  const subScoreTrends = useQuery(api.healthObservations.subScoreTrends, { days: 7 });

  return (
    <div className="space-y-4">
      {/* Trend Chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
            Health Trend
          </span>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-1.5 py-0.5 font-mono text-[9px] tracking-terminal transition-colors border ${
                  days === d
                    ? 'border-void-border bg-void-raised text-bone-base'
                    : 'border-transparent text-bone-ghost hover:text-bone-muted'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <HealthTrendChartFixed data={trends} />
      </div>

      {/* Sub-Scores */}
      {current?.subScores && (
        <div className="space-y-2">
          <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
            Sub-Scores
          </span>
          {Object.entries(current.subScores as Record<string, number>).map(([key, value]) => (
            <SubScoreWidget
              key={key}
              label={SUB_SCORE_LABELS[key] || key}
              score={value}
              sparklineData={subScoreTrends?.[key]}
            />
          ))}
        </div>
      )}

      {/* Issues */}
      {current && (
        <IssuesPanel
          staleConstructs={current.staleConstructs as string[]}
          emptyCategories={current.emptyCategories as string[]}
          verificationTiers={current.verificationTiers as Record<string, number>}
        />
      )}
    </div>
  );
}

// Fixed version of HealthTrendChart — uses CSS var instead of hardcoded oklch
function HealthTrendChartFixed({
  data,
}: {
  data: { period: string; points: Array<{ date: string; avgScore: number; avgApiResponseMs: number }> } | undefined;
}) {
  if (data === undefined) {
    return <div className="h-[120px] animate-pulse bg-void-raised" />;
  }

  if (data.points.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center font-mono text-[9px] text-bone-muted">
        No trend data
      </div>
    );
  }

  const scores = data.points.map((p) => p.avgScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const padding = 4;
  const viewWidth = 400;
  const viewHeight = 120;
  const plotWidth = viewWidth - padding * 2;
  const plotHeight = viewHeight - padding * 2;

  // Threshold lines at 80 and 50
  const threshold80Y = padding + plotHeight - ((80 - min) / range) * plotHeight;
  const threshold50Y = padding + plotHeight - ((50 - min) / range) * plotHeight;

  if (data.points.length === 1) {
    const cx = viewWidth / 2;
    const cy = viewHeight / 2;
    const color = scores[0] >= 80 ? 'var(--color-cyan-base)' : scores[0] >= 50 ? 'var(--color-token-yellow)' : 'var(--color-crimson-base)';
    return (
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-[120px]" preserveAspectRatio="none">
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>
    );
  }

  // Build segments with threshold-based coloring
  const pointCoords = data.points.map((p, i) => ({
    x: padding + (i / (data.points.length - 1)) * plotWidth,
    y: padding + plotHeight - ((p.avgScore - min) / range) * plotHeight,
    score: p.avgScore,
  }));

  const polylinePoints = pointCoords.map((p) => `${p.x},${p.y}`).join(' ');

  // Use the last point's score to determine the line color
  const lastScore = scores[scores.length - 1];
  const lineColor = lastScore >= 80 ? 'var(--color-cyan-base)' : lastScore >= 50 ? 'var(--color-token-yellow)' : 'var(--color-crimson-base)';

  return (
    <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-[120px]" preserveAspectRatio="none">
      {/* Threshold lines */}
      {threshold80Y >= padding && threshold80Y <= viewHeight - padding && (
        <line
          x1={padding} y1={threshold80Y} x2={viewWidth - padding} y2={threshold80Y}
          stroke="var(--color-cyan-base)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3"
        />
      )}
      {threshold50Y >= padding && threshold50Y <= viewHeight - padding && (
        <line
          x1={padding} y1={threshold50Y} x2={viewWidth - padding} y2={threshold50Y}
          stroke="var(--color-crimson-base)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3"
        />
      )}

      {/* Main line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
