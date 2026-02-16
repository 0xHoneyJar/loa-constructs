'use client';

import { use } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { useTeam } from '@/lib/api/hooks';

export default function TeamBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: teamId } = use(params);
  const { data: team, isLoading } = useTeam(teamId);

  if (isLoading) {
    return <p className="text-sm font-mono text-tui-dim">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teams/${teamId}`} className="text-xs font-mono text-tui-dim hover:text-tui-fg">
          ← Back to team
        </Link>
        <div>
          <h1 className="text-lg font-mono text-tui-bright">Team Billing</h1>
          <p className="text-xs font-mono text-tui-dim mt-1">{team?.name ?? 'Team'}</p>
        </div>
      </div>

      <Panel title="Current Plan">
        <div className="space-y-3">
          {team?.subscription ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xl font-mono text-tui-accent uppercase">
                  {team.subscription.tier}
                </span>
                <span className={`border px-2 py-0.5 text-[10px] font-mono ${
                  team.subscription.status === 'active'
                    ? 'border-tui-green text-tui-green'
                    : 'border-tui-red text-tui-red'
                }`}>
                  {team.subscription.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs font-mono text-tui-dim space-y-1">
                <p>Seats: {team.subscription.usedSeats} / {team.subscription.seats}</p>
                <div className="w-full h-2 bg-tui-border/30">
                  <div
                    className="h-full bg-tui-accent"
                    style={{
                      width: `${(team.subscription.usedSeats / team.subscription.seats) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xl font-mono text-tui-green">FREE</span>
              <span className="border border-tui-green px-2 py-0.5 text-[10px] font-mono text-tui-green">
                ACTIVE
              </span>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Plans">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-tui-border p-4 space-y-2">
            <p className="text-sm font-mono text-tui-bright">Team</p>
            <p className="text-xs font-mono text-tui-dim">$10/seat/month</p>
            <ul className="text-xs font-mono text-tui-dim space-y-1">
              <li>· Up to 20 seats</li>
              <li>· Team constructs</li>
              <li>· Priority support</li>
            </ul>
          </div>
          <div className="border border-tui-border p-4 space-y-2">
            <p className="text-sm font-mono text-tui-bright">Enterprise</p>
            <p className="text-xs font-mono text-tui-dim">Contact sales</p>
            <ul className="text-xs font-mono text-tui-dim space-y-1">
              <li>· Unlimited seats</li>
              <li>· Private registry</li>
              <li>· SSO + SAML</li>
              <li>· Dedicated support</li>
            </ul>
          </div>
        </div>
        <p className="text-xs font-mono text-tui-dim mt-4">
          Premium team tiers coming soon. Stay tuned for announcements.
        </p>
      </Panel>
    </div>
  );
}
