import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';
import { AuthAwareConstructList } from '@/components/constructs/auth-aware-construct-list';
import { SearchTrigger } from '@/components/layout/search-trigger';
import { RotatingInstall } from '@/components/ui/rotating-install';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  // Top slugs for the rotating install command
  const topSlugs = constructs.slice(0, 6).map((c) => c.slug);

  return (
    <div>
      {/* Hero — left-aligned, compact, horse watermark */}
      <section className="relative px-4 pt-16 pb-10 sm:pt-20 sm:pb-12 overflow-hidden">
        {/* Horse watermark — fixed to left side of viewport */}
        <div
          className="fixed left-0 top-1/3 -translate-y-1/2 -translate-x-1/2 sm:-translate-x-1/3 pointer-events-none select-none w-48 sm:w-64 lg:w-80 z-0"
          aria-hidden="true"
          style={{
            maskImage: 'url(/horse-mark.svg)',
            WebkitMaskImage: 'url(/horse-mark.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            aspectRatio: '319 / 250',
            backgroundColor: 'oklch(0.18 0.003 80)',
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Constructs
            </h1>
            <p className="mt-3 font-mono text-sm uppercase tracking-terminal sm:tracking-whisper text-cyan-dim">
              The Open Agent Expertise Network
            </p>
            <div className="mt-4 flex items-center gap-4 font-mono text-sm uppercase tracking-terminal sm:tracking-whisper text-bone-ghost">
              <span>{allConstructs.length} constructs</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{totalSkills} skills</span>
            </div>
          </div>

          {/* Install CTA — rotating construct names */}
          <div className="mt-10">
            <RotatingInstall slugs={topSlugs} />
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          {/* Search bar */}
          <div className="mb-4">
            <SearchTrigger />
          </div>

          {/* Auth-aware construct list */}
          <AuthAwareConstructList publicConstructs={constructs}>
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-void-border hover:bg-transparent">
                    <TableHead className="w-8 sm:w-12 font-mono text-sm uppercase tracking-whisper text-bone-ghost" />
                    <TableHead className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                      Construct
                    </TableHead>
                    <TableHead className="w-28 text-right font-mono text-sm uppercase tracking-whisper text-bone-ghost hidden sm:table-cell">
                      Skills
                    </TableHead>
                    <TableHead className="w-20 sm:w-36 text-right font-mono text-sm uppercase tracking-whisper text-bone-ghost">
                      Installs
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center font-mono text-sm text-bone-ghost">
                        No constructs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    constructs.map((construct) => (
                      <TableRow
                        key={construct.id}
                        className="border-void-border hover:bg-void-raised group relative cursor-pointer"
                      >
                        <TableCell className="py-3 sm:py-5 text-xl sm:text-2xl text-center align-middle">
                          {construct.icon || ''}
                        </TableCell>
                        <TableCell className="py-3 sm:py-5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/constructs/${construct.slug}`}
                                className="font-mono text-base sm:text-xl font-bold text-bone-base group-hover:text-bone-bright transition-colors after:absolute after:inset-0"
                              >
                                {construct.name}
                              </Link>
                              {construct.constructType !== 'skill-pack' && (
                                <Badge variant="cyan" className="relative z-10 hidden sm:inline-flex">
                                  {construct.constructType.replace(/-/g, ' ')}
                                </Badge>
                              )}
                              {construct.visibility === 'internal' && (
                                <Badge variant="internal" className="relative z-10 hidden sm:inline-flex">
                                  internal
                                </Badge>
                              )}
                              {construct.verificationTier === 'PROVEN' && (
                                <Badge variant="proven" className="relative z-10 hidden sm:inline-flex">
                                  proven
                                </Badge>
                              )}
                              {construct.verificationTier === 'BACKTESTED' && (
                                <Badge variant="backtested" className="relative z-10 hidden sm:inline-flex">
                                  backtested
                                </Badge>
                              )}
                            </div>
                            <p className="font-mono text-sm sm:text-base text-bone-muted truncate mt-0.5">
                              {construct.shortDescription}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 sm:py-5 text-right font-mono text-base text-bone-dim hidden sm:table-cell align-middle">
                          {construct.skillsCount}
                        </TableCell>
                        <TableCell className="py-3 sm:py-5 text-right font-mono text-sm sm:text-lg text-bone-base align-middle">
                          {formatInstalls(construct.downloads)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </AuthAwareConstructList>
        </div>
      </section>
    </div>
  );
}
