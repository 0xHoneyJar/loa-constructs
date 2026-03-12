'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface StatusBarProps {
  selectedApp: string | null;
  onSelectApp: (app: string | null) => void;
}

export function SignalStatusBar({ selectedApp, onSelectApp }: StatusBarProps) {
  const counts = useQuery(api.signals.statusCounts);

  if (counts === undefined) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-void-raised h-8 w-24 shrink-0" />
        ))}
      </div>
    );
  }

  const apps = Object.keys(counts.byApp);

  if (apps.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <StatusPill
        label="ALL"
        newCount={counts.totalNew}
        criticalCount={counts.totalCritical}
        isActive={selectedApp === null}
        onClick={() => onSelectApp(null)}
      />
      {apps.map((app) => {
        const appCounts = counts.byApp[app];
        return (
          <StatusPill
            key={app}
            label={app}
            newCount={appCounts.new || 0}
            criticalCount={appCounts.critical || 0}
            highCount={appCounts.high || 0}
            isActive={selectedApp === app}
            onClick={() => onSelectApp(app)}
          />
        );
      })}
    </div>
  );
}

function StatusPill({
  label,
  newCount,
  criticalCount,
  highCount = 0,
  isActive,
  onClick,
}: {
  label: string;
  newCount: number;
  criticalCount: number;
  highCount?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const dotColor =
    criticalCount > 0
      ? 'bg-crimson-base'
      : highCount > 0
        ? 'bg-amber-400'
        : newCount > 0
          ? 'bg-cyan-base'
          : 'bg-bone-ghost/30';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider shrink-0 border transition-colors ${
        isActive
          ? 'border-cyan-base/30 bg-cyan-dim/10 text-cyan-base'
          : 'border-void-border bg-void-base text-bone-muted hover:text-bone-base hover:bg-void-raised'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {newCount > 0 && (
        <span className="ml-1 px-1 py-0.5 text-[8px] bg-void-raised text-bone-dim rounded">
          {newCount}
        </span>
      )}
    </button>
  );
}
