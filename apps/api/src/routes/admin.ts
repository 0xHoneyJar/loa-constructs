/**
 * Admin Routes
 * @see sprint-v2.md T15.5: Admin API
 * @see sdd-v2.md §5.2 Admin Endpoints
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { db, users, packs, subscriptions, skills, skillUsage, packInstallations, apiKeys, teams } from '../db/index.js';
import { eq, like, or, desc, count, sql, gte, and } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { createAuditLog } from '../services/audit.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';
import {
  updateSubmissionReview,
  updatePackStatus,
  getPendingSubmissions,
  getPackWithOwner,
} from '../services/submissions.js';
import {
  sendPackApprovedEmail,
  sendPackRejectedEmail,
} from '../services/email.js';
import {
  listPendingGraduationRequests,
  reviewGraduation,
} from '../services/graduation.js';

// --- Route Instance ---

export const adminRouter = new Hono();

// Apply middleware: auth first, then admin check, then rate limiting
adminRouter.use('*', requireAuth());
adminRouter.use('*', requireAdmin());
adminRouter.use('*', apiRateLimiter());

// --- Schemas ---

const listUsersSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

const updateUserSchema = z.object({
  is_banned: z.boolean().optional(),
  tier_override: z.enum(['free', 'pro', 'team', 'enterprise']).optional().nullable(),
});

const listPacksSchema = z.object({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'deprecated']).optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

const moderatePackSchema = z.object({
  status: z.enum(['published', 'rejected', 'deprecated']).optional(),
  is_featured: z.boolean().optional(),
  review_notes: z.string().max(2000).optional(),
});

const reviewPackSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  review_notes: z.string().min(1).max(2000),
  rejection_reason: z
    .enum([
      'quality_standards',
      'incomplete_content',
      'duplicate_functionality',
      'policy_violation',
      'security_concern',
      'other',
    ])
    .optional(),
});

// --- User Management Routes ---

/**
 * GET /v1/admin/users
 * List users with search
 */
adminRouter.get('/users', zValidator('query', listUsersSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const { q, page, per_page } = c.req.valid('query');

  const offset = (page - 1) * per_page;

  // Build conditions
  const conditions = [];
  if (q) {
    const searchTerm = `%${q}%`;
    conditions.push(
      or(
        like(users.email, searchTerm),
        like(users.name, searchTerm)
      )
    );
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(conditions.length > 0 ? conditions[0] : undefined);

  // Get users
  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar_url: users.avatarUrl,
      email_verified: users.emailVerified,
      is_admin: users.isAdmin,
      oauth_provider: users.oauthProvider,
      created_at: users.createdAt,
      updated_at: users.updatedAt,
    })
    .from(users)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(users.createdAt))
    .limit(per_page)
    .offset(offset);

  logger.info({ adminId, query: q, count: userList.length, requestId }, 'Admin listed users');

  return c.json({
    users: userList,
    pagination: {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    },
  });
});

/**
 * GET /v1/admin/users/:id
 * Get user details
 */
adminRouter.get('/users/:id', async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const userId = c.req.param('id');

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw Errors.BadRequest('Invalid user ID format');
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar_url: users.avatarUrl,
      email_verified: users.emailVerified,
      is_admin: users.isAdmin,
      oauth_provider: users.oauthProvider,
      stripe_customer_id: users.stripeCustomerId,
      created_at: users.createdAt,
      updated_at: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw Errors.NotFound('User not found');
  }

  // Get user's subscription
  const [subscription] = await db
    .select({
      id: subscriptions.id,
      tier: subscriptions.tier,
      status: subscriptions.status,
      current_period_end: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  logger.info({ adminId, targetUserId: userId, requestId }, 'Admin viewed user details');

  return c.json({
    user,
    subscription: subscription || null,
  });
});

/**
 * PATCH /v1/admin/users/:id
 * Update user (ban, tier override)
 */
