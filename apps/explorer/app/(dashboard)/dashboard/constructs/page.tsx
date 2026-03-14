'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDashboard } from '@/lib/api/dashboard';
import { LiveInstallFeed } from '@/components/dashboard/live-install-feed';

interface ApiConstruct {
  id: string;
  name: string;
  slug: string;
  downloads: number;
  skills_count: number;
  type: string;
  construct_type: string | null;
}

interface ConstructSummary {
  id: string;
  name: string;
  slug: string;
  downloads: number;
  skillsCount: number;
  constructType: string;
}

export default function ConstructMetricsPage() {
  const [constructs, setConstructs] = useState<ConstructSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard<{ data: ApiConstruct[] }>('/constructs?per_page=100')
      .then((res) => {
        const mapped = (res.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          downloads: c.downloads,
          skillsCount: c.skills_count,
          constructType: c.construct_type || c.type,
        }));
        const sorted = mapped.sort((a, b) => b.downloads - a.downloads);
        setConstructs(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex gap-6 max-w-6xl">
      <div className="flex-1 min-w-0 space-y-4">
        <h1 className="font-mono text-lg text-bone-base">Constructs</h1>

        {loading ? (
          <div className="border border-void-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-void-border">
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Domain
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Skills
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Installs
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-void-border/50 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="animate-pulse bg-void-raised rounded-none h-3 w-28" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="animate-pulse bg-void-raised rounded-none h-3 w-12" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="animate-pulse bg-void-raised rounded-none h-3 w-6 ml-auto" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="animate-pulse bg-void-raised rounded-none h-3 w-10 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : constructs.length === 0 ? (
          <div className="border border-void-border p-8 text-center">
            <div className="font-mono text-xs text-bone-muted">
              No constructs found
            </div>
            <div className="mt-1 font-mono text-[9px] text-bone-ghost">
              Constructs will appear once they are published to the registry
            </div>
          </div>
        ) : (
          <div className="border border-void-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-void-border">
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Domain
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Skills
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-muted uppercase tracking-widest">
                    Installs
                  </th>
                </tr>
              </thead>
              <tbody>
                {constructs.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-void-border/50 last:border-b-0 hover:bg-void-raised/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/constructs/${c.slug}`}
                        className="font-mono text-[11px] text-bone-base hover:text-cyan-base transition-colors"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block font-mono text-[9px] text-bone-muted border border-void-border px-1.5 py-0.5 uppercase">
                        {c.category || 'uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-bone-dim">
                      {c.skillsCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-cyan-base/70">
                      {c.downloads.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="w-72 shrink-0 space-y-4">
        <h2 className="font-mono text-xs text-bone-muted uppercase tracking-widest">
          Live Feed
        </h2>
        <LiveInstallFeed />
      </div>
    </div>
  );
}
