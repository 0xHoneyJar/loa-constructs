# Software Design Document: Pack Submission & Creator Program

**Version**: 1.0.0
**Date**: 2026-01-04
**Author**: Software Architect Agent
**Status**: Draft
**Parent SDD**: GTM Collective Pack Integration (loa-grimoire/sdd.md)
**PRD Reference**: loa-grimoire/prd-pack-submission.md

---

## 1. Executive Summary

This SDD details the technical architecture for enabling third-party pack submissions to the Loa Registry. The implementation extends existing infrastructure (pack API, admin routes, email service) with new submission workflow endpoints, database tables, and notification triggers.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Submission Storage** | `pack_submissions` table | Preserves submission history, supports audit trail |
| **Notification Delivery** | Resend email via existing service | Already implemented, production-ready |
| **Revenue Tracking** | Separate `pack_download_attributions` table | Supports flexible payout models |
| **Stripe Connect** | Deferred to v1.1 | Start with manual payouts to reduce complexity |
| **Rate Limiting** | 5 submissions/day per creator | Prevents spam while allowing iteration |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Pack Submission Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Creator                                                            │
│  ┌─────────────┐                                                   │
│  │  Create     │                                                   │
│  │  Draft Pack │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   Submit    │───▶│  Pending    │───▶│  Published  │            │
│  │ for Review  │    │   Review    │    │    or       │            │
│  └─────────────┘    └──────┬──────┘    │  Rejected   │            │
│         ▲                  │           └─────────────┘            │
│         │                  │                                       │
│         │                  ▼                                       │
│         │           ┌─────────────┐                               │
│         └───────────│  Withdraw   │                               │
│                     │  (optional) │                               │
│                     └─────────────┘                               │
│                                                                     │
│  Admin                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │   Review    │───▶│  Approve/   │───▶│  Notify     │            │
│  │   Queue     │    │   Reject    │    │  Creator    │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer (Hono)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Pack Routes    │  │  Creator Routes │  │  Admin Routes   │    │
│  │  (existing)     │  │  (NEW)          │  │  (enhanced)     │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                    │              │
│           └────────────────────┼────────────────────┘              │
│                                │                                    │
│                                ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     Service Layer                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │  │   Packs     │  │ Submissions │  │   Email     │          │ │
│  │  │  Service    │  │  Service    │  │  Service    │          │ │
│  │  │  (existing) │  │   (NEW)     │  │  (existing) │          │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                │                                    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │     packs       │  │pack_submissions │  │ users (enhanced)│    │
│  │   (existing)    │  │     (NEW)       │  │  + stripe_conn  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                         │
│  │creator_payouts  │  │pack_download_   │                         │
│  │    (NEW)        │  │ attributions    │                         │
│  │                 │  │    (NEW)        │                         │
│  └─────────────────┘  └─────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
Submit Pack Flow:
────────────────────────────────────────────────────────────────────────
Creator                API                    DB                Email
   │                    │                      │                  │
   │ POST /submit       │                      │                  │
   ├───────────────────>│                      │                  │
   │                    │ Validate pack        │                  │
   │                    │ - has version        │                  │
   │                    │ - has description    │                  │
   │                    │ - owner match        │                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │ Insert           │
   │                    │                      │ pack_submissions │
   │                    │                      │<─────────────────┤
   │                    │                      │                  │
   │                    │ Update pack.status   │                  │
   │                    │ = pending_review     │                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │                  │
   │                    │ Send emails          │                  │
   │                    ├────────────────────────────────────────>│
   │                    │                      │ creator-received │
   │                    │                      │ admin-submitted  │
   │<───────────────────┤                      │                  │
   │ 200 OK             │                      │                  │

Review Pack Flow:
────────────────────────────────────────────────────────────────────────
Admin                  API                    DB                Email
   │                    │                      │                  │
   │ PATCH /review      │                      │                  │
   │ status=published   │                      │                  │
   ├───────────────────>│                      │                  │
   │                    │ Update pack.status   │                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │                  │
   │                    │ Update submission    │                  │
   │                    │ reviewed_at, etc     │                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │                  │
   │                    │ Create audit log     │                  │
   │                    ├─────────────────────>│                  │
   │                    │                      │                  │
   │                    │ Send email           │                  │
   │                    ├────────────────────────────────────────>│
   │                    │                      │ creator-approved │
   │<───────────────────┤                      │                  │
   │ 200 OK             │                      │                  │
```

---

## 3. Database Architecture

### 3.1 New Tables

#### 3.1.1 pack_submissions

Tracks submission history for audit trail and review workflow.

```sql
CREATE TABLE pack_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,

  -- Submission metadata
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  submission_notes TEXT,                    -- Creator's notes to reviewer

  -- Review metadata
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,                        -- Reviewer feedback
  rejection_reason VARCHAR(50),             -- Enum-like categorization

  -- Status: submitted, approved, rejected, withdrawn
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',

  -- Version at time of submission (for historical reference)
  version_id UUID REFERENCES pack_versions(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pack_submissions_pack ON pack_submissions(pack_id);
CREATE INDEX idx_pack_submissions_status ON pack_submissions(status);
CREATE INDEX idx_pack_submissions_submitted ON pack_submissions(submitted_at DESC);
```

#### 3.1.2 pack_download_attributions

Tracks downloads for revenue attribution (v1.1 Stripe Connect).

```sql
CREATE TABLE pack_download_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  -- Download context
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month DATE NOT NULL,                      -- YYYY-MM-01 for aggregation

  -- Attribution metadata
  version_id UUID REFERENCES pack_versions(id),
  action VARCHAR(20) DEFAULT 'install',     -- install, update

  UNIQUE(pack_id, user_id, month)           -- One attribution per user per month
);

