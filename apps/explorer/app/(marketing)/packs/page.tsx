import Link from 'next/link';
import { fetchAllConstructs } from '@/lib/data/fetch-constructs';

export const revalidate = 300;

export const metadata = {
  title: 'Packs',
  description: 'Browse construct packs — curated collections of AI agent skills.',
};

export default async function PacksPage() {
  const all = await fetchAllConstructs();
  const packs = all.filter((c) => c.type === 'pack').sort((a, b) => b.downloads - a.downloads);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white">Packs</h1>
        <p className="text-sm font-mono text-white/60 mt-1">
          {packs.length} packs available
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="text-sm font-mono text-white/40 py-12 text-center">No packs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <Link
              key={pack.id}
              href={`/packs/${pack.slug}`}
              className="border border-white/10 p-4 hover:border-white/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-bold text-white group-hover:text-white/90">
                  {pack.name}
                </span>
                <span className="text-[10px] font-mono text-white/40">v{pack.version}</span>
              </div>
              <p className="text-xs font-mono text-white/50 line-clamp-2 mb-3">
                {pack.shortDescription}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
                <span>{pack.category}</span>
                <span>{pack.downloads.toLocaleString()} downloads</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
