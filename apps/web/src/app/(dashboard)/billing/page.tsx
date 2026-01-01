/**
 * Billing Page (TUI Style)
 * @see sprint.md T20.5: Redesign Billing Page
 */

'use client';

import { useState } from 'react';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton, TuiLinkButton } from '@/components/tui/tui-button';
import { TuiH1, TuiH2, TuiDim, TuiSuccess, TuiTag } from '@/components/tui/tui-text';
import { useAuth } from '@/contexts/auth-context';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individual developers exploring Loa',
    price: 0,
    interval: 'month',
    tier: 'free',
    features: [
      'Up to 5 skills installed',
      '1,000 API calls/month',
      'Community support',
      'Basic code review',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professional developers',
    price: 19,
    interval: 'month',
    tier: 'pro',
    highlighted: true,
    features: [
      'Unlimited skills',
      '50,000 API calls/month',
      'Priority email support',
      'Advanced code review',
      'Security scanning',
      'Performance analytics',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For growing development teams',
    price: 49,
    interval: 'month',
    tier: 'team',
    features: [
      'Everything in Pro',
      '200,000 API calls/month',
      'Up to 10 team members',
      'Team management dashboard',
      'Usage analytics',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations at scale',
    price: 199,
    interval: 'month',
    tier: 'enterprise',
    features: [
      'Everything in Team',
      'Unlimited API calls',
      'Unlimited team members',
      'SSO/SAML authentication',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
];

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

const mockBillingHistory: BillingHistory[] = [
  { id: '1', date: '2024-12-01', amount: 19, status: 'paid', description: 'Pro Plan - December 2024' },
  { id: '2', date: '2024-11-01', amount: 19, status: 'paid', description: 'Pro Plan - November 2024' },
  { id: '3', date: '2024-10-01', amount: 19, status: 'paid', description: 'Pro Plan - October 2024' },
];

const tierColors: Record<string, string> = {
  free: 'var(--fg-dim)',
  pro: 'var(--accent)',
  team: 'var(--cyan)',
  enterprise: 'var(--yellow)',
};

function PlanCard({
  plan,
  currentTier,
  onSelect,
  isLoading,
}: {
  plan: Plan;
  currentTier: string;
  onSelect: (planId: string) => void;
  isLoading: boolean;
}) {
  const isCurrentPlan = plan.tier.toLowerCase() === currentTier.toLowerCase();
  const isUpgrade = plans.findIndex((p) => p.tier === plan.tier) > plans.findIndex((p) => p.tier.toLowerCase() === currentTier.toLowerCase());
  const tierColor = tierColors[plan.tier] || tierColors.free;

  return (
    <div
      style={{
        border: `1px solid ${isCurrentPlan ? 'var(--green)' : plan.highlighted ? 'var(--accent)' : 'var(--border)'}`,
        background: 'rgba(0, 0, 0, 0.75)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      {/* Badge */}
      {(plan.highlighted || isCurrentPlan) && (
        <span
          style={{
            position: 'absolute',
            top: '-10px',
            left: '12px',
            padding: '2px 8px',
            fontSize: '10px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: `1px solid ${isCurrentPlan ? 'var(--green)' : 'var(--accent)'}`,
            color: isCurrentPlan ? 'var(--green)' : 'var(--accent)',
            textTransform: 'uppercase',
          }}
        >
          {isCurrentPlan ? 'Current' : 'Popular'}
        </span>
      )}

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: tierColor, fontWeight: 600 }}>{plan.name}</span>
        </div>
        <TuiDim style={{ fontSize: '12px' }}>{plan.description}</TuiDim>
      </div>

      {/* Price */}
      <div>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fg-bright)' }}>
          ${plan.price}
        </span>
        <TuiDim>/{plan.interval}</TuiDim>
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
        {plan.features.map((feature) => (
          <li
            key={feature}
            style={{
              padding: '4px 0',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <TuiSuccess>✓</TuiSuccess>
            <span style={{ color: 'var(--fg)' }}>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action */}
      <TuiButton
        variant={plan.highlighted ? 'primary' : 'secondary'}
        fullWidth
        disabled={isCurrentPlan || isLoading}
        onClick={() => onSelect(plan.id)}
      >
        {isCurrentPlan ? 'Current Plan' : isUpgrade ? `$ upgrade --to ${plan.tier}` : `$ downgrade --to ${plan.tier}`}
      </TuiButton>
    </div>
  );
}

function UsageBar({ label, used, total, unit = '' }: { label: string; used: number; total: number; unit?: string }) {
  const percentage = Math.min((used / total) * 100, 100);
  const isHigh = percentage >= 80;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: 'var(--fg)' }}>{label}</span>
        <span style={{ color: isHigh ? 'var(--yellow)' : 'var(--fg-dim)' }}>
          {used.toLocaleString()}{unit} / {total.toLocaleString()}{unit}
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: isHigh ? 'var(--yellow)' : 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const currentTier = user?.role || 'free';
  const tierColor = tierColors[currentTier] || tierColors.free;

  const handlePlanSelect = async (planId: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert(`Redirecting to Stripe Checkout for ${planId} plan...`);
    setIsLoading(false);
  };

  const handleManageSubscription = () => {
    alert('Redirecting to Stripe Customer Portal...');
  };

  const statusColors: Record<string, string> = {
    paid: 'var(--green)',
    pending: 'var(--yellow)',
    failed: 'var(--red)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ padding: '0 4px' }}>
        <TuiH1 cursor>Billing & Subscription</TuiH1>
        <TuiDim>Manage your subscription and billing details</TuiDim>
      </div>

      {/* Current Plan Summary */}
      <TuiBox title="Current Plan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: tierColor, textTransform: 'capitalize' }}>
                  {currentTier} Plan
                </span>
                {currentTier !== 'free' && (
                  <TuiTag color="green">ACTIVE</TuiTag>
                )}
              </div>
              <TuiDim>
                {currentTier === 'free'
                  ? 'Free forever'
                  : `$${plans.find((p) => p.tier === currentTier)?.price || 0}/month`}
              </TuiDim>
            </div>
            {currentTier !== 'free' && (
              <TuiButton variant="secondary" onClick={handleManageSubscription}>
                $ manage-subscription
              </TuiButton>
            )}
          </div>

          {currentTier !== 'free' && (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              <TuiDim>Next billing date:</TuiDim>{' '}
              <span style={{ color: 'var(--fg-bright)' }}>January 1, 2025</span>
            </div>
          )}
        </div>
      </TuiBox>

      {/* Available Plans */}
      <div>
        <TuiH2 style={{ marginBottom: '12px', padding: '0 4px' }}>Available Plans</TuiH2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentTier={currentTier}
              onSelect={handlePlanSelect}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <TuiBox title="Usage This Month">
        <UsageBar label="API Calls" used={847} total={1000} />
        <UsageBar label="Skills Installed" used={4} total={5} />

        {currentTier === 'free' && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              border: '1px solid var(--yellow)',
              background: 'rgba(241, 250, 140, 0.1)',
            }}
          >
            <span style={{ color: 'var(--yellow)' }}>⚠ Approaching API limit</span>
            <TuiDim style={{ display: 'block', marginTop: '4px' }}>
              Upgrade to Pro for 50,000 API calls/month
            </TuiDim>
          </div>
        )}
      </TuiBox>

      {/* Billing History */}
      {currentTier !== 'free' && (
        <TuiBox title="Billing History">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {mockBillingHistory.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < mockBillingHistory.length - 1 ? '1px solid var(--border)' : 'none',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ color: 'var(--fg-bright)' }}>{item.description}</div>
                  <TuiDim style={{ fontSize: '12px' }}>{item.date}</TuiDim>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      color: statusColors[item.status],
                      fontSize: '11px',
                      padding: '2px 6px',
                      border: `1px solid ${statusColors[item.status]}`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.status}
                  </span>
                  <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>${item.amount}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <TuiLinkButton onClick={() => alert('View all invoices')}>
              View all invoices →
            </TuiLinkButton>
          </div>
        </TuiBox>
      )}
    </div>
  );
}
