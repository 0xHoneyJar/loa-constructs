/**
 * Landing Page (TUI Style)
 * @see sprint.md T20.9: Update Landing Page (Public)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiCode, TuiTag } from '@/components/tui/tui-text';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

const installCommands: Record<PackageManager, string> = {
  npm: 'npx loa-cli skill install',
  pnpm: 'pnpm dlx loa-cli skill install',
  yarn: 'yarn dlx loa-cli skill install',
  bun: 'bunx loa-cli skill install',
};

const features = [
  {
    title: 'Curated Skills',
    description: 'Every skill is reviewed for quality, security, and compatibility with the Loa framework.',
    icon: '✓',
  },
  {
    title: 'One-Command Install',
    description: 'Install any skill with a single command. Works seamlessly with your existing projects.',
    icon: '⚡',
  },
  {
    title: 'Version Control',
    description: 'Pin specific versions, roll back changes, and manage dependencies with ease.',
    icon: '📦',
  },
  {
    title: 'Team Collaboration',
    description: 'Share skills across your organization with team plans and granular permissions.',
    icon: '👥',
  },
  {
    title: 'Security First',
    description: 'Automated security scanning, signed packages, and audit logs for enterprise compliance.',
    icon: '🔒',
  },
  {
    title: 'CLI & API',
    description: 'Full-featured CLI for local development and REST API for CI/CD integration.',
    icon: '⌨️',
  },
];

const stats = [
  { label: 'Total Skills', value: '150+' },
  { label: 'Downloads', value: '50K+' },
  { label: 'Active Users', value: '2,500+' },
  { label: 'Uptime', value: '99.9%' },
];

export default function Home() {
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '16px' }}>LOA</span>
          <span style={{ color: 'var(--fg-dim)' }}>CONSTRUCTS</span>
          <TuiTag color="cyan">BETA</TuiTag>
        </div>
        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/skills" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
            Skills
          </Link>
          <Link href="/login" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
            Login
          </Link>
          <Link href="/register">
            <TuiButton>$ register</TuiButton>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '16px',
            lineHeight: 1.2,
          }}
        >
          Agent-Driven Development
          <span className="cursor" style={{ marginLeft: '4px' }} />
        </h1>
        <p style={{ color: 'var(--fg)', fontSize: '16px', marginBottom: '8px' }}>
          Discover, install, and manage AI agent skills for the Loa framework.
        </p>
        <TuiDim style={{ fontSize: '14px' }}>
          Extend your Claude agents with powerful skills from our curated marketplace.
        </TuiDim>

        {/* CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
          <Link href="/skills">
            <TuiButton>$ browse-skills</TuiButton>
          </Link>
          <Link href="/register">
            <TuiButton variant="secondary">$ get-started</TuiButton>
          </Link>
        </div>
      </section>

      {/* Quick Install */}
      <section style={{ padding: '0 24px 48px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <TuiBox title="Quick Install">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Package Manager Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPackageManager(pm)}
                  style={{
                    padding: '4px 12px',
                    border: `1px solid ${packageManager === pm ? 'var(--accent)' : 'var(--border)'}`,
                    background: packageManager === pm ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
                    color: packageManager === pm ? 'var(--accent)' : 'var(--fg-dim)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                  }}
                >
                  {pm}
                </button>
              ))}
            </div>

            {/* Install Command */}
            <TuiCode copyable>
              <span style={{ color: 'var(--fg-dim)' }}>$</span> {installCommands[packageManager]} code-review
            </TuiCode>

            <TuiDim style={{ fontSize: '12px' }}>
              Install any skill with a single command. No configuration required.
            </TuiDim>
          </div>
        </TuiBox>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 24px 48px' }}>
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: '16px',
                border: '1px solid var(--border)',
                background: 'rgba(0, 0, 0, 0.75)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: 'var(--accent)', fontSize: '24px', fontWeight: 700 }}>{stat.value}</div>
              <TuiDim style={{ fontSize: '12px' }}>{stat.label}</TuiDim>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '24px' }}>Why Loa Constructs?</TuiH2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                style={{
                  padding: '16px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.75)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{feature.icon}</span>
                  <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>{feature.title}</span>
                </div>
                <TuiDim style={{ fontSize: '13px' }}>{feature.description}</TuiDim>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{ padding: '0 24px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiBox title="Plans">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {/* Free */}
              <div style={{ padding: '12px', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--fg-dim)', fontWeight: 600 }}>Free</div>
                <div style={{ color: 'var(--fg-bright)', fontSize: '20px', margin: '8px 0' }}>$0</div>
                <TuiDim style={{ fontSize: '11px' }}>5 skills, 1K API calls/mo</TuiDim>
              </div>

              {/* Pro */}
              <div style={{ padding: '12px', border: '1px solid var(--accent)' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Pro</div>
                <div style={{ color: 'var(--fg-bright)', fontSize: '20px', margin: '8px 0' }}>$19<TuiDim>/mo</TuiDim></div>
                <TuiDim style={{ fontSize: '11px' }}>Unlimited skills, 50K calls</TuiDim>
              </div>

              {/* Team */}
              <div style={{ padding: '12px', border: '1px solid var(--cyan)' }}>
                <div style={{ color: 'var(--cyan)', fontWeight: 600 }}>Team</div>
                <div style={{ color: 'var(--fg-bright)', fontSize: '20px', margin: '8px 0' }}>$49<TuiDim>/mo</TuiDim></div>
                <TuiDim style={{ fontSize: '11px' }}>10 members, 200K calls</TuiDim>
              </div>

              {/* Enterprise */}
              <div style={{ padding: '12px', border: '1px solid var(--yellow)' }}>
                <div style={{ color: 'var(--yellow)', fontWeight: 600 }}>Enterprise</div>
                <div style={{ color: 'var(--fg-bright)', fontSize: '20px', margin: '8px 0' }}>Custom</div>
                <TuiDim style={{ fontSize: '11px' }}>SSO, SLA, unlimited</TuiDim>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link href="/billing">
                <TuiButton variant="secondary">View full pricing →</TuiButton>
              </Link>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2>Ready to get started?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Join thousands of developers using Loa Constructs.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>$ create-account</TuiButton>
          </Link>
          <Link href="https://github.com/0xHoneyJar/loa-constructs" target="_blank">
            <TuiButton variant="secondary">GitHub →</TuiButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '24px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.8)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Link href="/skills" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '12px' }}>
              Skills
            </Link>
            <Link href="/billing" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '12px' }}>
              Pricing
            </Link>
            <Link href="https://github.com/0xHoneyJar/loa-constructs" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '12px' }}>
              GitHub
            </Link>
            <Link href="/terms" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '12px' }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '12px' }}>
              Privacy
            </Link>
          </div>
          <TuiDim style={{ fontSize: '11px' }}>
            &copy; {new Date().getFullYear()} The Honey Jar. All rights reserved.
          </TuiDim>
        </div>
      </footer>
    </div>
  );
}
