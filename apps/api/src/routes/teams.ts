/**
 * Team Routes
 * @see sprint.md T9.1-T9.4: Team Management API
 * @see sdd.md §5.3 Team Endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import {
  createTeam,
  getTeamById,
  getTeamWithMembers,
  getUserTeams,
  updateTeam,
  deleteTeam,
  getUserRoleInTeam,
  isTeamAdmin,
  isTeamOwner,
  updateTeamMemberRole,
  removeTeamMember,
  hasAvailableSeats,
  transferOwnership,
  type TeamRole,
} from '../services/team.js';
import {
  createInvitation,
  sendInvitationEmail,
  getInvitationWithDetails,
  getTeamPendingInvitations,
  acceptInvitation,
  revokeInvitation,
  hasPendingInvitation,
} from '../services/invitation.js';
import {
  logTeamEvent,
  logTeamMemberEvent,
  logInvitationEvent,
} from '../services/audit.js';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';

// --- Schemas ---

const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters'),
  avatarUrl: z.string().url().optional(),
});

const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .optional(),
  avatarUrl: z.string().url().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
});

// --- Routes ---

const teamsRouter = new Hono();

// Apply auth middleware to all routes
teamsRouter.use('*', requireAuth());

/**
 * GET /v1/teams
 * List all teams the current user is a member of
 */
teamsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  const teams = await getUserTeams(userId);

  logger.info({ userId, teamCount: teams.length, requestId }, 'Listed user teams');

  return c.json({
    teams,
  });
});

/**
 * POST /v1/teams
 * Create a new team
 */
teamsRouter.post('/', zValidator('json', createTeamSchema), async (c) => {
  const { name, avatarUrl } = c.req.valid('json');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  const team = await createTeam({
    name,
    ownerId: userId,
    avatarUrl,
  });

  // Audit log
  await logTeamEvent('team.created', {
    userId,
    teamId: team.id,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    metadata: { name },
  });

  logger.info({ teamId: team.id, userId, requestId }, 'Team created');

  return c.json({ team }, 201);
});

/**
 * GET /v1/teams/:teamId
 * Get team details with members
 */
teamsRouter.get('/:teamId', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Check if user is a team member
  const role = await getUserRoleInTeam(teamId, userId);
  if (!role) {
    throw Errors.NotFound('Team');
  }

  const team = await getTeamWithMembers(teamId);
  if (!team) {
    throw Errors.NotFound('Team');
  }

  logger.info({ teamId, userId, requestId }, 'Team details fetched');

  return c.json({ team, userRole: role });
});

/**
 * PATCH /v1/teams/:teamId
 * Update team details (admin/owner only)
 */
teamsRouter.patch('/:teamId', zValidator('json', updateTeamSchema), async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const data = c.req.valid('json');

  // Check if user is admin
  const isAdmin = await isTeamAdmin(teamId, userId);
  if (!isAdmin) {
    throw Errors.Forbidden('Only team admins can update team details');
  }

  const team = await updateTeam(teamId, data);
  if (!team) {
    throw Errors.NotFound('Team');
  }

  // Audit log
  await logTeamEvent('team.updated', {
    userId,
    teamId,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    metadata: data,
  });

  logger.info({ teamId, userId, requestId }, 'Team updated');

  return c.json({ team });
});

/**
 * DELETE /v1/teams/:teamId
 * Delete a team (owner only)
 */
teamsRouter.delete('/:teamId', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Check if user is owner
  const isOwner = await isTeamOwner(teamId, userId);
  if (!isOwner) {
    throw Errors.Forbidden('Only the team owner can delete the team');
  }

  const deleted = await deleteTeam(teamId);
  if (!deleted) {
    throw Errors.NotFound('Team');
  }

  // Audit log
  await logTeamEvent('team.deleted', {
    userId,
    teamId,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  logger.info({ teamId, userId, requestId }, 'Team deleted');

  return c.json({ success: true });
});

// --- Member Management ---

/**
 * GET /v1/teams/:teamId/members
 * List team members
 */
teamsRouter.get('/:teamId/members', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');

  // Check if user is a team member
  const role = await getUserRoleInTeam(teamId, userId);
  if (!role) {
    throw Errors.NotFound('Team');
  }

  const team = await getTeamWithMembers(teamId);
  if (!team) {
    throw Errors.NotFound('Team');
  }

  return c.json({
    members: team.members,
    memberCount: team.memberCount,
    subscription: team.subscription,
  });
});

