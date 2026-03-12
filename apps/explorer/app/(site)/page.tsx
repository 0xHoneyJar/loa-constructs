import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';
import { AuthAwareConstructList } from '@/components/constructs/auth-aware-construct-list';

// ISR — revalidate hourly
export const revalidate = 3600;

function formatInstalls(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const allConstructs = await fetchAllConstructs();

  const constructs = params.q
    ? await searchConstructs(params.q)
    : [...allConstructs].sort((a, b) => b.downloads - a.downloads);

  const totalSkills = allConstructs.reduce((sum, c) => sum + c.skillsCount, 0);

  return (
    <div>
      {/* Hero — left-aligned, compact */}
      <section className="px-4 pt-16 pb-10 sm:pt-20 sm:pb-12">
        <div className="mx-auto max-w-5xl">
          <div>
            <h1 className="font-display text-6xl sm:text-7xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Constructs
            </h1>
            <p className="mt-3 font-mono text-sm uppercase tracking-whisper text-cyan-dim">
              The Open Agent Expertise Network
            </p>
            <p className="mt-5 font-mono text-lg sm:text-xl text-bone-muted leading-relaxed max-w-lg">
              Named expertise for AI agents. One command to install.
            </p>
          </div>

          {/* Install CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-start gap-6">
            <div>
              <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost mb-3">
                Try it now
              </p>
              <div className="border border-void-border bg-void-raised px-6 py-3.5 font-mono text-lg inline-flex items-center gap-3">
                <div>
                  <span className="text-bone-ghost">$ </span>
                  <span className="text-cyan-base">npx constructs install</span>
                  <span className="text-bone-base"> observer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm uppercase tracking-whisper text-cyan-dim">
              Constructs Leaderboard
            </h2>
            <div className="flex items-center gap-4 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              <span>{allConstructs.length} constructs</span>
              <span className="w-px h-3 bg-void-border" />
              <span>{totalSkills} skills</span>
            </div>
          </div>

          {/* Auth-aware construct list — cycle-039 */}
          <AuthAwareConstructList publicConstructs={constructs}>
            <div className="mt-6">
              {/* Table header */}
              <div className="flex items-center border-b border-void-border pb-2 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                <span className="w-12 shrink-0" />
                <span className="flex-1">Construct</span>
                <span className="w-20 text-right hidden sm:block">Skills</span>
                <span className="w-28 text-right">Installs</span>
              </div>

              {/* Rows */}
              {constructs.length === 0 ? (
                <div className="py-12 text-center font-mono text-sm text-bone-ghost">
                  No constructs found.
                </div>
              ) : (
                <div>
                  {constructs.map((construct) => (
                    <Link
                      key={construct.id}
                      href={`/constructs/${construct.slug}`}
                      className="flex items-center py-4 border-b border-void-border hover:bg-void-raised transition-colors group"
                    >
                      <span className="w-12 shrink-0 text-2xl text-center">
                        {construct.icon || ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl font-bold text-bone-base group-hover:text-bone-bright transition-colors">
                            {construct.name}
                          </span>
                          {construct.constructType !== 'skill-pack' && (
                            <span className="border border-cyan-dim/30 bg-cyan-dim/10 px-1.5 py-0.5 text-xs font-mono text-cyan-dim hidden sm:inline">
                              {construct.constructType.replace(/-/g, ' ')}
                            </span>
                          )}
                          {construct.visibility === 'internal' && (
                            <span className="border border-cyan-base/30 bg-cyan-base/10 px-1.5 py-0.5 text-xs font-mono text-cyan-base hidden sm:inline">
                              internal
                            </span>
                          )}
                          {construct.verificationTier === 'PROVEN' && (
                            <span className="border border-graduation-stable/30 bg-graduation-stable/10 px-1.5 py-0.5 text-xs font-mono text-graduation-stable hidden sm:inline">
                              proven
                            </span>
                          )}
                          {construct.verificationTier === 'BACKTESTED' && (
                            <span className="border border-graduation-beta/30 bg-graduation-beta/10 px-1.5 py-0.5 text-xs font-mono text-graduation-beta hidden sm:inline">
                              backtested
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-base text-bone-muted truncate mt-0.5 max-w-xl">
                          {construct.shortDescription}
                        </p>
                      </div>
                      <span className="w-20 text-right font-mono text-base text-bone-dim hidden sm:block">
                        {construct.skillsCount}
                      </span>
                      <span className="w-28 text-right font-mono text-lg text-bone-base">
                        {formatInstalls(construct.downloads)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </AuthAwareConstructList>
        </div>
      </section>
    </div>
  );
}
