'use client';

import { cn } from '@/lib/utils/cn';
import { ReactNode } from 'react';

interface KeyHint {
  key: string;
  action: string;
}

interface StatusBarProps {
  keyHints?: KeyHint[];
  rightContent?: ReactNode;
  className?: string;
}

const defaultKeyHints: KeyHint[] = [
  { key: 'j/k', action: 'navigate' },
  { key: 'Enter', action: 'select' },
  { key: '1-6', action: 'jump' },
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="border border-tui-border bg-transparent px-1 font-mono text-[11px]">
      {children}
    </kbd>
  );
}

export function StatusBar({ keyHints = defaultKeyHints, rightContent, className }: StatusBarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between border-t border-tui-border bg-tui-bg/75 px-3 py-1 text-xs font-mono text-tui-dim',
        className,
      )}
    >
      <div className="hidden items-center gap-4 md:flex">
        {keyHints.map((hint, i) => (
          <span key={i}>
            <Kbd>{hint.key}</Kbd> {hint.action}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4">{rightContent}</div>
    </div>
  );
}
