'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/explore': 'Explore',
  '/dashboard/constructs': 'Constructs',
  '/dashboard/keys': 'API Keys',
};

export function DashboardHeader() {
  const { user, isAdmin, isOrgMember } = useAuthStore();
  const pathname = usePathname();

  const pageLabel = routeLabels[pathname] ?? 'Dashboard';

  return (
    <header className="h-12 shrink-0 border-b border-void-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="font-mono text-xs text-bone-muted hover:text-bone-base transition-colors">Dashboard</Link>
        <span className="font-mono text-[9px] text-bone-ghost">/</span>
        <span className="font-mono text-xs text-bone-base">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {isOrgMember && (
          <span className="font-mono text-[9px] text-cyan-base/70 border border-cyan-base/20 px-1 py-0.5 uppercase tracking-wider">
            org
          </span>
        )}
        {isAdmin && (
          <span className="font-mono text-[9px] text-graduation-beta/70 border border-graduation-beta/20 px-1 py-0.5 uppercase tracking-wider">
            admin
          </span>
        )}
        {user?.walletAddress && (
          <span className="font-mono text-[10px] text-bone-muted">
            {truncateAddress(user.walletAddress)}
          </span>
        )}
      </div>
    </header>
  );
}
