import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';
import { CatalogSearch } from './catalog-search';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata = {
  title: 'Constructs',
  description: 'Browse AI agent constructs — named expertise you install into your coding agent.',
};

export default async function ConstructsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const allConstructs = await fetchAllConstructs();

  // Use API search when query is present (server-side relevance scoring)
  let filtered = params.q
    ? await searchConstructs(params.q)
    : allConstructs;

  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((c) => c.category === params.category);
  }

  if (!params.q) {
    if (params.sort === 'name') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered = filtered.sort((a, b) => b.downloads - a.downloads);
    }
  }

  const categories = [...new Set(allConstructs.map((c) => c.category))].sort();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-display text-bone-bright">Constructs</h1>
          <p className="text-xs font-mono text-bone-muted mt-1">
            {allConstructs.length} constructs available
          </p>
        </div>
        <CatalogSearch defaultValue={params.q} />
      </div>

      {/* Category Filters */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-terminal">
          <Link
            href="/constructs"
            className={`border px-3 py-1 transition-colors ${
              !params.category || params.category === 'all'
                ? 'border-cyan-dim text-cyan-dim'
                : 'border-void-border text-bone-ghost hover:border-bone-ghost hover:text-bone-muted'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/constructs?category=${cat}`}
              className={`border px-3 py-1 transition-colors ${
                params.category === cat
                  ? 'border-cyan-dim text-cyan-dim'
                  : 'border-void-border text-bone-ghost hover:border-bone-ghost hover:text-bone-muted'
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm font-mono text-bone-ghost py-12 text-center">
          No constructs found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-void-border">
          {filtered.map((construct) => (
            <Link
              key={construct.id}
              href={`/constructs/${construct.slug}`}
              className="bg-void-base p-5 hover:bg-void-raised transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-mono text-sm font-bold text-bone-base group-hover:text-bone-bright transition-colors">
                  {construct.icon && <span className="mr-1.5">{construct.icon}</span>}
                  {construct.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-whisper text-bone-ghost mt-0.5">
                  {construct.skillsCount > 0 && `${construct.skillsCount}s`}
                </span>
              </div>
              <p className="font-mono text-xs text-bone-muted line-clamp-2 mb-4 leading-relaxed">
                {construct.shortDescription}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-whisper text-bone-ghost">
                  {construct.category}
                </span>
                <span className="font-mono text-[10px] text-bone-ghost">
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
