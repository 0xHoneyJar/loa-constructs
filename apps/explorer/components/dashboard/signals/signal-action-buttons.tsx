'use client';

import { useState } from 'react';
import type { Doc } from '@/convex/_generated/dataModel';

interface ActionButtonsProps {
  signal: Doc<'signals'>;
  onUpdateStatus: (status: string, note?: string) => Promise<void>;
}

export function SignalActionButtons({ signal, onUpdateStatus }: ActionButtonsProps) {
  const [isActing, setIsActing] = useState(false);
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  if (signal.status === 'resolved' || signal.status === 'dismissed') {
    return (
      <div className="font-mono text-[9px] text-bone-ghost">
        {signal.status === 'resolved' ? 'Resolved' : 'Dismissed'}
        {signal.resolvedAt && (
          <span className="ml-1 text-[8px]">
            {new Date(signal.resolvedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  const handleAction = async (status: string, note?: string) => {
    setIsActing(true);
    try {
      await onUpdateStatus(status, note);
    } finally {
      setIsActing(false);
      setConfirmDismiss(false);
      setShowResolveInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Dismiss — ghost weight */}
        {!confirmDismiss ? (
          <button
            disabled={isActing}
            onClick={() =>
              signal.severity === 'critical'
                ? setConfirmDismiss(true)
                : handleAction('dismissed')
            }
            className="font-mono text-[10px] text-bone-ghost hover:text-bone-muted transition-colors disabled:opacity-40"
          >
            Dismiss
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-crimson-base/70">Dismiss critical?</span>
            <button
              onClick={() => handleAction('dismissed')}
              disabled={isActing}
              className="font-mono text-[9px] text-crimson-base hover:text-crimson-base/80 disabled:opacity-40"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDismiss(false)}
              className="font-mono text-[9px] text-bone-ghost hover:text-bone-muted"
            >
              No
            </button>
          </div>
        )}

        {/* Triage — light weight */}
        {signal.status === 'new' && (
          <button
            disabled={isActing}
            onClick={() => handleAction('triaged')}
            className="px-2 py-0.5 font-mono text-[10px] text-bone-dim border border-void-border hover:bg-void-raised transition-colors disabled:opacity-40"
          >
            Triage
          </button>
        )}

        {/* Escalate — heavy weight (crimson) */}
        <div className="relative group">
          <button
            disabled
            className="px-2 py-0.5 font-mono text-[10px] text-crimson-base/40 border border-crimson-base/20 cursor-not-allowed"
          >
            Escalate
          </button>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
            <div className="px-2 py-1 bg-void-raised border border-void-border font-mono text-[8px] text-bone-ghost whitespace-nowrap">
              Linear integration coming in Sprint 3
            </div>
          </div>
        </div>

        {/* Resolve — medium weight */}
        {!showResolveInput ? (
          <button
            disabled={isActing}
            onClick={() => setShowResolveInput(true)}
            className="px-2 py-0.5 font-mono text-[10px] text-cyan-base border border-cyan-base/30 hover:bg-cyan-dim/10 transition-colors disabled:opacity-40"
          >
            Resolve
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="PR/commit link (optional)"
              className="px-2 py-0.5 font-mono text-[10px] bg-void-base border border-void-border text-bone-dim placeholder:text-bone-ghost/40 w-40"
            />
            <button
              onClick={() => handleAction('resolved', resolveNote || undefined)}
              disabled={isActing}
              className="px-2 py-0.5 font-mono text-[10px] text-cyan-base border border-cyan-base/30 hover:bg-cyan-dim/10 disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {/* Linear issue link if escalated */}
      {signal.linearIssueUrl && (
        <a
          href={signal.linearIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[9px] text-cyan-base hover:text-cyan-base/80"
        >
          Linear Issue →
        </a>
      )}
    </div>
  );
}
