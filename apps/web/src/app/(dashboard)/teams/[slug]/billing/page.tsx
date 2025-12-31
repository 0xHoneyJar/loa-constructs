/**
 * Team Billing Page
 * @see sprint.md T9.6: Team Billing Page
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  Check,
  Users,
  Package,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import Cookies from 'js-cookie';

interface TeamSubscription {
  tier: string;
  status: string;
  seats: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  subscription: TeamSubscription | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TEAM_PLANS = [
  {
    tier: 'team',
    name: 'Team',
    price: 99,
    pricePerSeat: 15,
    baseSeats: 5,
    description: 'For small to medium teams',
    features: [
      'All Pro skills included',
      'Team-exclusive skills',
      '5 seats included',
      'Additional seats at $15/month',
      'Team usage analytics',
      'Priority support',
      'Centralized billing',
    ],
    popular: true,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    pricePerSeat: null,
    baseSeats: null,
    description: 'For large organizations',
    features: [
      'Everything in Team',
      'Unlimited seats',
      'Custom skills development',
      'SSO/SAML integration',
      'Dedicated support',
      'SLA guarantee',
      'Security audit reports',
      'Custom contracts',
    ],
    popular: false,
  },
];

export default function TeamBillingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const slug = params.slug as string;

  const fetchTeamData = async () => {
    const accessToken = Cookies.get('access_token');
    if (!accessToken) return;

    try {
      // Get team list to find team ID from slug
      const teamsResponse = await fetch(`${API_URL}/v1/teams`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!teamsResponse.ok) {
        throw new Error('Failed to fetch teams');
      }

      const teamsData = await teamsResponse.json();
      const teamInfo = teamsData.teams.find((t: { slug: string }) => t.slug === slug);

      if (!teamInfo) {
        throw new Error('Team not found');
      }

      // Get full team details
      const teamResponse = await fetch(`${API_URL}/v1/teams/${teamInfo.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!teamResponse.ok) {
        throw new Error('Failed to fetch team details');
      }

      const teamData = await teamResponse.json();
      setTeam({
        id: teamInfo.id,
        name: teamData.team.name,
        slug: teamData.team.slug,
        memberCount: teamData.team.memberCount,
        subscription: teamData.team.subscription,
      });
      setUserRole(teamData.userRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [slug]);

  const handleUpgrade = async (tier: string) => {
    if (!team) return;
    setIsUpgrading(true);
    const accessToken = Cookies.get('access_token');

    try {
      const response = await fetch(`${API_URL}/v1/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tier,
          teamId: team.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create checkout session');
      }

      const data = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!team) return;
    const accessToken = Cookies.get('access_token');

    try {
      const response = await fetch(`${API_URL}/v1/subscriptions/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teamId: team.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Team not found</h2>
        <Link href="/teams">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          Only team admins can manage billing.
        </p>
        <Link href={`/teams/${slug}`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
      </div>
    );
  }

  const currentPlan = team.subscription?.tier || 'free';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/teams/${slug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Team Billing</h1>
          <p className="text-muted-foreground">{team.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">{currentPlan} Plan</p>
              <p className="text-muted-foreground">
                {team.memberCount} members
                {team.subscription && ` of ${team.subscription.seats} seats`}
              </p>
              {team.subscription?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {team.subscription.cancelAtPeriodEnd
                    ? 'Cancels'
                    : 'Renews'}{' '}
                  {new Date(team.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {team.subscription && (
              <Button variant="outline" onClick={handleManageSubscription}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {TEAM_PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.tier;
            const canUpgrade = !isCurrentPlan && plan.tier !== 'enterprise';

            return (
              <Card
                key={plan.tier}
                className={`relative ${
                  plan.popular ? 'border-primary shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {plan.price !== null ? (
                      <>
                        <span className="text-3xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          + ${plan.pricePerSeat}/seat/month after {plan.baseSeats} seats
                        </p>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">Custom</span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Processing...' : `Upgrade to ${plan.name}`}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() =>
                        (window.location.href = 'mailto:sales@loaskills.dev')
                      }
                    >
                      Contact Sales
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seat Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seat Usage
          </CardTitle>
          <CardDescription>
            Manage team seats and member access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Usage</p>
                <p className="text-sm text-muted-foreground">
                  {team.memberCount} of{' '}
                  {team.subscription?.seats || 5} seats used
                </p>
              </div>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      (team.memberCount / (team.subscription?.seats || 5)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {team.subscription && (
              <p className="text-sm text-muted-foreground">
                Need more seats? Upgrade your plan or contact us for custom
                pricing.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