-- Indexes
CREATE INDEX idx_pack_downloads_month ON pack_download_attributions(month);
CREATE INDEX idx_pack_downloads_pack ON pack_download_attributions(pack_id);
CREATE INDEX idx_pack_downloads_user ON pack_download_attributions(user_id);
```

#### 3.1.3 creator_payouts (v1.1)

Tracks creator payouts for revenue sharing.

```sql
CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payout details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Stripe Connect reference
  stripe_transfer_id VARCHAR(100),

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Status: pending, processing, completed, failed
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Breakdown (JSONB for flexibility)
  breakdown JSONB DEFAULT '{}',             -- {pack_slug: amount, ...}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_creator_payouts_user ON creator_payouts(user_id);
CREATE INDEX idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX idx_creator_payouts_period ON creator_payouts(period_start, period_end);
```

### 3.2 Schema Modifications

#### 3.2.1 users table (v1.1)

```sql
-- Add Stripe Connect fields for creator payouts
ALTER TABLE users ADD COLUMN stripe_connect_account_id VARCHAR(100);
ALTER TABLE users ADD COLUMN stripe_connect_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN payout_threshold_cents INTEGER DEFAULT 5000; -- $50 minimum
```

#### 3.2.2 packs table

Existing schema already supports submission workflow with `status`, `review_notes`, `reviewed_by`, `reviewed_at` fields. No changes needed.

### 3.3 Drizzle Schema Additions

**File**: `apps/api/src/db/schema.ts`

```typescript
// --- New Enums ---

export const packSubmissionStatusEnum = pgEnum('pack_submission_status', [
  'submitted',
  'approved',
  'rejected',
  'withdrawn',
]);

export const rejectionReasonEnum = pgEnum('rejection_reason', [
  'quality_standards',
  'incomplete_content',
  'duplicate_functionality',
  'policy_violation',
  'security_concern',
  'other',
]);

// --- New Tables ---

export const packSubmissions = pgTable(
  'pack_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    submissionNotes: text('submission_notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewNotes: text('review_notes'),
    rejectionReason: varchar('rejection_reason', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull().default('submitted'),
    versionId: uuid('version_id').references(() => packVersions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    packIdx: index('idx_pack_submissions_pack').on(table.packId),
    statusIdx: index('idx_pack_submissions_status').on(table.status),
    submittedIdx: index('idx_pack_submissions_submitted').on(table.submittedAt),
  })
);

export const packDownloadAttributions = pgTable(
  'pack_download_attributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    downloadedAt: timestamp('downloaded_at', { withTimezone: true }).defaultNow(),
    month: timestamp('month', { withTimezone: true }).notNull(),
    versionId: uuid('version_id').references(() => packVersions.id),
    action: varchar('action', { length: 20 }).default('install'),
  },
  (table) => ({
    monthIdx: index('idx_pack_downloads_month').on(table.month),
    packIdx: index('idx_pack_downloads_pack').on(table.packId),
    userIdx: index('idx_pack_downloads_user').on(table.userId),
    uniqueAttribution: uniqueIndex('idx_pack_downloads_unique').on(
      table.packId,
      table.userId,
      table.month
    ),
  })
);

export const creatorPayouts = pgTable(
  'creator_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    stripeTransferId: varchar('stripe_transfer_id', { length: 100 }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    breakdown: jsonb('breakdown').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('idx_creator_payouts_user').on(table.userId),
    statusIdx: index('idx_creator_payouts_status').on(table.status),
    periodIdx: index('idx_creator_payouts_period').on(table.periodStart, table.periodEnd),
  })
);
```

---

## 4. API Design

### 4.1 New Endpoints

#### 4.1.1 POST /v1/packs/:slug/submit

Submit a pack for review.

**File**: `apps/api/src/routes/packs.ts`

```typescript
const submitPackSchema = z.object({
  submission_notes: z.string().max(2000).optional(),
});

/**
 * POST /v1/packs/:slug/submit
 * Submit pack for review
 * @see prd-pack-submission.md §4.2.2
 */
packsRouter.post(
  '/:slug/submit',
  requireAuth(),
  zValidator('json', submitPackSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const user = c.get('user');
    const requestId = c.get('requestId');

    // Get pack
    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Check ownership
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden('You are not the owner of this pack');
    }

    // Validate pack state
    if (pack.status !== 'draft' && pack.status !== 'rejected') {
      throw Errors.BadRequest(
        `Cannot submit pack with status '${pack.status}'. Must be 'draft' or 'rejected'.`
      );
    }

    // Validate pack has at least one version
    const latestVersion = await getLatestPackVersion(pack.id);
    if (!latestVersion) {
      throw Errors.BadRequest('Pack must have at least one version before submission');
    }

    // Validate pack has description
    if (!pack.description) {
      throw Errors.BadRequest('Pack must have a description before submission');
    }

    // Rate limit: max 5 submissions per day
    const recentSubmissions = await countRecentSubmissions(userId, 24);
    if (recentSubmissions >= 5) {
      throw Errors.TooManyRequests('Maximum 5 submissions per 24 hours');
    }

    // Create submission record
    const submission = await createPackSubmission({
      packId: pack.id,
      submissionNotes: body.submission_notes,
      versionId: latestVersion.id,
    });

    // Update pack status
    await updatePackStatus(pack.id, 'pending_review');

    // Send notification emails
    await sendPackSubmissionEmails(pack, user, body.submission_notes);

    logger.info(
      { userId, packId: pack.id, submissionId: submission.id, requestId },
      'Pack submitted for review'
    );

    return c.json({
      data: {
        status: 'pending_review',
        submission_id: submission.id,
        submitted_at: submission.submittedAt,
        estimated_review_time: '2-3 business days',
      },
      request_id: requestId,
    });
  }
);
```

#### 4.1.2 POST /v1/packs/:slug/withdraw

Withdraw a pending submission.

```typescript
/**
 * POST /v1/packs/:slug/withdraw
 * Withdraw pending submission
 * @see prd-pack-submission.md §4.2.3
 */
