'use client';

import { useEffect, useCallback } from 'react';

export function SearchTrigger() {
  const handleClick = useCallback(() => {
    // Dispatch the same keyboard event that CommandPalette listens for
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    );
  }, []);

  // Also handle `/` key to open palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 border border-void-border bg-transparent px-3 py-1.5 font-mono text-[11px] text-bone-ghost hover:border-bone-ghost hover:text-bone-muted transition-colors"
    >
      <span className="hidden sm:inline">Search</span>
      <kbd className="border border-void-border px-1 text-[10px] text-bone-ghost">
        <span className="hidden sm:inline">/</span>
        <span className="sm:hidden">K</span>
      </kbd>
    </button>
  );
}
