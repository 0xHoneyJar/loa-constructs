'use client';

import { useState } from 'react';

export function InstallBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-10 w-full border border-void-border bg-void-raised px-5 py-4 font-mono text-sm sm:text-lg flex items-center justify-between gap-3 cursor-pointer hover:border-bone-ghost transition-colors group text-left"
      aria-label={copied ? 'Copied to clipboard' : 'Click to copy install command'}
    >
      <div className="whitespace-nowrap overflow-x-auto">
        <span className="text-bone-ghost">$ </span>
        <span className="text-cyan-base">{command}</span>
      </div>
      <span className="text-bone-ghost group-hover:text-bone-dim transition-colors shrink-0 text-xs font-mono uppercase tracking-terminal">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
}