adminRouter.patch('/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const targetUserId = c.req.param('id');
  const updates = c.req.valid('json');

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
    throw Errors.BadRequest('Invalid user ID format');
  }

  // Prevent self-modification
  if (targetUserId === adminId) {
    throw Errors.Forbidden('Cannot modify your own account');
  }

  // Check user exists
  const [existingUser] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, targetUserId));

  if (!existingUser) {
    throw Errors.NotFound('User not found');
  }

  // Handle tier override via subscription
  if (updates.tier_override !== undefined) {
    // Update or create subscription with admin override
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, targetUserId))
      .limit(1);

    if (updates.tier_override === null) {
      // Remove override - this would require tracking original tier
      // For now, revert to 'free'
      if (existingSub) {
        await db
          .update(subscriptions)
          .set({
            tier: 'free',
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{admin_override}', 'null')`,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSub.id));
      }
    } else {
      if (existingSub) {
        // SECURITY FIX (T27.4): Use parameterized JSON instead of sql.raw()
        // Even though tier_override is Zod-validated to enum values,
        // defense-in-depth requires parameterized queries
        await db
          .update(subscriptions)
          .set({
            tier: updates.tier_override,
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{admin_override}', to_jsonb(${updates.tier_override}::text))`,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existingSub.id));
      } else {
        await db.insert(subscriptions).values({
          userId: targetUserId,
          tier: updates.tier_override,
          status: 'active',
          metadata: { admin_override: updates.tier_override },
        });
      }
    }
  }

  // Log audit event
  await createAuditLog({
    userId: adminId,
    action: updates.is_banned ? 'admin.user_disabled' : 'admin.user_enabled',
    resourceType: 'user',
    resourceId: targetUserId,
    metadata: {
      updates,
      target_email: existingUser.email,
    },
  });

  logger.info({ adminId, targetUserId, updates, requestId }, 'Admin updated user');

  return c.json({
    success: true,
    message: 'User updated successfully',
  });
});

// --- Pack Management Routes ---

/**
 * GET /v1/admin/packs
 * List all packs
 */
adminRouter.get('/packs', zValidator('query', listPacksSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const { status, page, per_page } = c.req.valid('query');

  const offset = (page - 1) * per_page;

  // Build conditions
  const conditions = [];
  if (status) {
    conditions.push(eq(packs.status, status));
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(packs)
    .where(conditions.length > 0 ? conditions[0] : undefined);

  // Get packs
  const packList = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      description: packs.description,
      status: packs.status,
      is_featured: packs.isFeatured,
      tier_required: packs.tierRequired,
      pricing_type: packs.pricingType,
      downloads: packs.downloads,
      owner_id: packs.ownerId,
      owner_type: packs.ownerType,
      review_notes: packs.reviewNotes,
      reviewed_at: packs.reviewedAt,
      created_at: packs.createdAt,
      updated_at: packs.updatedAt,
    })
    .from(packs)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(packs.createdAt))
    .limit(per_page)
    .offset(offset);

  logger.info({ adminId, status, count: packList.length, requestId }, 'Admin listed packs');

  return c.json({
    packs: packList,
    pagination: {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    },
  });
});

/**
 * PATCH /v1/admin/packs/:id
 * Moderate pack (approve, reject, feature)
 */
adminRouter.patch('/packs/:id', zValidator('json', moderatePackSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const packId = c.req.param('id');
  const updates = c.req.valid('json');

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packId)) {
    throw Errors.BadRequest('Invalid pack ID format');
  }

  // Check pack exists
  const [existingPack] = await db
    .select({ id: packs.id, name: packs.name, slug: packs.slug })
    .from(packs)
    .where(eq(packs.id, packId));

  if (!existingPack) {
    throw Errors.NotFound('Pack not found');
  }

  // Build update values
  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) {
    updateValues.status = updates.status;
    updateValues.reviewedBy = adminId;
    updateValues.reviewedAt = new Date();
  }

  if (updates.is_featured !== undefined) {
    updateValues.isFeatured = updates.is_featured;
  }

  if (updates.review_notes !== undefined) {
    updateValues.reviewNotes = updates.review_notes;
  }

  // Update pack
  await db
    .update(packs)
    .set(updateValues)
    .where(eq(packs.id, packId));

  // Log audit event
  await createAuditLog({
    userId: adminId,
    action: updates.is_featured ? 'admin.skill_featured' : 'admin.skill_removed',
    resourceType: 'skill', // Packs are similar to skills for audit purposes
    resourceId: packId,
    metadata: {
      updates,
      pack_name: existingPack.name,
      pack_slug: existingPack.slug,
    },
  });

  logger.info({ adminId, packId, updates, requestId }, 'Admin moderated pack');

  return c.json({
    success: true,
    message: 'Pack updated successfully',
  });
});

/**
 * DELETE /v1/admin/packs/:id
 * Remove pack
 */
