/**
 * Documentation Hub Page
 * Getting started guide and CLI reference
 * @see sprint.md T26.9: Create Documentation Hub Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiCode, TuiLink } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Get started with Loa Constructs. Installation guide, CLI reference, and tutorials.',
};

const quickStartSteps = [
  {
    step: 1,
    title: 'Create an account',
    description: 'Sign up free to get your API key.',
    code: null,
    link: { href: '/register', label: 'Sign up →' },
  },
  {
    step: 2,
    title: 'Install a skill pack',
    description: 'Use the Claude CLI to install packs directly into your Claude Code environment.',
    code: 'claude skills add gtm-collective',
    link: null,
  },
  {
    step: 3,
    title: 'Run commands',
    description: 'Execute pack commands with slash commands in Claude Code.',
    code: '/gtm-setup',
    link: null,
  },
];

const cliCommands = [
  { command: 'claude skills add <pack>', description: 'Install a skill pack' },
  { command: 'claude skills remove <pack>', description: 'Uninstall a skill pack' },
  { command: 'claude skills list', description: 'List installed packs' },
  { command: 'claude skills update <pack>', description: 'Update a pack to latest version' },
  { command: 'claude skills info <pack>', description: 'Show pack details and commands' },
];

const resources = [
  {
    title: 'Full Documentation',
    description: 'Complete guides, tutorials, and API reference on GitHub.',
    href: 'https://github.com/0xHoneyJar/loa/tree/main/docs',
    external: true,
  },
  {
    title: 'Loa Framework',
    description: 'The underlying agent-driven development framework.',
    href: 'https://github.com/0xHoneyJar/loa',
    external: true,
  },
  {
    title: 'Creating Packs',
    description: 'Learn how to create and publish your own skill packs.',
    href: 'https://github.com/0xHoneyJar/loa/blob/main/docs/creating-packs.md',
    external: true,
  },
  {
    title: 'API Reference',
    description: 'REST API documentation for CI/CD integration.',
    href: 'https://github.com/0xHoneyJar/loa/blob/main/docs/api-reference.md',
    external: true,
  },
];

export default function DocsPage() {
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
          Documentation
        </h1>
        <TuiDim style={{ fontSize: '15px', display: 'block', maxWidth: '500px', margin: '0 auto' }}>
          Everything you need to get started with Loa Constructs.
        </TuiDim>
      </section>

      {/* Quick Start */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>Quick Start</TuiH2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {quickStartSteps.map((step) => (
              <TuiBox key={step.step} title={`Step ${step.step}: ${step.title}`}>
                <TuiDim style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  {step.description}
                </TuiDim>
                {step.code && (
                  <TuiCode copyable>
                    <span style={{ color: 'var(--fg-dim)' }}>$</span> {step.code}
                  </TuiCode>
                )}
                {step.link && (
                  <Link href={step.link.href}>
                    <TuiButton>{step.link.label}</TuiButton>
                  </Link>
                )}
              </TuiBox>
            ))}
          </div>
        </div>
      </section>

      {/* CLI Reference */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>CLI Reference</TuiH2>

          <TuiBox title="Skills Commands">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--fg-dim)' }}>Command</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--fg-dim)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cliCommands.map((cmd) => (
                    <tr key={cmd.command} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>
                        <code style={{ color: 'var(--green)' }}>{cmd.command}</code>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--fg)' }}>{cmd.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TuiBox>

          <div style={{ marginTop: '16px' }}>
            <TuiDim style={{ fontSize: '13px' }}>
              See full CLI documentation on{' '}
              <TuiLink href="https://github.com/0xHoneyJar/loa/blob/main/docs/cli.md" target="_blank">
                GitHub
              </TuiLink>
              .
            </TuiDim>
          </div>
        </div>
      </section>

      {/* Example Usage */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>Example Usage</TuiH2>

          <TuiBox title="GTM Collective Workflow">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  1. Install the pack
                </TuiDim>
                <TuiCode copyable>
                  <span style={{ color: 'var(--fg-dim)' }}>$</span> claude skills add gtm-collective
                </TuiCode>
              </div>

              <div>
                <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  2. Initialize the GTM workflow
                </TuiDim>
                <TuiCode copyable>
                  <span style={{ color: 'var(--fg-dim)' }}>$</span> /gtm-setup
                </TuiCode>
              </div>

              <div>
                <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  3. Run market analysis
                </TuiDim>
                <TuiCode copyable>
                  <span style={{ color: 'var(--fg-dim)' }}>$</span> /analyze-market
                </TuiCode>
              </div>

              <div>
                <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  4. Define positioning
                </TuiDim>
                <TuiCode copyable>
                  <span style={{ color: 'var(--fg-dim)' }}>$</span> /position
                </TuiCode>
              </div>

              <div>
                <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                  5. Review the complete strategy
                </TuiDim>
                <TuiCode copyable>
                  <span style={{ color: 'var(--fg-dim)' }}>$</span> /review-gtm
                </TuiCode>
              </div>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* Resources */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>Resources</TuiH2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                target={resource.external ? '_blank' : undefined}
                rel={resource.external ? 'noopener noreferrer' : undefined}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    height: '100%',
                    transition: 'border-color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                    {resource.title}
                    {resource.external && <span style={{ color: 'var(--fg-dim)', marginLeft: '4px' }}>↗</span>}
                  </h3>
                  <TuiDim style={{ fontSize: '13px' }}>{resource.description}</TuiDim>
                </div>
              </a>
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
        <TuiH2 style={{ marginBottom: '16px' }}>Need help?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Join our Discord community or open an issue on GitHub.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="https://discord.gg/thehoneyjar" target="_blank">
            <TuiButton>Join Discord</TuiButton>
          </Link>
          <Link href="https://github.com/0xHoneyJar/loa/issues" target="_blank">
            <TuiButton variant="secondary">Open Issue</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
