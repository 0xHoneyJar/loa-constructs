'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { useTeam, useInviteTeamMember } from '@/lib/api/hooks';
import { removeMember, revokeInvitation } from '@/lib/api/teams';
import { useQueryClient } from '@tanstack/react-query';

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

const roleBadge: Record<string, { label: string; color: string }> = {
  owner: { label: 'OWNER', color: 'text-graduation-beta' },
  admin: { label: 'ADMIN', color: 'text-cyan-base' },
  member: { label: 'MEMBER', color: 'text-bone-muted' },
};

export default function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: teamId } = use(params);
  const { data: team, isLoading } = useTeam(teamId);
  const inviteMember = useInviteTeamMember();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const onInvite = async (data: InviteFormData) => {
    await inviteMember.mutateAsync({ teamId, email: data.email, role: data.role });
    reset();
    setShowInvite(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    await removeMember(teamId, memberId);
    queryClient.invalidateQueries({ queryKey: ['team', teamId] });
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    await revokeInvitation(teamId, invitationId);
    queryClient.invalidateQueries({ queryKey: ['team', teamId] });
  };

  if (isLoading) {
    return <p className="text-sm font-mono text-bone-muted">Loading team...</p>;
  }

  if (!team) {
    return (
      <Panel title="Not Found" variant="danger">
        <p className="text-xs font-mono text-crimson-base">Team not found.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teams" className="text-xs font-mono text-bone-muted hover:text-bone-base">
            ← Back
          </Link>
          <div>
            <h1 className="text-lg font-mono text-bone-bright">{team.name}</h1>
            <p className="text-xs font-mono text-bone-muted mt-1">/{team.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/teams/${teamId}/billing`}>
            <Button variant="secondary">Billing</Button>
          </Link>
          <Button onClick={() => setShowInvite(!showInvite)}>
            {showInvite ? 'Cancel' : '+ Invite'}
          </Button>
        </div>
      </div>

      {/* Subscription */}
      {team.subscription && (
        <Panel title="Subscription">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-cyan-base uppercase">{team.subscription.tier}</span>
              <span className="text-bone-muted">·</span>
              <span className="text-bone-base">
                {team.subscription.usedSeats}/{team.subscription.seats} seats
              </span>
            </div>
            <span className={team.subscription.status === 'active' ? 'text-cyan-base' : 'text-crimson-base'}>
              {team.subscription.status.toUpperCase()}
            </span>
          </div>
        </Panel>
      )}

      {/* Invite Form */}
      {showInvite && (
        <Panel title="Invite Member">
          <form onSubmit={handleSubmit(onInvite)} className="flex gap-3 items-end">
            <div className="flex-1">
              <FormInput
                label="Email"
                type="email"
                placeholder="user@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-bone-muted mb-1">Role</label>
              <select
                className="bg-transparent border border-void-border px-3 py-2 text-sm font-mono text-bone-base focus:outline-none focus:border-cyan-base"
                {...register('role')}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending ? 'Inviting...' : 'Invite'}
            </Button>
          </form>
          {inviteMember.isError && (
            <p className="text-xs font-mono text-crimson-base mt-2">
              {inviteMember.error?.message || 'Failed to invite.'}
            </p>
          )}
        </Panel>
      )}

      {/* Pending Invitations */}
      {team.invitations?.filter((i) => i.status === 'pending').length > 0 && (
        <Panel title="Pending Invitations">
          <div className="space-y-2">
            {team.invitations
              .filter((i) => i.status === 'pending')
              .map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border border-void-border px-3 py-2 text-xs font-mono"
                >
                  <div>
                    <span className="text-bone-base">{inv.email}</span>
                    <span className="text-bone-muted ml-2">({inv.role})</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-crimson-base hover:bg-crimson-base/10 text-[10px] px-2 py-1 h-auto"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
          </div>
        </Panel>
      )}

      {/* Members */}
      <Panel title={`Members (${team.members?.length ?? 0})`}>
        {!team.members?.length ? (
          <p className="text-xs font-mono text-bone-muted">No members.</p>
        ) : (
          <div className="space-y-2">
            {team.members.map((member) => {
              const badge = roleBadge[member.role] ?? roleBadge.member;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between border border-void-border px-3 py-2"
                >
                  <div className="text-xs font-mono">
                    <span className="text-bone-base">{member.name}</span>
                    <span className="text-bone-muted ml-2">{member.email}</span>
                    <span className={`ml-2 text-[10px] ${badge.color}`}>[{badge.label}]</span>
                  </div>
                  {member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-crimson-base hover:bg-crimson-base/10 text-[10px] px-2 py-1 h-auto"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
