import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';

import { AuthAwareConstructList } from '@/components/constructs/auth-aware-construct-list';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

export const metadata = {
  title: 'Constructs',
  description: 'Browse AI agent constructs — skills you install into your coding agent.',
};

export default async function ConstructsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const allConstructs = await fetchAllConstructs();

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
    <div className="space-y-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-display text-bone-bright">Catalog</h1>
          <p className="text-base font-mono text-bone-muted mt-3">
            {allConstructs.length} constructs
          </p>
        </div>
      </div>

      {/* Category Filters */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 font-mono text-sm uppercase tracking-terminal">
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

      {/* Construct grid — 2 columns, generous spacing */}
      <AuthAwareConstructList publicConstructs={filtered}>
        {filtered.length === 0 ? (
          <p className="text-lg font-mono text-bone-ghost py-16 text-center">
            No constructs found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filtered.map((construct) => (
              <Link
                key={construct.id}
                href={`/constructs/${construct.slug}`}
                className="border border-void-border p-6 sm:p-8 hover:border-bone-ghost transition-colors group"
              >
                <div className="flex items-center gap-3 mb-4">
                  {construct.logoWordmark ? (
                    <div
                      className="text-bone-base group-hover:text-bone-bright transition-colors [&_svg]:h-8 sm:[&_svg]:h-10 [&_svg]:w-auto [&_svg]:max-w-full"
                      style={{ color: 'currentColor' }}
                      dangerouslySetInnerHTML={{ __html: construct.logoWordmark }}
                    />
                  ) : (
                    <>
                      {construct.icon && (
                        <span className="text-2xl shrink-0">{construct.icon}</span>
                      )}
                      <span className="font-display text-xl uppercase tracking-display text-bone-base group-hover:text-bone-bright transition-colors">
                        {construct.name}
                      </span>
                    </>
                  )}
                  {construct.verificationTier === 'PROVEN' && (
                    <Badge variant="proven">proven</Badge>
                  )}
                </div>
                <p className="font-mono text-base text-bone-dim leading-relaxed line-clamp-2">
                  {construct.shortDescription}
                </p>
                <div className="mt-6 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                  {construct.category}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AuthAwareConstructList>
    </div>
  );
}