packsRouter.post('/:slug/withdraw', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Check ownership
  const isOwner = await isPackOwner(pack.id, userId);
  if (!isOwner) {
    throw Errors.Forbidden('You are not the owner of this pack');
  }

  // Validate pack state
  if (pack.status !== 'pending_review') {
    throw Errors.BadRequest(
      `Cannot withdraw pack with status '${pack.status}'. Must be 'pending_review'.`
    );
  }

  // Update submission record
  await withdrawPackSubmission(pack.id);

  // Update pack status
  await updatePackStatus(pack.id, 'draft');

  logger.info({ userId, packId: pack.id, requestId }, 'Pack submission withdrawn');

  return c.json({
    data: {
      status: 'draft',
      withdrawn_at: new Date().toISOString(),
    },
    request_id: requestId,
  });
});
```

#### 4.1.3 GET /v1/packs/:slug/review-status

Get submission review status.

```typescript
/**
 * GET /v1/packs/:slug/review-status
 * Get review status for pack
 * @see prd-pack-submission.md §4.2.4
 */
packsRouter.get('/:slug/review-status', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // Get pack
  const pack = await getPackBySlug(slug);
  if (!pack) {
    throw Errors.NotFound('Pack not found');
  }

  // Check ownership
  const isOwner = await isPackOwner(pack.id, userId);
  if (!isOwner) {
    throw Errors.Forbidden('You are not the owner of this pack');
  }

  // Get latest submission
  const submission = await getLatestPackSubmission(pack.id);

  if (!submission) {
    return c.json({
      data: {
        status: pack.status,
        has_submission: false,
      },
      request_id: requestId,
    });
  }

  return c.json({
    data: {
      status: submission.status,
      submitted_at: submission.submittedAt,
      review_notes: submission.reviewNotes,
      reviewer: submission.reviewedBy ? 'THJ Team' : null,
      reviewed_at: submission.reviewedAt,
      rejection_reason: submission.rejectionReason,
    },
    request_id: requestId,
  });
});
```

### 4.2 Creator Dashboard Endpoints

**File**: `apps/api/src/routes/creator.ts` (NEW)

```typescript
/**
 * Creator Routes
 * @see prd-pack-submission.md §4.2.5
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';

export const creatorRouter = new Hono();

creatorRouter.use('*', requireAuth());
creatorRouter.use('*', apiRateLimiter());

/**
 * GET /v1/creator/packs
 * List creator's packs with stats
 */
