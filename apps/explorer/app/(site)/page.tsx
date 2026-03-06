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
    .slice(0, 6);

  const totalSkills = allConstructs.reduce((sum, c) => sum + c.skillsCount, 0);

  return (
    <div>
      {/* Hero — left-aligned, Basement Grotesque display */}
      <section className="border-b border-void-border px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-whisper text-cyan-dim mb-4">
              The Constructs Network
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Named expertise
              <br />
              <span className="text-cyan-base">for AI agents</span>
            </h1>
            <p className="mt-6 font-mono text-sm text-bone-muted max-w-lg leading-relaxed">
              Install a construct — your agent gets identity, skills, and boundaries.
              Not just capabilities. A way of seeing.
            </p>

            {/* Install CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
              <div className="border border-void-border bg-void-raised px-4 py-2.5 font-mono text-sm">
                <span className="text-bone-ghost">$ </span>
                <span className="text-cyan-base">npx constructs install</span>
                <span className="text-bone-base"> observer</span>
              </div>
              <Link
                href="/constructs"
                className="border border-bone-ghost px-4 py-2.5 font-mono text-xs uppercase tracking-terminal text-bone-dim hover:text-bone-base hover:border-bone-muted transition-colors"
              >
                Browse All
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 flex items-center gap-6 font-mono text-[10px] uppercase tracking-whisper text-bone-ghost">
              <span>{allConstructs.length} constructs</span>
              <span className="w-px h-3 bg-void-border" />
              <span>{totalSkills} skills</span>
              <span className="w-px h-3 bg-void-border" />
              <span>Open source</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Constructs */}
      {featured.length > 0 && (
        <section className="border-b border-void-border px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono text-[10px] uppercase tracking-whisper text-cyan-dim">
                Popular Constructs
              </h2>
              <Link
                href="/constructs"
                className="font-mono text-[10px] uppercase tracking-whisper text-bone-ghost hover:text-bone-base transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-void-border">
              {featured.map((construct) => (
                <Link
                  key={construct.id}
                  href={`/constructs/${construct.slug}`}
                  className="bg-void-base p-5 hover:bg-void-raised transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-bone-base group-hover:text-bone-bright transition-colors">
                        {construct.icon && <span className="mr-1.5">{construct.icon}</span>}
                        {construct.name}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-whisper text-bone-ghost mt-0.5">
                      {construct.skillsCount}s
                    </span>
                  </div>
                  <p className="font-mono text-xs text-bone-muted line-clamp-2 mb-4 leading-relaxed">
                    {construct.shortDescription}
                  </p>
                  <code className="font-mono text-[10px] text-bone-ghost group-hover:text-cyan-dim transition-colors">
                    constructs install {construct.slug}
                  </code>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Graph Explorer */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-[10px] uppercase tracking-whisper text-cyan-dim mb-4">
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
