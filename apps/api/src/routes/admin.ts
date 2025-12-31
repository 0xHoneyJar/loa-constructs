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
import { db, users, packs, subscriptions } from '../db/index.js';
import { eq, like, or, desc, count, sql } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { createAuditLog } from '../services/audit.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';

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
        await db
          .update(subscriptions)
          .set({
            tier: updates.tier_override,
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{admin_override}', '"${sql.raw(updates.tier_override)}"')`,
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
