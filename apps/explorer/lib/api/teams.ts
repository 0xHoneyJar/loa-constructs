import { getAuthClient } from '@/components/auth/auth-initializer';

// --- Types ---

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
  invitations: TeamInvitation[];
  subscription: {
    tier: string;
    seats: number;
    usedSeats: number;
    status: string;
  } | null;
}

// --- API Functions ---

export async function fetchTeams(): Promise<Team[]> {
  const client = getAuthClient();
  const data = await client.get<{ teams: Team[] }>('/teams');
  return data.teams ?? [];
}

export async function fetchTeam(teamId: string): Promise<TeamDetail> {
  const client = getAuthClient();
  const data = await client.get<{ team: TeamDetail }>(`/teams/${teamId}`);
  return data.team;
}

export async function createTeam(name: string): Promise<Team> {
  const client = getAuthClient();
  const data = await client.post<{ team: Team }>('/teams', { name });
  return data.team;
}

export async function inviteTeamMember(teamId: string, email: string, role: string): Promise<void> {
  const client = getAuthClient();
  await client.post(`/teams/${teamId}/invitations`, { email, role });
}

export async function revokeInvitation(teamId: string, invitationId: string): Promise<void> {
  const client = getAuthClient();
  await client.delete(`/teams/${teamId}/invitations/${invitationId}`);
}

export async function removeMember(teamId: string, memberId: string): Promise<void> {
  const client = getAuthClient();
  await client.delete(`/teams/${teamId}/members/${memberId}`);
}
