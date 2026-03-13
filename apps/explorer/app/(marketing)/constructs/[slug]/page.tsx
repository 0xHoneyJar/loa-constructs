import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct, fetchAllConstructs } from '@/lib/data/fetch-constructs';
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
      {/* Only what matters in the first 2 seconds: name, what it does, how to get it */}
      <div className="mt-10 space-y-8">
        {/* Header — name + type context */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-5xl font-mono font-bold text-bone-base tracking-tight">{construct.name}</h1>
            {construct.constructType && construct.constructType !== 'skill-pack' && (
              <Badge variant="cyan">
                {construct.constructType.replace(/-/g, ' ')}
              </Badge>
            )}
            {verificationBadge}
          </div>
          <p className="mt-4 text-base sm:text-lg font-mono text-bone-dim leading-relaxed max-w-2xl">
            {construct.description}
          </p>
          {construct.forkedFrom && (
            <Link
              href={`/constructs/${construct.forkedFrom.slug}`}
              className="inline-flex items-center gap-1 mt-2 text-sm font-mono text-cyan-dim hover:text-cyan-base transition-colors"
            >
              Forked from {construct.forkedFrom.name}
            </Link>
          )}
        </div>

        {/* Install — primary action, always above the fold */}
        <div className="border border-void-border bg-void-raised px-4 sm:px-5 py-3.5 font-mono text-sm sm:text-lg flex items-center gap-3 max-w-full overflow-x-auto">
          <div className="whitespace-nowrap">
            <span className="text-bone-ghost">$ </span>
            <span className="text-cyan-base">{construct.installCommand}</span>
          </div>
          <CopyButton text={construct.installCommand} />
        </div>

        {/* Context line — just enough to orient */}
        <div className="flex items-center gap-4 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
          <span>{construct.category}</span>
          <Separator orientation="vertical" className="h-3 self-center" />
          <Badge>v{construct.version}</Badge>
          <Separator orientation="vertical" className="h-3 self-center" />
          <GraduationBadge level={construct.graduationLevel} showStable />
        </div>
      </div>

      {/* ── TIER 2: The Scan ── */}
      {/* What it contains, how it connects, where to go deeper */}
      <div className="mt-16 space-y-6">
        {/* Stats grid — replaces the overloaded single-line */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border border-void-border p-3">
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Downloads</p>
            <p className="mt-1 font-mono text-lg text-bone-base">{construct.downloads.toLocaleString()}</p>
          </div>
          <div className="border border-void-border p-3">
            <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Commands</p>
            <p className="mt-1 font-mono text-lg text-bone-base">{construct.commandCount}</p>
          </div>
          {(construct.skills?.length ?? 0) > 0 && (
            <div className="border border-void-border p-3">
              <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Skills</p>
              <p className="mt-1 font-mono text-lg text-bone-base">{construct.skills!.length}</p>
            </div>
          )}
          {construct.rating != null && (
            <div className="border border-void-border p-3">
              <p className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">Rating</p>
              <p className="mt-1 font-mono text-lg text-bone-base">{construct.rating.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Identity summary — archetype + expertise chips */}
        {construct.identity && <IdentitySummary identity={construct.identity} />}

        {/* Works with panel — composes_with + depended_by (cycle-048) */}
        <WorksWithPanel slug={slug} composesWith={construct.composesWith} />

        {/* Commands */}
        {construct.commands.length > 0 && (
          <Disclosure title={`Commands (${construct.commands.length})`} defaultOpen>
            <CollapsibleList initialCount={5} label="commands">
              {construct.commands.map((cmd) => (
                <div key={cmd.name} className="border border-void-border p-3">
                  <code className="text-sm font-mono text-cyan-dim">{cmd.name}</code>
                  <p className="text-sm font-mono text-bone-muted mt-1">{cmd.description}</p>
                  {cmd.usage && (
                    <code className="block text-sm font-mono text-bone-ghost mt-1">{cmd.usage}</code>
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
                <div key={skill.slug} className="border border-void-border p-3">
                  <p className="text-sm font-mono text-bone-base">{skill.name}</p>
                  {skill.description && (
                    <p className="text-sm font-mono text-bone-muted mt-1">{skill.description}</p>
                  )}
                </div>
              ))}
            </CollapsibleList>
          </Disclosure>
        )}

        {/* Links — secondary actions, after the content */}
        <div className="flex flex-wrap gap-3 pt-2">
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
      {/* Prose, identity, showcases, accuracy — only for those who want it */}
      {(construct.longDescription ||
        construct.skillProse ||
        construct.accuracy ||
        construct.showcases.length > 0 ||
        construct.forkCount > 0) && (
        <div className="mt-16 space-y-6">
          {/* Long description */}
          {construct.longDescription && (
            <Disclosure title="About">
              <p className="text-base font-mono text-bone-dim leading-relaxed">
                {construct.longDescription}
              </p>
              {construct.forkCount > 0 && (
                <p className="text-sm font-mono text-bone-ghost mt-3">
                  {construct.forkCount} variant{construct.forkCount !== 1 ? 's' : ''} exist{construct.forkCount === 1 ? 's' : ''}
                </p>
              )}
            </Disclosure>
          )}

          {/* SKILL.md prose */}
          {construct.skillProse && (
            <Disclosure title="Documentation">
              <div className="text-base font-mono text-bone-dim leading-relaxed whitespace-pre-wrap">
                {construct.skillProse}
              </div>
            </Disclosure>
          )}

          {/* Identity deep dive */}
          {construct.identity && hasDeepIdentity(construct.identity) && (
            <Disclosure title="Identity">
              <IdentityDeep identity={construct.identity} />
            </Disclosure>
          )}

          {/* Showcases */}
          {construct.showcases.length > 0 && (
            <Disclosure title={`Built With (${construct.showcases.length})`}>
              <div className="space-y-2">
                {construct.showcases.map((showcase) => (
                  <div key={showcase.id} className="border border-void-border p-3">
                    <a
                      href={showcase.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-cyan-dim hover:text-cyan-base transition-colors"
                    >
                      {showcase.title} &rarr;
                    </a>
                    {showcase.description && (
                      <p className="text-sm font-mono text-bone-muted mt-1">{showcase.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Disclosure>
          )}

          {/* Signal Accuracy */}
          {construct.accuracy && (
            <Disclosure title="Signal Accuracy">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-mono">
                <div className="border border-void-border p-3">
                  <p className="text-bone-ghost mb-1">Weighted Kappa</p>
                  <p className="text-bone-base text-lg">{construct.accuracy.weightedKappa.toFixed(3)}</p>
                </div>
                <div className="border border-void-border p-3">
                  <p className="text-bone-ghost mb-1">Coverage</p>
                  <p className="text-bone-base text-lg">{(construct.accuracy.coverage * 100).toFixed(0)}%</p>
                </div>
                <div className="border border-void-border p-3">
                  <p className="text-bone-ghost mb-1">Sample Size</p>
                  <p className="text-bone-base text-lg">{construct.accuracy.sampleSize}</p>
                </div>
              </div>
              {construct.accuracy.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
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

/* ── Works with panel (cycle-048) ── */

async function WorksWithPanel({ slug, composesWith }: { slug: string; composesWith: string[] }) {
  // Fetch all constructs to compute reverse dependencies
  const allConstructs = await fetchAllConstructs();
  const dependedBy = allConstructs
    .filter(c => c.composesWith?.includes(slug) && c.slug !== slug)
    .map(c => c.slug);

  // Deduplicate: remove items in dependedBy that are already in composesWith
  const uniqueDependedBy = dependedBy.filter(s => !composesWith.includes(s));

  const hasForward = composesWith.length > 0;
  const hasReverse = uniqueDependedBy.length > 0;

  if (!hasForward && !hasReverse) return null;

  return (
    <div className="border border-void-border p-4 space-y-4">
      <h3 className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
        Works with
      </h3>

      {hasForward && (
        <div>
          <p className="font-mono text-xs uppercase tracking-terminal text-bone-ghost mb-2">
            Composes with
          </p>
          <div className="flex flex-wrap gap-2">
            {composesWith.map((dep) => (
              <Link
                key={dep}
                href={`/constructs/${dep}`}
                className="border border-void-border px-2 py-0.5 text-sm font-mono text-bone-dim hover:bg-void-surface hover:text-bone-base transition-colors"
              >
                {dep}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasReverse && (
        <div>
          <p className="font-mono text-xs uppercase tracking-terminal text-bone-ghost mb-2">
            Depended on by
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueDependedBy.map((dep) => (
              <Link
                key={dep}
                href={`/constructs/${dep}`}
                className="border border-void-border px-2 py-0.5 text-sm font-mono text-cyan-dim hover:bg-void-surface hover:text-cyan-base transition-colors"
              >
                {dep}
              </Link>
            ))}
          </div>
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

/** Tier 1 — inline archetype + expertise chips */
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
        <div className="flex items-center gap-1.5 flex-wrap">
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

/** Tier 3 — full cognitive frame + voice config */
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
    <div className="grid gap-4 sm:grid-cols-2">
      {frame && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Cognitive Frame
          </span>
          <p className="mt-1 text-base text-bone-dim">{frame}</p>
        </div>
      )}
      {tone && (
        <div>
          <span className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
            Voice
          </span>
          <p className="mt-1 text-base text-bone-dim">{tone}</p>
        </div>
      )}
    </div>
  );
}
