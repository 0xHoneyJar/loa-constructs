'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { ConstructNode } from '@/lib/types/graph';
import { Badge } from '@/components/ui/badge';

/* ── Intent cards ── */

interface IntentCard {
  id: string;
  label: string;
  description: string;
  /** Construct slugs or categories that match this intent */
  matchSlugs?: string[];
  matchCategories?: string[];
  matchDomains?: string[];
}

const INTENT_CARDS: IntentCard[] = [
  {
    id: 'create',
    label: 'Create',
    description: 'Build new features and applications',
    matchCategories: ['development', 'design', 'infrastructure'],
    matchDomains: ['frontend', 'backend', 'full-stack', 'web development', 'react', 'next.js'],
  },
  {
    id: 'validate',
    label: 'Validate',
    description: 'Test, audit, and verify quality',
    matchCategories: ['testing', 'security'],
    matchDomains: ['testing', 'qa', 'security', 'auditing', 'code review', 'verification'],
  },
  {
    id: 'launch',
    label: 'Launch',
    description: 'Deploy, ship, and release',
    matchCategories: ['infrastructure', 'operations'],
    matchDomains: ['devops', 'deployment', 'ci/cd', 'cloud', 'infrastructure', 'monitoring'],
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Explore, analyze, and discover',
    matchCategories: ['research', 'documentation'],
    matchDomains: ['research', 'analysis', 'data', 'documentation', 'knowledge'],
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Plan, coordinate, and manage',
    matchCategories: ['operations', 'design'],
    matchDomains: ['project management', 'planning', 'strategy', 'architecture', 'leadership'],
  },
];

function matchesIntent(construct: ConstructNode, intent: IntentCard): boolean {
  if (intent.matchSlugs?.includes(construct.slug)) return true;
  if (intent.matchCategories?.includes(construct.category)) return true;
  if (intent.matchDomains && construct.domains) {
    const lowerDomains = construct.domains.map(d => d.toLowerCase());
    return intent.matchDomains.some(md => lowerDomains.some(d => d.includes(md)));
  }
  return false;
}

/* ── Fuse.js config ── */

