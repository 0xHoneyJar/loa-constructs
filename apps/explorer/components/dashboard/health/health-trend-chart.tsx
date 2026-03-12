'use client';

interface TrendPoint {
  date: string;
  avgScore: number;
  avgApiResponseMs: number;
}

interface TrendsData {
  period: string;
  points: TrendPoint[];
}

export function HealthTrendChart({ data }: { data: TrendsData | undefined }) {
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

  if (data.points.length === 1) {
    const cx = viewWidth / 2;
    const cy = viewHeight / 2;
    return (
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="w-full h-[120px]"
        preserveAspectRatio="none"
      >
        <circle cx={cx} cy={cy} r="3" fill="oklch(0.85 0.15 195)" />
      </svg>
    );
  }

  const points = data.points
    .map((p, i) => {
      const x = padding + (i / (data.points.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((p.avgScore - min) / range) * plotHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-[120px]"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="oklch(0.85 0.15 195)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
