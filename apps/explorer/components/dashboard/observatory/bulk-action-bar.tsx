'use client';

import { useObservatoryStore } from '@/lib/stores/observatory-store';
import { updateSignalStatus, escalateSignal } from '@/app/actions/signal-actions';
import { toast } from 'sonner';
import { useState } from 'react';

export function BulkActionBar() {
  const { selectedSignalIds, clearSelection } = useObservatoryStore();
  const [acting, setActing] = useState(false);
  const count = selectedSignalIds.size;

  if (count <= 1) return null;

  const handleBatchAction = async (
    action: (id: string) => Promise<void>,
    label: string,
  ) => {
    setActing(true);
    const ids = Array.from(selectedSignalIds);
    let succeeded = 0;
    for (const id of ids) {
      try {
        await action(id);
        succeeded++;
      } catch {
        // continue with remaining
      }
    }
    setActing(false);
    if (succeeded === ids.length) {
      toast.success(`${succeeded} signals ${label}`);
    } else {
      toast.warning(`${succeeded}/${ids.length} signals ${label}`);
    }
    clearSelection();
  };

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between px-4 py-2 border-t border-void-border bg-void-raised">
      <span
        className="font-mono text-[10px] text-bone-base"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {count} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={acting}
          onClick={() =>
            handleBatchAction(
              (id) => updateSignalStatus(id, 'dismissed'),
              'dismissed',
            )
          }
          className="px-2 py-1 font-mono text-[9px] text-bone-ghost hover:text-bone-base uppercase tracking-terminal border border-void-border hover:border-bone-ghost transition-colors disabled:opacity-50"
        >
          Dismiss All
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={() =>
            handleBatchAction(
              (id) => updateSignalStatus(id, 'triaged'),
              'triaged',
            )
          }
          className="px-2 py-1 font-mono text-[9px] text-bone-ghost hover:text-bone-base uppercase tracking-terminal border border-void-border hover:border-bone-ghost transition-colors disabled:opacity-50"
        >
          Triage All
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={() =>
            handleBatchAction(
              (id) => escalateSignal(id),
              'escalated',
            )
          }
          className="px-2 py-1 font-mono text-[9px] text-crimson-base hover:text-bone-base uppercase tracking-terminal border border-crimson-base/30 hover:border-crimson-base transition-colors disabled:opacity-50"
        >
          Escalate All
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="px-2 py-1 font-mono text-[9px] text-bone-ghost hover:text-bone-muted uppercase tracking-terminal transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
