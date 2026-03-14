import Link from 'next/link';
import { fetchAllConstructs, searchConstructs } from '@/lib/data/fetch-constructs';
import { AuthAwareConstructList } from '@/components/constructs/auth-aware-construct-list';

import { RotatingInstall } from '@/components/ui/rotating-install';
import { Separator } from '@/components/ui/separator';

// ISR — revalidate hourly
export const revalidate = 3600;

/**
 * Static mapping: construct slug → showcase OG images from live project websites.
 * OG images are the web's standard preview — 1200x630, already optimized for sharing.
 * Sourced from the actual projects each construct helped build.
 */
const CONSTRUCT_SHOWCASES: Record<string, { src: string; alt: string }[]> = {
  artisan: [
    { src: 'https://midi.0xhoneyjar.xyz/og.png', alt: 'Mibera Dimensions' },
    { src: 'https://setandforgetti.0xhoneyjar.xyz/brand/og.png', alt: 'Set and Forgetti' },
  ],
  observer: [
    { src: 'https://moneycomb.0xhoneyjar.xyz/opengraph-image', alt: 'Moneycomb Vaults' },
    { src: 'https://midi.0xhoneyjar.xyz/og.png', alt: 'Mibera Dimensions' },
  ],
  'k-hole': [
    { src: 'https://moneycomb.0xhoneyjar.xyz/opengraph-image', alt: 'Moneycomb Vaults' },
  ],
  'mibera-codex': [
    { src: 'https://midi.0xhoneyjar.xyz/og.png', alt: 'Mibera Dimensions' },
  ],
};

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
      {/* Hero */}
      <section className="relative px-4 pt-16 pb-10 sm:pt-20 sm:pb-12 overflow-hidden">
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
          {/* Auth-aware construct list */}
          <AuthAwareConstructList publicConstructs={constructs}>
            <div className="mt-6 divide-y divide-void-border border-t border-void-border">
              {constructs.length === 0 ? (
                <p className="py-12 text-center font-mono text-sm text-bone-ghost">
                  No constructs found.
                </p>
              ) : (
                constructs.map((construct) => {
                  const showcases = CONSTRUCT_SHOWCASES[construct.slug];
                  return (
                    <Link
                      key={construct.id}
                      href={`/constructs/${construct.slug}`}
                      className="construct-row group relative flex items-center justify-between py-6 sm:py-10 cursor-pointer transition-[background] duration-200 hover:[background:radial-gradient(ellipse_80%_100%_at_20%_50%,oklch(0.14_0.03_195)_0%,transparent_70%)]"
                    >
                      <div className="min-w-0 flex-1">
                        {construct.logoWordmark ? (
                          <div
                            className="text-bone-base group-hover:text-bone-bright transition-colors [&_svg]:h-12 sm:[&_svg]:h-16 [&_svg]:w-auto"
                            dangerouslySetInnerHTML={{ __html: construct.logoWordmark }}
                          />
                        ) : (
                          <span className="font-display text-2xl sm:text-3xl uppercase tracking-display text-bone-base group-hover:text-bone-bright transition-colors block">
                            {construct.name}
                          </span>
                        )}
                        <p className="font-mono text-sm sm:text-base text-bone-muted truncate mt-2">
                          {construct.shortDescription}
                        </p>
                        <p className="font-mono text-xs text-bone-ghost mt-1.5">
                          {construct.skillsCount} skills · {construct.downloads.toLocaleString()} installs
                        </p>
                      </div>
                      {showcases && (
                        <div className="hidden sm:flex gap-3 ml-8 shrink-0">
                          {showcases.slice(0, 2).map((s) => (
                            <div
                              key={s.src}
                              className="relative w-[180px] h-[95px] border border-void-border overflow-hidden group-hover:border-bone-ghost transition-colors"
                              style={{ backgroundColor: 'oklch(0.06 0.005 250)' }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={s.src}
                                alt={s.alt}
                                className="w-full h-full object-cover"
                                style={{ opacity: 0.7 }}
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </AuthAwareConstructList>
        </div>
      </section>
    </div>
  );
}
