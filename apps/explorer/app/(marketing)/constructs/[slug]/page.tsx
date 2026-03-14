import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    if (tier === 'PROVEN') {
      return <Badge variant="proven">Proven</Badge>;
    }
    if (tier === 'BACKTESTED') {
      return <Badge variant="backtested">Backtested</Badge>;
    }
    return null;
  })();

  return (
    <div className="max-w-4xl">
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
      <div className="mt-16 space-y-10">
        {/* Header — Basement Grotesque title */}
        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-display text-bone-bright leading-[0.95]">
              {construct.name}
            </h1>
            {construct.constructType && construct.constructType !== 'skill-pack' && (
              <Badge variant="cyan">
                {construct.constructType.replace(/-/g, ' ')}
              </Badge>
            )}
            {verificationBadge}
          </div>
          <p className="mt-6 text-base sm:text-lg font-mono text-bone-dim leading-relaxed max-w-2xl">
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
        </div>

        {/* Install */}
        <div className="border border-void-border bg-void-raised px-5 py-4 font-mono text-sm sm:text-lg flex items-center gap-3 max-w-full overflow-x-auto">
          <div className="whitespace-nowrap">
            <span className="text-bone-ghost">$ </span>
            <span className="text-cyan-base">{construct.installCommand}</span>
          </div>
          <CopyButton text={construct.installCommand} />
        </div>

        {/* Context line */}
        <div className="flex items-center gap-4 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
          <span>{construct.category}</span>
          <Separator orientation="vertical" className="h-3 self-center" />
          <Badge>v{construct.version}</Badge>
          <Separator orientation="vertical" className="h-3 self-center" />
          <GraduationBadge level={construct.graduationLevel} showStable />
        </div>
      </div>

      {/* ── TIER 2: The Scan ── */}
      <div className="mt-24 space-y-10">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="border border-void-border p-4">
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Downloads</p>
            <p className="mt-2 font-mono text-xl text-bone-base">{construct.downloads.toLocaleString()}</p>
          </div>
          <div className="border border-void-border p-4">
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Commands</p>
            <p className="mt-2 font-mono text-xl text-bone-base">{construct.commandCount}</p>
          </div>
          {(construct.skills?.length ?? 0) > 0 && (
            <div className="border border-void-border p-4">
              <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Skills</p>
              <p className="mt-2 font-mono text-xl text-bone-base">{construct.skills!.length}</p>
            </div>
          )}
          {construct.rating != null && (
            <div className="border border-void-border p-4">
              <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Rating</p>
              <p className="mt-2 font-mono text-xl text-bone-base">{construct.rating.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Identity summary */}
        {construct.identity && <IdentitySummary identity={construct.identity} />}

        {/* Composes with */}
        {construct.composesWith.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Composes with
            </span>
            {construct.composesWith.map((dep) => (
              <Link
                key={dep}
                href={`/constructs/${dep}`}
                className="border border-void-border px-3 py-1 text-sm font-mono text-bone-dim hover:bg-void-surface hover:text-bone-base transition-colors"
              >
                {dep}
              </Link>
            ))}
          </div>
        )}

        {/* Commands */}
        {construct.commands.length > 0 && (
          <Disclosure title={`Commands (${construct.commands.length})`} defaultOpen>
            <CollapsibleList initialCount={5} label="commands">
              {construct.commands.map((cmd) => (
                <div key={cmd.name} className="border border-void-border p-4">
                  <code className="text-sm font-mono text-cyan-dim">{cmd.name}</code>
                  <p className="text-sm font-mono text-bone-muted mt-2">{cmd.description}</p>
                  {cmd.usage && (
                    <code className="block text-sm font-mono text-bone-ghost mt-2">{cmd.usage}</code>
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
                <div key={skill.slug} className="border border-void-border p-4">
                  <p className="text-sm font-mono text-bone-base">{skill.name}</p>
                  {skill.description && (
                    <p className="text-sm font-mono text-bone-muted mt-2">{skill.description}</p>
                  )}
                </div>
              ))}
            </CollapsibleList>
          </Disclosure>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/explore">View in graph</Link>
          </Button>
          {construct.sourceType === 'git' && construct.gitUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={construct.gitUrl.replace(/\.git$/, '')} target="_blank" rel="noopener noreferrer">
                Source
              </a>
            </Button>
          )}
          {construct.repositoryUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={construct.repositoryUrl} target="_blank" rel="noopener noreferrer">
                Repository
              </a>
            </Button>
          )}
          {construct.homepageUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={construct.homepageUrl} target="_blank" rel="noopener noreferrer">
                Homepage
              </a>
            </Button>
          )}
          {construct.documentationUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={construct.documentationUrl} target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ── TIER 3: The Deep Read ── */}
      {(construct.longDescription ||
        construct.skillProse ||
        construct.accuracy ||
        construct.showcases.length > 0 ||
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

          {construct.identity && hasDeepIdentity(construct.identity) && (
            <Disclosure title="Identity">
              <IdentityDeep identity={construct.identity} />
            </Disclosure>
          )}

          {construct.showcases.length > 0 && (
            <Disclosure title={`Built With (${construct.showcases.length})`}>
              <div className="space-y-3">
                {construct.showcases.map((showcase) => (
                  <div key={showcase.id} className="border border-void-border p-4">
                    <a
                      href={showcase.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-cyan-dim hover:text-cyan-base transition-colors"
                    >
                      {showcase.title} &rarr;
                    </a>
                    {showcase.description && (
                      <p className="text-sm font-mono text-bone-muted mt-2">{showcase.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Disclosure>
          )}

          {construct.accuracy && (
            <Disclosure title="Signal Accuracy">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm font-mono">
                <div className="border border-void-border p-4">
                  <p className="text-bone-ghost mb-2">Weighted Kappa</p>
                  <p className="text-bone-base text-xl">{construct.accuracy.weightedKappa.toFixed(3)}</p>
                </div>
                <div className="border border-void-border p-4">
                  <p className="text-bone-ghost mb-2">Coverage</p>
                  <p className="text-bone-base text-xl">{(construct.accuracy.coverage * 100).toFixed(0)}%</p>
                </div>
                <div className="border border-void-border p-4">
                  <p className="text-bone-ghost mb-2">Sample Size</p>
                  <p className="text-bone-base text-xl">{construct.accuracy.sampleSize}</p>
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

function hasDeepIdentity(identity: {
  cognitiveFrame?: Record<string, unknown>;
  voiceConfig?: Record<string, unknown>;
}): boolean {
  const frame = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'frame', 'cognitive_frame', 'approach')
    : null;
  const tone = identity.voiceConfig
    ? extractString(identity.voiceConfig, 'tone', 'style', 'voice')
    : null;
  return Boolean(frame || tone);
}

function IdentitySummary({
  identity,
}: {
  identity: {
    cognitiveFrame?: Record<string, unknown>;
    expertiseDomains?: string[];
  };
}) {
  const archetype = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'archetype', 'role', 'type')
    : null;
  const domains = identity.expertiseDomains;

  if (!archetype && (!domains || domains.length === 0)) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {archetype && (
        <span className="font-mono text-sm text-bone-dim">
          {archetype}
        </span>
      )}
      {domains && domains.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {archetype && <Separator orientation="vertical" className="h-3" />}
          {domains.map((domain) => (
            <Badge key={domain} variant="skill">
              {domain}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function IdentityDeep({
  identity,
}: {
  identity: {
    cognitiveFrame?: Record<string, unknown>;
    voiceConfig?: Record<string, unknown>;
  };
}) {
  const frame = identity.cognitiveFrame
    ? extractString(identity.cognitiveFrame, 'frame', 'cognitive_frame', 'approach')
    : null;
  const tone = identity.voiceConfig
    ? extractString(identity.voiceConfig, 'tone', 'style', 'voice')
    : null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {frame && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Cognitive Frame
          </span>
          <p className="mt-2 text-base text-bone-dim">{frame}</p>
        </div>
      )}
      {tone && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Voice
          </span>
          <p className="mt-2 text-base text-bone-dim">{tone}</p>
        </div>
      )}
    </div>
  );
}
