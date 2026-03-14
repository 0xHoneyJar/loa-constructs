import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { Badge } from '@/components/ui/badge';
import { GraduationBadge } from '@/components/ui/graduation-badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/ui/copy-button';
import { CollapsibleList } from '@/components/ui/collapsible-list';
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
      {/* Name, what it does, how to get it. Nothing else. */}
      <div className="mt-16">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-display text-bone-bright leading-[0.95]">
            {construct.name}
          </h1>
          {verificationBadge}
        </div>

        <p className="mt-8 text-base sm:text-lg font-mono text-bone-dim leading-relaxed max-w-2xl">
          {construct.description}
        </p>

        {construct.forkedFrom && (
          <Link
            href={`/constructs/${construct.forkedFrom.slug}`}
            className="inline-flex items-center gap-1 mt-3 text-sm font-mono text-cyan-dim hover:text-cyan-base transition-colors"
          >
            Forked from {construct.forkedFrom.name}
          </Link>
        )}

        {/* Install */}
        <div className="mt-10 border border-void-border bg-void-raised px-5 py-4 font-mono text-sm sm:text-lg flex items-center gap-3 max-w-full overflow-x-auto">
          <div className="whitespace-nowrap">
            <span className="text-bone-ghost">$ </span>
            <span className="text-cyan-base">{construct.installCommand}</span>
          </div>
          <CopyButton text={construct.installCommand} />
        </div>

        {/* Context — category, version, graduation, source */}
        <div className="mt-8 flex items-center gap-4 flex-wrap font-mono text-sm uppercase tracking-whisper text-bone-ghost">
          <span>{construct.category}</span>
          <Separator orientation="vertical" className="h-3 self-center" />
          <Badge>v{construct.version}</Badge>
          <Separator orientation="vertical" className="h-3 self-center" />
          <GraduationBadge level={construct.graduationLevel} showStable />
          {sourceUrl && (
            <>
              <Separator orientation="vertical" className="h-3 self-center" />
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bone-dim transition-colors normal-case"
              >
                source &rarr;
              </a>
            </>
          )}
        </div>
      </div>

      {/* ── TIER 2: The Scan ── */}
      {/* Identity first (context), then composition trails, then capabilities. */}
      <div className="mt-24 space-y-12">
        {/* Identity — who this construct is. Context for everything below. */}
        {construct.identity && hasIdentityContent(construct.identity) && (
          <IdentityFull identity={construct.identity} />
        )}

        {/* Showcases — real products that shipped with this construct */}
        {construct.showcases.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {construct.showcases.map((showcase) => (
              <a
                key={showcase.id}
                href={showcase.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-void-border hover:border-bone-ghost transition-colors group block"
              >
                <div className="aspect-[16/9] bg-void-raised border-b border-void-border flex items-center justify-center">
                  <span className="font-display text-2xl uppercase tracking-display text-bone-ghost group-hover:text-bone-dim transition-colors">
                    {showcase.title}
                  </span>
                </div>
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
            ))}
          </div>
        )}

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

        {/* Commands */}
        {construct.commands.length > 0 && (
          <Disclosure title={`Commands (${construct.commands.length})`} defaultOpen>
            <CollapsibleList initialCount={5} label="commands">
              {construct.commands.map((cmd) => (
                <div key={cmd.name} className="border border-void-border p-5">
                  <code className="font-mono text-base text-cyan-dim">{cmd.name}</code>
                  <p className="font-mono text-sm text-bone-muted mt-2 leading-relaxed">{cmd.description}</p>
                  {cmd.usage && (
                    <code className="block font-mono text-sm text-bone-ghost mt-3">{cmd.usage}</code>
                  )}
                </div>
              ))}
            </CollapsibleList>
          </Disclosure>
        )}

        {/* Skills */}
        {(construct.skills?.length ?? 0) > 0 && (
          <Disclosure title={`Skills (${construct.skills!.length})`} defaultOpen={construct.skills!.length <= 8}>
            <CollapsibleList initialCount={5} label="skills">
              {construct.skills!.map((skill) => (
                <div key={skill.slug} className="border border-void-border p-5">
                  <p className="font-mono text-base text-bone-base">{skill.name}</p>
                  {skill.description && (
                    <p className="font-mono text-sm text-bone-muted mt-2 leading-relaxed">{skill.description}</p>
                  )}
                </div>
              ))}
            </CollapsibleList>
          </Disclosure>
        )}
      </div>

      {/* ── TIER 3: The Deep Read ── */}
      {/* Only for those who want it. Everything behind disclosure. */}
      {(construct.longDescription ||
        construct.skillProse ||
        construct.accuracy ||
        construct.forkCount > 0) && (
        <div className="mt-24 space-y-10">
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
        </div>
      )}
    </div>
  );
}

/* ── Identity helpers ── */

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
