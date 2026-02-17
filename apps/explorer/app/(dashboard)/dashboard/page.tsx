'use client';

import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useDashboardStats } from '@/lib/api/hooks';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-mono text-tui-bright">
          Welcome back, {user?.name || user?.email?.split('@')[0] || 'user'}
        </h1>
        <p className="text-xs font-mono text-tui-dim mt-1">Here&apos;s an overview of your account.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel title="Published">
          <p className="text-2xl font-mono text-tui-green">
            {isLoading ? '—' : stats?.constructsPublished ?? 0}
          </p>
          <p className="text-xs font-mono text-tui-dim">constructs</p>
        </Panel>
        <Panel title="Downloads">
          <p className="text-2xl font-mono text-tui-accent">
            {isLoading ? '—' : stats?.totalDownloads ?? 0}
          </p>
          <p className="text-xs font-mono text-tui-dim">total</p>
        </Panel>
        <Panel title="Views">
          <p className="text-2xl font-mono text-tui-cyan">
            {isLoading ? '—' : stats?.totalViews ?? 0}
          </p>
          <p className="text-xs font-mono text-tui-dim">total</p>
        </Panel>
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Link href="/creator/new">
            <Button variant="secondary">Create Construct</Button>
          </Link>
          <Link href="/api-keys">
            <Button variant="secondary">Manage API Keys</Button>
          </Link>
          <Link href="/profile">
            <Button variant="secondary">Edit Profile</Button>
          </Link>
        </div>
      </Panel>

      {/* Recent Activity */}
      <Panel title="Recent Activity">
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading activity...</p>
        ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <ul className="space-y-2">
            {stats.recentActivity.map((item) => (
              <li key={item.id} className="flex justify-between text-xs font-mono">
                <span className="text-tui-fg">{item.description}</span>
                <span className="text-tui-dim">{new Date(item.timestamp).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-mono text-tui-dim">No recent activity. Start by creating a construct.</p>
        )}
      </Panel>
    </div>
  );
}