/**
 * POST /v1/teams/:teamId/invitations
 * Invite a new member to the team (admin/owner only)
 */
teamsRouter.post(
  '/:teamId/invitations',
  zValidator('json', inviteMemberSchema),
  async (c) => {
    const teamId = c.req.param('teamId');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { email, role } = c.req.valid('json');

    // Check if user is admin
    const isAdmin = await isTeamAdmin(teamId, userId);
    if (!isAdmin) {
      throw Errors.Forbidden('Only team admins can invite members');
    }

    // Check if team has available seats
    const seatsAvailable = await hasAvailableSeats(teamId);
    if (!seatsAvailable) {
      throw Errors.BadRequest('Team has no available seats. Please upgrade your subscription.');
    }

    // Check if email already has pending invitation
    const hasPending = await hasPendingInvitation(teamId, email);
    if (hasPending) {
      throw Errors.Conflict('An invitation has already been sent to this email');
    }

    // Check if user is already a member
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      const existingMember = await getUserRoleInTeam(teamId, existingUser[0].id);
      if (existingMember) {
        throw Errors.Conflict('This user is already a team member');
      }
    }

    // Create invitation
    const invitation = await createInvitation({
      teamId,
      email,
      role: role as TeamRole,
      invitedBy: userId,
    });

    // Get team and inviter details for email
    const team = await getTeamById(teamId);
    const inviter = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Send invitation email
    if (team && inviter.length > 0) {
      await sendInvitationEmail(invitation, team.name, inviter[0].name);
    }

    // Audit log
    await logInvitationEvent('team.invitation_sent', {
      userId,
      teamId,
      invitationId: invitation.id,
      targetEmail: email,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
      metadata: { role },
    });

    logger.info(
      { teamId, email, role, invitationId: invitation.id, requestId },
      'Team invitation sent'
    );

    return c.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      201
    );
  }
);

/**
 * GET /v1/teams/:teamId/invitations
 * List pending invitations (admin/owner only)
 */
teamsRouter.get('/:teamId/invitations', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');

  // Check if user is admin
  const isAdmin = await isTeamAdmin(teamId, userId);
  if (!isAdmin) {
    throw Errors.Forbidden('Only team admins can view invitations');
  }

  const invitations = await getTeamPendingInvitations(teamId);

  return c.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
  });
});

/**
 * DELETE /v1/teams/:teamId/invitations/:invitationId
 * Revoke a pending invitation (admin/owner only)
 */
