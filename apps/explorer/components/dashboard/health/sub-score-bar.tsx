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

export function SubScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[9px] text-bone-muted uppercase tracking-widest w-40 shrink-0">
        {label.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 h-2 bg-void-raised">
        <div
          className={`h-full ${scoreBgColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] w-8 text-right ${scoreTextColor(score)}`}>
        {score}
      </span>
    </div>
  );
}
