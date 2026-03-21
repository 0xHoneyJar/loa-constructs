'use client';

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-cyan-base';
  if (score >= 50) return 'bg-graduation-beta';
  return 'bg-crimson-base';
}

function scoreTextColor(score: number): string {
  if (score >= 80) return 'text-cyan-base';
  if (score >= 50) return 'text-graduation-beta';
  return 'text-crimson-base';
}

function strokeColor(score: number): string {
  if (score >= 80) return 'var(--color-cyan-base)';
  if (score >= 50) return 'var(--color-token-yellow)';
  return 'var(--color-crimson-base)';
}

interface SubScoreWidgetProps {
  label: string;
  score: number;
  sparklineData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const w = 48;
  const h = 16;
  const padding = 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = padding + (h - padding * 2) - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SubScoreWidget({ label, score, sparklineData }: SubScoreWidgetProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[9px] text-bone-muted uppercase tracking-widest w-36 shrink-0">
        {label.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 h-2 bg-void-raised">
        <div
          className={`h-full ${scoreBgColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`font-mono text-[10px] w-7 text-right ${scoreTextColor(score)}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {score}
      </span>
      {sparklineData && sparklineData.length >= 2 && (
        <MiniSparkline data={sparklineData} color={strokeColor(score)} />
      )}
    </div>
  );
}
