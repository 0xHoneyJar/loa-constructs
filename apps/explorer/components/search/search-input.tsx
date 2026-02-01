'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchQuery, setSearchQuery } = useGraphStore();

  // Focus on `/` key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchQuery]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleChange}
        placeholder="Search constructs..."
        className="h-8 w-48 rounded-md border border-border bg-surface/50 px-3 pr-8 font-mono text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-0 sm:w-64"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <span className="sr-only">Clear search</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 font-mono text-[10px] text-white/30">
          /
        </kbd>
      )}
    </div>
  );
}
