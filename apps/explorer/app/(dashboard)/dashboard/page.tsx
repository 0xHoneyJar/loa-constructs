'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fetchDashboard, type AdminAnalytics } from '@/lib/api/dashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { QuickLink } from '@/components/dashboard/quick-link';
import {
  PixelGrid,
  PixelNetwork,
  PixelCube,
  PixelKey,
  PixelSignal,
} from '@/components/icons/pixel';

export default function DashboardOverview() {
  const { isAdmin } = useAuthStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [constructCount, setConstructCount] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboard<{ data: { id: string }[]; pagination: { total: number } }>('/constructs?per_page=1')
      .then((res) => setConstructCount(res.pagination?.total ?? res.data?.length ?? 0))
      .catch(() => setConstructCount(0));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboard<Record<string, unknown>>('/admin/analytics')
      .then((raw) => setAnalytics({
        users: {
          total: (raw.users as { total: number })?.total ?? 0,
          new: (raw.users as { new_in_period: number })?.new_in_period ?? 0,
          verified: (raw.users as { verified: number })?.verified ?? 0,
        },
        apiKeys: (raw.api_keys as { total_active: number })?.total_active ?? 0,
        teams: (raw.teams as { total: number })?.total ?? 0,
      } as AdminAnalytics))
      .catch(() => {});
  }, [isAdmin]);

  return (
    <div className="space-y-8 bg-grid-substrate min-h-full" data-dashboard-state="nominal">
      <div className="flex items-center gap-2">
        <PixelGrid className="w-4 h-4 text-bone-ghost" />
        <h1 className="font-mono text-[9px] text-bone-muted uppercase tracking-terminal" aria-hidden="true">
          sprawlos::overview
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Constructs"
          value={constructCount !== null ? String(constructCount) : '...'}
          variant="cyan"
          icon={<PixelCube className="w-3.5 h-3.5" />}
        />
        <QuickLink href="/dashboard/keys" label="API Keys" icon={<PixelKey className="w-3.5 h-3.5" />} />
        <QuickLink href="/dashboard/explore" label="Graph" icon={<PixelNetwork className="w-3.5 h-3.5" />} />
        <QuickLink href="/dashboard/constructs" label="Metrics" icon={<PixelCube className="w-3.5 h-3.5" />} />
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] text-bone-ghost uppercase tracking-whisper" aria-hidden="true">
              sector::admin
            </span>
            <div className="flex-1 h-px bg-sprawl-grid-line" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickLink href="/dashboard/signals" label="Signals" icon={<PixelSignal className="w-3.5 h-3.5" />} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Users" value={analytics ? String(analytics.users.total) : '...'} variant="yellow" />
            <StatCard label="New Users" value={analytics ? String(analytics.users.new) : '...'} variant="green" />
            <StatCard label="API Keys" value={analytics ? String(analytics.apiKeys) : '...'} variant="cyan" />
            <StatCard label="Teams" value={analytics ? String(analytics.teams) : '...'} variant="default" />
          </div>
        </div>
      )}
    </div>
  );
}
