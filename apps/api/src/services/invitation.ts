/**
 * Team Invitation Service
 * @see sprint.md T9.3: Invitation Flow
 * @see sdd.md §3.2 UC-3: Manage Team Seats
 */

import { randomBytes } from 'crypto';
import { db, users, teamInvitations } from '../db/index.js';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { sendEmail } from './email.js';
import { addTeamMember, getTeamById, hasAvailableSeats, type TeamRole } from './team.js';
import { env } from '../config/env.js';

// --- Types ---

export interface Invitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date | null;
  acceptedAt: Date | null;
}

export interface InvitationWithTeam extends Invitation {
  team: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    name: string;
    email: string;
  };
}

// --- Constants ---

const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_TOKEN_LENGTH = 32;

// --- Helper Functions ---

/**
 * Generate secure invitation token
 */
function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_LENGTH).toString('hex');
}

/**
 * Calculate invitation expiry date
 */
function getExpiryDate(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + INVITATION_EXPIRY_DAYS);
  return expiry;
}

// --- Email Templates ---

/**
 * Generate team invitation email HTML
 */
function generateInvitationEmail(
  inviterName: string,
  teamName: string,
  inviteUrl: string,
  role: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Skills Registry</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">You've Been Invited!</h2>

    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(teamName)}</strong> as a <strong>${escapeHtml(role)}</strong>.</p>

    <p>As a team member, you'll have access to all the skills and features included in the team's subscription.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(inviteUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This invitation expires in ${INVITATION_EXPIRY_DAYS} days. If you don't have a Loa Skills Registry account, you'll be able to create one when you accept.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${escapeHtml(inviteUrl)}" style="color: #667eea; word-break: break-all;">${escapeHtml(inviteUrl)}</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

// --- Core Functions ---

/**
 * Create a team invitation
 */
export async function createInvitation(data: {
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
}): Promise<Invitation> {
  const token = generateInvitationToken();
  const expiresAt = getExpiryDate();

  const [invitation] = await db
    .insert(teamInvitations)
    .values({
      teamId: data.teamId,
      email: data.email.toLowerCase(),
      role: data.role,
      token,
      invitedBy: data.invitedBy,
      expiresAt,
      status: 'pending',
    })
    .returning();

  logger.info(
    { teamId: data.teamId, email: data.email, role: data.role },
    'Team invitation created'
  );

  return {
    id: invitation.id,
    teamId: invitation.teamId,
    email: invitation.email,
    role: invitation.role as TeamRole,
    token: invitation.token,
    status: invitation.status as Invitation['status'],
    invitedBy: invitation.invitedBy,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
  };
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  invitation: Invitation,
  teamName: string,
  inviterName: string
): Promise<boolean> {
  const baseUrl =
    env.NODE_ENV === 'production'
      ? 'https://loaskills.dev'
      : 'http://localhost:3001';

  const inviteUrl = `${baseUrl}/teams/invite/${invitation.token}`;

  const result = await sendEmail({
    to: invitation.email,
    subject: `You've been invited to join ${teamName} on Loa Skills Registry`,
    html: generateInvitationEmail(inviterName, teamName, inviteUrl, invitation.role),
    text: `${inviterName} has invited you to join ${teamName} as a ${invitation.role}. Accept the invitation: ${inviteUrl}`,
  });

  return result.success;
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const result = await db
    .select()
    .from(teamInvitations)
    .where(eq(teamInvitations.token, token))
    .limit(1);

  if (result.length === 0) return null;

  const invitation = result[0];
  return {
    id: invitation.id,
    teamId: invitation.teamId,
    email: invitation.email,
    role: invitation.role as TeamRole,
    token: invitation.token,
    status: invitation.status as Invitation['status'],
    invitedBy: invitation.invitedBy,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
  };
}

/**
 * Get invitation with team and inviter details
 */
export async function getInvitationWithDetails(
  token: string
): Promise<InvitationWithTeam | null> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) return null;

  const team = await getTeamById(invitation.teamId);
  if (!team) return null;

  // Get inviter info
  const inviterResult = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, invitation.invitedBy))
    .limit(1);

  return {
    ...invitation,
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
    },
    inviter: inviterResult.length > 0 ? inviterResult[0] : undefined,
  };
}

/**
 * Get pending invitations for a team
 */
export async function getTeamPendingInvitations(teamId: string): Promise<Invitation[]> {
  const result = await db
    .select()
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        eq(teamInvitations.status, 'pending')
      )
    );

  return result.map((invitation) => ({
    id: invitation.id,
    teamId: invitation.teamId,
    email: invitation.email,
    role: invitation.role as TeamRole,
    token: invitation.token,
    status: invitation.status as Invitation['status'],
    invitedBy: invitation.invitedBy,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
  }));
}

/**
 * Accept invitation
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; teamId?: string; error?: string }> {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Invitation is no longer valid' };
  }

  if (new Date() > invitation.expiresAt) {
    // Mark as expired
    await db
      .update(teamInvitations)
      .set({ status: 'expired' })
      .where(eq(teamInvitations.id, invitation.id));

    return { success: false, error: 'Invitation has expired' };
  }

  // Check if team has available seats
  const seatsAvailable = await hasAvailableSeats(invitation.teamId);
  if (!seatsAvailable) {
    return { success: false, error: 'Team has no available seats' };
  }

  // Verify user email matches invitation email
  const userResult = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    return { success: false, error: 'User not found' };
  }

  if (userResult[0].email.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      success: false,
      error: 'This invitation was sent to a different email address',
    };
  }

  // Add user to team
  await addTeamMember({
    teamId: invitation.teamId,
    userId,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
  });

  // Mark invitation as accepted
  await db
    .update(teamInvitations)
    .set({ status: 'accepted', acceptedAt: new Date() })
    .where(eq(teamInvitations.id, invitation.id));

  logger.info(
    { teamId: invitation.teamId, userId, invitationId: invitation.id },
    'Invitation accepted'
  );

  return { success: true, teamId: invitation.teamId };
}

/**
 * Revoke invitation
 */
export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const result = await db
    .update(teamInvitations)
    .set({ status: 'revoked' })
    .where(eq(teamInvitations.id, invitationId))
    .returning();

  if (result.length > 0) {
    logger.info({ invitationId }, 'Invitation revoked');
    return true;
  }

  return false;
}

/**
 * Clean up expired invitations
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await db
    .update(teamInvitations)
    .set({ status: 'expired' })
    .where(
      and(
        eq(teamInvitations.status, 'pending'),
        lt(teamInvitations.expiresAt, new Date())
      )
    )
    .returning();

  if (result.length > 0) {
    logger.info({ count: result.length }, 'Expired invitations cleaned up');
  }

  return result.length;
}

/**
 * Check if email has pending invitation to team
 */
export async function hasPendingInvitation(
  teamId: string,
  email: string
): Promise<boolean> {
  const result = await db
    .select({ id: teamInvitations.id })
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        eq(teamInvitations.email, email.toLowerCase()),
        eq(teamInvitations.status, 'pending')
      )
    )
    .limit(1);

  return result.length > 0;
}
