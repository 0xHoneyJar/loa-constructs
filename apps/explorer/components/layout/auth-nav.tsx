'use client';

/**
 * AuthNav — Header auth state island
 * @see sdd.md §6.6 AuthNav
 *
 * primaryWallet from Dynamic SDK is the source of truth for connected state.
 * Auth store provides supplementary API-level auth (org membership, admin).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';

export function AuthNav() {
  const { isOrgMember, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-7 w-20" />;
  }

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated && (
        <Link
          href="/dashboard"
          className="font-mono text-sm text-bone-dim hover:text-bone-bright border border-void-border hover:border-void-border px-3 py-1 uppercase tracking-wider transition-colors"
        >
          Dashboard
        </Link>
      )}
      {isOrgMember && (
        <span className="font-mono text-sm text-cyan-base/70 border border-cyan-base/20 px-2.5 py-0.5 uppercase tracking-wider">
          org
        </span>
      )}
      <DynamicConnectButton />
    </div>
  );
}
