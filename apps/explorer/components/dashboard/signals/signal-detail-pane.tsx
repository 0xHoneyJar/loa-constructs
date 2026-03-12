'use client';

import type { Doc } from '@/convex/_generated/dataModel';
import { SignalClassification } from './signal-classification';
import { SignalActionButtons } from './signal-action-buttons';

interface DetailPaneProps {
  signal: Doc<'signals'>;
  onUpdateStatus: (status: string, note?: string) => Promise<void>;
}

const severityBadge: Record<string, string> = {
  critical: 'bg-crimson-base/20 text-crimson-base border-crimson-base/30',
  high: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  medium: 'bg-cyan-base/20 text-cyan-base border-cyan-base/30',
  low: 'bg-bone-ghost/10 text-bone-ghost border-bone-ghost/20',
};

const statusBadge: Record<string, string> = {
  new: 'text-cyan-base',
  triaged: 'text-amber-400',
  escalated: 'text-crimson-base',
  resolved: 'text-emerald-400',
  dismissed: 'text-bone-ghost',
};

export function SignalDetailPane({ signal, onUpdateStatus }: DetailPaneProps) {
  const severity = severityBadge[signal.severity] || severityBadge.low;

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-mono text-[12px] text-bone-base leading-tight">
            {signal.title}
          </h3>
          <span className={`shrink-0 px-1.5 py-0.5 font-mono text-[8px] uppercase border ${severity}`}>
            {signal.severity}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[9px] text-bone-ghost">{signal.appSlug}</span>
          <span className="text-bone-ghost/30">·</span>
          <span className="font-mono text-[9px] text-bone-ghost">{signal.source}</span>
          <span className="text-bone-ghost/30">·</span>
          <span className={`font-mono text-[9px] ${statusBadge[signal.status] || ''}`}>
            {signal.status}
          </span>
          {signal.occurrenceCount > 1 && (
            <>
              <span className="text-bone-ghost/30">·</span>
              <span className="font-mono text-[9px] text-amber-400">
                {signal.occurrenceCount} occurrences
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[8px] text-bone-ghost">
          {new Date(signal.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Signal Data */}
      <div className="space-y-2">
        <div className="font-mono text-[9px] text-bone-muted uppercase tracking-widest">
          Details
        </div>
        {signal.data.type === 'feedback' ? (
          <FeedbackDetails data={signal.data} />
        ) : (
          <ErrorDetails data={signal.data} />
        )}
      </div>

      {/* Classification */}
      <SignalClassification signal={signal} />

      {/* Actions */}
      <div className="pt-2 border-t border-void-border">
        <SignalActionButtons signal={signal} onUpdateStatus={onUpdateStatus} />
      </div>

      {/* Incident Group */}
      <div className="pt-2 border-t border-void-border">
        <div className="font-mono text-[8px] text-bone-ghost">
          Group: {signal.incidentGroupId}
        </div>
      </div>
    </div>
  );
}

function FeedbackDetails({ data }: { data: { type: 'feedback'; category: string; description?: string; whatUserWanted?: string; frustration?: number } }) {
  return (
    <div className="space-y-1.5">
      <DetailRow label="Category" value={data.category} />
      {data.description && <DetailRow label="Description" value={data.description} />}
      {data.whatUserWanted && <DetailRow label="Wanted" value={data.whatUserWanted} />}
      {data.frustration != null && (
        <div className="flex items-center gap-1">
          <span className="font-mono text-[8px] text-bone-ghost uppercase">Frustration:</span>
          <FrustrationDots level={data.frustration} />
        </div>
      )}
    </div>
  );
}

function ErrorDetails({ data }: { data: { type: 'error_report'; errorClass?: string; message?: string; stackTrace?: string; url?: string } }) {
  return (
    <div className="space-y-1.5">
      {data.errorClass && <DetailRow label="Error" value={data.errorClass} />}
      {data.message && <DetailRow label="Message" value={data.message} />}
      {data.url && <DetailRow label="URL" value={data.url} />}
      {data.stackTrace && (
        <div>
          <span className="font-mono text-[8px] text-bone-ghost uppercase">Stack Trace:</span>
          <pre className="mt-1 p-2 bg-void-raised border border-void-border font-mono text-[9px] text-bone-dim overflow-x-auto max-h-40 whitespace-pre-wrap">
            {data.stackTrace}
          </pre>
        </div>
      )}
    </div>
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

function FrustrationDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < level ? 'bg-crimson-base' : 'bg-bone-ghost/20'
          }`}
        />
      ))}
    </div>
  );
}
