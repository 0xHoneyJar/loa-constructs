'use client';

import { useState } from 'react';

interface CollapsibleListProps {
  children: React.ReactNode[];
  initialCount: number;
  label: string;
}

export function CollapsibleList({ children, initialCount, label }: CollapsibleListProps) {
  const [expanded, setExpanded] = useState(false);
  const total = children.length;

  if (total <= initialCount) {
    return <div className="space-y-3">{children}</div>;
  }

  return (
    <div className="space-y-3">
      {expanded ? children : children.slice(0, initialCount)}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="font-mono text-sm text-cyan-dim hover:text-cyan-base transition-colors uppercase tracking-whisper"
      >
        {expanded ? 'Show less' : `Show all ${total} ${label}`}
      </button>
    </div>
  );
}