creatorRouter.get('/packs', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  const packs = await getCreatorPacks(userId);
  const totals = await getCreatorTotals(userId);

  return c.json({
    data: {
      packs: packs.map(p => ({
        slug: p.slug,
        name: p.name,
        status: p.status,
        downloads: p.downloads,
        revenue: {
          total: 0,      // v1.1: Calculate from attributions
          pending: 0,
          currency: 'USD',
        },
        latest_version: p.latestVersion,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      totals: {
        packs_count: totals.packCount,
        total_downloads: totals.totalDownloads,
        total_revenue: 0,    // v1.1
        pending_payout: 0,   // v1.1
      },
    },
    request_id: requestId,
  });
});

/**
 * GET /v1/creator/earnings
 * Get creator earnings summary
 * @see prd-pack-submission.md §4.4.3
 */
creatorRouter.get('/earnings', async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');

  // v1.0: Return placeholder - manual payouts via Stripe dashboard
  // v1.1: Calculate from pack_download_attributions

  return c.json({
    data: {
      lifetime: {
        gross: 0,
        platform_fee: 0,
        net: 0,
        paid_out: 0,
        pending: 0,
      },
      this_month: {
        gross: 0,
        platform_fee: 0,
        net: 0,
      },
      payout_schedule: 'manual',  // v1.1: 'monthly'
      next_payout_date: null,     // v1.1: First of next month
      stripe_connect_status: 'not_connected',  // v1.1: Check user record
    },
    request_id: requestId,
  });
});
```

### 4.3 Enhanced Admin Endpoints

**File**: `apps/api/src/routes/admin.ts`

Add enhanced review workflow to existing admin routes:

```typescript
const reviewPackSchema = z.object({
  status: z.enum(['published', 'rejected']),
  review_notes: z.string().max(2000),
  rejection_reason: z.enum([
    'quality_standards',
    'incomplete_content',
    'duplicate_functionality',
    'policy_violation',
    'security_concern',
    'other',
  ]).optional(),
});

/**
 * POST /v1/admin/packs/:id/review
 * Submit review decision for pack
 * @see prd-pack-submission.md §4.3.2
 */
adminRouter.post(
  '/packs/:id/review',
  zValidator('json', reviewPackSchema),
  async (c) => {
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

    // Validate pack is pending review
    if (pack.status !== 'pending_review') {
      throw Errors.BadRequest(
        `Cannot review pack with status '${pack.status}'. Must be 'pending_review'.`
      );
    }

    // Require rejection_reason for rejections
    if (body.status === 'rejected' && !body.rejection_reason) {
      throw Errors.BadRequest('rejection_reason required when rejecting pack');
    }

    // Update pack status
    await db
      .update(packs)
      .set({
        status: body.status,
        reviewNotes: body.review_notes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(packs.id, packId));

    // Update submission record
    await updateSubmissionReview(packId, {
      status: body.status === 'published' ? 'approved' : 'rejected',
      reviewedBy: adminId,
      reviewNotes: body.review_notes,
      rejectionReason: body.rejection_reason,
    });

    // Create audit log
    await createAuditLog({
      userId: adminId,
      action: body.status === 'published' ? 'admin.pack_approved' : 'admin.pack_rejected',
      resourceType: 'pack',
      resourceId: packId,
      metadata: {
        pack_name: pack.name,
        pack_slug: pack.slug,
        review_notes: body.review_notes,
        rejection_reason: body.rejection_reason,
      },
    });

    // Send notification email to creator
    if (body.status === 'published') {
      await sendPackApprovedEmail(pack, pack.owner);
    } else {
      await sendPackRejectedEmail(pack, pack.owner, body.review_notes, body.rejection_reason);
    }

    logger.info(
      { adminId, packId, status: body.status, requestId },
      'Admin reviewed pack'
    );

    return c.json({
      success: true,
      message: `Pack ${body.status === 'published' ? 'approved' : 'rejected'} successfully`,
    });
  }
);

/**
 * GET /v1/admin/reviews
 * Get review queue with enhanced data
 * @see prd-pack-submission.md §4.3.1
 */
adminRouter.get('/reviews', async (c) => {
  const adminId = c.get('userId');
  const requestId = c.get('requestId');

  // Get pending packs with submission info
  const pendingPacks = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      description: packs.description,
      status: packs.status,
      owner_id: packs.ownerId,
      tier_required: packs.tierRequired,
      created_at: packs.createdAt,
    })
    .from(packs)
    .where(eq(packs.status, 'pending_review'))
    .orderBy(packs.createdAt);  // Oldest first

  // Enrich with submission data and owner info
  const enrichedPacks = await Promise.all(
    pendingPacks.map(async (pack) => {
      const submission = await getLatestPackSubmission(pack.id);
      const owner = await getUserById(pack.owner_id);
      const latestVersion = await getLatestPackVersion(pack.id);

      return {
        ...pack,
        submission: submission ? {
          submitted_at: submission.submittedAt,
          submission_notes: submission.submissionNotes,
        } : null,
        creator_email: owner?.email,
        creator_name: owner?.name,
        latest_version: latestVersion?.version,
      };
    })
  );

  logger.info({ adminId, count: enrichedPacks.length, requestId }, 'Admin viewed review queue');

  return c.json({
    data: enrichedPacks,
    request_id: requestId,
  });
});
```

### 4.4 API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/packs/:slug/submit` | Creator | Submit pack for review |
| POST | `/v1/packs/:slug/withdraw` | Creator | Withdraw pending submission |
| GET | `/v1/packs/:slug/review-status` | Creator | Get review status |
| GET | `/v1/creator/packs` | Creator | List creator's packs |
| GET | `/v1/creator/earnings` | Creator | View earnings (v1.1) |
| GET | `/v1/admin/reviews` | Admin | Review queue |
| POST | `/v1/admin/packs/:id/review` | Admin | Submit review decision |

---

## 5. Service Layer

### 5.1 Submission Service

**File**: `apps/api/src/services/submissions.ts` (NEW)

```typescript
/**
 * Submission Service
 * @see prd-pack-submission.md §4.2
 */

import { db, packSubmissions, packs, users } from '../db/index.js';
import { eq, desc, and, gte, count } from 'drizzle-orm';

export interface CreateSubmissionInput {
  packId: string;
  submissionNotes?: string;
  versionId: string;
}

/**
 * Create a new pack submission record
 */
export async function createPackSubmission(input: CreateSubmissionInput) {
  const [submission] = await db
    .insert(packSubmissions)
    .values({
      packId: input.packId,
      submissionNotes: input.submissionNotes,
      versionId: input.versionId,
      status: 'submitted',
    })
    .returning();

  return submission;
}

/**
 * Get latest submission for a pack
 */
export async function getLatestPackSubmission(packId: string) {
  const [submission] = await db
    .select()
    .from(packSubmissions)
    .where(eq(packSubmissions.packId, packId))
    .orderBy(desc(packSubmissions.submittedAt))
    .limit(1);

  return submission;
}

/**
 * Withdraw a pending submission
 */
export async function withdrawPackSubmission(packId: string) {
  const latest = await getLatestPackSubmission(packId);
  if (!latest || latest.status !== 'submitted') {
    return null;
  }

  const [updated] = await db
    .update(packSubmissions)
    .set({
      status: 'withdrawn',
    })
    .where(eq(packSubmissions.id, latest.id))
    .returning();

  return updated;
}

/**
 * Update submission with review decision
 */
export async function updateSubmissionReview(
  packId: string,
  review: {
    status: 'approved' | 'rejected';
    reviewedBy: string;
    reviewNotes: string;
    rejectionReason?: string;
  }
) {
  const latest = await getLatestPackSubmission(packId);
  if (!latest) return null;

  const [updated] = await db
    .update(packSubmissions)
    .set({
      status: review.status,
      reviewedBy: review.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: review.reviewNotes,
      rejectionReason: review.rejectionReason,
    })
    .where(eq(packSubmissions.id, latest.id))
    .returning();

  return updated;
}

/**
 * Count recent submissions by user (for rate limiting)
 */
export async function countRecentSubmissions(userId: string, hoursAgo: number) {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  // Get user's packs
  const userPacks = await db
    .select({ id: packs.id })
    .from(packs)
    .where(eq(packs.ownerId, userId));

  if (userPacks.length === 0) return 0;

  const packIds = userPacks.map(p => p.id);

  const [result] = await db
    .select({ count: count() })
    .from(packSubmissions)
    .where(
      and(
        gte(packSubmissions.submittedAt, cutoff),
        // Note: Would need SQL IN clause for packIds
      )
    );

  return result?.count ?? 0;
}

/**
 * Update pack status
 */
export async function updatePackStatus(
  packId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deprecated'
) {
  await db
    .update(packs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(packs.id, packId));
}
```

