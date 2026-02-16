/**
 * Public Constructs Catalog Page
 * Unified discovery of skills and packs from the registry API
 * @see sprint-constructs-api.md T2.2: Create Constructs Catalog Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag } from '@/components/tui/tui-text';
import { fetchConstructs, type Construct, type ConstructType } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Constructs',
  description: 'Browse constructs for Claude Code. Skills, packs, and bundles for agent workflows.',
};

function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function getTypeBadgeColor(type: ConstructType): 'cyan' | 'green' | 'accent' {
  switch (type) {
    case 'skill':
      return 'cyan';
    case 'pack':
      return 'green';
    case 'bundle':
      return 'accent';
    default:
      return 'cyan';
  }
}

function getMaturityColor(maturity: string | null): 'cyan' | 'green' | 'accent' {
  switch (maturity) {
    case 'stable': return 'green';
    case 'beta': return 'cyan';
    default: return 'accent';
  }
}

function getCommandCount(construct: Construct): number {
  if (construct.manifest?.commands) {
    return construct.manifest.commands.length;
  }
  // Skills have 1 command by default
  return construct.type === 'skill' ? 1 : 0;
}

type SearchParams = Promise<{
  type?: string;
  tier?: string;
  q?: string;
  sort?: string;
}>;

export default async function ConstructsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const typeFilter = resolvedParams.type as ConstructType | undefined;
  const tierFilter = resolvedParams.tier;
  const queryFilter = resolvedParams.q;
  const sortFilter = resolvedParams.sort || 'downloads';

  let constructs: Construct[] = [];
  let error: string | null = null;

  try {
    const response = await fetchConstructs({
      type: typeFilter,
      tier: tierFilter,
      query: queryFilter,
      sort: sortFilter,
      per_page: 50,
    });
    constructs = response.data;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load constructs';
    console.error('Failed to fetch constructs:', e);
  }

  // Find featured construct
  const featuredConstruct = constructs.find((c) => c.is_featured);

  // Filter types for tabs
  const typeFilters: Array<{ value: ConstructType | undefined; label: string }> = [
    { value: undefined, label: 'All' },
    { value: 'pack', label: 'Packs' },
    { value: 'skill', label: 'Skills' },
  ];

  const sortOptions: Array<{ value: string; label: string }> = [
    { value: 'downloads', label: 'Most Downloads' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest' },
    { value: 'updated', label: 'Recently Updated' },
  ];

  function buildUrl(overrides: { type?: string; sort?: string }): string {
    const p = new URLSearchParams();
    const t = overrides.type !== undefined ? overrides.type : (typeFilter || '');
    const s = overrides.sort !== undefined ? overrides.sort : sortFilter;
    if (t) p.set('type', t);
    if (tierFilter) p.set('tier', tierFilter);
    if (queryFilter) p.set('q', queryFilter);
    if (s && s !== 'downloads') p.set('sort', s);
    const qs = p.toString();
    return `/constructs${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '12px',
          }}
        >
          Constructs
        </h1>
        <TuiDim style={{ fontSize: '15px', display: 'block', maxWidth: '500px', margin: '0 auto' }}>
          Skills, packs, and bundles for Claude Code. Install in one command.
        </TuiDim>
      </section>

      {/* Type Filters + Sort */}
      <section style={{ padding: '0 24px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {typeFilters.map((filter) => {
                const isActive = typeFilter === filter.value;
                return (
                  <Link key={filter.label} href={buildUrl({ type: filter.value || '' })} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        padding: '8px 16px',
                        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isActive ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--fg-dim)',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {filter.label}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {sortOptions.map((option) => {
                const isActive = sortFilter === option.value;
                return (
                  <Link key={option.value} href={buildUrl({ sort: option.value })} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        padding: '6px 12px',
                        border: isActive ? '1px solid var(--cyan)' : '1px solid var(--border)',
                        background: isActive ? 'rgba(95, 205, 235, 0.1)' : 'transparent',
                        color: isActive ? 'var(--cyan)' : 'var(--fg-dim)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {option.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <section style={{ padding: '0 24px 32px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--red)',
                background: 'rgba(255, 85, 85, 0.1)',
                color: 'var(--red)',
                fontSize: '14px',
              }}
            >
              Unable to load constructs: {error}. Please try again later.
            </div>
          </div>
        </section>
      )}

      {/* Featured Construct */}
      {featuredConstruct && !typeFilter && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <TuiDim style={{ fontSize: '12px', marginBottom: '12px', display: 'block' }}>FEATURED</TuiDim>
            <Link href={`/constructs/${featuredConstruct.slug}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  padding: '24px',
                  border: '2px solid var(--accent)',
                  background: 'rgba(95, 175, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h2 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '18px' }}>
                      {featuredConstruct.name}
                    </h2>
                    <TuiTag color={getTypeBadgeColor(featuredConstruct.type)}>
                      {featuredConstruct.type.toUpperCase()}
                    </TuiTag>
                    {featuredConstruct.tier_required !== 'free' ? (
                      <TuiTag color="accent">PREMIUM</TuiTag>
                    ) : (
                      <TuiTag color="green">FREE</TuiTag>
                    )}
                  </div>
                  <TuiDim style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                    {featuredConstruct.description}
                  </TuiDim>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>{getCommandCount(featuredConstruct)} commands</span>
                    {featuredConstruct.version && (
                      <span style={{ color: 'var(--fg-dim)' }}>v{featuredConstruct.version}</span>
                    )}
                    <span style={{ color: 'var(--fg-dim)' }}>{formatDownloads(featuredConstruct.downloads)} downloads</span>
                  </div>
                </div>
                <TuiButton>View Construct</TuiButton>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Construct Grid */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>
            {typeFilter ? `${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s` : 'All Constructs'} ({constructs.length})
          </TuiH2>

          {constructs.length === 0 && !error && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--fg-dim)' }}>
              No constructs available yet. Check back soon!
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {constructs.map((construct) => (
              <Link key={construct.slug} href={`/constructs/${construct.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  className="tui-card-hover"
                  style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '15px' }}>{construct.name}</h3>
                    <TuiTag color={getTypeBadgeColor(construct.type)}>
                      {construct.type.toUpperCase()}
                    </TuiTag>
                    {construct.tier_required !== 'free' ? (
                      <TuiTag color="accent">PRO</TuiTag>
                    ) : (
                      <TuiTag color="green">FREE</TuiTag>
                    )}
                    {construct.maturity && (
                      <TuiTag color={getMaturityColor(construct.maturity)}>
                        {construct.maturity.toUpperCase()}
                      </TuiTag>
                    )}
                  </div>

                  {/* Description */}
                  <TuiDim style={{ fontSize: '13px', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
                    {construct.description || 'No description available'}
                  </TuiDim>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {construct.category && (
                        <span style={{ color: 'var(--cyan)' }}>{construct.category}</span>
                      )}
                      <span style={{ color: 'var(--fg-dim)' }}>{getCommandCount(construct)} cmds</span>
                      {construct.rating !== null && (
                        <span style={{ color: 'var(--fg-dim)' }}>{construct.rating.toFixed(1)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {construct.source_type === 'git' && (
                        <TuiTag color="cyan" style={{ fontSize: '10px' }}>GIT</TuiTag>
                      )}
                      <span style={{ color: 'var(--fg-dim)' }}>{formatDownloads(construct.downloads)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Want to create your own construct?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Earn 70% revenue share on every subscription using your constructs.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>Become a Creator</TuiButton>
          </Link>
          <Link href="/docs">
            <TuiButton variant="secondary">Read the Docs</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
