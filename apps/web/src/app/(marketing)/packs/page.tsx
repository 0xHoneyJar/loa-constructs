/**
 * Public Packs Catalog Page
 * Browse packs without login
 * @see sprint.md T26.7: Create Public Packs Catalog Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiTag } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Packs',
  description: 'Browse skill packs for Claude Code. GTM, documentation, security, deployment workflows and more.',
};

// Placeholder pack data - in production, this would come from API
const packs = [
  {
    slug: 'gtm-collective',
    name: 'GTM Collective',
    description: 'Complete go-to-market workflow. Market analysis, positioning, pricing, launch planning, and more.',
    category: 'GTM',
    downloads: 1250,
    premium: true,
    featured: true,
    creator: 'The Honey Jar',
    version: '1.0.0',
    commands: 14,
  },
  {
    slug: 'security-audit',
    name: 'Security Audit',
    description: 'Comprehensive security review workflow. OWASP checks, dependency scanning, code analysis.',
    category: 'Security',
    downloads: 890,
    premium: true,
    featured: false,
    creator: 'The Honey Jar',
    version: '0.9.0',
    commands: 8,
  },
  {
    slug: 'docs-generator',
    name: 'Docs Generator',
    description: 'Automated documentation workflow. API docs, README generation, architecture decision records.',
    category: 'Documentation',
    downloads: 2100,
    premium: false,
    featured: false,
    creator: 'Community',
    version: '1.2.0',
    commands: 6,
  },
  {
    slug: 'deploy-toolkit',
    name: 'Deploy Toolkit',
    description: 'Deployment workflow for modern stacks. Vercel, Fly.io, Railway, Docker configurations.',
    category: 'DevOps',
    downloads: 1560,
    premium: true,
    featured: false,
    creator: 'The Honey Jar',
    version: '0.8.0',
    commands: 10,
  },
  {
    slug: 'code-review',
    name: 'Code Review',
    description: 'AI-powered code review workflow. Style checks, best practices, performance suggestions.',
    category: 'Development',
    downloads: 3200,
    premium: false,
    featured: false,
    creator: 'Community',
    version: '2.0.1',
    commands: 5,
  },
  {
    slug: 'test-suite',
    name: 'Test Suite Generator',
    description: 'Generate comprehensive test suites. Unit tests, integration tests, E2E test scaffolding.',
    category: 'Testing',
    downloads: 1890,
    premium: false,
    featured: false,
    creator: 'Community',
    version: '1.1.0',
    commands: 7,
  },
];

const categories = ['All', 'GTM', 'Security', 'Documentation', 'DevOps', 'Development', 'Testing'];

function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function PacksPage() {
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

      {/* Search & Filters */}
      <section style={{ padding: '0 24px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: '1 1 300px', minWidth: '200px' }}>
              <input
                type="search"
                placeholder="Search packs..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: 'var(--fg)',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  style={{
                    padding: '6px 14px',
                    border: `1px solid ${cat === 'All' ? 'var(--accent)' : 'var(--border)'}`,
                    background: cat === 'All' ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
                    color: cat === 'All' ? 'var(--accent)' : 'var(--fg-dim)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Pack */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiDim style={{ fontSize: '12px', marginBottom: '12px', display: 'block' }}>FEATURED</TuiDim>
          <Link href="/packs/gtm-collective" style={{ textDecoration: 'none' }}>
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
                  <h2 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '18px' }}>GTM Collective</h2>
                  <TuiTag color="accent">PREMIUM</TuiTag>
                </div>
                <TuiDim style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  Complete go-to-market workflow. Market analysis, positioning, pricing, launch planning.
                </TuiDim>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--fg-dim)' }}>14 commands</span>
                  <span style={{ color: 'var(--fg-dim)' }}>v1.0.0</span>
                  <span style={{ color: 'var(--fg-dim)' }}>{formatDownloads(1250)} downloads</span>
                </div>
              </div>
              <TuiButton>View Pack →</TuiButton>
            </div>
          </Link>
        </div>
      </section>

      {/* Pack Grid */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>All Packs</TuiH2>

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
                  style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '15px' }}>{pack.name}</h3>
                    {pack.premium ? (
                      <TuiTag color="accent">PRO</TuiTag>
                    ) : (
                      <TuiTag color="green">FREE</TuiTag>
                    )}
                  </div>

                  {/* Description */}
                  <TuiDim style={{ fontSize: '13px', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
                    {pack.description}
                  </TuiDim>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: 'var(--cyan)' }}>{pack.category}</span>
                      <span style={{ color: 'var(--fg-dim)' }}>{pack.commands} cmds</span>
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