adminRouter.delete('/packs/:id', async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const packId = c.req.param('id');

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packId)) {
    throw Errors.BadRequest('Invalid pack ID format');
  }

  // Check pack exists
  const [existingPack] = await db
    .select({ id: packs.id, name: packs.name, slug: packs.slug })
    .from(packs)
    .where(eq(packs.id, packId));

  if (!existingPack) {
    throw Errors.NotFound('Pack not found');
  }

  // Soft delete - set status to deprecated
  // (Cascading deletes would remove version history which we want to preserve)
  await db
    .update(packs)
    .set({
      status: 'deprecated',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: 'Removed by admin',
      updatedAt: new Date(),
    })
    .where(eq(packs.id, packId));

  // Log audit event
  await createAuditLog({
    userId: adminId,
    action: 'admin.skill_removed',
    resourceType: 'skill',
    resourceId: packId,
    metadata: {
      pack_name: existingPack.name,
      pack_slug: existingPack.slug,
      action: 'delete',
    },
  });

  logger.info({ adminId, packId, packSlug: existingPack.slug, requestId }, 'Admin removed pack');

  return c.json({
    success: true,
    message: 'Pack removed successfully',
  });
});

// --- Submission Review Routes ---

/**
 * GET /v1/admin/reviews
 * List pending submissions for admin review queue
 * @see sdd-pack-submission.md §4.2 GET /v1/admin/reviews
 */
adminRouter.get('/reviews', async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');

  const pendingSubmissions = await getPendingSubmissions();

  logger.info(
    { adminId, count: pendingSubmissions.length, requestId },
    'Admin fetched pending submissions'
  );

  return c.json({
    data: pendingSubmissions.map((pack) => ({
      id: pack.id,
      name: pack.name,
      slug: pack.slug,
      description: pack.description,
      status: pack.status,
      tier_required: pack.tierRequired,
      created_at: pack.createdAt,
      latest_version: pack.latestVersion,
      submission: pack.submission
        ? {
            submitted_at: pack.submission.submittedAt,
            submission_notes: pack.submission.submissionNotes,
          }
        : null,
      creator: {
        email: pack.creatorEmail,
        name: pack.creatorName,
      },
    })),
    total: pendingSubmissions.length,
    request_id: requestId,
  });
});

/**
 * POST /v1/admin/packs/:id/review
 * Review and approve/reject a pack submission
 * @see sdd-pack-submission.md §4.2 POST /v1/admin/packs/:id/review
 */
adminRouter.post('/packs/:id/review', zValidator('json', reviewPackSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const packId = c.req.param('id');
  const body = c.req.valid('json');

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packId)) {
    throw Errors.BadRequest('Invalid pack ID format');
  }

  // Get pack with owner info
  const pack = await getPackWithOwner(packId);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Validate pack is in pending_review status
  if (pack.status !== 'pending_review') {
    throw Errors.BadRequest(
      `Cannot review pack in '${pack.status}' status. Only pending_review packs can be reviewed.`
    );
  }

  // Validate rejection reason is provided when rejecting
  if (body.decision === 'rejected' && !body.rejection_reason) {
    throw Errors.BadRequest('Rejection reason is required when rejecting a submission');
  }

  // Update submission record
  const submission = await updateSubmissionReview(packId, {
    status: body.decision,
    reviewedBy: adminId,
    reviewNotes: body.review_notes,
    rejectionReason: body.rejection_reason,
  });

  if (!submission) {
    throw Errors.BadRequest('No submission found for this pack');
  }

  // Update pack status based on decision
  const newPackStatus = body.decision === 'approved' ? 'published' : 'rejected';
  await updatePackStatus(packId, newPackStatus);

  // Also update the pack's review fields for backwards compatibility
  await db
    .update(packs)
    .set({
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: body.review_notes,
      updatedAt: new Date(),
    })
    .where(eq(packs.id, packId));

  // Log audit event
  await createAuditLog({
    userId: adminId,
    action: body.decision === 'approved' ? 'admin.pack_approved' : 'admin.pack_rejected',
    resourceType: 'pack',
    resourceId: packId,
    metadata: {
      pack_name: pack.name,
      pack_slug: pack.slug,
      decision: body.decision,
      review_notes: body.review_notes,
      rejection_reason: body.rejection_reason,
      owner_email: pack.owner?.email,
    },
  });

  // Send notification email to pack owner (fire and forget)
  if (pack.owner?.email) {
    const ownerName = pack.owner.name || 'Creator';
    if (body.decision === 'approved') {
      sendPackApprovedEmail(
        pack.owner.email,
        ownerName,
        pack.name,
        pack.slug,
        body.review_notes
      ).catch((err) => {
        logger.error({ error: err, packId }, 'Failed to send pack approval email');
      });
    } else {
      sendPackRejectedEmail(
        pack.owner.email,
        ownerName,
        pack.name,
        pack.slug,
        body.rejection_reason || 'other',
        body.review_notes
      ).catch((err) => {
        logger.error({ error: err, packId }, 'Failed to send pack rejection email');
      });
    }
  }

  logger.info(
    {
      adminId,
      packId,
      packSlug: pack.slug,
      decision: body.decision,
      newStatus: newPackStatus,
      requestId,
    },
    'Admin reviewed pack submission'
  );

  return c.json({
    data: {
      pack_id: packId,
      status: newPackStatus,
      decision: body.decision,
      reviewed_at: new Date().toISOString(),
      submission_id: submission.id,
    },
    message:
      body.decision === 'approved'
        ? 'Pack approved and published successfully'
        : 'Pack submission rejected',
    request_id: requestId,
  });
});

