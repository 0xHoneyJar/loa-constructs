/**
 * Team Service
 * @see sprint.md T9.1-T9.4: Team Management
 * @see sdd.md §3.2 Entity: Teams, Team Members
 */

import { db, teams, teamMembers, subscriptions, users } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { invalidateTierCache } from './subscription.js';

// --- Types ---

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  avatarUrl: string | null;
  stripeCustomerId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date | null;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
  memberCount: number;
  subscription?: {
    tier: string;
    status: string;
    seats: number | null;
  } | null;
}

// --- Helper Functions ---

/**
 * Generate URL-safe slug from team name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Ensure slug is unique by appending random suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;

  for (;;) {
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// --- Core Functions ---

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string;
  ownerId: string;
  avatarUrl?: string;
}): Promise<Team> {
  const baseSlug = generateSlug(data.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const [team] = await db
    .insert(teams)
    .values({
      name: data.name,
      slug,
      ownerId: data.ownerId,
      avatarUrl: data.avatarUrl ?? null,
    })
    .returning();

  // Add owner as team member with 'owner' role
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: data.ownerId,
    role: 'owner',
    invitedBy: data.ownerId,
    joinedAt: new Date(),
  });

  logger.info({ teamId: team.id, ownerId: data.ownerId }, 'Team created');

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    ownerId: team.ownerId,
    avatarUrl: team.avatarUrl,
    stripeCustomerId: team.stripeCustomerId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (result.length === 0) return null;

  const team = result[0];
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    ownerId: team.ownerId,
    avatarUrl: team.avatarUrl,
    stripeCustomerId: team.stripeCustomerId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/**
 * Get team by slug
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);

  if (result.length === 0) return null;

  const team = result[0];
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    ownerId: team.ownerId,
    avatarUrl: team.avatarUrl,
    stripeCustomerId: team.stripeCustomerId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/**
 * Get team with members and subscription info
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
  const team = await getTeamById(teamId);
  if (!team) return null;

  // Get team members with user info
  const members = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      invitedBy: teamMembers.invitedBy,
      invitedAt: teamMembers.invitedAt,
      joinedAt: teamMembers.joinedAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  // Get team subscription
  const teamSub = await db
    .select({
      tier: subscriptions.tier,
      status: subscriptions.status,
      seats: subscriptions.seats,
    })
    .from(subscriptions)
    .where(eq(subscriptions.teamId, teamId))
    .limit(1);

  return {
    ...team,
    members: members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      role: m.role as TeamRole,
      invitedBy: m.invitedBy,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    memberCount: members.length,
    subscription: teamSub.length > 0 ? teamSub[0] : null,
  };
}

/**
 * Get all teams for a user (as member or owner)
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  if (memberships.length === 0) return [];

  const teamIds = memberships.map((m) => m.teamId);

  const result = await Promise.all(teamIds.map((id) => getTeamById(id)));

  return result.filter((team): team is Team => team !== null);
}

/**
 * Update team details
 */
export async function updateTeam(
  teamId: string,
  data: {
    name?: string;
    avatarUrl?: string;
  }
): Promise<Team | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name) {
    updateData.name = data.name;
    // Generate new slug if name changes
    const baseSlug = generateSlug(data.name);
    updateData.slug = await ensureUniqueSlug(baseSlug);
  }

  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
  }

  const [team] = await db
    .update(teams)
    .set(updateData)
    .where(eq(teams.id, teamId))
    .returning();

  if (!team) return null;

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    ownerId: team.ownerId,
    avatarUrl: team.avatarUrl,
    stripeCustomerId: team.stripeCustomerId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/**
 * Delete a team (cascades to members via DB constraint)
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  // Get all team members before deletion (for cache invalidation)
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const result = await db.delete(teams).where(eq(teams.id, teamId)).returning();

  if (result.length > 0) {
    // Invalidate tier cache for all former members
    for (const member of members) {
      await invalidateTierCache(member.userId);
    }
    logger.info({ teamId }, 'Team deleted');
    return true;
  }

  return false;
}

// --- Member Management ---

/**
 * Get user's role in a team
 */
export async function getUserRoleInTeam(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const result = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (result.length === 0) return null;

  return result[0].role as TeamRole;
}

/**
 * Check if user is team admin (owner or admin role)
 */
export async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const role = await getUserRoleInTeam(teamId, userId);
  return role === 'owner' || role === 'admin';
}

/**
 * Check if user is team owner
 */
export async function isTeamOwner(teamId: string, userId: string): Promise<boolean> {
  const role = await getUserRoleInTeam(teamId, userId);
  return role === 'owner';
}

/**
 * Add member to team
 */
export async function addTeamMember(data: {
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string;
}): Promise<TeamMember> {
  const [member] = await db
    .insert(teamMembers)
    .values({
      teamId: data.teamId,
      userId: data.userId,
      role: data.role,
      invitedBy: data.invitedBy,
      joinedAt: new Date(),
    })
    .returning();

  // Invalidate tier cache for new member
  await invalidateTierCache(data.userId);

  logger.info(
    { teamId: data.teamId, userId: data.userId, role: data.role },
    'Team member added'
  );

  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role as TeamRole,
    invitedBy: member.invitedBy,
    invitedAt: member.invitedAt,
    joinedAt: member.joinedAt,
  };
}

/**
 * Update member role
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<TeamMember | null> {
  const [member] = await db
    .update(teamMembers)
    .set({ role: newRole })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();

  if (!member) return null;

  logger.info({ teamId, userId, newRole }, 'Team member role updated');

  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role as TeamRole,
    invitedBy: member.invitedBy,
    invitedAt: member.invitedAt,
    joinedAt: member.joinedAt,
  };
}

/**
 * Remove member from team
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();

  if (result.length > 0) {
    // Invalidate tier cache for removed member
    await invalidateTierCache(userId);
    logger.info({ teamId, userId }, 'Team member removed');
    return true;
  }

  return false;
}

/**
 * Count team members (for seat validation)
 */
export async function countTeamMembers(teamId: string): Promise<number> {
  const members = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  return members.length;
}

/**
 * Check if team has available seats
 */
export async function hasAvailableSeats(teamId: string): Promise<boolean> {
  const memberCount = await countTeamMembers(teamId);

  // Get team subscription
  const teamSub = await db
    .select({ seats: subscriptions.seats })
    .from(subscriptions)
    .where(eq(subscriptions.teamId, teamId))
    .limit(1);

  if (teamSub.length === 0) {
    // No subscription, default to 5 seats for free tier
    return memberCount < 5;
  }

  const maxSeats = teamSub[0].seats ?? 5;
  return memberCount < maxSeats;
}

/**
 * Transfer team ownership to another member
 */
export async function transferOwnership(
  teamId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<boolean> {
  // Verify new owner is a team member
  const newOwnerMembership = await getUserRoleInTeam(teamId, newOwnerId);
  if (!newOwnerMembership) {
    return false;
  }

  // Update team owner
  await db
    .update(teams)
    .set({ ownerId: newOwnerId, updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  // Update roles
  await db
    .update(teamMembers)
    .set({ role: 'admin' })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, currentOwnerId)));

  await db
    .update(teamMembers)
    .set({ role: 'owner' })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerId)));

  logger.info(
    { teamId, currentOwnerId, newOwnerId },
    'Team ownership transferred'
  );

  return true;
}
