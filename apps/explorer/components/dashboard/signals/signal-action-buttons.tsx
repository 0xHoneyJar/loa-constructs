'use client';

import { useState } from 'react';
import type { Doc } from '@/convex/_generated/dataModel';

interface ActionButtonsProps {
  signal: Doc<'signals'>;
  onUpdateStatus: (status: string, note?: string) => Promise<void>;
  onEscalate: () => Promise<void>;
}

export function SignalActionButtons({ signal, onUpdateStatus, onEscalate }: ActionButtonsProps) {
  const [isActing, setIsActing] = useState(false);
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [showEscalatePreview, setShowEscalatePreview] = useState(false);

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

        {/* Escalate — heavy weight (crimson), preview before confirm */}
        {signal.status !== 'escalated' && !showEscalatePreview ? (
          <button
            disabled={isActing}
            onClick={() => setShowEscalatePreview(true)}
            className="px-2 py-0.5 font-mono text-[10px] text-crimson-base border border-crimson-base/30 hover:bg-crimson-base/10 transition-colors disabled:opacity-40"
          >
            Escalate
          </button>
        ) : signal.status !== 'escalated' && showEscalatePreview ? (
          <div className="flex flex-col gap-1 p-2 border border-crimson-base/20 bg-crimson-base/5">
            <div className="font-mono text-[9px] text-bone-dim">
              Create Linear issue: <span className="text-bone-base">[{signal.appSlug}] {signal.title}</span>
            </div>
            <div className="font-mono text-[8px] text-bone-ghost">
              Team: {signal.data.type === 'error_report' ? 'Infrastructure' : 'Product'}
            </div>
            <div className="flex gap-1">
              <button
                disabled={isActing}
                onClick={async () => {
                  setIsActing(true);
                  try {
                    await onEscalate();
                  } finally {
                    setIsActing(false);
                    setShowEscalatePreview(false);
                  }
                }}
                className="px-2 py-0.5 font-mono text-[9px] text-crimson-base border border-crimson-base/30 hover:bg-crimson-base/10 disabled:opacity-40"
              >
                Confirm Escalation
              </button>
              <button
                onClick={() => setShowEscalatePreview(false)}
                className="px-2 py-0.5 font-mono text-[9px] text-bone-ghost hover:text-bone-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

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
