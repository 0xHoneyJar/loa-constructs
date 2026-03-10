'use client';

/**
 * AuthNav — Header auth state island — cycle-039
 * @see sdd.md §6.3 AuthNav
 *
 * Client component rendered inside the RSC header.
 * Shows connect button, wallet address, or org badge based on auth state.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';

export function AuthNav() {
  const { isAuthenticated, isOrgMember, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — auth state is client-only
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR placeholder — matches connect button dimensions
    return <div className="h-7 w-20" />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        {isOrgMember && (
          <span className="font-mono text-[9px] text-cyan-base/70 border border-cyan-base/20 px-1 py-0.5 uppercase tracking-wider">
            org
          </span>
        )}
        <Link
          href="/dashboard"
          className="font-mono text-[11px] text-bone-muted hover:text-bone-base transition-colors"
        >
          {user?.name || 'Dashboard'}
        </Link>
        <DynamicConnectButton />
      </div>
    );
  }

  return <DynamicConnectButton />;
}
