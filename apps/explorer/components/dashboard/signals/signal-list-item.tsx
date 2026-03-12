'use client';

import type { Doc } from '@/convex/_generated/dataModel';

interface SignalListItemProps {
  signal: Doc<'signals'>;
  isSelected: boolean;
  onClick: () => void;
}

const severityColors: Record<string, string> = {
  critical: 'border-l-crimson-base',
  high: 'border-l-amber-400',
  medium: 'border-l-cyan-base',
  low: 'border-l-bone-ghost/40',
};

export function SignalListItem({ signal, isSelected, onClick }: SignalListItemProps) {
  const borderColor = severityColors[signal.severity] || 'border-l-bone-ghost/20';
  const timeAgo = getTimeAgo(signal.timestamp);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border-l-2 px-3 py-2 transition-colors ${borderColor} ${
        isSelected
          ? 'bg-cyan-dim/10 border-r-2 border-r-cyan-base'
          : 'hover:bg-void-raised border-r-2 border-r-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-bone-base truncate">
            {signal.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[8px] text-bone-ghost uppercase">
              {signal.appSlug}
            </span>
            <span className="font-mono text-[8px] text-bone-ghost">
              {signal.source}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="font-mono text-[8px] text-bone-ghost">{timeAgo}</span>
          {signal.occurrenceCount > 1 && (
            <span className="mt-0.5 font-mono text-[8px] text-amber-400">
              ×{signal.occurrenceCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
