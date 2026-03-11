import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { IdentityPanel } from '@/components/construct/identity-panel';

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

  return (
    <div className="space-y-8 max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[10px] text-bone-ghost uppercase tracking-wider">
        <Link href="/constructs" className="hover:text-bone-dim transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <span className="text-bone-muted">{construct.name}</span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-mono font-bold text-bone-base">{construct.name}</h1>
          <span className="border border-void-border px-2 py-0.5 text-[10px] font-mono text-bone-dim">
            v{construct.version}
          </span>
          <span className="text-[10px] font-mono text-bone-ghost uppercase">{construct.type}</span>
          {construct.constructType && construct.constructType !== 'skill-pack' && (
            <span className="border border-cyan-dim/30 bg-cyan-dim/10 px-2 py-0.5 text-[10px] font-mono text-cyan-dim">
              {construct.constructType.replace(/-/g, ' ')}
            </span>
          )}
          {construct.owner && (
            <span className="border border-void-border px-2 py-0.5 text-[10px] font-mono text-bone-dim">
              by {construct.owner.name}
            </span>
          )}
          {(() => {
            const tier = construct.verificationTier;
            if (tier === 'PROVEN') {
              return (
                <span className="border border-graduation-stable/30 bg-graduation-stable/10 px-2 py-0.5 text-[10px] font-mono text-graduation-stable">
                  Proven
                </span>
              );
            }
            if (tier === 'BACKTESTED') {
              return (
                <span className="border border-graduation-beta/30 bg-graduation-beta/10 px-2 py-0.5 text-[10px] font-mono text-graduation-beta">
                  Backtested
                </span>
              );
            }
            return (
              <span className="border border-void-border px-2 py-0.5 text-[10px] font-mono text-bone-ghost">
                Unverified
              </span>
            );
          })()}
        </div>
        <p className="text-sm font-mono text-bone-dim">{construct.description}</p>
        {construct.longDescription && (
          <p className="text-sm font-mono text-bone-ghost mt-2">{construct.longDescription}</p>
        )}
        {construct.forkedFrom && (
          <div className="mt-2">
            <Link
              href={`/constructs/${construct.forkedFrom.slug}`}
              className="inline-flex items-center gap-1 text-xs font-mono text-cyan-dim hover:text-cyan-base transition-colors"
            >
              Forked from {construct.forkedFrom.name}
            </Link>
          </div>
        )}
        {construct.forkCount > 0 && (
          <p className="text-xs font-mono text-bone-ghost mt-1">
            {construct.forkCount} variant{construct.forkCount !== 1 ? 's' : ''} exist{construct.forkCount === 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* SKILL.md Prose */}
      {construct.skillProse && (
        <div className="border border-void-border p-4">
          <p className="text-sm font-mono text-bone-dim whitespace-pre-wrap">
            {construct.skillProse}
          </p>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="border border-void-border p-3">
          <p className="text-bone-ghost mb-1">Category</p>
          <p className="text-bone-base">{construct.category}</p>
        </div>
        <div className="border border-void-border p-3">
          <p className="text-bone-ghost mb-1">Downloads</p>
          <p className="text-bone-base">{construct.downloads.toLocaleString()}</p>
        </div>
        <div className="border border-void-border p-3">
          <p className="text-bone-ghost mb-1">Commands</p>
          <p className="text-bone-base">{construct.commandCount}</p>
        </div>
        <div className="border border-void-border p-3">
          <p className="text-bone-ghost mb-1">Graduation</p>
          <p className="text-bone-base capitalize">{construct.graduationLevel}</p>
        </div>
        {construct.rating != null && (
          <div className="border border-void-border p-3">
            <p className="text-bone-ghost mb-1">Rating</p>
            <p className="text-bone-base">{construct.rating.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Expert Identity */}
      {construct.identity && (
        <IdentityPanel identity={construct.identity} />
      )}

      {/* Verification Status */}
      {construct.verificationTier && construct.verificationTier !== 'UNVERIFIED' && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Verification</h2>
          <div className="border border-void-border p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-bone-ghost">Tier</span>
              <span className="text-xs font-mono text-bone-base capitalize">
                {construct.verificationTier.toLowerCase()}
              </span>
            </div>
            {construct.verifiedAt && (
              <p className="text-xs font-mono text-bone-ghost">
                Verified {new Date(construct.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Install */}
      <div className="border border-void-border p-4">
        <p className="text-xs font-mono text-bone-ghost mb-2">Install</p>
        <code className="block text-sm font-mono text-cyan-base">
          {construct.installCommand}
        </code>
      </div>

      {/* Commands */}
      {construct.commands.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Commands</h2>
          <div className="space-y-2">
            {construct.commands.map((cmd) => (
              <div key={cmd.name} className="border border-void-border p-3">
                <code className="text-xs font-mono text-cyan-dim">{cmd.name}</code>
                <p className="text-xs font-mono text-bone-muted mt-1">{cmd.description}</p>
                {cmd.usage && (
                  <code className="block text-[10px] font-mono text-bone-ghost mt-1">{cmd.usage}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(construct.skills?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Skills</h2>
          <div className="space-y-2">
            {construct.skills!.map((skill) => (
              <div key={skill.slug} className="border border-void-border p-3">
                <p className="text-xs font-mono text-bone-base">{skill.name}</p>
                {skill.description && (
                  <p className="text-xs font-mono text-bone-muted mt-1">{skill.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composes With */}
      {construct.composesWith.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Composes With</h2>
          <div className="flex flex-wrap gap-2">
            {construct.composesWith.map((dep) => (
              <Link
                key={dep}
                href={`/constructs/${dep}`}
                className="border border-void-border px-2 py-1 text-xs font-mono text-bone-dim hover:bg-void-surface hover:text-bone-base transition-colors"
              >
                {dep}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Built With — Showcases */}
      {construct.showcases.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Built With</h2>
          <div className="space-y-2">
            {construct.showcases.map((showcase) => (
              <div key={showcase.id} className="border border-void-border p-3">
                <a
                  href={showcase.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-cyan-dim hover:text-cyan-base transition-colors"
                >
                  {showcase.title} &rarr;
                </a>
                {showcase.description && (
                  <p className="text-xs font-mono text-bone-muted mt-1">{showcase.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal Accuracy */}
      {construct.accuracy && (
        <div>
          <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Signal Accuracy</h2>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="border border-void-border p-3">
              <p className="text-bone-ghost mb-1">Weighted Kappa</p>
              <p className="text-bone-base">{construct.accuracy.weightedKappa.toFixed(3)}</p>
            </div>
            <div className="border border-void-border p-3">
              <p className="text-bone-ghost mb-1">Coverage</p>
              <p className="text-bone-base">{(construct.accuracy.coverage * 100).toFixed(0)}%</p>
            </div>
            <div className="border border-void-border p-3">
              <p className="text-bone-ghost mb-1">Sample Size</p>
              <p className="text-bone-base">{construct.accuracy.sampleSize}</p>
            </div>
          </div>
          {construct.accuracy.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {construct.accuracy.warnings.map((warning, i) => (
                <p key={i} className="text-xs font-mono text-graduation-beta">{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Links */}
      <div>
        <h2 className="text-sm font-mono font-bold text-bone-base mb-3">Links</h2>
        <div className="flex flex-wrap gap-3 text-xs font-mono">
          <Link
            href="/explore"
            className="border border-void-border px-4 py-2 text-bone-dim hover:bg-void-raised hover:text-bone-base transition-colors"
          >
            View in graph &rarr;
          </Link>
          {construct.sourceType === 'git' && construct.gitUrl && (
            <a
              href={construct.gitUrl.replace(/\.git$/, '')}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-void-border px-4 py-2 text-bone-dim hover:bg-void-raised hover:text-bone-base transition-colors"
            >
              Source &rarr;
            </a>
          )}
          {construct.repositoryUrl && (
            <a
              href={construct.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-void-border px-4 py-2 text-bone-dim hover:bg-void-raised hover:text-bone-base transition-colors"
            >
              Repository &rarr;
            </a>
          )}
          {construct.homepageUrl && (
            <a
              href={construct.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-void-border px-4 py-2 text-bone-dim hover:bg-void-raised hover:text-bone-base transition-colors"
            >
              Homepage &rarr;
            </a>
          )}
          {construct.documentationUrl && (
            <a
              href={construct.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-void-border px-4 py-2 text-bone-dim hover:bg-void-raised hover:text-bone-base transition-colors"
            >
              Docs &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
