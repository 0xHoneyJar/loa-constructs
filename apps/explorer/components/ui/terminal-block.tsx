'use client';

import { useState, useCallback } from 'react';

/* ─── CopyLine ─────────────────────────────────────────────────────────────── */

interface CopyLineProps {
  command: string;
  output?: string;
}

export function CopyLine({ command, output }: CopyLineProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div>
      <button
        type="button"
        onClick={handleCopy}
        className="group/line w-full flex items-center justify-between gap-3 px-5 py-3 text-left cursor-pointer font-mono text-sm sm:text-base border-b border-void-border last:border-b-0"
        style={{
          transition: `background-color var(--duration-quantum) var(--ease-quantum)`,
        }}
        aria-label={copied ? 'Copied to clipboard' : `Copy command: ${command}`}
      >
        <div className="whitespace-nowrap overflow-x-auto">
          <span className="text-bone-ghost">$ </span>
          <span className="text-cyan-base">{command}</span>
        </div>
        <span
          className="shrink-0 text-xs font-mono uppercase text-bone-ghost group-hover/line:text-bone-dim"
          style={{
            letterSpacing: 'var(--tracking-terminal)',
            transition: `color var(--duration-quantum) var(--ease-quantum)`,
          }}
        >
          {copied ? 'COPIED' : 'COPY'}
        </span>
      </button>
      {output && (
        <div className="px-5 py-2.5 font-mono text-xs sm:text-sm text-bone-muted border-b border-void-border last:border-b-0 select-none">
          {output}
        </div>
      )}
    </div>
  );
}

/* ─── TerminalBlock ────────────────────────────────────────────────────────── */

interface TerminalLine {
  type: 'command' | 'output';
  text: string;
  copiable?: boolean;
}

interface TerminalBlockProps {
  lines: TerminalLine[];
  title?: string;
}

export function TerminalBlock({ lines, title }: TerminalBlockProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className="border border-void-border hover:border-bone-ghost"
      style={{
        transition: `border-color var(--duration-normal) var(--ease-default)`,
      }}
    >
      {title && (
        <div
          className="px-5 py-2 border-b border-void-border font-mono text-xs text-bone-ghost uppercase"
          style={{ letterSpacing: 'var(--tracking-terminal)' }}
        >
          {title}
        </div>
      )}
      {lines.map((line, i) => {
        if (line.type === 'command' && line.copiable) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleCopy(line.text, i)}
              className="group/line w-full px-5 py-3 font-mono text-sm sm:text-base flex items-center justify-between gap-3 cursor-pointer text-left border-b border-void-border last:border-b-0"
              style={{
                transition: `background-color var(--duration-quantum) var(--ease-quantum)`,
              }}
              aria-label={
                copiedIndex === i
                  ? 'Copied to clipboard'
                  : 'Click to copy command'
              }
            >
              <div className="whitespace-nowrap overflow-x-auto">
                <span className="text-bone-ghost">$ </span>
                <span className="text-cyan-base">{line.text}</span>
              </div>
              <span
                className="text-bone-ghost group-hover/line:text-bone-dim shrink-0 text-xs font-mono uppercase"
                style={{
                  letterSpacing: 'var(--tracking-terminal)',
                  transition: `color var(--duration-quantum) var(--ease-quantum)`,
                }}
              >
                {copiedIndex === i ? 'COPIED' : 'COPY'}
              </span>
            </button>
          );
        }

        if (line.type === 'command') {
          return (
            <div
              key={i}
              className="px-5 py-3 font-mono text-sm sm:text-base border-b border-void-border last:border-b-0"
            >
              <span className="text-bone-ghost">$ </span>
              <span className="text-bone-base">{line.text}</span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="px-5 py-2.5 font-mono text-xs sm:text-sm text-bone-muted border-b border-void-border last:border-b-0 select-none"
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
