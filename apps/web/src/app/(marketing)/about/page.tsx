/**
 * About Page
 * Origin story, team, philosophy
 * @see sprint.md T26.6: Create About Page
 * @see gtm-grimoire/execution/website-copy-about.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiLink } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Loa Constructs - the skill pack registry for Claude Code. Built by The Honey Jar.',
};

const beliefs = [
  {
    title: 'Workflows, not prompts',
    description: 'Single prompts are a starting point, not a destination. Real value comes from complete methodologies with feedback loops, quality gates, and managed state.',
  },
  {
    title: 'Beyond code',
    description: 'AI coding assistants are great at code. But shipping products requires GTM strategy, documentation, security audits, and deployment. We focus on the other 50%.',
  },
  {
    title: 'Creator economics matter',
    description: '70% revenue share because creators deserve to build sustainable businesses. Recurring revenue, transparent attribution, simple payouts.',
  },
  {
    title: 'Curated > aggregated',
    description: 'We review every pack before publishing. Quality over quantity. Trust over volume.',
  },
  {
    title: 'Developer experience first',
    description: 'One command to install. Slash commands to run. No configuration, no prompt engineering, no setup required.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '64px 24px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '16px',
          }}
        >
          About Loa Constructs
        </h1>
        <TuiDim style={{ fontSize: '16px', display: 'block', maxWidth: '600px', margin: '0 auto' }}>
          The skill pack registry for Claude Code. Built by developers, for developers.
        </TuiDim>
      </section>

      {/* Why We Built This */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiBox title="Why We Built This">
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)' }}>
              <p style={{ marginBottom: '16px' }}>
                We&apos;re indie hackers who ship products. And we kept running into the same problem:
              </p>
              <p style={{ marginBottom: '16px', color: 'var(--fg-bright)' }}>
                AI is great at writing code. But shipping a product requires so much more.
              </p>
              <p style={{ marginBottom: '16px' }}>
                GTM strategy. Market research. Pricing decisions. Security audits. Documentation. Deployment.
                Every time we started a new project, we&apos;d spend days—sometimes weeks—recreating the same workflows.
              </p>
              <p style={{ marginBottom: '16px' }}>
                We&apos;d prompt ChatGPT for market analysis. Then lose the conversation. Then start over.
                We&apos;d copy-paste security checklists. Then forget to update them.
                We&apos;d write deployment scripts. Then do it differently next project.
              </p>
              <p style={{ marginBottom: '16px', color: 'var(--accent)' }}>
                So we built Loa: reusable agent workflows that handle the &quot;other 50%&quot; of shipping products.
              </p>
              <p>
                One command to install. Slash commands to run. Feedback loops to iterate. Quality gates to ship with confidence.
              </p>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* What is Loa */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '24px' }}>What is &quot;Loa&quot;?</TuiH2>
          <div style={{ textAlign: 'center', fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)' }}>
            <p style={{ marginBottom: '16px' }}>
              In Vodou tradition, <strong style={{ color: 'var(--fg-bright)' }}>Loa</strong> are spirits that serve as intermediaries between humans and the divine.
              They embody specific domains of expertise—wisdom, creativity, transformation.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Our skill packs work the same way: specialized agents that bring expert knowledge to your projects.
              GTM Collective embodies go-to-market expertise. Security Audit embodies security knowledge.
            </p>
            <p style={{ color: 'var(--fg-dim)' }}>
              (Also, it&apos;s a fun acronym: <strong>L</strong>everaging <strong>O</strong>rchestrated <strong>A</strong>gents)
            </p>
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '24px' }}>Who We Are</TuiH2>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--yellow)', fontSize: '24px' }}>🍯</span>
              <span style={{ color: 'var(--fg-bright)', fontSize: '18px', fontWeight: 600 }}>The Honey Jar</span>
            </div>
            <TuiDim style={{ fontSize: '14px' }}>
              A small team of builders shipping developer tools and crypto infrastructure.
            </TuiDim>
          </div>

          <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>
              We&apos;ve shipped 10+ products over the past few years—mostly in crypto and developer tooling.
              We use Claude Code daily. We built Loa because we needed it ourselves.
            </p>
            <p>
              Based remotely. Building in public. Always happy to chat.
            </p>
          </div>
        </div>
      </section>

      {/* What We Believe */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '32px' }}>What We Believe</TuiH2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {beliefs.map((belief) => (
              <div
                key={belief.title}
                style={{
                  padding: '24px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.75)',
                }}
              >
                <h3 style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                  {belief.title}
                </h3>
                <TuiDim style={{ fontSize: '13px', lineHeight: 1.6 }}>{belief.description}</TuiDim>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <TuiH2 style={{ marginBottom: '16px' }}>Open Source</TuiH2>
          <TuiDim style={{ fontSize: '14px', display: 'block', marginBottom: '24px' }}>
            The Loa framework and many skill packs are open source.
            <br />
            We believe in transparency, community contributions, and building in public.
          </TuiDim>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="https://github.com/0xHoneyJar/loa" target="_blank">
              <TuiButton>View on GitHub</TuiButton>
            </Link>
            <Link href="https://github.com/0xHoneyJar/loa/blob/main/CONTRIBUTING.md" target="_blank">
              <TuiButton variant="secondary">Contributing Guide</TuiButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Get in Touch</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Questions, feedback, or just want to say hi? We&apos;d love to hear from you.
        </TuiDim>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}
        >
          <div>
            <TuiDim style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Email</TuiDim>
            <TuiLink href="mailto:hello@thehoneyjar.xyz">hello@thehoneyjar.xyz</TuiLink>
          </div>
          <div>
            <TuiDim style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Discord</TuiDim>
            <TuiLink href="https://discord.gg/thehoneyjar" target="_blank">discord.gg/thehoneyjar</TuiLink>
          </div>
          <div>
            <TuiDim style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Twitter</TuiDim>
            <TuiLink href="https://x.com/0xhoneyjar" target="_blank">@0xhoneyjar</TuiLink>
          </div>
        </div>

        <Link href="/register">
          <TuiButton>Get Started Free</TuiButton>
        </Link>
      </section>
    </>
  );
}
