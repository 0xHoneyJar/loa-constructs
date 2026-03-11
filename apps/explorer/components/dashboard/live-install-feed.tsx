'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const CONVEX_AVAILABLE = !!process.env.NEXT_PUBLIC_CONVEX_URL;

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LiveInstallFeed() {
  if (!CONVEX_AVAILABLE) {
    return <FeedOffline />;
  }
  return <LiveFeedInner />;
}

function LiveFeedInner() {
  const events = useQuery(api.installEvents.recent, { limit: 20 });

  if (events === undefined) {
    return <FeedSkeleton />;
  }

  if (events.length === 0) {
    return <FeedEmpty />;
  }

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {events.map((event) => (
        <div
          key={event._id}
          className="flex items-center justify-between px-3 py-1.5 border border-void-border/50 hover:border-void-border transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-base/60" />
            <span className="font-mono text-[11px] text-bone-base truncate">
              {event.packName || event.packSlug}
            </span>
            <span className="font-mono text-[9px] text-bone-ghost">
              {event.action}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[9px] text-bone-ghost ml-2">
            {formatTimeAgo(event.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 bg-void-raised animate-pulse" />
      ))}
    </div>
  );
}

function FeedEmpty() {
  return (
    <div className="py-8 text-center">
      <div className="font-mono text-[10px] text-bone-ghost">
        No install events yet
      </div>
    </div>
  );
}

function FeedOffline() {
  return (
    <div className="py-8 text-center">
      <div className="font-mono text-[10px] text-bone-ghost">
        Real-time feed unavailable
      </div>
      <div className="mt-1 font-mono text-[8px] text-bone-ghost">
        Set NEXT_PUBLIC_CONVEX_URL to enable
      </div>
    </div>
  );
}