// --- Analytics Routes ---

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
});

/**
 * GET /v1/admin/analytics
 * Platform-wide analytics dashboard
 */
adminRouter.get('/analytics', zValidator('query', analyticsQuerySchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const { period } = c.req.valid('query');

  // Calculate period start date
  let periodStart: Date | null = null;
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
  }

  // --- User Stats ---
  const [{ totalUsers }] = await db
    .select({ totalUsers: count() })
    .from(users);

  const [{ newUsers }] = periodStart
    ? await db
        .select({ newUsers: count() })
        .from(users)
        .where(gte(users.createdAt, periodStart))
    : [{ newUsers: totalUsers }];

  const [{ verifiedUsers }] = await db
    .select({ verifiedUsers: count() })
    .from(users)
    .where(eq(users.emailVerified, true));

  // --- Subscription Stats ---
  const subscriptionStats = await db
    .select({
      tier: subscriptions.tier,
      status: subscriptions.status,
      count: count(),
    })
    .from(subscriptions)
    .groupBy(subscriptions.tier, subscriptions.status);

  const activeSubscriptions = subscriptionStats
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.count, 0);

  const subscriptionsByTier = {
    free: subscriptionStats.filter(s => s.tier === 'free' && s.status === 'active').reduce((sum, s) => sum + s.count, 0),
    pro: subscriptionStats.filter(s => s.tier === 'pro' && s.status === 'active').reduce((sum, s) => sum + s.count, 0),
    team: subscriptionStats.filter(s => s.tier === 'team' && s.status === 'active').reduce((sum, s) => sum + s.count, 0),
    enterprise: subscriptionStats.filter(s => s.tier === 'enterprise' && s.status === 'active').reduce((sum, s) => sum + s.count, 0),
  };

  // --- Skills Stats ---
  const [{ totalSkills }] = await db
    .select({ totalSkills: count() })
    .from(skills);

  const [{ totalSkillDownloads }] = await db
    .select({ totalSkillDownloads: sql<number>`COALESCE(SUM(${skills.downloads}), 0)::int` })
    .from(skills);

  // --- Pack Stats ---
  const packStats = await db
    .select({
      status: packs.status,
      count: count(),
    })
    .from(packs)
    .groupBy(packs.status);

  const [{ totalPackDownloads }] = await db
    .select({ totalPackDownloads: sql<number>`COALESCE(SUM(${packs.downloads}), 0)::int` })
    .from(packs);

  // --- Usage Stats (period-based) ---
  const usageConditions = periodStart
    ? and(gte(skillUsage.createdAt, periodStart))
    : undefined;

  const usageStats = await db
    .select({
      action: skillUsage.action,
      count: count(),
    })
    .from(skillUsage)
    .where(usageConditions)
    .groupBy(skillUsage.action);

  const usageByAction = {
    installs: usageStats.find(u => u.action === 'install')?.count ?? 0,
    updates: usageStats.find(u => u.action === 'update')?.count ?? 0,
    loads: usageStats.find(u => u.action === 'load')?.count ?? 0,
    uninstalls: usageStats.find(u => u.action === 'uninstall')?.count ?? 0,
  };

  // --- Pack Installation Stats (period-based) ---
  const packInstallConditions = periodStart
    ? and(gte(packInstallations.createdAt, periodStart))
    : undefined;

  const packInstallStats = await db
    .select({
      action: packInstallations.action,
      count: count(),
    })
    .from(packInstallations)
    .where(packInstallConditions)
    .groupBy(packInstallations.action);

  const packUsageByAction = {
    installs: packInstallStats.find(u => u.action === 'install')?.count ?? 0,
    updates: packInstallStats.find(u => u.action === 'update')?.count ?? 0,
    uninstalls: packInstallStats.find(u => u.action === 'uninstall')?.count ?? 0,
  };

  // --- API Key Stats ---
  const [{ totalApiKeys }] = await db
    .select({ totalApiKeys: count() })
    .from(apiKeys)
    .where(eq(apiKeys.revoked, false));

  // --- Team Stats ---
  const [{ totalTeams }] = await db
    .select({ totalTeams: count() })
    .from(teams);

  logger.info({ adminId, period, requestId }, 'Admin viewed platform analytics');

  return c.json({
    period,
    period_start: periodStart?.toISOString() ?? null,
    generated_at: new Date().toISOString(),
    users: {
      total: totalUsers,
      new_in_period: newUsers,
      verified: verifiedUsers,
      unverified: totalUsers - verifiedUsers,
    },
    subscriptions: {
      total_active: activeSubscriptions,
      by_tier: subscriptionsByTier,
    },
    skills: {
      total: totalSkills,
      total_downloads: totalSkillDownloads,
    },
    packs: {
      total: packStats.reduce((sum, p) => sum + p.count, 0),
      by_status: {
        draft: packStats.find(p => p.status === 'draft')?.count ?? 0,
        pending_review: packStats.find(p => p.status === 'pending_review')?.count ?? 0,
        published: packStats.find(p => p.status === 'published')?.count ?? 0,
        rejected: packStats.find(p => p.status === 'rejected')?.count ?? 0,
        deprecated: packStats.find(p => p.status === 'deprecated')?.count ?? 0,
      },
      total_downloads: totalPackDownloads,
    },
    usage_in_period: {
      skills: usageByAction,
      packs: packUsageByAction,
    },
    api_keys: {
      total_active: totalApiKeys,
    },
    teams: {
      total: totalTeams,
    },
  });
});

