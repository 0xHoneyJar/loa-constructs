'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { resolveShortDescription } from '@/lib/utils/resolve-short-description';
import { useObservatoryStore } from '@/lib/stores/observatory-store';
import { updateSignalStatus } from '@/app/actions/signal-actions';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  shortDescription: string;
  category: string;
  type: 'construct' | 'action' | 'navigate';
  action?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';

function getObservatoryActions(router: ReturnType<typeof useRouter>): SearchResult[] {
  return [
    {
      id: 'nav-observatory',
      slug: '',
      name: 'Observatory',
      icon: '◉',
      shortDescription: 'Go to signals observatory',
      category: 'Navigation',
      type: 'navigate',
      action: () => router.push('/dashboard/observatory'),
    },
    {
      id: 'nav-overview',
      slug: '',
      name: 'Overview',
      icon: '◫',
      shortDescription: 'Go to dashboard overview',
      category: 'Navigation',
      type: 'navigate',
      action: () => router.push('/dashboard'),
    },
    {
      id: 'action-dismiss',
      slug: '',
      name: 'Dismiss Selected Signal',
      icon: '×',
      shortDescription: 'Mark the selected signal as dismissed',
      category: 'Action',
      type: 'action',
      action: () => {
        const { selectedSignalId, selectNext } = useObservatoryStore.getState();
        if (!selectedSignalId) {
          toast.error('No signal selected');
          return;
        }
        updateSignalStatus(selectedSignalId, 'dismissed').then(() => {
          toast.success('Signal dismissed');
          selectNext();
        });
      },
    },
    {
      id: 'action-triage',
      slug: '',
      name: 'Triage Selected Signal',
      icon: '▸',
      shortDescription: 'Mark the selected signal as triaged',
      category: 'Action',
      type: 'action',
      action: () => {
        const { selectedSignalId, selectNext } = useObservatoryStore.getState();
        if (!selectedSignalId) {
          toast.error('No signal selected');
          return;
        }
        updateSignalStatus(selectedSignalId, 'triaged').then(() => {
          toast.success('Signal triaged');
          selectNext();
        });
      },
    },
    {
      id: 'filter-critical',
      slug: '',
      name: 'Filter: Critical Only',
      icon: '⬤',
      shortDescription: 'Show only critical severity signals',
      category: 'Filter',
      type: 'action',
      action: () => {
        const { filters, setFilter } = useObservatoryStore.getState();
        setFilter('severity', filters.severity === 'critical' ? null : 'critical');
      },
    },
    {
      id: 'filter-clear',
      slug: '',
      name: 'Clear All Filters',
      icon: '⌀',
      shortDescription: 'Reset all observatory filters',
      category: 'Filter',
      type: 'action',
      action: () => {
        useObservatoryStore.getState().clearFilters();
      },
    },
  ];
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allConstructs, setAllConstructs] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnObservatory = pathname === '/dashboard/observatory';

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
            type: 'construct' as const,
          }));
          setAllConstructs(data);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded]);

  // Filter results when query changes
  useEffect(() => {
    const observatoryActions = isOnObservatory ? getObservatoryActions(router) : [];
    const allItems = [...observatoryActions, ...allConstructs];

    if (!query.trim()) {
      // Show actions first when on observatory, then constructs
      setResults(allItems.slice(0, 10));
    } else {
      const q = query.toLowerCase();
      const filtered = allItems.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortDescription.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.slug && c.slug.toLowerCase().includes(q))
      );
      setResults(filtered.slice(0, 10));
    }
    setSelectedIndex(0);
  }, [query, allConstructs, isOnObservatory, router]);

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
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.type === 'action' || result.type === 'navigate') {
        result.action?.();
      } else {
        router.push(`/constructs/${result.slug}`);
      }
      setOpen(false);
      setQuery('');
    },
    [router]
  );

  if (!open) return null;

  // Group results by category for section headers
  const groupedResults: Array<{ header?: string; result: SearchResult; index: number }> = [];
  let lastCategory = '';
  results.forEach((result, index) => {
    const cat = result.type === 'construct' ? 'Constructs' : result.category;
    if (cat !== lastCategory) {
      groupedResults.push({ header: cat, result, index });
      lastCategory = cat;
    } else {
      groupedResults.push({ result, index });
    }
  });

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
            placeholder={isOnObservatory ? 'Search actions, filters, constructs...' : 'Search constructs...'}
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
              <p className="font-mono text-base text-bone-ghost">No results found</p>
            </div>
          ) : (
            <ul>
              {groupedResults.map((item) => (
                <li key={item.result.id}>
                  {item.header && (
                    <div className="px-6 pt-3 pb-1">
                      <span className="font-mono text-[9px] text-bone-ghost uppercase tracking-widest">
                        {item.header}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(item.result)}
                    onMouseEnter={() => setSelectedIndex(item.index)}
                    className={`flex w-full items-center gap-4 px-6 py-3 text-left transition-colors ${
                      item.index === selectedIndex ? 'bg-void-raised' : ''
                    }`}
                  >
                    {item.result.icon && (
                      <span className={`text-lg shrink-0 ${
                        item.result.type === 'action' ? 'text-cyan-base' :
                        item.result.type === 'navigate' ? 'text-bone-muted' :
                        ''
                      }`}>
                        {item.result.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-base uppercase tracking-terminal ${
                          item.result.type === 'construct' ? 'font-display text-lg tracking-display' : ''
                        } text-bone-base`}>
                          {item.result.name}
                        </span>
                        {item.result.type === 'construct' && (
                          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                            {item.result.category}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-sm text-bone-muted mt-0.5">
                        {item.result.shortDescription}
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
            <span><kbd className="border border-void-border px-1.5 py-0.5">↵</kbd> select</span>
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
