/**
 * Public Packs Catalog Page
 * Browse packs from the registry API
 * @see sprint.md T26.7: Create Public Packs Catalog Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag } from '@/components/tui/tui-text';
import { fetchPacks, type Pack } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Packs',
  description: 'Browse skill packs for Claude Code. User research, validation, design systems, and more.',
};

// Category mapping for display
const CATEGORY_MAP: Record<string, string> = {
  'gtm-collective': 'GTM',
  'observer': 'Research',
  'crucible': 'Validation',
  'artisan': 'Design',
};

function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function getCategory(pack: Pack): string {
  return CATEGORY_MAP[pack.slug] || 'Workflow';
}

function getCommandCount(pack: Pack): number {
  // Extract from latest version or use default based on known packs
  const knownCounts: Record<string, number> = {
    'gtm-collective': 14,
    'observer': 6,
    'crucible': 5,
    'artisan': 10,
  };
  return knownCounts[pack.slug] || pack.latest_version?.file_count || 0;
}

export default async function PacksPage() {
  let packs: Pack[] = [];
  let error: string | null = null;

  try {
    const response = await fetchPacks({ per_page: 50 });
    // Filter to only show published packs (status check removed since API only returns published)
    packs = response.data;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load packs';
    console.error('Failed to fetch packs:', e);
  }

  // Find featured pack (first one marked as featured, or gtm-collective as fallback)
  const featuredPack = packs.find(p => p.is_featured) || packs.find(p => p.slug === 'gtm-collective');

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
          Skill Packs
        </h1>
        <TuiDim style={{ fontSize: '15px', display: 'block', maxWidth: '500px', margin: '0 auto' }}>
          Pre-built agent workflows for Claude Code. Install in one command.
        </TuiDim>
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
              {error}. Showing cached data or try again later.
            </div>
          </div>
        </section>
      )}

      {/* Featured Pack */}
      {featuredPack && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <TuiDim style={{ fontSize: '12px', marginBottom: '12px', display: 'block' }}>FEATURED</TuiDim>
            <Link href={`/packs/${featuredPack.slug}`} style={{ textDecoration: 'none' }}>
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
                    <h2 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '18px' }}>{featuredPack.name}</h2>
                    {featuredPack.tier_required !== 'free' ? (
                      <TuiTag color="accent">PREMIUM</TuiTag>
                    ) : (
                      <TuiTag color="green">FREE</TuiTag>
                    )}
                  </div>
                  <TuiDim style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                    {featuredPack.description}
                  </TuiDim>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--fg-dim)' }}>{getCommandCount(featuredPack)} commands</span>
                    {featuredPack.latest_version && (
                      <span style={{ color: 'var(--fg-dim)' }}>v{featuredPack.latest_version.version}</span>
                    )}
                    <span style={{ color: 'var(--fg-dim)' }}>{formatDownloads(featuredPack.downloads)} downloads</span>
                  </div>
                </div>
                <TuiButton>View Pack →</TuiButton>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Pack Grid */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>All Packs ({packs.length})</TuiH2>

          {packs.length === 0 && !error && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--fg-dim)' }}>
              No packs available yet. Check back soon!
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {packs.map((pack) => (
              <Link key={pack.slug} href={`/packs/${pack.slug}`} style={{ textDecoration: 'none' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '15px' }}>{pack.name}</h3>
                    {pack.tier_required !== 'free' ? (
                      <TuiTag color="accent">PRO</TuiTag>
                    ) : (
                      <TuiTag color="green">FREE</TuiTag>
                    )}
                  </div>

                  {/* Description */}
                  <TuiDim style={{ fontSize: '13px', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
                    {pack.description || 'No description available'}
                  </TuiDim>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: 'var(--cyan)' }}>{getCategory(pack)}</span>
                      <span style={{ color: 'var(--fg-dim)' }}>{getCommandCount(pack)} cmds</span>
                    </div>
                    <span style={{ color: 'var(--fg-dim)' }}>{formatDownloads(pack.downloads)} ↓</span>
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
        <TuiH2 style={{ marginBottom: '16px' }}>Want to create your own pack?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Earn 70% revenue share on every subscription using your packs.
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
