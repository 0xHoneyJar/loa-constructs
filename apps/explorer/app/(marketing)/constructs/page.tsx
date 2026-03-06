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
    if (params.sort === 'downloads') {
      filtered = filtered.sort((a, b) => b.downloads - a.downloads);
    } else if (params.sort === 'name') {
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
          <h1 className="text-2xl font-mono font-boldtext-bone-base">Constructs</h1>
          <p className="text-sm font-mono text-bone-dim mt-1">
            {allConstructs.length} constructs available
          </p>
        </div>
        <CatalogSearch defaultValue={params.q} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        <Link
          href="/constructs"
          className={`border px-3 py-1 transition-colors ${
            !params.category || params.category === 'all'
              ? 'border-white text-bone-base'
              : 'border-bone-ghost text-bone-dim hover:border-bone-muted'
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
                ? 'border-white text-bone-base'
                : 'border-bone-ghost text-bone-dim hover:border-bone-muted'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm font-mono text-bone-ghost py-12 text-center">
          No constructs found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((construct) => (
            <Link
              key={construct.id}
              href={`/constructs/${construct.slug}`}
              className="border border-void-border p-4 hover:border-bone-ghost transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-bold text-bone-base group-hover:text-bone-base">
                  {construct.icon && <span className="mr-1.5">{construct.icon}</span>}
                  {construct.name}
                </span>
                <span className="text-[10px] font-mono text-bone-ghost">
                  {construct.skillsCount > 0 && `${construct.skillsCount} skills`}
                </span>
              </div>
              <p className="text-xs font-mono text-bone-muted line-clamp-2 mb-3">
                {construct.shortDescription}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-bone-ghost">
                <span>{construct.category}</span>
                <span>{construct.downloads.toLocaleString()} installs</span>
              </div>
              <div className="mt-3 pt-2 border-t border-void-border">
                <code className="text-[10px] font-mono text-white/20 group-hover:text-bone-ghost transition-colors">
                  constructs install {construct.slug}
                </code>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
