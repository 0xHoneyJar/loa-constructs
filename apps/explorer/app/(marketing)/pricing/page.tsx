import Link from 'next/link';

export const revalidate = 86400;

export const metadata = {
  title: 'Pricing',
  description: 'Constructs Network pricing plans — free, pro, team, and enterprise.',
};

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started.',
    features: [
      'Access to free constructs',
      'Community support',
      'Public registry access',
      '5 API keys',
    ],
    cta: 'Get Started',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For power users and creators.',
    features: [
      'Everything in Free',
      'Access to Pro constructs',
      'Priority support',
      'Unlimited API keys',
      'Usage analytics',
      'Creator tools',
    ],
    cta: 'Coming Soon',
    href: '#',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$10',
    period: '/seat/month',
    description: 'For teams collaborating on constructs.',
    features: [
      'Everything in Pro',
      'Team management',
      'Shared constructs',
      'Team billing',
      'Up to 20 seats',
      'Priority support',
    ],
    cta: 'Coming Soon',
    href: '#',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced needs.',
    features: [
      'Everything in Team',
      'Unlimited seats',
      'Private registry',
      'SSO / SAML',
      'Dedicated support',
      'Custom SLA',
    ],
    cta: 'Contact Sales',
    href: '#',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-mono font-bold text-bone-bright">Pricing</h1>
        <p className="text-sm font-mono text-bone-dim mt-1">
          Choose the plan that fits your needs. Premium tiers launching soon.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`border p-5 flex flex-col ${
              tier.highlighted ? 'border-bone-ghost' : 'border-void-border'
            }`}
          >
            <div className="mb-4">
              <h2 className="text-sm font-mono font-bold text-bone-base">{tier.name}</h2>
              <div className="mt-2">
                <span className="text-2xl font-mono text-bone-bright">{tier.price}</span>
                {tier.period && (
                  <span className="text-xs font-mono text-bone-ghost">{tier.period}</span>
                )}
              </div>
              <p className="text-xs font-mono text-bone-muted mt-1">{tier.description}</p>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="text-xs font-mono text-bone-dim flex items-start gap-2">
                  <span className="text-bone-ghost">·</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={`block text-center text-xs font-mono px-4 py-2 border transition-colors ${
                tier.highlighted
                  ? 'border-bone-base text-bone-base hover:bg-void-raised'
                  : 'border-void-border text-bone-dim hover:border-bone-ghost'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs font-mono text-bone-ghost text-center">
        All plans include access to the public registry. Payments via NowPayments (coming soon).
      </p>
    </div>
  );
}
