'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { SignalListItem } from './signal-list-item';
import { SignalDetailPane } from './signal-detail-pane';

interface InboxProps {
  selectedApp: string | null;
  selectedSignalId: string | null;
  onSelectSignal: (id: string | null) => void;
  onUpdateStatus: (signalId: string, status: string, note?: string) => Promise<void>;
}

export function SignalInbox({
  selectedApp,
  selectedSignalId,
  onSelectSignal,
  onUpdateStatus,
}: InboxProps) {
  const result = useQuery(api.signals.byApp, {
    appSlug: selectedApp ?? undefined,
    limit: 20,
  });

  const selectedSignal = useQuery(
    api.signals.getByIdPublic,
    selectedSignalId ? { signalId: selectedSignalId as Id<'signals'> } : 'skip',
  );

  if (result === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] border border-void-border bg-void-base min-h-[400px]">
        <div className="border-r border-void-border p-2 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-void-raised h-12" />
          ))}
        </div>
        <div className="p-4">
          <div className="animate-pulse bg-void-raised h-6 w-48 mb-3" />
          <div className="animate-pulse bg-void-raised h-4 w-32" />
        </div>
      </div>
    );
  }

  const signals = (result.signals || []).filter(
    (s) => s.source !== 'heartbeat',
  );

  if (signals.length === 0) {
    return (
      <div className="border border-void-border bg-void-base p-8 text-center min-h-[300px] flex items-center justify-center">
        <div>
          <div className="font-mono text-xs text-bone-muted">
            No signals {selectedApp ? `for ${selectedApp}` : ''}
          </div>
          <div className="mt-1 font-mono text-[10px] text-bone-ghost">
            Signals will appear here when your apps send them
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] border border-void-border bg-void-base min-h-[400px]">
      {/* Left: Signal List */}
      <div className="border-r border-void-border overflow-y-auto max-h-[600px]">
        {signals.map((signal) => (
          <SignalListItem
            key={signal._id}
            signal={signal}
            isSelected={selectedSignalId === signal._id}
            onClick={() => onSelectSignal(signal._id)}
          />
        ))}
        {result.hasMore && (
          <div className="p-2 text-center">
            <span className="font-mono text-[9px] text-bone-ghost">
              Load more...
            </span>
          </div>
        )}
      </div>

      {/* Right: Detail Pane */}
      <div className="overflow-y-auto max-h-[600px]">
        {selectedSignal ? (
          <SignalDetailPane
            signal={selectedSignal}
            onUpdateStatus={(status, note) =>
              onUpdateStatus(selectedSignal._id, status, note)
            }
          />
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="font-mono text-[10px] text-bone-ghost text-center">
              Select a signal to view details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
