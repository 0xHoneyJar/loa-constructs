import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct, fetchAllConstructs } from '@/lib/data/fetch-constructs';

export const revalidate = 600;

export async function generateStaticParams() {
  const constructs = await fetchAllConstructs();
  return constructs.map((c) => ({ slug: c.slug }));
}

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-mono font-bold text-white">{construct.name}</h1>
          <span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/60">
            v{construct.version}
          </span>
          <span className="text-[10px] font-mono text-white/40 uppercase">{construct.type}</span>
          {construct.owner && (
            <span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/60">
              by {construct.owner.name}
            </span>
          )}
          {construct.hasIdentity && (
            <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              Expert Identity
            </span>
          )}
        </div>
        <p className="text-sm font-mono text-white/60">{construct.description}</p>
        {construct.longDescription && (
          <p className="text-sm font-mono text-white/40 mt-2">{construct.longDescription}</p>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Category</p>
          <p className="text-white">{construct.category}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Downloads</p>
          <p className="text-white">{construct.downloads.toLocaleString()}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Commands</p>
          <p className="text-white">{construct.commandCount}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Level</p>
          <p className="text-white capitalize">{construct.graduationLevel}</p>
        </div>
        {construct.rating != null && (
          <div className="border border-white/10 p-3">
            <p className="text-white/40 mb-1">Rating</p>
            <p className="text-white">{construct.rating.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Install */}
      <div className="border border-white/10 p-4">
        <p className="text-xs font-mono text-white/40 mb-2">Install</p>
        <code className="block text-sm font-mono text-green-400">
          {construct.installCommand}
        </code>
      </div>

      {/* Commands */}
      {construct.commands.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-white mb-3">Commands</h2>
          <div className="space-y-2">
            {construct.commands.map((cmd) => (
              <div key={cmd.name} className="border border-white/10 p-3">
                <code className="text-xs font-mono text-blue-400">{cmd.name}</code>
                <p className="text-xs font-mono text-white/50 mt-1">{cmd.description}</p>
                {cmd.usage && (
                  <code className="block text-[10px] font-mono text-white/30 mt-1">{cmd.usage}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(construct.skills?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-white mb-3">Skills</h2>
          <div className="space-y-2">
            {construct.skills!.map((skill) => (
              <div key={skill.slug} className="border border-white/10 p-3">
                <p className="text-xs font-mono text-white">{skill.name}</p>
                {skill.description && (
                  <p className="text-xs font-mono text-white/50 mt-1">{skill.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composes With */}
      {construct.composesWith.length > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-white mb-3">Composes With</h2>
          <div className="flex flex-wrap gap-2">
            {construct.composesWith.map((dep) => (
              <span key={dep} className="border border-white/20 px-2 py-1 text-xs font-mono text-white/60">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex gap-3 text-xs font-mono">
        <Link
          href={`/${slug}`}
          className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
        >
          View in graph →
        </Link>
        {construct.sourceType === 'git' && construct.gitUrl && (
          <a
            href={construct.gitUrl.replace(/\.git$/, '')}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            View Source on GitHub →
          </a>
        )}
        {construct.repositoryUrl && (
          <a
            href={construct.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            Repository →
          </a>
        )}
        {construct.homepageUrl && (
          <a
            href={construct.homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            Homepage →
          </a>
        )}
        {construct.documentationUrl && (
          <a
            href={construct.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            Documentation →
          </a>
        )}
        <Link
          href="/constructs"
          className="text-white/40 hover:text-white/60 transition-colors flex items-center"
        >
          ← Back to catalog
        </Link>
      </div>
    </div>
  );
}
