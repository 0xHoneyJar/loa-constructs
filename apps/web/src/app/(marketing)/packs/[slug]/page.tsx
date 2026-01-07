/**
 * Public Pack Detail Page
 * Individual pack detail for marketing
 * @see sprint.md T26.8: Create Public Pack Detail Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag, TuiCode } from '@/components/tui/tui-text';

// Placeholder pack data - in production, this would come from API
const packsData: Record<string, {
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  category: string;
  downloads: number;
  premium: boolean;
  creator: string;
  version: string;
  commands: Array<{ name: string; description: string }>;
  features: string[];
}> = {
  'gtm-collective': {
    name: 'GTM Collective',
    slug: 'gtm-collective',
    description: 'Complete go-to-market workflow. Market analysis, positioning, pricing, launch planning, and more.',
    longDescription: `GTM Collective is a comprehensive go-to-market workflow pack that guides you through every step of launching a product. Built by founders who've shipped 10+ products, it encodes years of GTM expertise into reusable agent workflows.

From market research to positioning strategy, pricing models to launch execution—GTM Collective handles the strategic work that typically takes weeks and compresses it into structured, repeatable processes.`,
    category: 'GTM',
    downloads: 1250,
    premium: true,
    creator: 'The Honey Jar',
    version: '1.0.0',
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
      '8 specialized skills covering the full GTM lifecycle',
      'Market research with TAM/SAM/SOM analysis',
      'ICP development with detailed buyer profiles',
      'Competitive analysis and positioning',
      'Pricing strategy with tier modeling',
      'Launch planning with content calendars',
      'Built-in review and consistency checks',
      'Grounded in actual market data',
    ],
  },
  'security-audit': {
    name: 'Security Audit',
    slug: 'security-audit',
    description: 'Comprehensive security review workflow. OWASP checks, dependency scanning, code analysis.',
    longDescription: `Security Audit provides a structured workflow for reviewing your codebase for security vulnerabilities. It covers OWASP Top 10, dependency vulnerabilities, authentication patterns, and more.

The workflow generates actionable reports with severity ratings, remediation steps, and compliance checks. Built for teams that need to ship secure code without dedicated security engineers.`,
    category: 'Security',
    downloads: 890,
    premium: true,
    creator: 'The Honey Jar',
    version: '0.9.0',
    commands: [
      { name: '/audit', description: 'Full security audit of the codebase' },
      { name: '/audit-sprint', description: 'Security review of sprint changes' },
      { name: '/audit-deployment', description: 'Pre-deployment security checklist' },
      { name: '/scan-deps', description: 'Dependency vulnerability scan' },
      { name: '/owasp-check', description: 'OWASP Top 10 compliance check' },
      { name: '/auth-review', description: 'Authentication pattern review' },
      { name: '/secrets-scan', description: 'Secrets and credentials detection' },
      { name: '/generate-report', description: 'Generate audit report' },
    ],
    features: [
      'OWASP Top 10 compliance checking',
      'Dependency vulnerability scanning',
      'Authentication pattern analysis',
      'Secrets detection and remediation',
      'Sprint-level security reviews',
      'Deployment security checklists',
      'Severity-rated findings',
      'Actionable remediation steps',
    ],
  },
  'docs-generator': {
    name: 'Docs Generator',
    slug: 'docs-generator',
    description: 'Automated documentation workflow. API docs, README generation, architecture decision records.',
    longDescription: `Docs Generator automates the tedious work of documentation. It analyzes your codebase and generates API documentation, READMEs, architecture decision records (ADRs), and more.

Keep your docs in sync with code changes using automated generation with human review gates.`,
    category: 'Documentation',
    downloads: 2100,
    premium: false,
    creator: 'Community',
    version: '1.2.0',
    commands: [
      { name: '/generate-readme', description: 'Generate or update README.md' },
      { name: '/generate-api-docs', description: 'Generate API documentation' },
      { name: '/create-adr', description: 'Create architecture decision record' },
      { name: '/sync-docs', description: 'Sync documentation with code changes' },
      { name: '/changelog', description: 'Generate changelog from commits' },
      { name: '/docs-review', description: 'Review documentation coverage' },
    ],
    features: [
      'README generation from codebase',
      'API documentation from types',
      'Architecture Decision Records',
      'Changelog generation',
      'Documentation coverage analysis',
      'Human review gates',
    ],
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const pack = packsData[resolvedParams.slug];

  if (!pack) {
    return { title: 'Pack Not Found' };
  }

  return {
    title: pack.name,
    description: pack.description,
  };
}

export default async function PackDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const pack = packsData[resolvedParams.slug];

  if (!pack) {
    notFound();
  }

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
                {pack.premium ? (
                  <TuiTag color="accent">PREMIUM</TuiTag>
                ) : (
                  <TuiTag color="green">FREE</TuiTag>
                )}
              </div>
              <TuiDim style={{ fontSize: '15px', marginBottom: '16px', display: 'block' }}>
                {pack.description}
              </TuiDim>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--cyan)' }}>{pack.category}</span>
                <span style={{ color: 'var(--fg-dim)' }}>v{pack.version}</span>
                <span style={{ color: 'var(--fg-dim)' }}>by {pack.creator}</span>
                <span style={{ color: 'var(--fg-dim)' }}>{pack.downloads.toLocaleString()} downloads</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/register">
                <TuiButton fullWidth>Get Started</TuiButton>
              </Link>
              <Link href="/docs">
                <TuiButton variant="secondary" fullWidth>Documentation</TuiButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Install Command */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiBox title="Install">
            <TuiCode copyable>
              <span style={{ color: 'var(--fg-dim)' }}>$</span> claude skills add {pack.slug}
            </TuiCode>
            <TuiDim style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              {pack.premium ? 'Requires Pro subscription or higher.' : 'Free to install.'}
            </TuiDim>
          </TuiBox>
        </div>
      </section>

      {/* Description */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiBox title="About">
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)', whiteSpace: 'pre-line' }}>
              {pack.longDescription}
            </div>
          </TuiBox>
        </div>
      </section>

      {/* Commands */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '16px' }}>Commands ({pack.commands.length})</TuiH2>
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
                  {pack.commands.map((cmd) => (
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

      {/* Features */}
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
            {pack.features.map((feature) => (
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
          {pack.premium
            ? 'Get Pro to access this pack and all other premium workflows.'
            : 'Sign up free and install this pack in seconds.'}
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>{pack.premium ? 'Get Pro' : 'Get Started Free'}</TuiButton>
          </Link>
          <Link href="/packs">
            <TuiButton variant="secondary">Browse All Packs</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
