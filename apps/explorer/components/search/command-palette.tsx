'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { Badge } from '@/components/ui/badge';
import type { ConstructNode, Domain } from '@/lib/types/graph';

interface CommandPaletteProps {
  nodes: ConstructNode[];
}

export function CommandPalette({ nodes }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fuse = useMemo(() => {
    return new Fuse(nodes, {
      keys: ['name', 'description', 'shortDescription'],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [nodes]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return nodes.slice(0, 10);
    }
    return fuse.search(query).slice(0, 10).map((r) => r.item);
  }, [fuse, query, nodes]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Close with Escape
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Handle navigation within palette
  const handlePaletteKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        router.push(`/${results[selectedIndex].slug}`);
        setOpen(false);
        setQuery('');
      }
    },
    [results, selectedIndex, router]
  );

  const handleSelect = useCallback(
    (node: ConstructNode) => {
      router.push(`/${node.slug}`);
      setOpen(false);
      setQuery('');
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setOpen(false);
          setQuery('');
        }}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
        {/* Search input */}
        <div className="border-b border-border p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handlePaletteKeyDown}
            placeholder="Search constructs..."
            autoFocus
            className="w-full bg-transparent font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-mono text-xs text-white/40">No constructs found</p>
            </div>
          ) : (
            <ul>
              {results.map((node, index) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(node)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">
                          {node.name}
                        </span>
                        <Badge variant={node.domain as Domain} className="text-[10px]">
                          {node.type}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-white/50">
                        {node.shortDescription}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                        ↵
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            <span>
              <kbd className="rounded border border-border bg-background px-1">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1">↵</kbd> select
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1">esc</kbd> close
            </span>
          </div>
          <span className="font-mono text-[10px] text-white/30">
            {results.length} results
          </span>
        </div>
      </div>
    </div>
  );
}
