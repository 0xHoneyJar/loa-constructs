import Link from 'next/link';
import { fetchGraphData, fetchAllConstructs } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';
import { CategoryInitializer } from '@/components/graph/category-initializer';

// ISR — revalidate hourly, won't block builds (fetch has error fallback)
export const revalidate = 3600;

export default async function HomePage() {
  const [{ graphData, categories }, allConstructs] = await Promise.all([
    fetchGraphData(),
    fetchAllConstructs(),
  ]);

  // Top constructs by downloads for the featured section
  const featured = [...allConstructs]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 4);

  const totalSkills = allConstructs.reduce((sum, c) => sum + c.skillsCount, 0);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-white/10 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-mono text-3xl sm:text-4xl font-bold text-white leading-tight">
            Named expertise for
            <br />
            AI coding agents
          </h1>
          <p className="mt-4 font-mono text-sm sm:text-base text-white/50 max-w-xl mx-auto">
            Install a construct — your agent gets a new way of seeing problems.
            Identity, skills, and boundaries. Not just capabilities.
          </p>

          {/* Install CTA */}
          <div className="mt-8 inline-flex items-center gap-3 border border-white/20 bg-white/[0.03] px-5 py-3">
            <code className="font-mono text-sm text-green-400">
              npx constructs install observer
            </code>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 font-mono text-xs">
            <Link
              href="/constructs"
              className="border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition-colors"
            >
              Browse Constructs
            </Link>
            <Link
              href="/install"
              className="text-white/50 hover:text-white transition-colors"
            >
              How to Install
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 flex items-center justify-center gap-8 font-mono text-xs text-white/40">
            <span>{allConstructs.length} constructs</span>
            <span className="text-white/20">|</span>
            <span>{totalSkills} skills</span>
            <span className="text-white/20">|</span>
            <span>Free &amp; open</span>
          </div>
        </div>
      </section>

      {/* Featured Constructs */}
      {featured.length > 0 && (
        <section className="border-b border-white/10 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white/60">
                Popular Constructs
              </h2>
              <Link
                href="/constructs"
                className="font-mono text-xs text-white/40 hover:text-white transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((construct) => (
                <Link
                  key={construct.id}
                  href={`/constructs/${construct.slug}`}
                  className="border border-white/10 p-4 hover:border-white/30 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono font-bold text-white group-hover:text-white/90">
                      {construct.icon && <span className="mr-1.5">{construct.icon}</span>}
                      {construct.name}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/50 line-clamp-2 mb-3">
                    {construct.shortDescription}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
                    <span>{construct.skillsCount} skills</span>
                    <span>{construct.downloads.toLocaleString()} installs</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5">
                    <code className="text-[10px] font-mono text-white/20 group-hover:text-white/40 transition-colors">
                      constructs install {construct.slug}
                    </code>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Graph Explorer */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white/60 mb-4">
            Network Graph
          </h2>
          <div className="h-[60vh] border border-white/10">
            <CategoryInitializer categories={categories} />
            <GraphExplorer data={graphData} />
          </div>
        </div>
      </section>
    </div>
  );
}
