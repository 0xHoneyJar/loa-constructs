'use client';

/**
 * AuthNav — Header auth state island — cycle-039
 * @see sdd.md §6.3 AuthNav
 *
 * primaryWallet from Dynamic SDK is the source of truth for connected state.
 * Auth store provides supplementary API-level auth (org membership).
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';

export function AuthNav() {
  const { isOrgMember } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-7 w-20" />;
  }

  return (
    <div className="flex items-center gap-3">
      {isOrgMember && (
        <span className="font-mono text-[9px] text-cyan-base/70 border border-cyan-base/20 px-1 py-0.5 uppercase tracking-wider">
          org
        </span>
      )}
      <DynamicConnectButton />
    </div>
  );
}
