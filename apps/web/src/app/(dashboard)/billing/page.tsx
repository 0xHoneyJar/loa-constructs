/**
 * Billing Page
 * @see sprint.md T6.5: Billing Page - Plans and Stripe
 */

'use client';

import { useState } from 'react';
import { Check, CreditCard, ExternalLink, Receipt, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

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

  return (
    <Card
      className={cn(
        'flex flex-col relative',
        plan.highlighted && 'border-primary shadow-lg',
        isCurrentPlan && 'border-green-500'
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Most Popular
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
          Current Plan
        </div>
      )}
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground">/{plan.interval}</span>
        </div>
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.highlighted ? 'default' : 'outline'}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrentPlan ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const currentTier = user?.role || 'free';

  const handlePlanSelect = async (planId: string) => {
    setIsLoading(true);
    // In production, this would redirect to Stripe Checkout
    // const response = await fetch('/api/billing/create-checkout-session', {
    //   method: 'POST',
    //   body: JSON.stringify({ planId }),
    // });
    // const { url } = await response.json();
    // window.location.href = url;

    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert(`Redirecting to Stripe Checkout for ${planId} plan...`);
    setIsLoading(false);
  };

  const handleManageSubscription = () => {
    // In production, this would redirect to Stripe Customer Portal
    alert('Redirecting to Stripe Customer Portal...');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold capitalize">{currentTier} Plan</p>
              <p className="text-sm text-muted-foreground">
                {currentTier === 'free'
                  ? 'Free forever'
                  : `$${plans.find((p) => p.tier === currentTier)?.price || 0}/month`}
              </p>
            </div>
            {currentTier !== 'free' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleManageSubscription}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              </div>
            )}
          </div>

          {currentTier !== 'free' && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Next billing date: January 1, 2025</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selector */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>API calls and resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>API Calls</span>
                <span>847 / 1,000</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: '84.7%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Skills Installed</span>
                <span>4 / 5</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: '80%' }}
                />
              </div>
            </div>
          </div>
          {currentTier === 'free' && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Approaching API limit
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Upgrade to Pro for 50,000 API calls/month
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      {currentTier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockBillingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        item.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="font-medium">${item.amount}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              View all invoices
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
