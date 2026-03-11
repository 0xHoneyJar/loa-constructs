'use client';

import { useEffect, useState } from 'react';
import { fetchDashboard } from '@/lib/api/dashboard';
import { LiveInstallFeed } from '@/components/dashboard/live-install-feed';

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
    fetchDashboard<{ constructs: ConstructSummary[] }>('/constructs?per_page=100')
      .then((data) => {
        const sorted = (data.constructs || []).sort(
          (a, b) => b.downloads - a.downloads,
        );
        setConstructs(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex gap-6 max-w-6xl">
      <div className="flex-1 min-w-0 space-y-4">
        <h1 className="font-mono text-lg text-bone-light">Constructs</h1>

        {loading ? (
          <div className="font-mono text-xs text-bone-light/30">Loading...</div>
        ) : (
          <div className="border border-bone-light/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bone-light/10">
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-light/40 uppercase tracking-widest">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-light/40 uppercase tracking-widest">
                    Type
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-light/40 uppercase tracking-widest">
                    Skills
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-light/40 uppercase tracking-widest">
                    Installs
                  </th>
                </tr>
              </thead>
              <tbody>
                {constructs.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-bone-light/5 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-bone-light">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[8px] text-bone-light/40 border border-bone-light/10 px-1 py-0.5">
                        {c.constructType || 'pack'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-bone-light/60">
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
        <h2 className="font-mono text-xs text-bone-light/40 uppercase tracking-widest">
          Live Feed
        </h2>
        <LiveInstallFeed />
      </div>
    </div>
  );
}
