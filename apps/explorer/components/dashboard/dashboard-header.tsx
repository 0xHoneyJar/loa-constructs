'use client';

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
  '/dashboard/analytics': 'Analytics',
};

export function DashboardHeader() {
  const { user, isAdmin, isOrgMember } = useAuthStore();
  const pathname = usePathname();

  const pageLabel = routeLabels[pathname] ?? 'Dashboard';

  return (
    <header className="h-12 shrink-0 border-b border-bone-light/10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-bone-light/40">Dashboard</span>
        <span className="font-mono text-[9px] text-bone-light/20">/</span>
        <span className="font-mono text-xs text-bone-light">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {isOrgMember && (
          <span className="font-mono text-[9px] text-cyan-base/70 border border-cyan-base/20 px-1 py-0.5 uppercase tracking-wider">
            org
          </span>
        )}
        {isAdmin && (
          <span className="font-mono text-[9px] text-amber-400/70 border border-amber-400/20 px-1 py-0.5 uppercase tracking-wider">
            admin
          </span>
        )}
        {user?.walletAddress && (
          <span className="font-mono text-[10px] text-bone-light/50">
            {truncateAddress(user.walletAddress)}
          </span>
        )}
      </div>
    </header>
  );
}
