/**
 * Pricing Page
 * Full pricing with comparison table and FAQ
 * @see sprint.md T26.5: Create Dedicated Pricing Page
 * @see gtm-grimoire/execution/website-copy-pricing.md
 * @see gtm-grimoire/strategy/pricing-strategy.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Loa Constructs. Start free, upgrade when you need premium packs.',
};

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Forever free',
    color: 'var(--fg-dim)',
    features: [
      'Access to public/community packs',
      '3 API keys',
      '100 API requests/minute',
      'Community Discord access',
    ],
    cta: 'Get Started Free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'For serious builders',
    color: 'var(--accent)',
    features: [
      'All packs (including premium)',
      'Unlimited API keys',
      '300 API requests/minute',
      'Creator dashboard',
      'Stripe Connect payouts',
      'Priority Discord support',
    ],
    cta: 'Go Pro',
    href: '/register?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/mo',
    description: 'For growing teams',
    color: 'var(--cyan)',
    features: [
      'Everything in Pro',
      '5 seats included',
      '$15/mo per additional seat',
      '500 API requests/minute',
      'Team collaboration features',
      'Usage analytics',
      'Dedicated Slack channel',
    ],
    cta: 'Start Team Trial',
    href: '/register?plan=team',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/mo',
    description: 'For organizations',
    color: 'var(--yellow)',
    features: [
      'Everything in Team',
      'Unlimited seats',
      '1000 API requests/minute',
      'SSO/SAML integration',
      '99.9% SLA guarantee',
      'Dedicated account manager',
      'Custom pack development',
      'Invoice billing (NET 30)',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@thehoneyjar.xyz',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'What happens to my installed packs if I cancel?',
    answer: 'Packs you\'ve already installed continue to work locally. However, you won\'t be able to download new versions or install new premium packs without an active subscription.',
  },
  {
    question: 'Is there a money-back guarantee?',
    answer: 'Yes! If you\'re not satisfied within the first 14 days, contact us for a full refund. No questions asked.',
  },
  {
    question: 'Can I switch plans anytime?',
    answer: 'Absolutely. Upgrade or downgrade at any time. Changes take effect immediately, with prorated billing.',
  },
  {
    question: 'What\'s included in the Free tier?',
    answer: 'Free tier gives you access to all public/community packs, 3 API keys, and community Discord support. It\'s a great way to try Loa before upgrading.',
  },
  {
    question: 'How does the 70% creator revenue share work?',
    answer: 'When subscribers use your packs, you earn 70% of the attributed revenue. Payouts happen monthly via Stripe Connect with a $50 minimum threshold.',
  },
  {
    question: 'What if I need more than 5 team seats?',
    answer: 'Team plan includes 5 seats at $99/mo. Additional seats are $15/mo each. For 50+ seats, contact us for Enterprise pricing.',
  },
  {
    question: 'Is there an annual discount?',
    answer: 'Yes! Pay annually and save 17% (~2 months free). Pro becomes $290/year, Team becomes $990/year.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards via Stripe. Enterprise customers can request invoice billing with NET 30 terms.',
  },
];

const comparisonFeatures = [
  { name: 'Pack Access', free: 'Public packs', pro: 'All packs', team: 'All packs', enterprise: 'All packs + custom' },
  { name: 'API Keys', free: '3', pro: 'Unlimited', team: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'API Rate Limit', free: '100/min', pro: '300/min', team: '500/min', enterprise: '1000/min' },
  { name: 'Team Seats', free: '1', pro: '1', team: '5 included', enterprise: 'Unlimited' },
  { name: 'Creator Dashboard', free: '—', pro: '✓', team: '✓', enterprise: '✓' },
  { name: 'Usage Analytics', free: '—', pro: '—', team: '✓', enterprise: '✓' },
  { name: 'SSO/SAML', free: '—', pro: '—', team: '—', enterprise: '✓' },
  { name: 'SLA', free: '—', pro: '—', team: '—', enterprise: '99.9%' },
  { name: 'Support', free: 'Community', pro: 'Priority Discord', team: 'Dedicated Slack', enterprise: 'Account Manager' },
];

export default function PricingPage() {
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
          Simple pricing. No surprises.
        </h1>
        <TuiDim style={{ fontSize: '16px', display: 'block', maxWidth: '600px', margin: '0 auto' }}>
          Start free. Upgrade when you need premium packs and creator features.
          <br />
          $29/mo = less than one hour of consultant time.
        </TuiDim>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '0 24px 64px' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: '32px 24px',
                border: tier.highlighted ? `2px solid ${tier.color}` : `1px solid var(--border)`,
                background: tier.highlighted ? 'rgba(95, 175, 255, 0.05)' : 'rgba(0, 0, 0, 0.75)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {tier.highlighted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: tier.color,
                    color: '#000',
                    padding: '2px 16px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div style={{ color: tier.color, fontWeight: 600, marginBottom: '8px' }}>{tier.name}</div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--fg-bright)', fontSize: '40px', fontWeight: 700 }}>{tier.price}</span>
                <span style={{ color: 'var(--fg-dim)', fontSize: '14px' }}>{tier.period}</span>
              </div>
              <TuiDim style={{ fontSize: '13px', marginBottom: '24px', display: 'block' }}>{tier.description}</TuiDim>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {tier.features.map((feature) => (
                  <li key={feature} style={{ color: 'var(--fg)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--green)' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={tier.href}>
                <TuiButton fullWidth variant={tier.highlighted ? 'primary' : 'secondary'}>
                  {tier.cta}
                </TuiButton>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ padding: '64px 24px', background: 'rgba(0, 0, 0, 0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '32px' }}>Compare Plans</TuiH2>

          <TuiBox title="Feature Comparison">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--fg-dim)' }}>Feature</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--fg-dim)' }}>Free</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--accent)' }}>Pro</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--cyan)' }}>Team</th>
                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--yellow)' }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', color: 'var(--fg-bright)' }}>{feature.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--fg)' }}>{feature.free}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--fg)' }}>{feature.pro}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--fg)' }}>{feature.team}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--fg)' }}>{feature.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiH2 style={{ textAlign: 'center', marginBottom: '32px' }}>Frequently Asked Questions</TuiH2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq) => (
              <div
                key={faq.question}
                style={{
                  padding: '20px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.75)',
                }}
              >
                <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                  {faq.question}
                </h3>
                <TuiDim style={{ fontSize: '13px', lineHeight: 1.6 }}>{faq.answer}</TuiDim>
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
        <TuiH2 style={{ marginBottom: '16px' }}>Still have questions?</TuiH2>
        <TuiDim style={{ marginBottom: '32px', display: 'block' }}>
          We&apos;re happy to help. Reach out anytime.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="mailto:hello@thehoneyjar.xyz">
            <TuiButton>Contact Us</TuiButton>
          </Link>
          <Link href="/register">
            <TuiButton variant="secondary">Start Free</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
