'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { resolveShortDescription } from '@/lib/utils/resolve-short-description';

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  shortDescription: string;
  category: string;
  type: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allConstructs, setAllConstructs] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all constructs on first open
  useEffect(() => {
    if (open && !loaded) {
      fetch(`${API_BASE}/constructs`)
        .then((r) => r.json())
        .then((json) => {
          const data = (json.data || []).map((c: Record<string, unknown>) => ({
            id: c.id as string,
            slug: c.slug as string,
            name: c.name as string,
            icon: c.icon as string | undefined,
            shortDescription: resolveShortDescription(c.short_description as string, c.description as string),
            category: c.category as string,
            type: c.type as string,
          }));
          setAllConstructs(data);
          setResults(data.slice(0, 8));
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded]);

  // Filter results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults(allConstructs.slice(0, 8));
    } else {
      const q = query.toLowerCase();
      const filtered = allConstructs.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortDescription.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q)
      );
      setResults(filtered.slice(0, 8));
    }
    setSelectedIndex(0);
  }, [query, allConstructs]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (
        e.key === '/' &&
        !open &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
        router.push(`/constructs/${results[selectedIndex].slug}`);
        setOpen(false);
        setQuery('');
      }
    },
    [results, selectedIndex, router]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      router.push(`/constructs/${result.slug}`);
      setOpen(false);
      setQuery('');
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div
        className="absolute inset-0 bg-void-base/80"
        onClick={() => { setOpen(false); setQuery(''); }}
      />

      <div className="relative w-full max-w-2xl mx-4 border border-void-border bg-void-base">
        {/* Input */}
        <div className="border-b border-void-border px-6 py-5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handlePaletteKeyDown}
            placeholder="Search constructs..."
            className="w-full bg-transparent font-mono text-xl text-bone-base placeholder:text-bone-ghost focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!loaded ? (
            <div className="px-6 py-12 text-center">
              <p className="font-mono text-base text-bone-ghost">Loading...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-mono text-base text-bone-ghost">No constructs found</p>
            </div>
          ) : (
            <ul>
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors ${
                      index === selectedIndex ? 'bg-void-raised' : ''
                    }`}
                  >
                    {result.icon && (
                      <span className="text-xl shrink-0">{result.icon}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg uppercase tracking-display text-bone-base">
                          {result.name}
                        </span>
                        <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                          {result.category}
                        </span>
                      </div>
                      <p className="truncate font-mono text-base text-bone-muted mt-1">
                        {result.shortDescription}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-void-border px-6 py-3">
          <div className="flex items-center gap-4 font-mono text-sm text-bone-ghost">
            <span><kbd className="border border-void-border px-1.5 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="border border-void-border px-1.5 py-0.5">↵</kbd> open</span>
            <span><kbd className="border border-void-border px-1.5 py-0.5">esc</kbd> close</span>
          </div>
          <span className="font-mono text-sm text-bone-ghost">
            {results.length} results
          </span>
        </div>
      </div>
    </div>
  );
}
