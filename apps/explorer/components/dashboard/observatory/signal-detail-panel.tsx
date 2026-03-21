'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useObservatoryStore } from '@/lib/stores/observatory-store';
import { SignalClassification } from '@/components/dashboard/signals/signal-classification';
import { SignalActionButtons } from '@/components/dashboard/signals/signal-action-buttons';
import { Disclosure } from '@/components/ui/disclosure';
import {
  updateSignalStatus,
  escalateSignal,
} from '@/app/actions/signal-actions';
import { toast } from 'sonner';

const severityBadge: Record<string, string> = {
  critical: 'bg-crimson-tint-bg text-crimson-base border-crimson-tint-border',
  high: 'bg-beta-tint-bg text-[var(--color-severity-high)] border-beta-tint-border',
  medium: 'bg-beta-tint-bg text-[var(--color-severity-medium)] border-beta-tint-border',
  low: 'bg-void-raised text-bone-ghost border-void-border',
};

const statusColors: Record<string, string> = {
  new: 'text-cyan-base',
  triaged: 'text-[var(--color-severity-medium)]',
  escalated: 'text-crimson-base',
  resolved: 'text-node-green',
  dismissed: 'text-bone-ghost',
};

export function SignalDetailPanel() {
  const { selectedSignalId, selectNext, setFocusZone } = useObservatoryStore();

  const signal = useQuery(
    api.signals.getByIdPublic,
    selectedSignalId ? { signalId: selectedSignalId as Id<'signals'> } : 'skip',
  );

  if (!selectedSignalId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="font-mono text-[10px] text-bone-ghost">
            Select a signal to view details
          </div>
          <div className="mt-1 font-mono text-[8px] text-bone-ghost">
            J/K to navigate · Enter to select
          </div>
        </div>
      </div>
    );
  }

  if (signal === undefined) {
    return (
      <div className="p-4 space-y-3">
        <div className="animate-pulse bg-void-raised h-5 w-3/4" />
        <div className="animate-pulse bg-void-raised h-4 w-1/2" />
        <div className="animate-pulse bg-void-raised h-3 w-1/3" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-[10px] text-bone-ghost">
          Signal not found
        </div>
      </div>
    );
  }

  const severity = severityBadge[signal.severity] || severityBadge.low;
  const statusColor = statusColors[signal.status] || '';

  const handleUpdateStatus = async (status: string, note?: string) => {
    try {
      await updateSignalStatus(signal._id, status, note);
      const actionLabel = status === 'dismissed' ? 'Dismissed' : status === 'triaged' ? 'Triaged' : status === 'resolved' ? 'Resolved' : status;
      toast.success(`Signal ${actionLabel.toLowerCase()}`);
      selectNext();
    } catch {
      toast.error('Failed to update signal');
    }
  };

  const handleEscalate = async () => {
    try {
      await escalateSignal(signal._id);
      toast.success('Escalated to Linear');
      selectNext();
    } catch {
      toast.error('Failed to escalate signal');
    }
  };

  // Count stack trace frames if available
  const stackTrace = signal.data?.type === 'error_report' ? (signal.data as { stackTrace?: string }).stackTrace : undefined;
  const frameCount = stackTrace ? stackTrace.split('\n').filter((l: string) => l.trim().startsWith('at ')).length : 0;

  return (
    <div
      className="overflow-y-auto h-full"
      onFocus={() => setFocusZone('detail')}
    >
      {/* Always Visible: Header */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-mono text-[12px] text-bone-base leading-tight">
              {signal.title}
            </h3>
            <span
              className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] uppercase border ${severity}`}
            >
              {signal.severity}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] text-bone-ghost">{signal.appSlug}</span>
            <span className="text-bone-ghost/30">·</span>
            <span className="font-mono text-[9px] text-bone-ghost">{signal.source}</span>
            <span className="text-bone-ghost/30">·</span>
            <span className={`font-mono text-[9px] ${statusColor}`}>{signal.status}</span>
            {signal.occurrenceCount > 1 && (
              <>
                <span className="text-bone-ghost/30">·</span>
                <span
                  className="font-mono text-[9px] text-[var(--color-severity-high)]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {signal.occurrenceCount} occurrences
                </span>
              </>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-bone-ghost">
            {new Date(signal.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Always Visible: Classification Summary */}
        <SignalClassification signal={signal} />

        {/* Always Visible: Actions */}
        <div className="pt-2 border-t border-void-border">
          <SignalActionButtons
            signal={signal}
            onUpdateStatus={handleUpdateStatus}
            onEscalate={handleEscalate}
          />
        </div>
      </div>

      {/* Progressive Disclosure Sections */}
      <div className="border-t border-void-border">
        {/* Stack Trace (error_report only) */}
        {signal.data?.type === 'error_report' && stackTrace && (
          <Disclosure title={`Stack Trace${frameCount > 0 ? ` (${frameCount} frames)` : ''}`}>
            <pre className="p-2 bg-void-raised border border-void-border font-mono text-[9px] text-bone-dim overflow-x-auto max-h-60 whitespace-pre-wrap">
              {stackTrace}
            </pre>
          </Disclosure>
        )}

        {/* Signal Data */}
        <Disclosure title="Signal Data">
          <div className="space-y-1.5">
            {signal.data?.type === 'feedback' ? (
              <FeedbackDetails data={signal.data as FeedbackData} />
            ) : (
              <ErrorDetails data={signal.data as ErrorData} />
            )}
          </div>
        </Disclosure>

        {/* Incident Group */}
        <Disclosure title="Incident Group">
          <div className="font-mono text-[9px] text-bone-dim">
            <span className="text-bone-ghost">Group ID: </span>
            {signal.incidentGroupId}
          </div>
        </Disclosure>

        {/* Linear Issue (if escalated) */}
        {signal.linearIssueUrl && (
          <Disclosure title="Linear Issue">
            <a
              href={signal.linearIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] text-cyan-base hover:text-cyan-dim transition-colors"
            >
              {signal.linearIssueUrl}
            </a>
          </Disclosure>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

interface FeedbackData {
  type: 'feedback';
  category: string;
  description?: string;
  whatUserWanted?: string;
  frustration?: number;
}

interface ErrorData {
  type: 'error_report';
  errorClass?: string;
  message?: string;
  url?: string;
  stackTrace?: string;
}

function FeedbackDetails({ data }: { data: FeedbackData }) {
  return (
    <>
      <DetailRow label="Category" value={data.category} />
      {data.description && <DetailRow label="Description" value={data.description} />}
      {data.whatUserWanted && <DetailRow label="Wanted" value={data.whatUserWanted} />}
      {data.frustration != null && (
        <div className="flex items-center gap-1">
          <span className="font-mono text-[8px] text-bone-ghost uppercase">Frustration:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 ${
                  i < data.frustration! ? 'bg-crimson-base' : 'bg-bone-ghost/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ErrorDetails({ data }: { data: ErrorData }) {
  return (
    <>
      {data.errorClass && <DetailRow label="Error" value={data.errorClass} />}
      {data.message && <DetailRow label="Message" value={data.message} />}
      {data.url && <DetailRow label="URL" value={data.url} />}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[8px] text-bone-ghost uppercase">{label}: </span>
      <span className="font-mono text-[10px] text-bone-dim">{value}</span>
    </div>
  );
}
