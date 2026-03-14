'use client';

/**
 * Auth-Aware Construct List — cycle-039
 * @see sdd.md §6.4 AuthAwareConstructList
 *
 * Client component that overlays ISR construct data with auth-aware behavior.
 * Shows CTA for unauthenticated users, prompts GitHub linking for non-org members,
 * and fetches the full construct list for authenticated org members.
 */

import Image from 'next/image';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ConstructNode } from '@/lib/types/graph';
import { resolveShortDescription } from '@/lib/utils/resolve-short-description';

/**
 * Static mapping: construct slug → showcase images in /public/showcases/.
 * Must stay in sync with the server-side copy in (site)/page.tsx.
 */
const CONSTRUCT_SHOWCASES: Record<string, { src: string; alt: string }[]> = {
  observer: [
    { src: '/showcases/mcv-interface.png', alt: 'Moneycomb Vaults' },
    { src: '/showcases/mibera-dimensions.png', alt: 'Mibera Dimensions' },
  ],
  artisan: [
    { src: '/showcases/mcv-interface.png', alt: 'Moneycomb Vaults' },
    { src: '/showcases/set-and-forgetti.png', alt: 'Set and Forgetti' },
  ],
  'k-hole': [
    { src: '/showcases/mcv-interface.png', alt: 'Moneycomb Vaults' },
  ],
  'the-mint': [
    { src: '/showcases/mcv-interface.png', alt: 'Moneycomb Vaults' },
    { src: '/showcases/mibera-dimensions.png', alt: 'Mibera Dimensions' },
  ],
  'the-easel': [
    { src: '/showcases/mibera-dimensions.png', alt: 'Mibera Dimensions' },
    { src: '/showcases/set-and-forgetti.png', alt: 'Set and Forgetti' },
  ],
  herald: [
    { src: '/showcases/mibera-dimensions.png', alt: 'Mibera Dimensions' },
  ],
  'mibera-codex': [
    { src: '/showcases/mibera-dimensions.png', alt: 'Mibera Dimensions' },
  ],
};

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
          shortDescription: resolveShortDescription(c.short_description as string, c.description as string),
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

  // Authenticated but not org member — show public constructs
  if (isAuthenticated && !isOrgMember) {
    return <>{publicConstructs.length > 0 && children}</>;
  }

  // Not authenticated, no public constructs
  if (publicConstructs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-bone-ghost">
          No public constructs available.
        </p>
      </div>
    );
  }

  // Has public constructs, show them
  return <>{children}</>;
}

/** Client-side table for authenticated constructs (same markup as server version) */
function AuthConstructTable({ constructs }: { constructs: ConstructNode[] }) {
  return (
    <div className="mt-6">
      <Table>
        <TableHeader>
          <TableRow className="border-void-border hover:bg-transparent">
            <TableHead className="w-8 sm:w-12 font-mono text-sm uppercase tracking-whisper text-bone-ghost" />
            <TableHead className="font-mono text-sm uppercase tracking-whisper text-bone-ghost">
              Construct
            </TableHead>
            <TableHead className="w-[280px] font-mono text-sm uppercase tracking-whisper text-bone-ghost text-right hidden sm:table-cell">
              Shipped
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {constructs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-12 text-center font-mono text-sm text-bone-ghost">
                No constructs found.
              </TableCell>
            </TableRow>
          ) : (
            constructs.map((construct) => {
              const showcases = CONSTRUCT_SHOWCASES[construct.slug];
              return (
                <TableRow
                  key={construct.id}
                  className="construct-row border-void-border group relative cursor-pointer transition-[background] duration-200 hover:[background:radial-gradient(ellipse_80%_100%_at_30%_50%,oklch(0.14_0.03_195)_0%,transparent_70%)]"
                >
                  <TableCell className="py-5 sm:py-8 text-xl sm:text-2xl text-center align-middle">
                    {construct.icon || ''}
                  </TableCell>
                  <TableCell className="py-5 sm:py-8">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/constructs/${construct.slug}`}
                          className="font-display text-base sm:text-xl uppercase tracking-display text-bone-base group-hover:text-bone-bright transition-colors after:absolute after:inset-0"
                        >
                          {construct.name}
                        </a>
                        {construct.visibility === 'internal' && (
                          <Badge variant="internal" className="relative z-10 hidden sm:inline-flex">
                            internal
                          </Badge>
                        )}
                        {construct.verificationTier === 'PROVEN' && (
                          <Badge variant="proven" className="relative z-10 hidden sm:inline-flex">
                            proven
                          </Badge>
                        )}
                        {construct.verificationTier === 'BACKTESTED' && (
                          <Badge variant="backtested" className="relative z-10 hidden sm:inline-flex">
                            backtested
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-sm sm:text-base text-bone-muted truncate mt-0.5 max-w-xl">
                        {construct.shortDescription}
                      </p>
                      <p className="font-mono text-xs text-bone-ghost mt-1.5">
                        {construct.skillsCount} skills · {construct.downloads.toLocaleString()} installs
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 sm:py-8 align-middle hidden sm:table-cell">
                    {showcases ? (
                      <div className="flex gap-2 justify-end">
                        {showcases.slice(0, 2).map((s) => (
                          <div
                            key={s.src}
                            className="relative w-[120px] h-[80px] border border-void-border overflow-hidden bg-void-raised group-hover:border-bone-ghost transition-colors"
                          >
                            <Image
                              src={s.src}
                              alt={s.alt}
                              fill
                              className="object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                              sizes="120px"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-bone-ghost text-right block">--</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
