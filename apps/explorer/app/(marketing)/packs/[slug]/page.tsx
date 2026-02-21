import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchConstruct } from '@/lib/data/fetch-constructs';

export const revalidate = 600;

// Return empty — pages are ISR-generated on first request to avoid
// build-time API dependency that causes Vercel timeout failures.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pack = await fetchConstruct(slug);
  if (!pack) return { title: 'Not Found' };
  return {
    title: pack.name,
    description: pack.description,
  };
}

export default async function PackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await fetchConstruct(slug);

  if (!pack) notFound();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-mono font-bold text-white">{pack.name}</h1>
          <span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/60">
            v{pack.version}
          </span>
        </div>
        <p className="text-sm font-mono text-white/60">{pack.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs font-mono">
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Downloads</p>
          <p className="text-white">{pack.downloads.toLocaleString()}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Skills</p>
          <p className="text-white">{pack.skills?.length ?? 0}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Commands</p>
          <p className="text-white">{pack.commands.length}</p>
        </div>
      </div>

      <div className="border border-white/10 p-4">
        <p className="text-xs font-mono text-white/40 mb-2">Install</p>
        <code className="block text-sm font-mono text-green-400">{pack.installCommand}</code>
      </div>

      {(pack.skills?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-mono font-bold text-white mb-3">Skills ({pack.skills!.length})</h2>
          <div className="space-y-2">
            {pack.skills!.map((skill) => (
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

      <div className="flex gap-3 text-xs font-mono">
        <Link href={`/${slug}`} className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors">
          View in graph →
        </Link>
        {pack.sourceType === 'git' && pack.gitUrl && (
          <a
            href={pack.gitUrl.replace(/\.git$/, '')}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors"
          >
            View Source on GitHub →
          </a>
        )}
        <Link href="/packs" className="text-white/40 hover:text-white/60 transition-colors flex items-center">
          ← Back to packs
        </Link>
      </div>
    </div>
  );
}
