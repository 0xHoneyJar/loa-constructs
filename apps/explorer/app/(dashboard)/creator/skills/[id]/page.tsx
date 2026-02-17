'use client';

import { use } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { useSkillAnalytics } from '@/lib/api/hooks';

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: analytics, isLoading } = useSkillAnalytics(id);

  const trend =
    analytics && analytics.lastMonth > 0
      ? ((analytics.thisMonth - analytics.lastMonth) / analytics.lastMonth) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/creator" className="text-xs font-mono text-tui-dim hover:text-tui-fg">
          ← Back
        </Link>
        <div>
          <h1 className="text-lg font-mono text-tui-bright">Skill Analytics</h1>
          <p className="text-xs font-mono text-tui-dim mt-1">ID: {id}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Panel title="Total Downloads">
          <p className="text-2xl font-mono text-tui-green">
            {isLoading ? '—' : (analytics?.totalDownloads ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Active Installs">
          <p className="text-2xl font-mono text-tui-accent">
            {isLoading ? '—' : (analytics?.activeInstalls ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="This Month">
          <p className="text-2xl font-mono text-tui-cyan">
            {isLoading ? '—' : (analytics?.thisMonth ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Trend">
          <p className={`text-2xl font-mono ${trend >= 0 ? 'text-tui-green' : 'text-tui-red'}`}>
            {isLoading ? '—' : `${trend >= 0 ? '+' : ''}${trend.toFixed(0)}%`}
          </p>
        </Panel>
      </div>

      {/* Daily Trend */}
      <Panel title="30-Day Trend">
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading trend data...</p>
        ) : !analytics?.dailyTrend?.length ? (
          <p className="text-xs font-mono text-tui-dim">No trend data available yet.</p>
        ) : (
          <div className="flex items-end gap-px h-32">
            {analytics.dailyTrend.map((day, i) => {
              const max = Math.max(...analytics.dailyTrend.map((d) => d.installs + d.loads), 1);
              const height = ((day.installs + day.loads) / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-tui-accent/60 hover:bg-tui-accent transition-colors"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${day.date}: ${day.installs} installs, ${day.loads} loads`}
                />
              );
            })}
          </div>
        )}
      </Panel>

      {/* Version Breakdown */}
      <Panel title="Version Breakdown">
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading...</p>
        ) : !analytics?.versionBreakdown?.length ? (
          <p className="text-xs font-mono text-tui-dim">No version data available.</p>
        ) : (
          <div className="space-y-2">
            {analytics.versionBreakdown.map((v) => (
              <div key={v.version} className="flex items-center gap-3 text-xs font-mono">
                <span className="text-tui-fg w-16">{v.version}</span>
                <div className="flex-1 h-3 bg-tui-border/30">
                  <div
                    className="h-full bg-tui-accent"
                    style={{ width: `${v.percentage}%` }}
                  />
                </div>
                <span className="text-tui-dim w-12 text-right">{v.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