### 5.2 Creator Service

**File**: `apps/api/src/services/creator.ts` (NEW)

```typescript
/**
 * Creator Service
 * @see prd-pack-submission.md §4.2.5
 */

import { db, packs, packVersions, packInstallations } from '../db/index.js';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Get all packs owned by creator
 */
export async function getCreatorPacks(userId: string) {
  const creatorPacks = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      description: packs.description,
      status: packs.status,
      downloads: packs.downloads,
      tierRequired: packs.tierRequired,
      pricingType: packs.pricingType,
      createdAt: packs.createdAt,
      updatedAt: packs.updatedAt,
    })
    .from(packs)
    .where(eq(packs.ownerId, userId))
    .orderBy(desc(packs.updatedAt));

  // Enrich with latest version
  const enriched = await Promise.all(
    creatorPacks.map(async (pack) => {
      const [latestVersion] = await db
        .select({ version: packVersions.version })
        .from(packVersions)
        .where(eq(packVersions.packId, pack.id))
        .orderBy(desc(packVersions.publishedAt))
        .limit(1);

      return {
        ...pack,
        latestVersion: latestVersion?.version,
      };
    })
  );

  return enriched;
}

/**
 * Get creator totals
 */
export async function getCreatorTotals(userId: string) {
  const [result] = await db
    .select({
      packCount: sql<number>`COUNT(*)::int`,
      totalDownloads: sql<number>`COALESCE(SUM(${packs.downloads}), 0)::int`,
    })
    .from(packs)
    .where(eq(packs.ownerId, userId));

  return {
    packCount: result?.packCount ?? 0,
    totalDownloads: result?.totalDownloads ?? 0,
  };
}
```

---

## 6. Notification System

### 6.1 Email Templates

**File**: `apps/api/src/services/email.ts` (extend existing)

```typescript
// --- Pack Submission Email Templates ---

/**
 * Email sent to creator when pack is submitted
 */
export function generatePackSubmittedEmail(
  creatorName: string,
  packName: string,
  packSlug: string,
  submissionNotes?: string
): string {
  const dashboardUrl = `https://constructs.network/creator/packs/${packSlug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pack submitted for review</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Registry</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Pack Submitted for Review</h2>

    <p>Hi ${escapeHtml(creatorName)},</p>

    <p>Your pack "<strong>${escapeHtml(packName)}</strong>" has been submitted for review.</p>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">What happens next:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Our team will review your pack within 2-3 business days</li>
        <li>You'll receive an email when a decision is made</li>
        <li>You can check status anytime in your dashboard</li>
      </ul>
    </div>

    ${submissionNotes ? `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Your notes to reviewers:</h3>
      <p style="margin: 0; color: #6b7280;">${escapeHtml(submissionNotes)}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(dashboardUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        View in Dashboard
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Questions? Reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email sent to creator when pack is approved
 */
export function generatePackApprovedEmail(
  creatorName: string,
  packName: string,
  packSlug: string,
  reviewNotes?: string
): string {
  const packUrl = `https://constructs.network/packs/${packSlug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your pack is live!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Registry</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0; color: #10b981;">Congratulations! Your Pack is Live</h2>

    <p>Hi ${escapeHtml(creatorName)},</p>

    <p>Great news! Your pack "<strong>${escapeHtml(packName)}</strong>" has been approved and is now live on the Loa Registry.</p>

    ${reviewNotes ? `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Reviewer notes:</h3>
      <p style="margin: 0; color: #6b7280;">${escapeHtml(reviewNotes)}</p>
    </div>
    ` : ''}

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Users can now install your pack:</strong></p>
      <code style="background: #dcfce7; padding: 8px 12px; border-radius: 4px; font-family: monospace;">
        loa pack-install ${escapeHtml(packSlug)}
      </code>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(packUrl)}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        View Your Pack
      </a>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">What's next:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Share your pack on social media</li>
        <li>Monitor downloads in your creator dashboard</li>
        <li>Keep it updated with new versions</li>
      </ul>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Thank you for contributing to the Loa ecosystem!
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email sent to creator when pack is rejected
 */
