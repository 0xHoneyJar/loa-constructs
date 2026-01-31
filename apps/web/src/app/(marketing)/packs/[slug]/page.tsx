/**
 * Public Pack Detail Page
 * Individual pack detail fetched from registry API
 * @see sprint.md T26.8: Create Public Pack Detail Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag, TuiCode } from '@/components/tui/tui-text';
import { fetchPack, type Pack } from '@/lib/api';

type Props = {
  params: Promise<{ slug: string }>;
};

// Known pack metadata (commands, features) - enriches API data
const PACK_METADATA: Record<string, {
  commands: Array<{ name: string; description: string }>;
  features: string[];
}> = {
  'gtm-collective': {
    commands: [
      { name: '/gtm-setup', description: 'Initialize GTM workflow and create grimoire structure' },
      { name: '/analyze-market', description: 'Research market size, trends, competitors, and ICPs' },
      { name: '/position', description: 'Define positioning statement and messaging framework' },
      { name: '/price', description: 'Develop pricing model, tiers, and revenue projections' },
      { name: '/plan-launch', description: 'Create launch timeline and content calendar' },
      { name: '/review-gtm', description: 'Comprehensive strategy review with consistency checks' },
      { name: '/create-deck', description: 'Generate pitch deck content slide by slide' },
      { name: '/translate', description: 'Adapt communication for different audiences' },
      { name: '/plan-partnerships', description: 'Partnership and BD strategy development' },
      { name: '/plan-devrel', description: 'Developer relations strategy planning' },
      { name: '/sync-from-gtm', description: 'Sync GTM decisions to dev workflow' },
      { name: '/sync-from-dev', description: 'Sync technical reality to GTM planning' },
      { name: '/gtm-feature-requests', description: 'Extract feature requests from GTM feedback' },
      { name: '/gtm-adopt', description: 'Technical grounding for GTM artifacts' },
    ],
    features: [
      'Complete go-to-market workflow automation',
      'Market research with TAM/SAM/SOM analysis',
      'ICP development with detailed buyer profiles',
      'Competitive analysis and positioning',
      'Pricing strategy with tier modeling',
      'Launch planning with content calendars',
      'Built-in review and consistency checks',
      'Grounded in actual market data',
    ],
  },
  'observer': {
    commands: [
      { name: '/observe', description: 'Capture user feedback as hypothesis-first research with Level 3 diagnostic' },
      { name: '/shape', description: 'Shape common patterns into journey definitions with JTBD clustering' },
      { name: '/analyze-gap', description: 'Compare user expectations with code reality, severity scoring' },
      { name: '/file-gap', description: 'Create GitHub/Linear issues from gap analysis with taxonomy labels' },
      { name: '/import-research', description: 'Bulk convert legacy user research to UTC format' },
    ],
    features: [
      'Hypothesis-first user research methodology',
      'Level 3 diagnostic (The Mom Test)',
      'User Truth Canvas (UTC) artifact generation',
      'JTBD clustering for journey synthesis',
      'Gap analysis with severity scoring',
      'GitHub/Linear issue creation',
      'Crypto/DeFi cultural context support',
      'Legacy research migration tools',
    ],
  },
  'crucible': {
    commands: [
      { name: '/ground', description: 'Extract actual code behavior into reality files with state machines' },
      { name: '/diagram', description: 'Generate Mermaid state diagrams (User Expects vs Code Does)' },
      { name: '/validate', description: 'Generate Playwright tests from state diagrams' },
      { name: '/walkthrough', description: 'Interactive dev browser walkthrough with wallet presets' },
      { name: '/iterate', description: 'Update upstream artifacts from test results' },
    ],
    features: [
      'Code reality extraction into structured files',
      'Dual state diagrams (expects vs does)',
      'Playwright test generation from diagrams',
      'Interactive browser walkthroughs',
      'Wallet preset configurations',
      'Feedback loop to Observer artifacts',
      'Confidence preservation system',
      'Selector inference for components',
    ],
  },
  'artisan': {
    commands: [
      { name: '/survey', description: 'Pattern frequency analysis, component cataloging' },
      { name: '/synthesize-taste', description: 'Reference material analysis, brand vocabulary extraction' },
      { name: '/inscribe', description: 'Brand token application, taste consistency checking' },
      { name: '/craft', description: 'Spring constant optimizer, mass/tension/friction calculator' },
      { name: '/animate', description: 'Spring physics, timing curves, motion orchestration' },
      { name: '/behavior', description: 'Interaction state machines, gesture handlers' },
      { name: '/style', description: 'Material 3 compliance, elevation/shadow calculator' },
      { name: '/distill', description: 'Component boundary detection, prop interface generation' },
      { name: '/validate-physics', description: 'Animation performance profiler, jank detection' },
      { name: '/web3-test', description: 'Wallet mocks, transaction flow testing' },
    ],
    features: [
      'Physics-based animation system',
      'Brand taste synthesis and application',
      'Pattern discovery and cataloging',
      'Spring physics calculator',
      'Material 3 design compliance',
      'Component extraction tools',
      'Animation performance profiling',
      'Web3/wallet testing utilities',
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;

  try {
    const response = await fetchPack(resolvedParams.slug);
    return {
      title: response.data.name,
      description: response.data.description || `${response.data.name} skill pack for Claude Code`,
    };
  } catch {
    return { title: 'Pack Not Found' };
  }
}

export default async function PackDetailPage({ params }: Props) {
  const resolvedParams = await params;
  let pack: Pack;

  try {
    const response = await fetchPack(resolvedParams.slug);
    pack = response.data;
  } catch {
    notFound();
  }

  // Get enriched metadata if available
  const metadata = PACK_METADATA[pack.slug];
  const commands = metadata?.commands || [];
  const features = metadata?.features || [];

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '13px' }}>
            <Link href="/packs" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
              Packs
            </Link>
            <span style={{ color: 'var(--fg-dim)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--fg)' }}>{pack.name}</span>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, color: 'var(--fg-bright)' }}>
                  {pack.name}
                </h1>
                {pack.tier_required !== 'free' ? (
                  <TuiTag color="accent">PREMIUM</TuiTag>
                ) : (
                  <TuiTag color="green">FREE</TuiTag>
                )}
              </div>
              <TuiDim style={{ fontSize: '15px', marginBottom: '16px', display: 'block' }}>
                {pack.description}
              </TuiDim>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                {pack.latest_version && (
                  <span style={{ color: 'var(--cyan)' }}>v{pack.latest_version.version}</span>
                )}
                <span style={{ color: 'var(--fg-dim)' }}>{pack.downloads.toLocaleString()} downloads</span>
                {pack.rating !== null && (
                  <span style={{ color: 'var(--fg-dim)' }}>★ {pack.rating.toFixed(1)}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/register">
                <TuiButton fullWidth>Get Started</TuiButton>
              </Link>
              {pack.documentation_url && (
                <Link href={pack.documentation_url} target="_blank">
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
              <span style={{ color: 'var(--fg-dim)' }}>$</span> constructs-install.sh pack {pack.slug}
            </TuiCode>
            <TuiDim style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              {pack.tier_required !== 'free' ? 'Requires Pro subscription or higher.' : 'Free to install.'}
            </TuiDim>
          </TuiBox>
        </div>
      </section>

      {/* Description */}
      {pack.long_description && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiBox title="About">
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)', whiteSpace: 'pre-line' }}>
                {pack.long_description}
              </div>
            </TuiBox>
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
                        <td style={{ padding: '12px', color: 'var(--fg)' }}>{cmd.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TuiBox>
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Features</TuiH2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {features.map((feature) => (
                <div
                  key={feature}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  <span style={{ color: 'var(--fg)', fontSize: '14px' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Links */}
      {(pack.repository_url || pack.homepage_url) && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Links</TuiH2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {pack.repository_url && (
                <Link
                  href={pack.repository_url}
                  target="_blank"
                  style={{
                    padding: '12px 20px',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  GitHub Repository →
                </Link>
              )}
              {pack.homepage_url && (
                <Link
                  href={pack.homepage_url}
                  target="_blank"
                  style={{
                    padding: '12px 20px',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Homepage →
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Ready to try {pack.name}?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          {pack.tier_required !== 'free'
            ? 'Get Pro to access this pack and all other premium workflows.'
            : 'Sign up free and install this pack in seconds.'}
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>{pack.tier_required !== 'free' ? 'Get Pro' : 'Get Started Free'}</TuiButton>
          </Link>
          <Link href="/packs">
            <TuiButton variant="secondary">Browse All Packs</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
