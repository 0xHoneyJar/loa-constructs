/**
 * Marketing Landing Page
 * GTM-approved messaging and copy
 * @see sprint.md T26.2: Redesign Landing Page with GTM Copy
 * @see gtm-grimoire/execution/website-copy-indie-devs.md
 * @see gtm-grimoire/strategy/positioning.md
 */

import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiCode, TuiTag } from '@/components/tui/tui-text';

// Force static generation to avoid client-reference-manifest issues
export const dynamic = 'force-static';

// GTM Collective commands table
const gtmCommands = [
  { command: '/gtm-setup', description: 'Initialize GTM workflow for your project' },
  { command: '/analyze-market', description: 'Research market size, trends, competitors' },
  { command: '/position', description: 'Define positioning and messaging strategy' },
  { command: '/price', description: 'Develop pricing model and tiers' },
  { command: '/plan-launch', description: 'Create launch timeline and content calendar' },
  { command: '/review-gtm', description: 'Comprehensive strategy review' },
  { command: '/create-deck', description: 'Generate pitch deck content' },
  { command: '/translate', description: 'Adapt communication for audiences' },
];

export default function MarketingHome() {

  return (
    <>
      {/* Hero Section */}
      <section style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '16px',
            lineHeight: 1.2,
          }}
        >
          Skill packs for Claude Code.
          <br />
          <span style={{ color: 'var(--accent)' }}>Beyond coding.</span>
          <span className="cursor" style={{ marginLeft: '4px' }} />
        </h1>
        <p style={{ color: 'var(--fg)', fontSize: '18px', marginBottom: '8px', maxWidth: '700px', margin: '0 auto 8px' }}>
          Pre-built agent workflows for GTM, documentation, security, and deployment.
        </p>
        <TuiDim style={{ fontSize: '16px', display: 'block', marginBottom: '32px' }}>
          Install in one command. Run with slash commands. The other 50% of shipping products.
        </TuiDim>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '48px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>Get Started Free</TuiButton>
          </Link>
          <Link href="/packs">
            <TuiButton variant="secondary">Browse Packs</TuiButton>
          </Link>
        </div>

        {/* Quick Install */}
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <TuiBox title="Quick Install">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Install Command */}
              <TuiCode>
                <span style={{ color: 'var(--fg-dim)' }}>$</span> claude skills add gtm-collective
              </TuiCode>

              <TuiDim style={{ fontSize: '12px' }}>
                One command to install. No configuration required.
              </TuiDim>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* Problem Section */}
      <section style={{ padding: '48px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>You&apos;re building the prompts instead of the product</TuiH2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '16px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.5)' }}>
              <TuiDim style={{ fontSize: '13px' }}>
                &quot;I spent 3 days writing prompts for market research...&quot;
              </TuiDim>
            </div>
            <div style={{ padding: '16px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.5)' }}>
              <TuiDim style={{ fontSize: '13px' }}>
                &quot;My GTM strategy is scattered across 20 ChatGPT conversations&quot;
              </TuiDim>
            </div>
            <div style={{ padding: '16px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.5)' }}>
              <TuiDim style={{ fontSize: '13px' }}>
                &quot;Every time I need security review, I start from scratch&quot;
              </TuiDim>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <TuiH2 style={{ marginBottom: '16px' }}>Agent skills that just work</TuiH2>
            <TuiDim style={{ fontSize: '15px' }}>
              Workflows, not prompts. Complete methodologies with feedback loops and quality gates.
            </TuiDim>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Feature 1 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--green)', fontSize: '20px', marginBottom: '12px' }}>⚡</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>One-Command Install</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                <code style={{ color: 'var(--green)' }}>claude skills add pack-name</code>
                <br />
                No configuration, no prompt engineering, no setup.
              </TuiDim>
            </div>

            {/* Feature 2 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--accent)', fontSize: '20px', marginBottom: '12px' }}>🎯</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>Beyond Code</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                GTM strategy, documentation, security audits, deployment workflows.
                <br />
                The other 50% of shipping products.
              </TuiDim>
            </div>

            {/* Feature 3 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--cyan)', fontSize: '20px', marginBottom: '12px' }}>🔄</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>Feedback Loops</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                Not one-shot prompts. Multi-step workflows with memory, quality gates, and iteration.
              </TuiDim>
            </div>

            {/* Feature 4 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--yellow)', fontSize: '20px', marginBottom: '12px' }}>📦</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>Managed Scaffolding</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                Professional-grade infrastructure. Version control, integrity checks, automatic updates.
              </TuiDim>
            </div>

            {/* Feature 5 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--green)', fontSize: '20px', marginBottom: '12px' }}>💰</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>Creator Economy</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                Build skills, earn 70% revenue share. Stripe Connect integration, transparent payouts.
              </TuiDim>
            </div>

            {/* Feature 6 */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--accent)', fontSize: '20px', marginBottom: '12px' }}>✓</div>
              <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px' }}>Curated Quality</h3>
              <TuiDim style={{ fontSize: '13px' }}>
                Every pack is reviewed before publishing. We curate, not aggregate.
              </TuiDim>
            </div>
          </div>
        </div>
      </section>

      {/* GTM Collective Section */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <TuiTag color="accent" style={{ fontSize: '12px', marginBottom: '12px', display: 'inline-block' }}>
              FEATURED PACK
            </TuiTag>
            <TuiH2 style={{ marginBottom: '8px' }}>Go-to-market without leaving your terminal</TuiH2>
            <p style={{ color: 'var(--fg)', marginBottom: '8px' }}>
              <strong style={{ color: 'var(--fg-bright)' }}>8 skills. 14 commands.</strong> Everything you need to launch.
            </p>
            <TuiDim style={{ fontSize: '14px' }}>Built by founders who shipped 10+ products.</TuiDim>
          </div>

          <TuiBox title="GTM Collective Commands">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--fg-dim)' }}>Command</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--fg-dim)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {gtmCommands.map((cmd) => (
                    <tr key={cmd.command} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{ color: 'var(--green)' }}>{cmd.command}</code>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--fg)' }}>{cmd.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TuiBox>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/packs/gtm-collective">
              <TuiButton>Try GTM Collective →</TuiButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <TuiH2 style={{ marginBottom: '8px' }}>Simple pricing. No surprises.</TuiH2>
            <TuiDim style={{ fontSize: '14px' }}>$29/mo = less than one hour of consultant time.</TuiDim>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Free */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--fg-dim)', fontWeight: 600, marginBottom: '4px' }}>Free</div>
              <div style={{ color: 'var(--fg-bright)', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>$0</div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '16px', display: 'block' }}>Forever free</TuiDim>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Public packs</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ 3 API keys</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Community support</li>
              </ul>
            </div>

            {/* Pro */}
            <div style={{ padding: '24px', border: '2px solid var(--accent)', background: 'rgba(95, 175, 255, 0.05)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', padding: '2px 12px', fontSize: '11px', fontWeight: 600 }}>
                MOST POPULAR
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>Pro</div>
              <div style={{ color: 'var(--fg-bright)', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
                $29<span style={{ fontSize: '14px', color: 'var(--fg-dim)' }}>/mo</span>
              </div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '16px', display: 'block' }}>For serious builders</TuiDim>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ All packs (including premium)</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Unlimited API keys</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Creator dashboard</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Priority support</li>
              </ul>
            </div>

            {/* Team */}
            <div style={{ padding: '24px', border: '1px solid var(--cyan)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--cyan)', fontWeight: 600, marginBottom: '4px' }}>Team</div>
              <div style={{ color: 'var(--fg-bright)', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
                $99<span style={{ fontSize: '14px', color: 'var(--fg-dim)' }}>/mo</span>
              </div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '16px', display: 'block' }}>For growing teams</TuiDim>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Everything in Pro</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ 5 team seats</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Team collaboration</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Usage analytics</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div style={{ padding: '24px', border: '1px solid var(--yellow)', background: 'rgba(0, 0, 0, 0.75)' }}>
              <div style={{ color: 'var(--yellow)', fontWeight: 600, marginBottom: '4px' }}>Enterprise</div>
              <div style={{ color: 'var(--fg-bright)', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
                $299<span style={{ fontSize: '14px', color: 'var(--fg-dim)' }}>/mo</span>
              </div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '16px', display: 'block' }}>For organizations</TuiDim>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Everything in Team</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ Unlimited seats</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ SSO/SAML</li>
                <li style={{ color: 'var(--fg)', marginBottom: '8px' }}>✓ SLA guarantee</li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/pricing">
              <TuiButton variant="secondary">View full pricing →</TuiButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Ready to ship faster?</TuiH2>
        <TuiDim style={{ marginBottom: '32px', display: 'block', fontSize: '15px' }}>
          Join founders using Loa Constructs to handle the other 50% of shipping products.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>Get Started Free</TuiButton>
          </Link>
          <a href="https://github.com/0xHoneyJar/loa" target="_blank" rel="noopener noreferrer">
            <TuiButton variant="secondary">Star on GitHub</TuiButton>
          </a>
        </div>
      </section>
    </>
  );
}
