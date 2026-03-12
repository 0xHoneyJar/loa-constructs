'use client';

import type { Doc } from '@/convex/_generated/dataModel';

interface ClassificationProps {
  signal: Doc<'signals'>;
}

export function SignalClassification({ signal }: ClassificationProps) {
  if (signal.classification) {
    return (
      <div className="space-y-2">
        <div className="font-mono text-[9px] text-bone-muted uppercase tracking-widest">
          Classification
        </div>
        <div className="space-y-1.5">
          <ClassificationRow label="Symptom" value={signal.classification.level1Symptom} />
          <ClassificationRow label="Want" value={signal.classification.level2Want} />
          <ClassificationRow label="Hypothesis" value={signal.classification.level3Hypothesis} />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] text-bone-ghost">Confidence:</span>
            <span className="font-mono text-[9px] text-bone-dim">
              {Math.round(signal.classification.confidence * 100)}%
            </span>
          </div>
          {signal.classification.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {signal.classification.labels.map((label) => (
                <span
                  key={label}
                  className="px-1.5 py-0.5 font-mono text-[8px] bg-void-raised text-bone-dim border border-void-border"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (signal.classificationAttempts >= 3) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-crimson-base/70">Classification failed</span>
      </div>
    );
  }

  if (signal.status === 'new' && !signal.classification) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 border border-bone-ghost/40 border-t-cyan-base rounded-full animate-spin" />
        <span className="font-mono text-[9px] text-bone-ghost">Classifying...</span>
      </div>
    );
  }

  return null;
}

function ClassificationRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[8px] text-bone-ghost uppercase">{label}: </span>
      <span className="font-mono text-[10px] text-bone-dim">{value}</span>
    </div>
  );
}
