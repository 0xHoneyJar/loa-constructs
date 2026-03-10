'use client';

/**
 * Auth-Aware Construct List — cycle-039
 * @see sdd.md §6.4 AuthAwareConstructList
 *
 * Client component that overlays ISR construct data with auth-aware behavior.
 * Shows CTA for unauthenticated users, prompts GitHub linking for non-org members,
 * and fetches the full construct list for authenticated org members.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';
import type { ConstructNode } from '@/lib/types/graph';

interface AuthAwareConstructListProps {
  /** Constructs from ISR (may be empty since all are internal) */
  publicConstructs: ConstructNode[];
  /** Render function for the actual construct list */
  children: (constructs: ConstructNode[]) => React.ReactNode;
}

export function AuthAwareConstructList({ publicConstructs, children }: AuthAwareConstructListProps) {
  const { isAuthenticated, isOrgMember, isLoading, getAccessToken, initialize } = useAuthStore();
  const [authConstructs, setAuthConstructs] = useState<ConstructNode[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize auth state on mount
    initialize();
  }, [initialize]);

  const fetchAuthenticatedConstructs = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setIsFetching(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';
      const response = await fetch(`${apiUrl}/constructs?per_page=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        // Transform API response to ConstructNode shape
        const nodes: ConstructNode[] = data.data.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          slug: c.slug as string,
          name: c.name as string,
          type: (c.type as string) || 'pack',
          constructType: (c.construct_type as string) || 'skill-pack',
          category: (c.category as string) || 'other',
          graduationLevel: (c.graduation_level as string) || 'experimental',
          description: (c.description as string) || '',
          shortDescription: (c.short_description as string) || '',
          commandCount: (c.command_count as number) || 0,
          skillsCount: (c.skills_count as number) || 0,
          downloads: (c.downloads as number) || 0,
          version: (c.version as string) || '0.0.0',
          icon: c.icon as string | null,
          verificationTier: c.verification_tier as string | undefined,
          visibility: c.visibility as string | undefined,
        }));
        setAuthConstructs(nodes);
      }
    } catch {
      // Fall back to public constructs
    } finally {
      setIsFetching(false);
    }
  }, [getAccessToken]);

  // Fetch authenticated constructs when auth state resolves
  useEffect(() => {
    if (mounted && isAuthenticated && isOrgMember && !authConstructs && !isFetching) {
      fetchAuthenticatedConstructs();
    }
  }, [mounted, isAuthenticated, isOrgMember, authConstructs, isFetching, fetchAuthenticatedConstructs]);

  // Not mounted yet — show ISR content
  if (!mounted || isLoading) {
    return <>{children(publicConstructs)}</>;
  }

  // Authenticated org member with fetched constructs
  if (isAuthenticated && isOrgMember && authConstructs) {
    return <>{children(authConstructs)}</>;
  }

  // Authenticated org member, still fetching
  if (isAuthenticated && isOrgMember && isFetching) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-cyan-base" />
          <p className="font-mono text-xs text-bone-ghost">Loading constructs...</p>
        </div>
      </div>
    );
  }

  // Authenticated but not org member
  if (isAuthenticated && !isOrgMember) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
          <div className="border border-void-border bg-void-raised px-6 py-4 w-full">
            <p className="font-mono text-sm text-bone-base mb-2">
              Link GitHub for internal access
            </p>
            <p className="font-mono text-xs text-bone-muted mb-4">
              Connect your GitHub account and verify org membership to access all constructs.
            </p>
            <p className="font-mono text-[10px] text-bone-ghost">
              GitHub org membership required
            </p>
          </div>
        </div>
        {/* Still show public constructs if any */}
        {publicConstructs.length > 0 && children(publicConstructs)}
      </div>
    );
  }

  // Not authenticated — show CTA
  if (publicConstructs.length === 0) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
          <div className="border border-void-border bg-void-raised px-6 py-4 w-full">
            <p className="font-mono text-sm text-bone-base mb-2">
              Connect to explore constructs
            </p>
            <p className="font-mono text-xs text-bone-muted mb-4">
              The Constructs Network is a gated registry. Connect your wallet to browse the full catalog.
            </p>
            <DynamicConnectButton label="Connect Wallet" />
          </div>
        </div>
      </div>
    );
  }

  // Has public constructs, show them with connect prompt
  return (
    <>
      <div className="mb-4 flex items-center justify-center">
        <div className="border border-void-border bg-void-raised px-4 py-2 inline-flex items-center gap-3">
          <p className="font-mono text-[11px] text-bone-muted">
            Connect to see all constructs
          </p>
          <DynamicConnectButton label="Connect" />
        </div>
      </div>
      {children(publicConstructs)}
    </>
  );
}