/**
 * GET /v1/admin/analytics/packs
 * Detailed pack analytics
 */
adminRouter.get('/analytics/packs', zValidator('query', analyticsQuerySchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const { period } = c.req.valid('query');

  // Calculate period start date
  let periodStart: Date | null = null;
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
  }

  // Get top packs by downloads
  const topPacks = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      status: packs.status,
      tier_required: packs.tierRequired,
      downloads: packs.downloads,
      is_featured: packs.isFeatured,
      created_at: packs.createdAt,
    })
    .from(packs)
    .where(eq(packs.status, 'published'))
    .orderBy(desc(packs.downloads))
    .limit(20);

  // Get pack installation counts for the period
  const packInstallConditions = periodStart
    ? and(eq(packInstallations.action, 'install'), gte(packInstallations.createdAt, periodStart))
    : eq(packInstallations.action, 'install');

  const periodInstalls = await db
    .select({
      packId: packInstallations.packId,
      installs: count(),
    })
    .from(packInstallations)
    .where(packInstallConditions)
    .groupBy(packInstallations.packId)
    .orderBy(desc(count()))
    .limit(20);

  // Merge period installs into top packs
  const installMap = new Map(periodInstalls.map(p => [p.packId, p.installs]));

  const packsWithPeriodStats = topPacks.map(pack => ({
    ...pack,
    installs_in_period: installMap.get(pack.id) ?? 0,
  }));

  // Get recently created packs
  const recentPacks = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      status: packs.status,
      tier_required: packs.tierRequired,
      downloads: packs.downloads,
      created_at: packs.createdAt,
    })
    .from(packs)
    .orderBy(desc(packs.createdAt))
    .limit(10);

  logger.info({ adminId, period, requestId }, 'Admin viewed pack analytics');

  return c.json({
    period,
    period_start: periodStart?.toISOString() ?? null,
    generated_at: new Date().toISOString(),
    top_packs_by_downloads: packsWithPeriodStats,
    recent_packs: recentPacks,
  });
});

// --- Graduation Review Routes ---

const listGraduationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

const reviewGraduationSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  review_notes: z.string().min(1).max(2000),
  rejection_reason: z
    .enum([
      'quality_standards',
      'incomplete_documentation',
      'insufficient_testing',
      'stability_concerns',
      'other',
    ])
    .optional(),
});

/**
 * GET /v1/admin/graduations
 * List pending graduation requests
 * @see prd.md §4.4 Admin Review Queue
 */
