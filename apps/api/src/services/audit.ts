/**
 * Audit Log Service
 * @see sprint.md T11.2: Audit Logging
 * @see sdd.md §3.2 audit_logs table
 */

import { db, auditLogs } from '../db/index.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

// --- Types ---

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_change'
  | 'user.email_verified'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  | 'team.invitation_sent'
  | 'team.invitation_accepted'
  | 'team.invitation_revoked'
  | 'skill.installed'
  | 'skill.uninstalled'
  | 'skill.updated'
  | 'skill.created'
  | 'skill.deprecated'
  | 'skill.version_published'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.used'
  | 'admin.user_disabled'
  | 'admin.user_enabled'
  | 'admin.skill_featured'
  | 'admin.skill_removed'
  | 'admin.pack_approved'
  | 'admin.pack_rejected'
  | 'sso.login'
  | 'sso.config_updated';

export type ResourceType =
  | 'user'
  | 'team'
  | 'subscription'
  | 'skill'
  | 'pack'
  | 'api_key'
  | 'invitation'
  | 'sso_config';

export interface AuditLogEntry {
  userId?: string;
  teamId?: string;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  teamId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogQueryOptions {
  userId?: string;
  teamId?: string;
  action?: AuditAction | AuditAction[];
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// --- Audit Log Functions ---

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      teamId: entry.teamId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata ?? {},
    });

    logger.debug(
      {
        action: entry.action,
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
      },
      'Audit log created'
    );
  } catch (error) {
    // Audit logging should never break the main flow
    logger.error({ error, entry }, 'Failed to create audit log');
  }
}

/**
 * Query audit logs with filtering
 */
export async function queryAuditLogs(
  options: AuditLogQueryOptions = {}
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const { userId, teamId, action, resourceType, resourceId, startDate, endDate, limit = 50, offset = 0 } = options;

  const conditions = [];

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (teamId) {
    conditions.push(eq(auditLogs.teamId, teamId));
  }

  if (action) {
    if (Array.isArray(action)) {
      conditions.push(sql`${auditLogs.action} IN (${sql.join(action.map(a => sql`${a}`), sql`, `)})`);
    } else {
      conditions.push(eq(auditLogs.action, action));
    }
  }

  if (resourceType) {
    conditions.push(eq(auditLogs.resourceType, resourceType));
  }

  if (resourceId) {
    conditions.push(eq(auditLogs.resourceId, resourceId));
  }

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  // Get logs with pagination
  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      teamId: log.teamId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
      createdAt: log.createdAt ?? new Date(),
    })),
    total,
  };
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number; startDate?: Date; endDate?: Date } = {}
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  return queryAuditLogs({ userId, ...options });
}

/**
 * Get audit logs for a specific team
 */
export async function getTeamAuditLogs(
  teamId: string,
  options: { limit?: number; offset?: number; startDate?: Date; endDate?: Date } = {}
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  return queryAuditLogs({ teamId, ...options });
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: ResourceType,
  resourceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  return queryAuditLogs({ resourceType, resourceId, ...options });
}

// --- Helper Functions for Common Audit Events ---

/**
 * Log user authentication event
 */
export async function logAuthEvent(
  action: 'user.login' | 'user.logout' | 'user.register' | 'sso.login',
  userId: string,
  context: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    resourceType: 'user',
    resourceId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log user account event (password change, email verification)
 */
export async function logUserAccountEvent(
  action: 'user.password_change' | 'user.email_verified',
  userId: string,
  context: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    resourceType: 'user',
    resourceId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log team event
 */
export async function logTeamEvent(
  action: 'team.created' | 'team.updated' | 'team.deleted',
  context: {
    userId: string;
    teamId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    teamId: context.teamId,
    action,
    resourceType: 'team',
    resourceId: context.teamId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log team invitation event
 */
export async function logInvitationEvent(
  action: 'team.invitation_sent' | 'team.invitation_accepted' | 'team.invitation_revoked',
  context: {
    userId: string;
    teamId: string;
    invitationId?: string;
    targetEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    teamId: context.teamId,
    action,
    resourceType: 'invitation',
    resourceId: context.invitationId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      targetEmail: context.targetEmail,
      ...context.metadata,
    },
  });
}

/**
 * Log subscription event
 */
export async function logSubscriptionEvent(
  action: 'subscription.created' | 'subscription.updated' | 'subscription.canceled',
  context: {
    userId?: string;
    teamId?: string;
    subscriptionId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    teamId: context.teamId,
    action,
    resourceType: 'subscription',
    resourceId: context.subscriptionId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log team member event
 */
export async function logTeamMemberEvent(
  action: 'team.member_added' | 'team.member_removed' | 'team.member_role_changed',
  context: {
    userId: string;
    teamId: string;
    targetUserId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    teamId: context.teamId,
    action,
    resourceType: 'team',
    resourceId: context.teamId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      targetUserId: context.targetUserId,
      ...context.metadata,
    },
  });
}

/**
 * Log skill usage event
 */
export async function logSkillEvent(
  action: 'skill.installed' | 'skill.uninstalled' | 'skill.updated',
  context: {
    userId: string;
    skillId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    action,
    resourceType: 'skill',
    resourceId: context.skillId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log API key event
 */
export async function logApiKeyEvent(
  action: 'api_key.created' | 'api_key.revoked' | 'api_key.used',
  context: {
    userId: string;
    apiKeyId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    action,
    resourceType: 'api_key',
    resourceId: context.apiKeyId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: 'admin.user_disabled' | 'admin.user_enabled' | 'admin.skill_featured' | 'admin.skill_removed',
  context: {
    adminUserId: string;
    resourceType: ResourceType;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog({
    userId: context.adminUserId,
    action,
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: context.metadata,
  });
}
