'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useConstructs } from '@/lib/api/hooks';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';

const categories = ['all', 'development', 'devops', 'marketing', 'sales', 'support', 'analytics', 'security', 'other'];
const tierOptions = ['all', 'free', 'pro', 'team', 'enterprise'];

export default function SkillsBrowserPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tier, setTier] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useConstructs({
    query: search || undefined,
    category: category !== 'all' ? category : undefined,
    tier: tier !== 'all' ? tier : undefined,
    page,
  });

  const items = data?.data ?? [];

  const { currentIndex } = useKeyboardNav({
    itemCount: items.length,
    onSelect: (index) => {
      const item = items[index];
      if (item) window.location.href = `/skills/${item.slug}`;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-mono text-tui-bright">Skills Browser</h1>
        <p className="text-xs font-mono text-tui-dim mt-1">Browse and install constructs.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search..."
          className="flex-1 min-w-[200px] bg-transparent border border-tui-border px-3 py-1.5 text-sm font-mono text-tui-fg placeholder:text-tui-dim/50 focus:outline-none focus:border-tui-accent"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="bg-transparent border border-tui-border px-3 py-1.5 text-sm font-mono text-tui-fg focus:outline-none focus:border-tui-accent"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value); setPage(1); }}
          className="bg-transparent border border-tui-border px-3 py-1.5 text-sm font-mono text-tui-fg focus:outline-none focus:border-tui-accent"
        >
          {tierOptions.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All Tiers' : t}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <Panel title={`Results${data ? ` (${data.pagination.total})` : ''}`}>
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading constructs...</p>
        ) : !items.length ? (
          <p className="text-xs font-mono text-tui-dim">No constructs found.</p>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => (
              <Link
                key={item.id}
                href={`/skills/${item.slug}`}
                className={`block px-3 py-2 text-xs font-mono transition-colors ${
                  index === currentIndex
                    ? 'bg-tui-accent/10 text-tui-accent'
                    : 'text-tui-fg hover:bg-tui-dim/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-tui-dim">{index === currentIndex ? '▸' : ' '}</span>
                    <span className="text-tui-bright">{item.name}</span>
                    {item.version && (
                      <span className="text-tui-dim">v{item.version}</span>
                    )}
                    <span className="text-tui-dim uppercase text-[10px]">{item.tier_required}</span>
                  </div>
                  <span className="text-tui-dim">{item.downloads.toLocaleString()} ↓</span>
                </div>
                {item.description && (
                  <p className="text-tui-dim ml-6 mt-0.5 truncate">{item.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-xs font-mono">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Prev
          </Button>
          <span className="text-tui-dim">
            Page {page} of {data.pagination.total_pages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.total_pages}
          >
            Next →
          </Button>
        </div>
      )}

      <p className="text-[10px] font-mono text-tui-dim text-center">
        j/k navigate · Enter select · 1-9 jump
      </p>
    </div>
  );
}
