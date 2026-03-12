'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const COLLAPSED_COUNT = 3;

export function SignalActivityFeed() {
  const [expanded, setExpanded] = useState(false);
  const signals = useQuery(api.signals.recentActivity, { limit: 20 });

  if (signals === undefined) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-void-raised h-6" />
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return null;
  }

  const visible = expanded ? signals : signals.slice(0, COLLAPSED_COUNT);
  const hasMore = signals.length > COLLAPSED_COUNT;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest">
          Recent Activity
        </h3>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-mono text-[9px] text-cyan-base hover:text-cyan-base/80 transition-colors"
          >
            {expanded ? 'Collapse' : `Show all (${signals.length})`}
          </button>
        )}
      </div>
      <div className="border border-void-border bg-void-base divide-y divide-void-border">
        {visible.map((signal) => (
          <div key={signal._id} className="flex items-center gap-3 px-3 py-1.5">
            <span className="font-mono text-[8px] text-bone-ghost shrink-0 w-12">
              {formatTime(signal.timestamp)}
            </span>
            <span className="font-mono text-[8px] text-bone-ghost uppercase shrink-0 w-16 truncate">
              {signal.appSlug}
            </span>
            <span className="font-mono text-[8px] text-bone-ghost shrink-0 w-12 truncate">
              {signal.source}
            </span>
            <span className="font-mono text-[10px] text-bone-dim truncate flex-1">
              {signal.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
