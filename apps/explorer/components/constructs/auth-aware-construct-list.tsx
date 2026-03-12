'use client';

/**
 * Auth-Aware Construct List — cycle-039
 * @see sdd.md §6.4 AuthAwareConstructList
 *
 * Client component that overlays ISR construct data with auth-aware behavior.
 * Shows CTA for unauthenticated users, prompts GitHub linking for non-org members,
 * and fetches the full construct list for authenticated org members.
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';
import type { ConstructNode } from '@/lib/types/graph';

interface AuthAwareConstructListProps {
  /** Constructs from ISR (may be empty since all are internal) */
  publicConstructs: ConstructNode[];
  /** Static content to render for the construct list — rendered by server, passed as ReactNode */
  children: ReactNode;
}

/**
 * Wrapper that handles auth gating. Renders children (server-rendered list) for
 * public/loading states, and fetches + renders auth constructs client-side when needed.
 */
export function AuthAwareConstructList({ publicConstructs, children }: AuthAwareConstructListProps) {
  const { isAuthenticated, isOrgMember, isLoading, getAccessToken, initialize } = useAuthStore();
  const [authConstructs, setAuthConstructs] = useState<ConstructNode[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        const nodes: ConstructNode[] = data.data.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          slug: c.slug as string,
          name: c.name as string,
          type: (c.type as string) || 'pack',
          constructType: (c.construct_type as string) || 'skill-pack',
          category: (c.category as string) || 'other',
          graduationLevel: (c.graduation_level as string) || 'experimental',
          description: (c.description as string) || '',
          shortDescription: (c.short_description as string) || (c.description as string || '').split('.')[0].slice(0, 80) || 'No description',
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

  useEffect(() => {
    if (mounted && isAuthenticated && isOrgMember && !authConstructs && !isFetching) {
      fetchAuthenticatedConstructs();
    }
  }, [mounted, isAuthenticated, isOrgMember, authConstructs, isFetching, fetchAuthenticatedConstructs]);

  // Not mounted yet or loading — show server-rendered content
  if (!mounted || isLoading) {
    return <>{children}</>;
  }

  // Authenticated org member with fetched constructs
  if (isAuthenticated && isOrgMember && authConstructs) {
    return <AuthConstructTable constructs={authConstructs} />;
  }

  // Authenticated org member, still fetching
  if (isAuthenticated && isOrgMember && isFetching) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin border-b-2 border-cyan-base" style={{ borderRadius: '9999px' }} />
          <p className="font-mono text-sm text-bone-ghost">Loading constructs...</p>
        </div>
      </div>
    );
  }

  // Authenticated but not org member — show public constructs with hint
  if (isAuthenticated && !isOrgMember) {
    return (
      <>
        {publicConstructs.length > 0 && children}
        <p className="mt-6 text-center font-mono text-sm text-bone-ghost tracking-whisper">
          Link GitHub to access internal constructs
        </p>
      </>
    );
  }

  // Not authenticated, no public constructs
  if (publicConstructs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-bone-ghost">
          No public constructs available.
        </p>
        <p className="mt-3 font-mono text-sm text-bone-ghost tracking-whisper">
          <span>Sign in to browse the full catalog.</span>{' '}
          <DynamicConnectButton label="Sign in" className="text-sm text-cyan-dim hover:text-cyan-base" />
        </p>
      </div>
    );
  }

  // Has public constructs, show them with subtle auth hint after list
  return (
    <>
      {children}
      <p className="mt-6 text-center font-mono text-sm text-bone-ghost tracking-whisper">
        <span>Sign in to see internal constructs</span>{' '}
        <DynamicConnectButton label="Sign in" className="text-sm text-cyan-dim hover:text-cyan-base" />
      </p>
    </>
  );
}

/** Client-side table for authenticated constructs (same markup as server version) */
function AuthConstructTable({ constructs }: { constructs: ConstructNode[] }) {
  return (
    <div className="mt-6">
      <div className="flex items-center border-b border-void-border pb-2 font-mono text-sm uppercase tracking-whisper text-bone-ghost">
        <span className="w-12 shrink-0" />
        <span className="flex-1">Construct</span>
        <span className="w-20 text-right hidden sm:block">Skills</span>
        <span className="w-28 text-right">Installs</span>
      </div>
      {constructs.length === 0 ? (
        <div className="py-12 text-center font-mono text-sm text-bone-ghost">
          No constructs found.
        </div>
      ) : (
        <div>
          {constructs.map((construct) => (
            <a
              key={construct.id}
              href={`/constructs/${construct.slug}`}
              className="flex items-center py-4 border-b border-void-border hover:bg-void-raised transition-colors group"
            >
              <span className="w-12 shrink-0 text-2xl text-center">
                {construct.icon || ''}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-bone-base group-hover:text-bone-bright transition-colors">
                    {construct.name}
                  </span>
                  {construct.constructType !== 'skill-pack' && (
                    <span className="border border-cyan-dim/30 bg-cyan-dim/10 px-1.5 py-0.5 text-sm font-mono text-cyan-dim hidden sm:inline">
                      {construct.constructType.replace(/-/g, ' ')}
                    </span>
                  )}
                  {construct.visibility === 'internal' && (
                    <span className="border border-cyan-base/30 bg-cyan-base/10 px-1.5 py-0.5 text-sm font-mono text-cyan-base hidden sm:inline">
                      internal
                    </span>
                  )}
                  {construct.verificationTier === 'PROVEN' && (
                    <span className="border border-graduation-stable/30 bg-graduation-stable/10 px-1.5 py-0.5 text-sm font-mono text-graduation-stable hidden sm:inline">
                      proven
                    </span>
                  )}
                  {construct.verificationTier === 'BACKTESTED' && (
                    <span className="border border-graduation-beta/30 bg-graduation-beta/10 px-1.5 py-0.5 text-sm font-mono text-graduation-beta hidden sm:inline">
                      backtested
                    </span>
                  )}
                </div>
                <p className="font-mono text-base text-bone-muted truncate mt-0.5 max-w-xl">
                  {construct.shortDescription}
                </p>
              </div>
              <span className="w-20 text-right font-mono text-base text-bone-dim hidden sm:block">
                {construct.skillsCount}
              </span>
              <span className="w-28 text-right font-mono text-lg text-bone-base">
                {construct.downloads >= 1000 ? `${(construct.downloads / 1000).toFixed(1)}K` : construct.downloads.toLocaleString()}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
