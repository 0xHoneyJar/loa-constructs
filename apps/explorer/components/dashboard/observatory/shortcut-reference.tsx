'use client';

import { useState, useEffect } from 'react';

const shortcutGroups = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['J', '↓'], description: 'Next signal' },
      { keys: ['K', '↑'], description: 'Previous signal' },
      { keys: ['Enter', 'L'], description: 'Open detail pane' },
      { keys: ['Esc'], description: 'Close / go back' },
      { keys: ['F'], description: 'Focus filter bar' },
    ],
  },
  {
    label: 'Selection',
    shortcuts: [
      { keys: ['Shift+J'], description: 'Extend selection down' },
      { keys: ['Shift+K'], description: 'Extend selection up' },
      { keys: ['X'], description: 'Toggle select' },
      { keys: ['⌘A'], description: 'Select all visible' },
    ],
  },
  {
    label: 'Triage',
    shortcuts: [
      { keys: ['D'], description: 'Dismiss signal' },
      { keys: ['T'], description: 'Triage signal' },
      { keys: ['E'], description: 'Escalate to Linear' },
      { keys: ['R'], description: 'Resolve signal' },
    ],
  },
  {
    label: 'Filters',
    shortcuts: [
      { keys: ['1'], description: 'Critical' },
      { keys: ['2'], description: 'High' },
      { keys: ['3'], description: 'Medium' },
      { keys: ['4'], description: 'Low' },
    ],
  },
  {
    label: 'Global',
    shortcuts: [
      { keys: ['⌘K'], description: 'Command palette' },
      { keys: ['/'], description: 'Search' },
      { keys: ['?'], description: 'This reference' },
    ],
  },
];

export function ShortcutReference() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (document.querySelector('.fixed.inset-0.z-50')) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-void-base/80"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg mx-4 border border-void-border bg-void-base">
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <span className="font-mono text-[11px] text-bone-base uppercase tracking-terminal">
            Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-[10px] text-bone-ghost hover:text-bone-base transition-colors"
          >
            esc
          </button>
        </div>
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <div className="font-mono text-[8px] text-bone-ghost uppercase tracking-widest mb-2">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono text-[10px] text-bone-dim">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-block px-1.5 py-0.5 font-mono text-[9px] text-bone-base border border-void-border bg-void-raised min-w-[20px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
