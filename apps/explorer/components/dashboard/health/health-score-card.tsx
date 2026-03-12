'use client';

function scoreColor(value: number): string {
  if (value >= 80) return 'text-cyan-base';
  if (value >= 50) return 'text-graduation-beta';
  return 'text-crimson-base';
}

function deltaDisplay(delta: number): { text: string; color: string } {
  if (delta > 0) return { text: `+${delta}`, color: 'text-cyan-base' };
  if (delta < 0) return { text: `${delta}`, color: 'text-crimson-base' };
  return { text: '0', color: 'text-bone-muted' };
}

export function HealthScoreCard({
  label,
  value,
  delta,
  subValue,
}: {
  label: string;
  value: string | number;
  delta?: number;
  subValue?: string;
}) {
  const isNumeric = typeof value === 'number';
  const colorClass = isNumeric ? scoreColor(value) : 'text-bone-base';

  return (
    <div className="border border-void-border bg-void-base p-4">
      <div className="font-mono text-[9px] text-bone-muted uppercase tracking-widest">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`font-mono text-xl ${colorClass}`}>{value}</span>
        {delta !== undefined && (
          <span className={`font-mono text-[9px] ${deltaDisplay(delta).color}`}>
            {deltaDisplay(delta).text}
          </span>
        )}
      </div>
      {subValue && (
        <div className="mt-1 font-mono text-[10px] text-bone-dim">{subValue}</div>
      )}
    </div>
  );
}
