/**
 * Public Author Profile Page
 * @see sprint.md T2.6: Author Profile Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiH2, TuiDim, TuiTag } from '@/components/tui/tui-text';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network';

type Props = {
  params: Promise<{ username: string }>;
};

interface CreatorProfile {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  constructs: Array<{
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    downloads: number;
    ratingAvg: number | null;
    maturity: string | null;
    sourceType: string | null;
  }>;
  stats: {
    totalConstructs: number;
    totalDownloads: number;
    avgRating: number | null;
  };
}

async function fetchCreatorProfile(username: string): Promise<CreatorProfile | null> {
  const res = await fetch(`${API_URL}/v1/creators/${encodeURIComponent(username)}`, {
    next: { revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch creator: ${res.statusText}`);

  const json = await res.json();
  return json.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchCreatorProfile(username);

  if (!profile) {
    return { title: 'Creator Not Found' };
  }

  return {
    title: `${profile.displayName} — Constructs Network`,
    description: `${profile.stats.totalConstructs} constructs by ${profile.displayName}`,
  };
}

function getMaturityColor(maturity: string | null): 'cyan' | 'green' | 'accent' {
  switch (maturity) {
    case 'stable': return 'green';
    case 'beta': return 'cyan';
    default: return 'accent';
  }
}

export default async function CreatorProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchCreatorProfile(username);

  if (!profile) {
    notFound();
  }

  return (
    <>
      {/* Header */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border)' }}
              />
            )}
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fg-bright)' }}>
                {profile.displayName}
              </h1>
              {profile.joinedAt && (
                <TuiDim style={{ fontSize: '13px' }}>
                  Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </TuiDim>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'flex', gap: '32px', fontSize: '14px', color: 'var(--fg-dim)' }}>
            <div>
              <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>{profile.stats.totalConstructs}</span> constructs
            </div>
            <div>
              <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>{profile.stats.totalDownloads.toLocaleString()}</span> downloads
            </div>
            {profile.stats.avgRating && (
              <div>
                <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>{profile.stats.avgRating.toFixed(1)}</span> avg rating
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Constructs Grid */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '16px' }}>Constructs</TuiH2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {profile.constructs.map((construct) => (
              <Link
                key={construct.slug}
                href={`/constructs/${construct.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <TuiBox style={{ height: '100%', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {construct.icon && <span>{construct.icon}</span>}
                    <span style={{ fontWeight: 600, color: 'var(--fg-bright)' }}>{construct.name}</span>
                    <TuiTag color={getMaturityColor(construct.maturity)}>
                      {(construct.maturity || 'experimental').toUpperCase()}
                    </TuiTag>
                  </div>
                  <TuiDim style={{ fontSize: '13px', marginBottom: '12px', display: 'block' }}>
                    {construct.description || 'No description'}
                  </TuiDim>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--fg-dim)' }}>
                    <span>{construct.downloads.toLocaleString()} downloads</span>
                    {construct.ratingAvg && <span>{construct.ratingAvg.toFixed(1)} rating</span>}
                    {construct.sourceType === 'git' && (
                      <TuiTag color="cyan" style={{ fontSize: '11px' }}>GIT</TuiTag>
                    )}
                  </div>
                </TuiBox>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
