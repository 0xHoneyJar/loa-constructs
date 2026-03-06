'use client';

import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useCreatorDashboard } from '@/lib/api/hooks';

const statusStyles: Record<string, { label: string; color: string }> = {
  draft: { label: 'DRAFT', color: 'text-bone-muted' },
  pending_review: { label: 'PENDING', color: 'text-graduation-beta' },
  published: { label: 'PUBLISHED', color: 'text-cyan-base' },
  rejected: { label: 'REJECTED', color: 'text-crimson-base' },
  deprecated: { label: 'DEPRECATED', color: 'text-bone-muted' },
};

export default function CreatorPage() {
  const { data, isLoading } = useCreatorDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono text-bone-bright">Creator Dashboard</h1>
          <p className="text-xs font-mono text-bone-muted mt-1">Manage and publish your constructs.</p>
        </div>
        <Link href="/creator/new">
          <Button>+ New Construct</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Panel title="Published">
          <p className="text-2xl font-mono text-cyan-base">
            {isLoading ? '—' : data?.totals.packs_count ?? 0}
          </p>
        </Panel>
        <Panel title="Downloads">
          <p className="text-2xl font-mono text-cyan-base">
            {isLoading ? '—' : (data?.totals.total_downloads ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Revenue">
          <p className="text-2xl font-mono text-cyan-dim">
            {isLoading ? '—' : `$${(data?.totals.total_revenue ?? 0).toFixed(2)}`}
          </p>
          <p className="text-[10px] font-mono text-bone-muted">coming soon</p>
        </Panel>
        <Panel title="Pending">
          <p className="text-2xl font-mono text-graduation-beta">
            {isLoading ? '—' : `$${(data?.totals.pending_payout ?? 0).toFixed(2)}`}
          </p>
          <p className="text-[10px] font-mono text-bone-muted">coming soon</p>
        </Panel>
      </div>

      {/* Packs Table */}
      <Panel title="Your Constructs">
        {isLoading ? (
          <p className="text-xs font-mono text-bone-muted">Loading constructs...</p>
        ) : !data?.packs.length ? (
          <div className="py-8 text-center">
            <p className="text-sm font-mono text-bone-muted mb-4">No constructs yet. Create your first one.</p>
            <Link href="/creator/new">
              <Button variant="secondary">Create Construct</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-void-border">
                  <th className="text-left py-2 px-2 text-bone-muted">Name</th>
                  <th className="text-center py-2 px-2 text-bone-muted">Status</th>
                  <th className="text-center py-2 px-2 text-bone-muted">Version</th>
                  <th className="text-right py-2 px-2 text-bone-muted">Downloads</th>
                  <th className="text-right py-2 px-2 text-bone-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.packs.map((pack) => {
                  const status = statusStyles[pack.status] ?? statusStyles.draft;
                  return (
                    <tr key={pack.slug} className="border-b border-void-border/50 hover:bg-bone-muted/5">
                      <td className="py-2 px-2">
                        <p className="text-bone-base">{pack.name}</p>
                        <p className="text-bone-muted text-[10px]">{pack.slug}</p>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`${status.color} text-[10px] uppercase`}>{status.label}</span>
                      </td>
                      <td className="text-center py-2 px-2 text-bone-base">
                        {pack.latest_version ?? '—'}
                      </td>
                      <td className="text-right py-2 px-2 text-bone-base">
                        {pack.downloads.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2">
                        <Link href={`/creator/skills/${pack.slug}`}>
                          <Button variant="ghost" className="text-[10px] px-2 py-1 h-auto">
                            View →
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
