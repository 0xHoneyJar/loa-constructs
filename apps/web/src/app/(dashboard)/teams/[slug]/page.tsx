/**
 * Team Detail Page
 * @see sprint.md T9.5: Team Dashboard Pages
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Settings,
  Mail,
  Crown,
  Shield,
  UserMinus,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import Cookies from 'js-cookie';

interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  avatarUrl: string | null;
  members: TeamMember[];
  memberCount: number;
  subscription: {
    tier: string;
    status: string;
    seats: number;
  } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TeamDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);

  const slug = params.slug as string;

  const fetchTeamData = async () => {
    const accessToken = Cookies.get('access_token');
    if (!accessToken) return;

    try {
      // First, get team list to find team ID from slug
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
      setTeam(teamData.team);
      setUserRole(teamData.userRole);

      // If admin, fetch invitations
      if (teamData.userRole === 'owner' || teamData.userRole === 'admin') {
        const invitationsResponse = await fetch(
          `${API_URL}/v1/teams/${teamInfo.id}/invitations`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          setInvitations(invitationsData.invitations);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [slug]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !team) return;

    setIsInviting(true);
    const accessToken = Cookies.get('access_token');

    try {
      const response = await fetch(`${API_URL}/v1/teams/${team.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send invitation');
      }

      const data = await response.json();
      setInvitations([...invitations, data.invitation]);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!team) return;
    const accessToken = Cookies.get('access_token');

    try {
      const response = await fetch(
        `${API_URL}/v1/teams/${team.id}/invitations/${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke invitation');
      }

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team || !confirm('Are you sure you want to remove this member?')) return;
    const accessToken = Cookies.get('access_token');

    try {
      const response = await fetch(`${API_URL}/v1/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      setTeam({
        ...team,
        members: team.members.filter((m) => m.userId !== memberId),
        memberCount: team.memberCount - 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { icon: React.ReactNode; className: string }> = {
      owner: {
        icon: <Crown className="h-3 w-3" />,
        className: 'bg-amber-100 text-amber-800',
      },
      admin: {
        icon: <Shield className="h-3 w-3" />,
        className: 'bg-blue-100 text-blue-800',
      },
      member: {
        icon: <Users className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-800',
      },
    };
    return badges[role] || badges.member;
  };

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Team not found</h2>
        <p className="text-muted-foreground mb-4">
          The team you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/teams">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {team.name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-muted-foreground">/{team.slug}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href={`/teams/${slug}/billing`}>
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </Button>
            </Link>
            <Link href={`/teams/${slug}/settings`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{team.subscription.tier} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {team.memberCount} of {team.subscription.seats} seats used
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  team.subscription.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {team.subscription.status}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  {team.memberCount} of 5 seats used
                </p>
              </div>
              <Link href={`/teams/${slug}/billing`}>
                <Button size="sm">Upgrade</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({team.memberCount})
            </CardTitle>
            <CardDescription>People who have access to this team</CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInviteForm(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showInviteForm && (
            <form onSubmit={handleInvite} className="mb-6 p-4 border rounded-md bg-muted/50">
              <h4 className="font-medium mb-3">Invite a new member</h4>
              <div className="flex gap-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 px-3 py-2 border rounded-md"
                  autoFocus
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting ? 'Sending...' : 'Send Invite'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Pending Invitations */}
          {isAdmin && invitations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Pending Invitations
              </h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-yellow-50"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Invited as {invitation.role}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member List */}
          <div className="space-y-2">
            {team.members.map((member) => {
              const badge = getRoleBadge(member.role);
              const isCurrentUser = member.userId === user?.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium text-primary">
                        {member.user.name?.[0]?.toUpperCase() ||
                          member.user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.user.name || member.user.email}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
                        >
                          {badge.icon}
                          {member.role}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  {isAdmin && !isCurrentUser && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
