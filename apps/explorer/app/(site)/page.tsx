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
      <section className="border-b border-void-border px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-mono text-3xl sm:text-4xl font-bold text-bone-bright leading-tight">
            Named expertise for
            <br />
            AI coding agents
          </h1>
          <p className="mt-4 font-mono text-sm sm:text-base text-bone-muted max-w-xl mx-auto">
            Install a construct — your agent gets a new way of seeing problems.
            Identity, skills, and boundaries. Not just capabilities.
          </p>

          {/* Install CTA */}
          <div className="mt-8 inline-flex items-center gap-3 border border-void-border bg-void-raised px-5 py-3">
            <code className="font-mono text-sm text-cyan-base">
              npx constructs install observer
            </code>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 font-mono text-xs">
            <Link
              href="/constructs"
              className="border border-bone-ghost px-4 py-2 text-bone-base hover:bg-void-raised transition-colors"
            >
              Browse Constructs
            </Link>
            <Link
              href="/install"
              className="text-bone-muted hover:text-bone-base transition-colors"
            >
              How to Install
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 flex items-center justify-center gap-8 font-mono text-xs text-bone-ghost">
            <span>{allConstructs.length} constructs</span>
            <span className="text-void-border">|</span>
            <span>{totalSkills} skills</span>
            <span className="text-void-border">|</span>
            <span>Free &amp; open</span>
          </div>
        </div>
      </section>

      {/* Featured Constructs */}
      {featured.length > 0 && (
        <section className="border-b border-void-border px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-terminal text-bone-dim">
                Popular Constructs
              </h2>
              <Link
                href="/constructs"
                className="font-mono text-xs text-bone-ghost hover:text-bone-base transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((construct) => (
                <Link
                  key={construct.id}
                  href={`/constructs/${construct.slug}`}
                  className="border border-void-border p-4 hover:border-bone-ghost transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono font-bold text-bone-base group-hover:text-bone-bright">
                      {construct.icon && <span className="mr-1.5">{construct.icon}</span>}
                      {construct.name}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-bone-muted line-clamp-2 mb-3">
                    {construct.shortDescription}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-bone-ghost">
                    <span>{construct.skillsCount} skills</span>
                    <span>{construct.downloads.toLocaleString()} installs</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-void-border">
                    <code className="text-[10px] font-mono text-bone-ghost group-hover:text-bone-muted transition-colors">
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
          <h2 className="font-mono text-xs font-semibold uppercase tracking-terminal text-bone-dim mb-4">
            Network Graph
          </h2>
          <div className="h-[60vh] border border-void-border">
            <CategoryInitializer categories={categories} />
            <GraphExplorer data={graphData} />
          </div>
        </div>
      </section>
    </div>
  );
}
