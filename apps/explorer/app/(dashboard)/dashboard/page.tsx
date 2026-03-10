'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fetchDashboard, type AdminAnalytics } from '@/lib/api/dashboard';
import Link from 'next/link';

export default function DashboardOverview() {
  const { isAdmin } = useAuthStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [constructCount, setConstructCount] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboard<{ constructs: { id: string }[] }>('/constructs?per_page=100')
      .then((data) => setConstructCount(data.constructs?.length ?? 0))
      .catch(() => setConstructCount(0));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboard<AdminAnalytics>('/admin/analytics')
      .then(setAnalytics)
      .catch(() => {});
  }, [isAdmin]);

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="font-mono text-lg text-bone-light">Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Constructs"
          value={constructCount !== null ? String(constructCount) : '...'}
        />
        <QuickLink href="/dashboard/keys" label="API Keys" />
        <QuickLink href="/dashboard/explore" label="Graph" />
        <QuickLink href="/dashboard/constructs" label="Metrics" />
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <h2 className="font-mono text-sm text-bone-light/70 uppercase tracking-wider">
            Admin
          </h2>
          {analytics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Users" value={String(analytics.users.total)} />
              <StatCard label="New Users" value={String(analytics.users.new)} />
              <StatCard label="API Keys" value={String(analytics.apiKeys)} />
              <StatCard label="Teams" value={String(analytics.teams)} />
            </div>
          ) : (
            <div className="font-mono text-xs text-bone-light/30">
              Loading admin stats...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-bone-light/10 bg-void-base p-4">
      <div className="font-mono text-[9px] text-bone-light/40 uppercase tracking-widest">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl text-bone-light">{value}</div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border border-bone-light/10 bg-void-base p-4 hover:border-bone-light/30 transition-colors group"
    >
      <div className="font-mono text-[11px] text-bone-light/60 group-hover:text-bone-light transition-colors uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 font-mono text-[9px] text-bone-light/30">
        &rarr;
      </div>
    </Link>
  );
}
