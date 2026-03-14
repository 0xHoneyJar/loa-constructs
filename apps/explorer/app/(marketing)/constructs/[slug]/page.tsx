import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InstallBlock } from '@/components/ui/install-block';
import { Disclosure } from '@/components/ui/disclosure';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const construct = await fetchConstruct(slug);
  if (!construct) return { title: 'Not Found' };

  return {
    title: construct.name,
    description: construct.description,
    alternates: {
      canonical: `/constructs/${slug}`,
    },
    openGraph: {
      title: `${construct.name} | Constructs Network`,
      description: construct.description,
      type: 'article',
    },
  };
}

export default async function ConstructDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const construct = await fetchConstruct(slug);

  if (!construct) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: construct.name,
    description: construct.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const verificationBadge = (() => {
    const tier = construct.verificationTier;
    if (tier === 'PROVEN') return <Badge variant="proven">Proven</Badge>;
    if (tier === 'BACKTESTED') return <Badge variant="backtested">Backtested</Badge>;
    return null;
  })();

  // Deduplicate source links — Source and Repository are often the same URL
  const sourceUrl = construct.sourceType === 'git' && construct.gitUrl
    ? construct.gitUrl.replace(/\.git$/, '')
    : construct.repositoryUrl || null;

  return (
    <div className="max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-sm text-bone-ghost uppercase tracking-wider">
        <Link href="/constructs" className="hover:text-bone-dim transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <span className="text-bone-muted">{construct.name}</span>
      </nav>

      {/* ── TIER 1: The Glance ── */}
      {/* Name, what it does, how to get it, what it built. Show the result before the mechanic. */}
      <div className="mt-16">
        {construct.logoKnockout || construct.logoWordmark ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="text-bone-bright [&_svg]:h-16 sm:[&_svg]:h-24 [&_svg]:w-auto [&_svg]:max-w-full"
              style={{ color: 'var(--color-bone-bright, #F5F0E8)' }}
              dangerouslySetInnerHTML={{ __html: construct.logoKnockout || construct.logoWordmark! }}
            />
            {verificationBadge}
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            {construct.logoMark && (
              <div
                className="text-bone-bright [&_svg]:h-14 sm:[&_svg]:h-20 [&_svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: construct.logoMark }}
              />
            )}
            <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-display text-bone-bright leading-[0.95]">
              {construct.name}
            </h1>
            {verificationBadge}
          </div>
        )}

        <p className="mt-8 font-display text-xl sm:text-2xl uppercase tracking-display text-bone-base max-w-2xl leading-[1.1]">
          {construct.description}
        </p>
        {construct.longDescription && (
          <p className="mt-4 text-sm sm:text-base font-mono text-bone-muted leading-relaxed max-w-2xl">
            {construct.longDescription}
          </p>
        )}

        {construct.forkedFrom && (
          <Link
            href={`/constructs/${construct.forkedFrom.slug}`}
            className="inline-flex items-center gap-1 mt-3 text-sm font-mono text-cyan-dim hover:text-cyan-base transition-colors"
          >
            Forked from {construct.forkedFrom.name}
          </Link>
        )}

        {/* Install — full-width click-to-copy */}
        <InstallBlock command={construct.installCommand} />

        {/* Showcases — real products that shipped with this construct. Visual proof before metadata. */}
        {construct.showcases.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {construct.showcases.filter((s) => !s.url.includes('rektdrop')).map((showcase) => {
              const ogImage = showcaseOgImage(showcase.url);
              return (
                <a
                  key={showcase.id}
                  href={showcase.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-void-border hover:border-bone-ghost transition-colors group block overflow-hidden"
                >
                  {ogImage ? (
                    <div className="aspect-[16/9] relative border-b border-void-border overflow-hidden" style={{ backgroundColor: 'oklch(0.06 0.005 250)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ogImage}
                        alt={showcase.title}
                        className="w-full h-full object-cover"
                        style={{ opacity: 0.8 }}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] border-b border-void-border flex items-center justify-center" style={{ backgroundColor: 'oklch(0.06 0.005 250)' }}>
                      <span className="font-display text-2xl uppercase tracking-display text-bone-ghost group-hover:text-bone-dim transition-colors">
                        {showcase.title}
                      </span>
                    </div>
                  )}
                  <div className="p-5">
                    <p className="font-display text-base uppercase tracking-display text-bone-base group-hover:text-bone-bright transition-colors">
                      {showcase.title}
                    </p>
                    {showcase.description && (
                      <p className="font-mono text-sm text-bone-muted mt-2 leading-relaxed">
                        {showcase.description}
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Context — category + version only. Graduation and source pushed to Tier 3. */}
        <div className="mt-8 flex items-center gap-4 flex-wrap font-mono text-sm uppercase tracking-whisper text-bone-ghost">
          <span>{construct.category}</span>
          <Separator orientation="vertical" className="h-3 self-center" />
          <Badge>v{construct.version}</Badge>
        </div>
      </div>

      {/* ── TIER 2: The Scan ── */}
      {/* Composition trails, then capabilities. Identity moved to Tier 3. */}
      <div className="mt-24 space-y-12">
        {/* Composes with — the person at the next stall (TDR-007) */}
        {construct.composesWith.length > 0 && (
          <div>
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost mb-4">
              Composes with
            </p>
            <div className="flex gap-3 flex-wrap">
              {construct.composesWith.map((dep) => (
                <Link
                  key={dep}
                  href={`/constructs/${dep}`}
                  className="border border-void-border px-4 py-2 font-display text-base uppercase tracking-display text-bone-dim hover:text-bone-bright hover:border-bone-ghost transition-colors"
                >
                  {dep}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Commands — flat grid, no disclosure */}
        {construct.commands.length > 0 && (
          <div>
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost mb-4">
              Commands
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {construct.commands.map((cmd) => (
                <div key={cmd.name} className="border border-void-border p-4 hover:border-bone-ghost transition-colors">
                  <code className="font-mono text-sm text-cyan-dim">{cmd.name}</code>
                  <p className="font-mono text-xs text-bone-muted mt-2 leading-relaxed line-clamp-2">{cmd.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills — flat grid, no disclosure */}
        {(construct.skills?.length ?? 0) > 0 && (
          <div>
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost mb-4">
              Skills
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {construct.skills!.map((skill) => (
                <div key={skill.slug} className="border border-void-border p-4 hover:border-bone-ghost transition-colors">
                  <p className="font-mono text-sm text-bone-base">{skill.name}</p>
                  {skill.description && (
                    <p className="font-mono text-xs text-bone-muted mt-2 leading-relaxed line-clamp-2">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TIER 3: The Deep Read ── */}
      {/* Identity, documentation, metadata. Only for those who want it. */}
      {(construct.identity && hasIdentityContent(construct.identity)) ||
        construct.longDescription ||
        construct.skillProse ||
        construct.accuracy ||
        construct.forkCount > 0 ||
        sourceUrl ? (
        <div className="mt-24 space-y-10">
          {/* Identity — who this construct is. Metadata, not value prop. */}
          {construct.identity && hasIdentityContent(construct.identity) && (
            <Disclosure title="Identity">
              <IdentityFull identity={construct.identity} />
            </Disclosure>
          )}

          {construct.longDescription && (
            <Disclosure title="About">
              <p className="text-base font-mono text-bone-dim leading-relaxed">
                {construct.longDescription}
              </p>
              {construct.forkCount > 0 && (
                <p className="text-sm font-mono text-bone-ghost mt-4">
                  {construct.forkCount} variant{construct.forkCount !== 1 ? 's' : ''} exist{construct.forkCount === 1 ? 's' : ''}
                </p>
              )}
            </Disclosure>
          )}

          {construct.skillProse && (
            <Disclosure title="Documentation">
              <div className="text-base font-mono text-bone-dim leading-relaxed whitespace-pre-wrap">
                {construct.skillProse}
              </div>
            </Disclosure>
          )}

          {construct.accuracy && (
            <Disclosure title="Signal Accuracy">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
                <div className="border border-void-border p-5">
                  <p className="text-sm text-bone-ghost mb-2">Weighted Kappa</p>
                  <p className="text-xl text-bone-base">{construct.accuracy.weightedKappa.toFixed(3)}</p>
                </div>
                <div className="border border-void-border p-5">
                  <p className="text-sm text-bone-ghost mb-2">Coverage</p>
                  <p className="text-xl text-bone-base">{(construct.accuracy.coverage * 100).toFixed(0)}%</p>
                </div>
                <div className="border border-void-border p-5">
                  <p className="text-sm text-bone-ghost mb-2">Sample Size</p>
                  <p className="text-xl text-bone-base">{construct.accuracy.sampleSize}</p>
                </div>
              </div>
              {construct.accuracy.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {construct.accuracy.warnings.map((warning, i) => (
                    <p key={i} className="text-sm font-mono text-graduation-beta">{warning}</p>
                  ))}
                </div>
              )}
            </Disclosure>
          )}

          {/* Source — quiet link at the bottom for those who need it */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-sm text-bone-ghost hover:text-bone-dim transition-colors"
            >
              View source &rarr;
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ── Identity helpers ── */

/** Map showcase URL to OG image from the live site */
function showcaseOgImage(url: string): string | null {
  const map: Record<string, string> = {
    'moneycomb.0xhoneyjar.xyz': 'https://moneycomb.0xhoneyjar.xyz/opengraph-image',
    'moneycombvaults.honeycomb.fyi': 'https://moneycomb.0xhoneyjar.xyz/opengraph-image',
    'midi.0xhoneyjar.xyz': 'https://midi.0xhoneyjar.xyz/og.png',
    'mibera.honeycomb.fyi': 'https://midi.0xhoneyjar.xyz/og.png',
    'setandforgetti.0xhoneyjar.xyz': 'https://setandforgetti.0xhoneyjar.xyz/brand/og.png',
    'setandforgetti.honeycomb.fyi': 'https://setandforgetti.0xhoneyjar.xyz/brand/og.png',
  };
  try {
    const hostname = new URL(url).hostname;
    return map[hostname] || null;
  } catch {
    return null;
  }
}

function extractString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}

function hasIdentityContent(identity: {
  cognitiveFrame?: Record<string, unknown>;
  voiceConfig?: Record<string, unknown>;
  expertiseDomains?: string[];
}): boolean {
  const archetype = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'archetype', 'role', 'type')
    : null;
  const frame = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'frame', 'cognitive_frame', 'approach')
    : null;
  const tone = identity.voiceConfig
    ? extractString(identity.voiceConfig, 'tone', 'style', 'voice')
    : null;
  const domains = identity.expertiseDomains;
  return Boolean(archetype || frame || tone || (domains && domains.length > 0));
}

/** Unified identity section — archetype, domains, frame, voice. All Tier 3. */
function IdentityFull({
  identity,
}: {
  identity: {
    cognitiveFrame?: Record<string, unknown>;
    voiceConfig?: Record<string, unknown>;
    expertiseDomains?: string[];
  };
}) {
  const archetype = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'archetype', 'role', 'type')
    : null;
  const frame = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'frame', 'cognitive_frame', 'approach')
    : null;
  const tone = identity.voiceConfig
    ? extractString(identity.voiceConfig, 'tone', 'style', 'voice')
    : null;
  const domains = identity.expertiseDomains;

  return (
    <div className="space-y-6">
      {archetype && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Archetype
          </span>
          <p className="mt-2 text-base font-mono text-bone-dim">{archetype}</p>
        </div>
      )}
      {domains && domains.length > 0 && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Domains
          </span>
          <div className="mt-2 flex gap-2 flex-wrap">
            {domains.map((domain) => (
              <Badge key={domain} variant="skill">{domain}</Badge>
            ))}
          </div>
        </div>
      )}
      {frame && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Cognitive Frame
          </span>
          <p className="mt-2 text-base font-mono text-bone-dim leading-relaxed">{frame}</p>
        </div>
      )}
      {tone && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Voice
          </span>
          <p className="mt-2 text-base font-mono text-bone-dim leading-relaxed">{tone}</p>
        </div>
      )}
    </div>
  );
}