teamsRouter.delete('/:teamId/invitations/:invitationId', async (c) => {
  const teamId = c.req.param('teamId');
  const invitationId = c.req.param('invitationId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Check if user is admin
  const isAdmin = await isTeamAdmin(teamId, userId);
  if (!isAdmin) {
    throw Errors.Forbidden('Only team admins can revoke invitations');
  }

  const revoked = await revokeInvitation(invitationId);
  if (!revoked) {
    throw Errors.NotFound('Invitation');
  }

  // Audit log
  await logInvitationEvent('team.invitation_revoked', {
    userId,
    teamId,
    invitationId,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  logger.info({ teamId, invitationId, userId, requestId }, 'Invitation revoked');

  return c.json({ success: true });
});

/**
 * PATCH /v1/teams/:teamId/members/:memberId
 * Update member role (admin/owner only)
 */
teamsRouter.patch(
  '/:teamId/members/:memberId',
  zValidator('json', updateMemberRoleSchema),
  async (c) => {
    const teamId = c.req.param('teamId');
    const memberId = c.req.param('memberId');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { role } = c.req.valid('json');

    // Check if user is admin
    const isAdmin = await isTeamAdmin(teamId, userId);
    if (!isAdmin) {
      throw Errors.Forbidden('Only team admins can update member roles');
    }

    // Cannot change owner role
    const targetRole = await getUserRoleInTeam(teamId, memberId);
    if (targetRole === 'owner') {
      throw Errors.Forbidden('Cannot change owner role. Use transfer ownership instead.');
    }

    // Cannot change own role
    if (memberId === userId) {
      throw Errors.Forbidden('Cannot change your own role');
    }

    const member = await updateTeamMemberRole(teamId, memberId, role as TeamRole);
    if (!member) {
      throw Errors.NotFound('Team member');
    }

    // Audit log
    await logTeamMemberEvent('team.member_role_changed', {
      userId,
      teamId,
      targetUserId: memberId,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
      metadata: { newRole: role },
    });

    logger.info({ teamId, memberId, newRole: role, requestId }, 'Member role updated');

    return c.json({ member });
  }
);

/**
 * DELETE /v1/teams/:teamId/members/:memberId
 * Remove a member from the team (admin/owner only, or self-removal)
 */
teamsRouter.delete('/:teamId/members/:memberId', async (c) => {
  const teamId = c.req.param('teamId');
  const memberId = c.req.param('memberId');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Allow self-removal or admin removal
  const isSelfRemoval = memberId === userId;
  const isAdmin = await isTeamAdmin(teamId, userId);

  if (!isSelfRemoval && !isAdmin) {
    throw Errors.Forbidden('Only team admins can remove members');
  }

  // Cannot remove owner
  const targetRole = await getUserRoleInTeam(teamId, memberId);
  if (targetRole === 'owner') {
    throw Errors.Forbidden('Cannot remove team owner. Transfer ownership first.');
  }

  const removed = await removeTeamMember(teamId, memberId);
  if (!removed) {
    throw Errors.NotFound('Team member');
  }

  // Audit log
  await logTeamMemberEvent('team.member_removed', {
    userId,
    teamId,
    targetUserId: memberId,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    metadata: { selfRemoval: isSelfRemoval },
  });

  logger.info(
    { teamId, memberId, removedBy: userId, selfRemoval: isSelfRemoval, requestId },
    'Team member removed'
  );

  return c.json({ success: true });
});

/**
 * POST /v1/teams/:teamId/transfer-ownership
 * Transfer team ownership to another member (owner only)
 */
teamsRouter.post(
  '/:teamId/transfer-ownership',
  zValidator('json', transferOwnershipSchema),
  async (c) => {
    const teamId = c.req.param('teamId');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const { newOwnerId } = c.req.valid('json');

    // Check if user is owner
    const isOwner = await isTeamOwner(teamId, userId);
    if (!isOwner) {
      throw Errors.Forbidden('Only the team owner can transfer ownership');
    }

    // Cannot transfer to self
    if (newOwnerId === userId) {
      throw Errors.BadRequest('Cannot transfer ownership to yourself');
    }

    const transferred = await transferOwnership(teamId, userId, newOwnerId);
    if (!transferred) {
      throw Errors.NotFound('New owner must be an existing team member');
    }

    logger.info({ teamId, oldOwner: userId, newOwner: newOwnerId, requestId }, 'Ownership transferred');

    return c.json({ success: true });
  }
);

// --- Invitation Accept (Public-ish endpoint) ---

/**
 * GET /v1/invitations/:token
 * Get invitation details by token
 */
teamsRouter.get('/invitations/:token', async (c) => {
  const token = c.req.param('token');

  const invitation = await getInvitationWithDetails(token);
  if (!invitation) {
    throw Errors.NotFound('Invitation');
  }

  // Don't expose sensitive details
  return c.json({
    invitation: {
      teamName: invitation.team.name,
      teamSlug: invitation.team.slug,
      role: invitation.role,
      inviterName: invitation.inviter?.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    },
  });
});

/**
 * POST /v1/invitations/:token/accept
 * Accept a team invitation
 */
teamsRouter.post('/invitations/:token/accept', async (c) => {
  const token = c.req.param('token');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  const result = await acceptInvitation(token, userId);

  if (!result.success) {
    throw Errors.BadRequest(result.error || 'Failed to accept invitation');
  }

  // Audit log for invitation acceptance
  if (result.teamId) {
    await logInvitationEvent('team.invitation_accepted', {
      userId,
      teamId: result.teamId,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });

    // Also log member added event
    await logTeamMemberEvent('team.member_added', {
      userId,
      teamId: result.teamId,
      targetUserId: userId,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
  }

  logger.info({ userId, teamId: result.teamId, requestId }, 'Invitation accepted');

  return c.json({
    success: true,
    teamId: result.teamId,
  });
});

export { teamsRouter };
