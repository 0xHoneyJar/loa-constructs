import Link from 'next/link';
import { fetchAllConstructs } from '@/lib/data/fetch-constructs';

export const revalidate = 3600;

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
        <h1 className="text-2xl font-mono font-boldtext-bone-base">Packs</h1>
        <p className="text-sm font-mono text-bone-dim mt-1">
          {packs.length} packs available
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="text-sm font-mono text-bone-ghost py-12 text-center">No packs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <Link
              key={pack.id}
              href={`/packs/${pack.slug}`}
              className="border border-void-border p-4 hover:border-bone-ghost transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-bold text-bone-base group-hover:text-bone-base">
                  {pack.name}
                </span>
                <span className="text-[10px] font-mono text-bone-ghost">v{pack.version}</span>
              </div>
              <p className="text-xs font-mono text-bone-muted line-clamp-2 mb-3">
                {pack.shortDescription}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-bone-ghost">
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
