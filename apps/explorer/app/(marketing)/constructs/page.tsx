import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';

export const revalidate = 300;

export const metadata = {
  title: 'Constructs',
  description: 'Browse AI agent constructs — preserved expertise you jack into your agent.',
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
      <div>
        <h1 className="text-2xl font-mono font-bold text-white">Constructs</h1>
        <p className="text-sm font-mono text-white/60 mt-1">
          {allConstructs.length} constructs available
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        <Link
          href="/constructs"
          className={`border px-3 py-1 transition-colors ${
            !params.category || params.category === 'all'
              ? 'border-white text-white'
              : 'border-white/20 text-white/60 hover:border-white/40'
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
                ? 'border-white text-white'
                : 'border-white/20 text-white/60 hover:border-white/40'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm font-mono text-white/40 py-12 text-center">
          No constructs found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((construct) => (
            <Link
              key={construct.id}
              href={`/constructs/${construct.slug}`}
              className="border border-white/10 p-4 hover:border-white/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-bold text-white group-hover:text-white/90">
                  {construct.name}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  {construct.type}
                </span>
              </div>
              <p className="text-xs font-mono text-white/50 line-clamp-2 mb-3">
                {construct.shortDescription}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
                <span>{construct.category}</span>
                <span>{construct.downloads.toLocaleString()} downloads</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