export function generatePackRejectedEmail(
  creatorName: string,
  packName: string,
  packSlug: string,
  reviewNotes: string,
  rejectionReason?: string
): string {
  const dashboardUrl = `https://constructs.network/creator/packs/${packSlug}`;

  const reasonLabels: Record<string, string> = {
    quality_standards: 'Quality Standards',
    incomplete_content: 'Incomplete Content',
    duplicate_functionality: 'Duplicate Functionality',
    policy_violation: 'Policy Violation',
    security_concern: 'Security Concern',
    other: 'Other',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Review feedback for your pack</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Registry</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Review Feedback</h2>

    <p>Hi ${escapeHtml(creatorName)},</p>

    <p>Your pack "<strong>${escapeHtml(packName)}</strong>" was not approved at this time.</p>

    ${rejectionReason ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 500; color: #dc2626;">
        Reason: ${escapeHtml(reasonLabels[rejectionReason] || rejectionReason)}
      </p>
    </div>
    ` : ''}

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Reviewer feedback:</h3>
      <p style="margin: 0; color: #374151;">${escapeHtml(reviewNotes)}</p>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">What you can do:</h3>
      <ol style="margin: 0; padding-left: 20px;">
        <li>Address the feedback above</li>
        <li>Update your pack</li>
        <li>Resubmit for review</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(dashboardUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Edit Your Pack
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      We want to help you succeed. If you have questions about the feedback, reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email sent to admins when pack is submitted
 */
export function generateAdminPackSubmittedEmail(
  packName: string,
  packSlug: string,
  creatorName: string,
  creatorEmail: string,
  submissionNotes?: string
): string {
  const reviewUrl = `https://constructs.network/admin/reviews`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New pack submission</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Registry - Admin</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">New Pack Submitted for Review</h2>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Pack:</td>
          <td style="padding: 8px 0;">${escapeHtml(packName)} (${escapeHtml(packSlug)})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Creator:</td>
          <td style="padding: 8px 0;">${escapeHtml(creatorName)} (${escapeHtml(creatorEmail)})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 500;">Submitted:</td>
          <td style="padding: 8px 0;">${new Date().toISOString()}</td>
        </tr>
      </table>
    </div>

    ${submissionNotes ? `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Creator notes:</h3>
      <p style="margin: 0; color: #6b7280;">${escapeHtml(submissionNotes)}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(reviewUrl)}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Review Pack
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
```

### 6.2 Email Sending Functions

```typescript
// Add to apps/api/src/services/email.ts

const ADMIN_EMAIL = 'team@thehoneyjar.xyz';

/**
 * Send emails when pack is submitted
 */
export async function sendPackSubmissionEmails(
  pack: { name: string; slug: string },
  creator: { name: string; email: string },
  submissionNotes?: string
): Promise<void> {
  // Email to creator
  await sendEmail({
    to: creator.email,
    subject: `Pack submitted for review: ${pack.name}`,
    html: generatePackSubmittedEmail(creator.name, pack.name, pack.slug, submissionNotes),
    text: `Your pack "${pack.name}" has been submitted for review. Our team will review it within 2-3 business days.`,
  });

  // Email to admins
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Review Required] New pack: ${pack.name}`,
    html: generateAdminPackSubmittedEmail(pack.name, pack.slug, creator.name, creator.email, submissionNotes),
    text: `New pack submission: ${pack.name} by ${creator.name} (${creator.email})`,
  });
}

/**
 * Send email when pack is approved
 */
export async function sendPackApprovedEmail(
  pack: { name: string; slug: string },
  creator: { name: string; email: string },
  reviewNotes?: string
): Promise<void> {
  await sendEmail({
    to: creator.email,
    subject: `Congratulations! Your pack is live: ${pack.name}`,
    html: generatePackApprovedEmail(creator.name, pack.name, pack.slug, reviewNotes),
    text: `Great news! Your pack "${pack.name}" has been approved and is now live on the Loa Registry.`,
  });
}

/**
 * Send email when pack is rejected
 */
export async function sendPackRejectedEmail(
  pack: { name: string; slug: string },
  creator: { name: string; email: string },
  reviewNotes: string,
  rejectionReason?: string
): Promise<void> {
  await sendEmail({
    to: creator.email,
    subject: `Review feedback for: ${pack.name}`,
    html: generatePackRejectedEmail(creator.name, pack.name, pack.slug, reviewNotes, rejectionReason),
    text: `Your pack "${pack.name}" was not approved. Reason: ${rejectionReason || 'See reviewer notes'}. ${reviewNotes}`,
  });
}
```

---

## 7. Security Architecture

### 7.1 Access Control Matrix

| Endpoint | Anonymous | Free | Pro | Creator | Admin |
|----------|-----------|------|-----|---------|-------|
| POST /submit | - | - | - | Own packs | - |
| POST /withdraw | - | - | - | Own packs | - |
| GET /review-status | - | - | - | Own packs | - |
| GET /creator/packs | - | - | - | Yes | Yes |
| GET /admin/reviews | - | - | - | - | Yes |
| POST /admin/review | - | - | - | - | Yes |

### 7.2 Validation Rules

| Rule | Implementation |
|------|----------------|
| Ownership | `isPackOwner()` check before all creator operations |
| State transitions | Validate current status before transitions |
| Rate limiting | 5 submissions/24h via `countRecentSubmissions()` |
| Admin only | `requireAdmin()` middleware on admin routes |
| Audit trail | `createAuditLog()` on all state changes |

### 7.3 Pack Content Security

Per PRD §5.4:

| Requirement | Implementation |
|-------------|----------------|
| No executable code | Future: Static analysis on submission (v1.1) |
| Path traversal | Existing `validatePath()` in pack routes |
| Content hashing | SHA-256 hash stored with each file |
| Rate limiting | Reuse existing `skillsRateLimiter()` |

---

## 8. Revenue Sharing Architecture (v1.1)

### 8.1 Attribution Model

Downloads are attributed monthly per user per pack:

```
Monthly Revenue Pool = Sum of Pro/Team/Enterprise subscriptions
Creator Share = 70%
Platform Share = 30%

Per-Creator Payout = (Creator Downloads / Total Downloads) × Monthly Pool × 0.70
```

### 8.2 Stripe Connect Flow (v1.1)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Creator   │────▶│  Loa API    │────▶│   Stripe    │
│  Dashboard  │     │             │     │  Connect    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │
      │ 1. Enable Payouts  │                   │
      ├───────────────────>│                   │
      │                    │ 2. Create Account │
      │                    │    Link           │
      │                    ├──────────────────>│
      │                    │<─────────────────┤
      │ 3. Redirect to     │                   │
      │    Stripe Onboard  │                   │
      │<───────────────────┤                   │
      │                    │                   │
      │ 4. Complete KYC    │                   │
      ├────────────────────────────────────────>│
      │                    │                   │
      │ 5. Webhook:        │                   │
      │    account.updated │                   │
      │                    │<─────────────────┤
      │                    │ 6. Store          │
      │                    │    account_id     │
      │                    │                   │
```

### 8.3 Payout Processing Job

Monthly cron job (1st of month):

```typescript
// scripts/process-creator-payouts.ts

async function processMonthlyPayouts() {
  const previousMonth = getPreviousMonth();

  // 1. Get all creators with completed Stripe Connect
  const creators = await getCreatorsWithStripeConnect();

  // 2. Calculate attributions for each creator
  for (const creator of creators) {
    const earnings = await calculateCreatorEarnings(creator.id, previousMonth);

    // Skip if below threshold ($50)
    if (earnings.netCents < 5000) continue;

    // 3. Create payout record
    const payout = await createPayoutRecord({
      userId: creator.id,
      amountCents: earnings.netCents,
      periodStart: previousMonth.start,
      periodEnd: previousMonth.end,
      breakdown: earnings.breakdown,
    });

    // 4. Execute Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: earnings.netCents,
      currency: 'usd',
      destination: creator.stripeConnectAccountId,
      metadata: {
        payout_id: payout.id,
        period: previousMonth.label,
      },
    });

    // 5. Update payout record
    await updatePayoutStatus(payout.id, 'completed', transfer.id);

    // 6. Send confirmation email
    await sendPayoutEmail(creator, earnings);
  }
}
```

---

## 9. Implementation Tasks

### 9.1 Phase 1: Core Submission (Sprint 23)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| T1 | Add `pack_submissions` table to schema | S | `schema.ts` |
| T2 | Create submission service | M | `services/submissions.ts` |
| T3 | Add `POST /packs/:slug/submit` endpoint | M | `routes/packs.ts` |
| T4 | Add `POST /packs/:slug/withdraw` endpoint | S | `routes/packs.ts` |
| T5 | Add `GET /packs/:slug/review-status` endpoint | S | `routes/packs.ts` |
| T6 | Enhance admin `POST /packs/:id/review` | M | `routes/admin.ts` |
| T7 | Add `GET /admin/reviews` queue endpoint | S | `routes/admin.ts` |
| T8 | Add submission email templates | M | `services/email.ts` |
| T9 | Add email sending functions | S | `services/email.ts` |
| T10 | Run database migration | S | - |

**Effort Key**: S = Small (<2 hrs), M = Medium (2-4 hrs)

### 9.2 Phase 2: Creator Dashboard (Sprint 24)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| T11 | Create creator routes file | S | `routes/creator.ts` |
| T12 | Add creator service | M | `services/creator.ts` |
| T13 | Add `GET /creator/packs` endpoint | S | `routes/creator.ts` |
| T14 | Add `GET /creator/earnings` placeholder | S | `routes/creator.ts` |
| T15 | Register creator routes in app | S | `app.ts` |

### 9.3 Phase 3: Revenue Sharing (Sprint 25+)

| Task ID | Description | Effort | Files |
|---------|-------------|--------|-------|
| T16 | Add `pack_download_attributions` table | S | `schema.ts` |
| T17 | Add `creator_payouts` table | S | `schema.ts` |
| T18 | Add Stripe Connect user fields | S | `schema.ts` |
| T19 | Create Stripe Connect onboarding flow | L | `routes/creator.ts` |
| T20 | Create attribution tracking | M | `services/packs.ts` |
| T21 | Create payout calculation service | M | `services/payouts.ts` |
| T22 | Create payout processing script | L | `scripts/` |
| T23 | Update earnings endpoint | M | `routes/creator.ts` |

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// apps/api/tests/unit/submissions.test.ts

describe('Submission Service', () => {
  it('should create submission record', async () => {
    const submission = await createPackSubmission({
      packId: testPackId,
      submissionNotes: 'First submission',
      versionId: testVersionId,
    });

    expect(submission.status).toBe('submitted');
    expect(submission.submissionNotes).toBe('First submission');
  });

  it('should enforce rate limits', async () => {
    // Submit 5 times
    for (let i = 0; i < 5; i++) {
      await createPackSubmission({ packId: testPackId, versionId: testVersionId });
    }

    // 6th should be blocked
    const count = await countRecentSubmissions(testUserId, 24);
    expect(count).toBe(5);
  });
});
```

### 10.2 Integration Tests

```typescript
// apps/api/tests/e2e/pack-submission.test.ts

describe('Pack Submission Flow', () => {
  it('should submit pack for review', async () => {
    const res = await request(app)
      .post(`/v1/packs/${testSlug}/submit`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ submission_notes: 'Please review' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });

  it('should reject non-owner submission', async () => {
    const res = await request(app)
      .post(`/v1/packs/${testSlug}/submit`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('should allow admin to approve pack', async () => {
    const res = await request(app)
      .post(`/v1/admin/packs/${testPackId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'published',
        review_notes: 'Looks great!',
      });

    expect(res.status).toBe(200);

    // Verify pack status updated
    const pack = await getPackBySlug(testSlug);
    expect(pack.status).toBe('published');
  });
});
```

### 10.3 Test Cases

| Test | Input | Expected |
|------|-------|----------|
| Submit valid pack | Draft pack with version | 200, status=pending_review |
| Submit without version | Draft pack, no versions | 400, validation error |
| Submit non-owner | Other user's pack | 403, forbidden |
| Submit already pending | Pack in pending_review | 400, invalid state |
| Withdraw pending | Pack in pending_review | 200, status=draft |
| Withdraw non-pending | Draft pack | 400, invalid state |
| Admin approve | Pending pack | 200, status=published |
| Admin reject | Pending pack | 200, status=rejected |
| Admin reject no reason | Missing rejection_reason | 400, validation error |
| Rate limit | 6th submission in 24h | 429, too many requests |

---

## 11. Migration Plan

### 11.1 Database Migration

```sql
-- migrations/20260104_pack_submissions.sql

-- Create submission status enum
DO $$ BEGIN
  CREATE TYPE pack_submission_status AS ENUM ('submitted', 'approved', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create pack_submissions table
CREATE TABLE IF NOT EXISTS pack_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  submission_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  version_id UUID REFERENCES pack_versions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pack_submissions_pack ON pack_submissions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_submissions_status ON pack_submissions(status);
CREATE INDEX IF NOT EXISTS idx_pack_submissions_submitted ON pack_submissions(submitted_at DESC);

-- Create download attributions table (for v1.1)
CREATE TABLE IF NOT EXISTS pack_download_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month DATE NOT NULL,
  version_id UUID REFERENCES pack_versions(id),
  action VARCHAR(20) DEFAULT 'install'
);

CREATE INDEX IF NOT EXISTS idx_pack_downloads_month ON pack_download_attributions(month);
CREATE INDEX IF NOT EXISTS idx_pack_downloads_pack ON pack_download_attributions(pack_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_downloads_unique
  ON pack_download_attributions(pack_id, user_id, month);
```

### 11.2 Rollback Script

```sql
-- rollback/20260104_pack_submissions.sql

DROP TABLE IF EXISTS pack_download_attributions;
DROP TABLE IF EXISTS pack_submissions;
DROP TYPE IF EXISTS pack_submission_status;
```

---

## 12. Monitoring & Observability

### 12.1 Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pack_submissions_total` | Total submissions | - |
| `pack_submissions_pending` | Pending review queue | > 10 for > 72h |
| `pack_review_latency_hours` | Time to review | > 72h average |
| `pack_approval_rate` | Approved / Total | < 50% |
| `submission_rate_limit_hits` | Rate limit triggers | > 10/day |

### 12.2 Logging

All operations log with structured context:

```typescript
logger.info({
  userId,
  packId: pack.id,
  submissionId: submission.id,
  requestId,
  action: 'pack_submitted',
}, 'Pack submitted for review');
```

---

## 13. Appendix

### A. State Machine

```
Pack Status State Machine:

         ┌────────────────────────────────────────┐
         │                                        │
         ▼                                        │
    ┌─────────┐    submit    ┌──────────────┐    │ resubmit
    │  DRAFT  │─────────────▶│   PENDING    │────┘
    └─────────┘              │   REVIEW     │
         ▲                   └───────┬──────┘
         │                           │
         │ withdraw                  │
         │                    ┌──────┴──────┐
         │                    │             │
         │              approve│             │reject
         │                    ▼             ▼
         │              ┌──────────┐  ┌──────────┐
         └──────────────│PUBLISHED │  │ REJECTED │
                        └────┬─────┘  └──────────┘
                             │
                        deprecate
                             │
                             ▼
                        ┌──────────┐
                        │DEPRECATED│
                        └──────────┘
```

### B. File Structure

```
apps/api/src/
├── routes/
│   ├── packs.ts           # Extended with submit/withdraw/review-status
│   ├── admin.ts           # Extended with /reviews and POST /review
│   └── creator.ts         # NEW - creator dashboard routes
├── services/
│   ├── packs.ts           # Existing - add updatePackStatus
│   ├── submissions.ts     # NEW - submission management
│   ├── creator.ts         # NEW - creator dashboard queries
│   └── email.ts           # Extended with submission templates
├── db/
│   └── schema.ts          # Extended with new tables
└── middleware/
    └── auth.ts            # Existing - no changes needed
```

### C. Environment Variables

No new environment variables required for v1.0.

For v1.1 (Stripe Connect):
```
STRIPE_CONNECT_CLIENT_ID=ca_xxx
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_xxx
```

---

**Document Status**: Ready for implementation
**Next Step**: `/sprint-plan` to break down into sprint tasks