const FUSE_OPTIONS: IFuseOptions<ConstructNode> = {
  keys: [
    { name: 'name', weight: 0.35 },
    { name: 'description', weight: 0.2 },
    { name: 'shortDescription', weight: 0.15 },
    { name: 'domains', weight: 0.15 },
    { name: 'skillSlugs', weight: 0.1 },
    { name: 'category', weight: 0.05 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/* ── Main catalog component ── */

interface ConstructCatalogProps {
  constructs: ConstructNode[];
}

export function ConstructCatalog({ constructs }: ConstructCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Read URL state
  const urlQuery = searchParams.get('q') || '';
  const urlTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const urlIntent = searchParams.get('intent') || '';

  // Local state
  const [query, setQuery] = useState(urlQuery);
  const [activeTags, setActiveTags] = useState<string[]>(urlTags);
  const [activeIntent, setActiveIntent] = useState<string>(urlIntent);

  // Build Fuse.js search index
  const fuse = useMemo(() => new Fuse(constructs, FUSE_OPTIONS), [constructs]);

  // Collect all unique domains for tag pills
  const allDomains = useMemo(() => {
    const domainSet = new Set<string>();
    for (const c of constructs) {
      if (c.domains) {
        for (const d of c.domains) {
          domainSet.add(d);
        }
      }
    }
    return [...domainSet].sort();
  }, [constructs]);

  // Build filtered results
  const filtered = useMemo(() => {
    let results = constructs;

    // Apply Fuse.js search
    if (query.trim().length >= 2) {
      results = fuse.search(query.trim()).map(r => r.item);
    }

    // Apply domain tag filters (AND logic)
    if (activeTags.length > 0) {
      results = results.filter(c => {
        if (!c.domains) return false;
        const lowerDomains = c.domains.map(d => d.toLowerCase());
        return activeTags.every(tag => lowerDomains.includes(tag.toLowerCase()));
      });
    }

    // Apply intent filter
    if (activeIntent) {
      const intent = INTENT_CARDS.find(i => i.id === activeIntent);
      if (intent) {
        results = results.filter(c => matchesIntent(c, intent));
      }
    }

    // Sort: downloads descending (unless search query active — Fuse already ranks by relevance)
    if (!query.trim()) {
      results = [...results].sort((a, b) => b.downloads - a.downloads);
    }

    return results;
  }, [constructs, query, activeTags, activeIntent, fuse]);

  // Sync state to URL (debounced)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToUrl = useCallback(
    (q: string, tags: string[], intent: string) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (tags.length > 0) params.set('tags', tags.join(','));
        if (intent) params.set('intent', intent);
        const qs = params.toString();
        router.replace(`/constructs${qs ? `?${qs}` : ''}`, { scroll: false });
      }, 300);
    },
    [router],
  );

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    syncToUrl(v, activeTags, activeIntent);
  };

  const handleClearQuery = () => {
    setQuery('');
    syncToUrl('', activeTags, activeIntent);
    inputRef.current?.focus();
  };

  const toggleTag = (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    setActiveTags(next);
    syncToUrl(query, next, activeIntent);
  };

  const toggleIntent = (intentId: string) => {
    const next = activeIntent === intentId ? '' : intentId;
    setActiveIntent(next);
    syncToUrl(query, activeTags, next);
  };

  const clearAllFilters = () => {
    setQuery('');
    setActiveTags([]);
    setActiveIntent('');
    syncToUrl('', [], '');
  };

  const hasFilters = query.trim() || activeTags.length > 0 || activeIntent;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-display text-bone-bright">
            Constructs
          </h1>
          <p className="text-base font-mono text-bone-muted mt-1">
            {constructs.length} constructs available
            {hasFilters && filtered.length !== constructs.length && (
              <span className="text-bone-ghost">
                {' '}&middot; {filtered.length} shown
              </span>
            )}
          </p>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search constructs..."
            className="h-10 w-48 sm:w-64 border border-void-border bg-transparent px-3 pr-8 font-mono text-base text-bone-base placeholder:text-bone-ghost focus:border-bone-ghost focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClearQuery}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-bone-ghost hover:text-bone-bright"
            >
              <span className="sr-only">Clear</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 border border-void-border px-1.5 font-mono text-sm text-bone-ghost">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Intent entry cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-void-border">
        {INTENT_CARDS.map(intent => (
          <button
            key={intent.id}
            type="button"
            onClick={() => toggleIntent(intent.id)}
            className={`bg-void-base p-4 text-left transition-colors ${
              activeIntent === intent.id
                ? 'bg-void-raised border-l-2 border-l-cyan-dim'
                : 'hover:bg-void-raised'
            }`}
          >
            <span className={`font-mono text-sm font-bold uppercase tracking-terminal block ${
              activeIntent === intent.id ? 'text-cyan-dim' : 'text-bone-base'
            }`}>
              {intent.label}
            </span>
            <span className="font-mono text-xs text-bone-ghost mt-1 block">
              {intent.description}
            </span>
          </button>
        ))}
      </div>

      {/* Domain tag pills */}
      {allDomains.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allDomains.map(domain => (
            <button
              key={domain}
              type="button"
              onClick={() => toggleTag(domain)}
              className={`px-2.5 py-1 font-mono text-xs uppercase tracking-terminal border transition-colors ${
                activeTags.includes(domain)
                  ? 'border-cyan-dim text-cyan-dim bg-tint-cyan-dim-bg'
                  : 'border-void-border text-bone-ghost hover:border-bone-ghost hover:text-bone-muted'
              }`}
            >
              {domain}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-2.5 py-1 font-mono text-xs uppercase tracking-terminal border border-crimson-dim text-crimson-dim hover:bg-tint-crimson-bg transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Construct grid — flat catalog, no pagination */}
      {filtered.length === 0 ? (
        <p className="text-lg font-mono text-bone-ghost py-12 text-center">
          No constructs match your filters.
          {hasFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="block mx-auto mt-3 font-mono text-sm text-cyan-dim hover:text-cyan-base transition-colors"
            >
              Clear filters
            </button>
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-void-border">
          {filtered.map(construct => (
            <Link
              key={construct.id}
              href={`/constructs/${construct.slug}`}
              className="bg-void-base p-5 hover:bg-void-raised transition-colors group"
            >
              {/* Row 1: logomark or icon + name + badges */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {construct.logoWordmark ? (
                    <span
                      className="shrink-0 text-bone-base group-hover:text-bone-bright transition-colors [&_svg]:h-8 [&_svg]:w-auto"
                      dangerouslySetInnerHTML={{ __html: construct.logoWordmark }}
                    />
                  ) : (
                    <>
                      {construct.logoMark ? (
                        <span
                          className="shrink-0 text-bone-base group-hover:text-bone-bright transition-colors [&_svg]:h-7 [&_svg]:w-7"
                          dangerouslySetInnerHTML={{ __html: construct.logoMark }}
                        />
                      ) : construct.icon ? (
                        <span className="text-2xl shrink-0">{construct.icon}</span>
                      ) : null}
                      <span className="font-mono text-xl font-bold text-bone-base group-hover:text-bone-bright transition-colors truncate">
                        {construct.name}
                      </span>
                    </>
                  )}
                  {construct.constructType !== 'skill-pack' && (
                    <Badge variant="cyan">
                      {construct.constructType.replace(/-/g, ' ')}
                    </Badge>
                  )}
                  {construct.visibility === 'internal' && (
                    <Badge variant="internal">internal</Badge>
                  )}
                  {construct.verificationTier === 'PROVEN' && (
                    <Badge variant="proven">proven</Badge>
                  )}
                </div>

                {/* Skill count badge */}
                {construct.skillsCount > 0 && (
                  <span className="font-mono text-sm text-bone-ghost mt-0.5 shrink-0 border border-void-border px-1.5 py-0.5">
                    {construct.skillsCount} {construct.skillsCount === 1 ? 'skill' : 'skills'}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="font-mono text-base text-bone-muted line-clamp-2 mb-4 leading-relaxed">
                {construct.shortDescription}
              </p>

              {/* Domain chips */}
              {construct.domains && construct.domains.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {construct.domains.slice(0, 4).map(domain => (
                    <span
                      key={domain}
                      className="px-1.5 py-0.5 font-mono text-xs uppercase tracking-terminal text-bone-ghost border border-void-border"
                    >
                      {domain}
                    </span>
                  ))}
                  {construct.domains.length > 4 && (
                    <span className="px-1.5 py-0.5 font-mono text-xs text-bone-ghost">
                      +{construct.domains.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Footer: category + composition degree + installs */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                    {construct.category}
                  </span>
                  {construct.composesWith && construct.composesWith.length > 0 && (
                    <span className="font-mono text-xs text-bone-ghost border border-void-border px-1 py-0.5" title={`Composes with: ${construct.composesWith.join(', ')}`}>
                      +{construct.composesWith.length}
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm text-bone-ghost">
                  {construct.downloads.toLocaleString()} installs
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