adminRouter.get('/graduations', zValidator('query', listGraduationsSchema), async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');
  const { page, per_page } = c.req.valid('query');

  const result = await listPendingGraduationRequests({ page, limit: per_page });

  // Enrich with construct details
  const enrichedRequests = await Promise.all(
    result.requests.map(async (request) => {
      let constructName = '';
      let constructSlug = '';
      let ownerName = '';
      let ownerEmail = '';

      if (request.constructType === 'skill') {
        const [skill] = await db
          .select({
            name: skills.name,
            slug: skills.slug,
            ownerId: skills.ownerId,
            ownerType: skills.ownerType,
          })
          .from(skills)
          .where(eq(skills.id, request.constructId))
          .limit(1);

        if (skill) {
          constructName = skill.name;
          constructSlug = skill.slug;

          if (skill.ownerType === 'user') {
            const [owner] = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, skill.ownerId))
              .limit(1);
            if (owner) {
              ownerName = owner.name;
              ownerEmail = owner.email;
            }
          }
        }
      } else {
        const [pack] = await db
          .select({
            name: packs.name,
            slug: packs.slug,
            ownerId: packs.ownerId,
            ownerType: packs.ownerType,
          })
          .from(packs)
          .where(eq(packs.id, request.constructId))
          .limit(1);

        if (pack) {
          constructName = pack.name;
          constructSlug = pack.slug;

          if (pack.ownerType === 'user') {
            const [owner] = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, pack.ownerId))
              .limit(1);
            if (owner) {
              ownerName = owner.name;
              ownerEmail = owner.email;
            }
          }
        }
      }

      return {
        id: request.id,
        construct_type: request.constructType,
        construct_id: request.constructId,
        construct_name: constructName,
        construct_slug: constructSlug,
        current_maturity: request.currentMaturity,
        target_maturity: request.targetMaturity,
        requested_at: request.requestedAt.toISOString(),
        request_notes: request.requestNotes,
        criteria_snapshot: request.criteriaSnapshot,
        owner: {
          name: ownerName,
          email: ownerEmail,
        },
      };
    })
  );

  logger.info(
    { adminId, count: result.requests.length, total: result.total, requestId },
    'Admin fetched pending graduation requests'
  );

  return c.json({
    data: enrichedRequests,
    pagination: {
      page: result.page,
      per_page: result.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / result.limit),
    },
    request_id: requestId,
  });
});

/**
 * POST /v1/admin/graduations/:id/review
 * Review a graduation request (approve/reject)
 * @see prd.md §4.4 Admin Review Queue
 */
adminRouter.post(
  '/graduations/:id/review',
  zValidator('json', reviewGraduationSchema),
  async (c) => {
    const adminId = c.get('userId');
    const requestId = c.get('requestId');
    const graduationRequestId = c.req.param('id');
    const body = c.req.valid('json');

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(graduationRequestId)) {
      throw Errors.BadRequest('Invalid graduation request ID format');
    }

    // Validate rejection reason is provided when rejecting
    if (body.decision === 'rejected' && !body.rejection_reason) {
      throw Errors.BadRequest('Rejection reason is required when rejecting a graduation request');
    }

    const result = await reviewGraduation(
      graduationRequestId,
      adminId,
      body.decision,
      body.review_notes,
      body.rejection_reason
    );

    // Log audit event
    await createAuditLog({
      userId: adminId,
      action: body.decision === 'approved' ? 'admin.graduation_approved' : 'admin.graduation_rejected',
      resourceType: result.constructType,
      resourceId: result.constructId,
      metadata: {
        graduation_request_id: graduationRequestId,
        decision: body.decision,
        review_notes: body.review_notes,
        rejection_reason: body.rejection_reason,
        new_maturity: body.decision === 'approved' ? result.targetMaturity : undefined,
      },
    });

    logger.info(
      {
        adminId,
        graduationRequestId,
        constructType: result.constructType,
        constructId: result.constructId,
        decision: body.decision,
        newMaturity: body.decision === 'approved' ? result.targetMaturity : undefined,
        requestId,
      },
      'Admin reviewed graduation request'
    );

    return c.json({
      data: {
        request_id: result.id,
        construct_type: result.constructType,
        construct_id: result.constructId,
        status: result.status,
        new_maturity: body.decision === 'approved' ? result.targetMaturity : null,
        reviewed_at: result.reviewedAt?.toISOString(),
      },
      message:
        body.decision === 'approved'
          ? `Graduation approved. Construct promoted to ${result.targetMaturity}.`
          : 'Graduation request rejected.',
      request_id: requestId,
    });
  }
);
