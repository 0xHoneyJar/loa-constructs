'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/explore': 'Explore',
  '/dashboard/constructs': 'Constructs',
  '/dashboard/keys': 'API Keys',
  '/dashboard/signals': 'Signals',
  '/dashboard/health': 'Health',
};

const HEADER_TOKENS = {
  '--header-bg': 'var(--color-bg-void)',
  '--header-border': 'var(--color-border-subtle)',
  '--header-breadcrumb': 'var(--color-text-tertiary)',
  '--header-breadcrumb-hover': 'var(--color-text-primary)',
  '--header-separator': 'var(--color-border-subtle)',
  '--header-page-label': 'var(--color-text-primary)',
  '--header-address': 'var(--color-text-ghost)',
} as CSSProperties;

export function DashboardHeader() {
  const { user, isAdmin, isOrgMember } = useAuthStore();
  const pathname = usePathname();

  const pageLabel = routeLabels[pathname] ?? 'Dashboard';

  return (
    <header
      style={HEADER_TOKENS}
      className="h-12 shrink-0 border-b border-[var(--header-border)] px-6 flex items-center justify-between bg-[var(--header-bg)]"
    >
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="font-mono text-[var(--text-xs)] text-[var(--header-breadcrumb)] uppercase tracking-terminal hover:text-[var(--header-breadcrumb-hover)] transition-colors">
          sprawlos
        </Link>
        <span className="font-mono text-[var(--text-xs)] text-[var(--header-separator)]" aria-hidden="true">/</span>
        <span className="font-mono text-[var(--text-xs)] text-[var(--header-page-label)] uppercase tracking-terminal">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {isOrgMember && (
          <span className="font-mono text-[var(--text-2xs)] text-cyan-base/70 border border-cyan-base/20 px-1.5 py-0.5 uppercase tracking-whisper" aria-hidden="true">
            org
          </span>
        )}
        {isAdmin && (
          <span className="font-mono text-[var(--text-2xs)] text-graduation-beta/70 border border-graduation-beta/20 px-1.5 py-0.5 uppercase tracking-whisper" aria-hidden="true">
            admin
          </span>
        )}
        {user?.walletAddress && (
          <span className="font-mono text-[var(--text-xs)] text-[var(--header-address)] tracking-terminal">
            {truncateAddress(user.walletAddress)}
          </span>
        )}
      </div>
    </header>
  );
}
