'use client';

import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useCreatorDashboard } from '@/lib/api/hooks';

const statusStyles: Record<string, { label: string; color: string }> = {
  draft: { label: 'DRAFT', color: 'text-tui-dim' },
  pending_review: { label: 'PENDING', color: 'text-tui-yellow' },
  published: { label: 'PUBLISHED', color: 'text-tui-green' },
  rejected: { label: 'REJECTED', color: 'text-tui-red' },
  deprecated: { label: 'DEPRECATED', color: 'text-tui-dim' },
};

export default function CreatorPage() {
  const { data, isLoading } = useCreatorDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono text-tui-bright">Creator Dashboard</h1>
          <p className="text-xs font-mono text-tui-dim mt-1">Manage and publish your constructs.</p>
        </div>
        <Link href="/creator/new">
          <Button>+ New Construct</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Panel title="Published">
          <p className="text-2xl font-mono text-tui-green">
            {isLoading ? '—' : data?.totals.packs_count ?? 0}
          </p>
        </Panel>
        <Panel title="Downloads">
          <p className="text-2xl font-mono text-tui-accent">
            {isLoading ? '—' : (data?.totals.total_downloads ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Revenue">
          <p className="text-2xl font-mono text-tui-cyan">
            {isLoading ? '—' : `$${(data?.totals.total_revenue ?? 0).toFixed(2)}`}
          </p>
          <p className="text-[10px] font-mono text-tui-dim">coming soon</p>
        </Panel>
        <Panel title="Pending">
          <p className="text-2xl font-mono text-tui-yellow">
            {isLoading ? '—' : `$${(data?.totals.pending_payout ?? 0).toFixed(2)}`}
          </p>
          <p className="text-[10px] font-mono text-tui-dim">coming soon</p>
        </Panel>
      </div>

      {/* Packs Table */}
      <Panel title="Your Constructs">
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading constructs...</p>
        ) : !data?.packs.length ? (
          <div className="py-8 text-center">
            <p className="text-sm font-mono text-tui-dim mb-4">No constructs yet. Create your first one.</p>
            <Link href="/creator/new">
              <Button variant="secondary">Create Construct</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-tui-border">
                  <th className="text-left py-2 px-2 text-tui-dim">Name</th>
                  <th className="text-center py-2 px-2 text-tui-dim">Status</th>
                  <th className="text-center py-2 px-2 text-tui-dim">Version</th>
                  <th className="text-right py-2 px-2 text-tui-dim">Downloads</th>
                  <th className="text-right py-2 px-2 text-tui-dim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.packs.map((pack) => {
                  const status = statusStyles[pack.status] ?? statusStyles.draft;
                  return (
                    <tr key={pack.slug} className="border-b border-tui-border/50 hover:bg-tui-dim/5">
                      <td className="py-2 px-2">
                        <p className="text-tui-fg">{pack.name}</p>
                        <p className="text-tui-dim text-[10px]">{pack.slug}</p>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`${status.color} text-[10px] uppercase`}>{status.label}</span>
                      </td>
                      <td className="text-center py-2 px-2 text-tui-fg">
                        {pack.latest_version ?? '—'}
                      </td>
                      <td className="text-right py-2 px-2 text-tui-fg">
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
