'use client';

import { memo } from 'react';

interface SignalListItemProps {
  signal: Record<string, unknown>;
  isSelected: boolean;
  isInBulkSelection?: boolean;
  isFocused: boolean;
  onClick: () => void;
}

const severityColors: Record<string, string> = {
  critical: 'border-l-crimson-base',
  high: 'border-l-[var(--color-severity-high)]',
  medium: 'border-l-[var(--color-severity-medium)]',
  low: 'border-l-cyan-base',
};

const severityIcons: Record<string, string> = {
  critical: '\u2B24', // filled circle
  high: '\u25C9',     // ring-dot (fisheye)
  medium: '\u25CE',   // double ring (bullseye)
  low: '\u25CB',      // open circle
};

const severityIconColors: Record<string, string> = {
  critical: 'text-crimson-base',
  high: 'text-[var(--color-severity-high)]',
  medium: 'text-[var(--color-severity-medium)]',
  low: 'text-cyan-base',
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const SignalListItem = memo(function SignalListItem({ signal, isSelected, isInBulkSelection, isFocused, onClick }: SignalListItemProps) {
  const severity = signal.severity as string;
  const borderColor = severityColors[severity] || severityColors.low;
  const icon = severityIcons[severity] || severityIcons.low;
  const iconColor = severityIconColors[severity] || severityIconColors.low;
  const classification = signal.classification as {
    level1Symptom?: string;
  } | undefined;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      id={signal._id as string}
      data-signal-id={signal._id as string}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`cursor-pointer border-l-2 border-r-2 px-3 transition-colors ${borderColor} ${
        isSelected
          ? 'bg-cyan-dim/10 border-r-cyan-base'
          : isInBulkSelection
            ? 'bg-cyan-dim/5 border-r-cyan-dim/50'
            : 'hover:bg-void-raised border-r-transparent'
      } ${isFocused ? 'outline-1 outline-cyan-dim outline-offset-[-1px]' : ''}`}
      style={{
        height: 'var(--density-row-height)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Severity Icon */}
      <span className={`text-[8px] shrink-0 ${iconColor}`} aria-hidden="true">
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-mono text-[11px] text-bone-base truncate flex-1">
          {signal.title as string}
        </span>

        {/* Classification hint */}
        {classification?.level1Symptom && (
          <span className="font-mono text-[8px] text-bone-ghost truncate max-w-[120px] hidden lg:inline">
            {classification.level1Symptom}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div
        className="shrink-0 flex items-center gap-2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span className="font-mono text-[8px] text-bone-ghost uppercase">
          {signal.appSlug as string}
        </span>
        {(signal.occurrenceCount as number) > 1 && (
          <span className="font-mono text-[9px] text-[var(--color-severity-high)]">
            ×{signal.occurrenceCount as number}
          </span>
        )}
        <span className="font-mono text-[8px] text-bone-ghost w-[28px] text-right">
          {timeAgo(signal.timestamp as string)}
        </span>
      </div>
    </div>
  );
});
