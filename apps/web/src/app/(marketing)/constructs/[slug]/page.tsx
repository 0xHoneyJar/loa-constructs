/**
 * Public Construct Detail Page
 * Individual construct detail fetched from registry API
 * @see sprint-constructs-api.md T2.3: Create Construct Detail Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag, TuiCode } from '@/components/tui/tui-text';
import { fetchConstruct, ConstructNotFoundError, type ConstructDetail, type ConstructType } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorResponse: string | null;
  authorRespondedAt: string | null;
  createdAt: string | null;
}

async function ReviewsSection({ slug }: { slug: string }) {
  let reviews: Review[] = [];
  let total = 0;

  try {
    const res = await fetch(`${API_URL}/v1/packs/${slug}/reviews?limit=5&sort=newest`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json = await res.json();
      reviews = json.data || [];
      total = json.pagination?.total || 0;
    }
  } catch {
    // Reviews section is non-critical — fail silently
  }

  if (total === 0) return null;

  return (
    <section style={{ padding: '0 24px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <TuiH2 style={{ marginBottom: '16px' }}>
          Reviews ({total})
        </TuiH2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((review) => (
            <TuiBox key={review.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </span>
                {review.title && (
                  <span style={{ fontWeight: 600, color: 'var(--fg-bright)' }}>{review.title}</span>
                )}
              </div>
              {review.body && (
                <p style={{ fontSize: '14px', color: 'var(--fg)', lineHeight: 1.6, marginBottom: '8px' }}>
                  {review.body}
                </p>
              )}
              {review.createdAt && (
                <TuiDim style={{ fontSize: '12px' }}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </TuiDim>
              )}
              {review.authorResponse && (
                <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--border)' }}>
                  <TuiDim style={{ fontSize: '12px', marginBottom: '4px' }}>Author Response</TuiDim>
                  <p style={{ fontSize: '13px', color: 'var(--fg)' }}>{review.authorResponse}</p>
                </div>
              )}
            </TuiBox>
          ))}
        </div>
      </div>
    </section>
  );
}

type Props = {
  params: Promise<{ slug: string }>;
};

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

function getInstallCommand(construct: ConstructDetail): string {
  return `constructs-install.sh ${construct.type} ${construct.slug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;

  try {
    const response = await fetchConstruct(resolvedParams.slug);
    return {
      title: response.data.name,
      description: response.data.description || `${response.data.name} ${response.data.type} for Claude Code`,
    };
  } catch (error) {
    if (error instanceof ConstructNotFoundError) {
      return { title: 'Construct Not Found' };
    }
    return { title: 'Error Loading Construct' };
  }
}

export default async function ConstructDetailPage({ params }: Props) {
  const resolvedParams = await params;
  let construct: ConstructDetail;

  try {
    const response = await fetchConstruct(resolvedParams.slug);
    construct = response.data;
  } catch (error) {
    if (error instanceof ConstructNotFoundError) {
      notFound();
    }
    throw error;
  }

  // Extract commands from manifest
  const commands = construct.manifest?.commands || [];
  const composesWithList = construct.manifest?.unix?.composes_with || [];
  const dependencies = construct.manifest?.dependencies || {};
  const skills = construct.manifest?.skills || [];
  const packDependencies = construct.manifest?.pack_dependencies || {};
  const eventsConsumed = construct.manifest?.events?.consumes || [];

  // Build "works with" list from pack_dependencies + events.consumes
  const worksWithSlugs = new Set<string>();
  for (const slug of Object.keys(packDependencies)) {
    worksWithSlugs.add(slug);
  }
  for (const event of eventsConsumed) {
    // Events are formatted as "pack-slug.event-name"
    const dotIdx = event.indexOf('.');
    if (dotIdx > 0) {
      worksWithSlugs.add(event.substring(0, dotIdx));
    }
  }
  const worksWithList = Array.from(worksWithSlugs);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '13px' }}>
            <Link href="/constructs" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
              Constructs
            </Link>
            <span style={{ color: 'var(--fg-dim)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--fg)' }}>{construct.name}</span>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, color: 'var(--fg-bright)' }}>
                  {construct.name}
                </h1>
                <TuiTag color={getTypeBadgeColor(construct.type)}>
                  {construct.type.toUpperCase()}
                </TuiTag>
                {construct.tier_required !== 'free' ? (
                  <TuiTag color="accent">PREMIUM</TuiTag>
                ) : (
                  <TuiTag color="green">FREE</TuiTag>
                )}
              </div>
              <TuiDim style={{ fontSize: '15px', marginBottom: '16px', display: 'block' }}>
                {construct.description}
              </TuiDim>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                {construct.latest_version && (
                  <span style={{ color: 'var(--cyan)' }}>v{construct.latest_version.version}</span>
                )}
                <span style={{ color: 'var(--fg-dim)' }}>{construct.downloads.toLocaleString()} downloads</span>
                {construct.rating !== null && (
                  <span style={{ color: 'var(--fg-dim)' }}>{construct.rating.toFixed(1)}</span>
                )}
                {construct.owner && (
                  <Link href={`/creators/${encodeURIComponent(construct.owner.name)}`} style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                    by {construct.owner.name}
                  </Link>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/register">
                <TuiButton fullWidth>Get Started</TuiButton>
              </Link>
              {construct.documentation_url && (
                <Link href={construct.documentation_url} target="_blank">
                  <TuiButton variant="secondary" fullWidth>Documentation</TuiButton>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Install Command */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiBox title="Install">
            <TuiCode copyable>
              <span style={{ color: 'var(--fg-dim)' }}>$</span> {getInstallCommand(construct)}
            </TuiCode>
            <TuiDim style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              {construct.tier_required !== 'free' ? 'Requires Pro subscription or higher.' : 'Free to install.'}
            </TuiDim>
          </TuiBox>
        </div>
      </section>

      {/* Long Description */}
      {construct.long_description && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiBox title="About">
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)', whiteSpace: 'pre-line' }}>
                {construct.long_description}
              </div>
            </TuiBox>
          </div>
        </section>
      )}

      {/* Identity */}
      {construct.has_identity && construct.identity && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Identity</TuiH2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Cognitive Frame */}
              {construct.identity.cognitive_frame && (
                <TuiBox title="Cognitive Frame">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {construct.identity.cognitive_frame.archetype && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Archetype</TuiDim>
                        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          {construct.identity.cognitive_frame.archetype}
                        </div>
                      </div>
                    )}
                    {construct.identity.cognitive_frame.disposition && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Disposition</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>
                          {construct.identity.cognitive_frame.disposition}
                        </div>
                      </div>
                    )}
                    {construct.identity.cognitive_frame.thinking_style && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Thinking Style</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>
                          {construct.identity.cognitive_frame.thinking_style}
                        </div>
                      </div>
                    )}
                    {construct.identity.cognitive_frame.decision_making && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Decision Making</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>
                          {construct.identity.cognitive_frame.decision_making}
                        </div>
                      </div>
                    )}
                  </div>
                </TuiBox>
              )}

              {/* Expertise Domains */}
              {construct.identity.expertise_domains && construct.identity.expertise_domains.length > 0 && (
                <TuiBox title="Expertise">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {construct.identity.expertise_domains.map((domain) => (
                      <div
                        key={domain.name}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                          color: 'var(--cyan)',
                        }}
                      >
                        {domain.name}
                        {domain.depth && (
                          <span style={{ color: 'var(--fg-dim)', fontSize: '11px', marginLeft: '6px' }}>
                            {domain.depth}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </TuiBox>
              )}

              {/* Voice */}
              {construct.identity.voice_config && (
                <TuiBox title="Voice">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {construct.identity.voice_config.tone && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Tone</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>{construct.identity.voice_config.tone}</div>
                      </div>
                    )}
                    {construct.identity.voice_config.register && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Register</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>{construct.identity.voice_config.register}</div>
                      </div>
                    )}
                    {construct.identity.voice_config.vocabulary && (
                      <div>
                        <TuiDim style={{ fontSize: '11px', textTransform: 'uppercase' }}>Vocabulary</TuiDim>
                        <div style={{ color: 'var(--fg)' }}>{construct.identity.voice_config.vocabulary}</div>
                      </div>
                    )}
                  </div>
                </TuiBox>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Commands */}
      {commands.length > 0 && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Commands ({commands.length})</TuiH2>
            <TuiBox title="Available Commands">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: 'var(--fg-dim)', width: '180px' }}>Command</th>
                      <th style={{ textAlign: 'left', padding: '12px', color: 'var(--fg-dim)' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commands.map((cmd) => (
                      <tr key={cmd.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>
                          <code style={{ color: 'var(--green)' }}>{cmd.name}</code>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--fg)' }}>{cmd.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TuiBox>
          </div>
        </section>
      )}

      {/* Composability (Unix Philosophy) */}
      {composesWithList.length > 0 && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Composes With</TuiH2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {composesWithList.map((item) => (
                <Link key={item} href={`/constructs/${item}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '12px 20px',
                      border: '1px solid var(--border)',
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: 'var(--cyan)',
                      fontSize: '14px',
                    }}
                  >
                    {item}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Works With (from pack_dependencies + events.consumes) */}
      {worksWithList.length > 0 && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Works With</TuiH2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {worksWithList.map((slug) => (
                <Link key={slug} href={`/constructs/${slug}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '12px 20px',
                      border: '1px solid var(--border)',
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: 'var(--green)',
                      fontSize: '14px',
                    }}
                  >
                    {slug}
                    {packDependencies[slug] && (
                      <span style={{ color: 'var(--fg-dim)', fontSize: '12px', marginLeft: '8px' }}>
                        {packDependencies[slug]}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dependencies */}
      {(Object.keys(dependencies).length > 0 || skills.length > 0) && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Dependencies</TuiH2>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {skills.length > 0 && (
                <div>
                  <TuiDim style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Skills</TuiDim>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {skills.map((skill) => (
                      <div
                        key={skill.name}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                          color: 'var(--fg)',
                        }}
                      >
                        {skill.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(dependencies).length > 0 && (
                <div>
                  <TuiDim style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Tools</TuiDim>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(dependencies).map(([name, version]) => (
                      <div
                        key={name}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                          color: 'var(--fg)',
                        }}
                      >
                        {name}@{version}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Links */}
      {(construct.repository_url || construct.documentation_url || construct.git_url) && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Links</TuiH2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {construct.repository_url && (
                <Link
                  href={construct.repository_url}
                  target="_blank"
                  style={{
                    padding: '12px 20px',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  GitHub Repository
                </Link>
              )}
              {construct.git_url && !construct.repository_url && (
                <Link
                  href={construct.git_url.replace(/\.git$/, '')}
                  target="_blank"
                  style={{
                    padding: '12px 20px',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Source Repository
                </Link>
              )}
              {construct.documentation_url && (
                <Link
                  href={construct.documentation_url}
                  target="_blank"
                  style={{
                    padding: '12px 20px',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Documentation
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <ReviewsSection slug={construct.slug} />

      {/* CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Ready to try {construct.name}?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          {construct.tier_required !== 'free'
            ? 'Get Pro to access this construct and all other premium workflows.'
            : 'Sign up free and install this construct in seconds.'}
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>{construct.tier_required !== 'free' ? 'Get Pro' : 'Get Started Free'}</TuiButton>
          </Link>
          <Link href="/constructs">
            <TuiButton variant="secondary">Browse All Constructs</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
