/**
 * Pack Submissions Service
 * @see sdd-pack-submission.md §5.1 Submission Service
 * @see prd-pack-submission.md §4.2 Submission Workflow
 */

import { eq, desc, and, gte, sql, inArray } from 'drizzle-orm';
import {
  db,
  packSubmissions,
  packs,
  packVersions,
  users,
} from '../db/index.js';
import { logger } from '../lib/logger.js';
import type { InferSelectModel } from 'drizzle-orm';

// --- Types ---

export type PackSubmission = InferSelectModel<typeof packSubmissions>;
export type PackSubmissionStatus = PackSubmission['status'];

export interface CreateSubmissionInput {
  packId: string;
  submissionNotes?: string;
  versionId: string;
}

export interface UpdateSubmissionReviewInput {
  status: 'approved' | 'rejected';
  reviewedBy: string;
  reviewNotes: string;
  rejectionReason?: string;
}

// --- Submission CRUD ---

/**
 * Create a new pack submission record
 * @see sdd-pack-submission.md §5.1 createPackSubmission
 */
export async function createPackSubmission(
  input: CreateSubmissionInput
): Promise<PackSubmission> {
  const [submission] = await db
    .insert(packSubmissions)
    .values({
      packId: input.packId,
      submissionNotes: input.submissionNotes,
      versionId: input.versionId,
      status: 'submitted',
    })
    .returning();

  logger.info(
    { submissionId: submission.id, packId: input.packId },
    'Pack submission created'
  );

  return submission;
}

/**
 * Get latest submission for a pack
 * @see sdd-pack-submission.md §5.1 getLatestPackSubmission
 */
export async function getLatestPackSubmission(
  packId: string
): Promise<PackSubmission | null> {
  const [submission] = await db
    .select()
    .from(packSubmissions)
    .where(eq(packSubmissions.packId, packId))
    .orderBy(desc(packSubmissions.submittedAt))
    .limit(1);

  return submission || null;
}

/**
 * Withdraw a pending submission
 * @see sdd-pack-submission.md §5.1 withdrawPackSubmission
 */
export async function withdrawPackSubmission(
  packId: string
): Promise<PackSubmission | null> {
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

  logger.info(
    { submissionId: latest.id, packId },
    'Pack submission withdrawn'
  );

  return updated || null;
}

/**
 * Update submission with review decision
 * @see sdd-pack-submission.md §5.1 updateSubmissionReview
 */
export async function updateSubmissionReview(
  packId: string,
  review: UpdateSubmissionReviewInput
): Promise<PackSubmission | null> {
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

  logger.info(
    { submissionId: latest.id, packId, status: review.status },
    'Pack submission reviewed'
  );

  return updated || null;
}

/**
 * Count recent submissions by user (for rate limiting)
 * Rate limit: 5 submissions per 24 hours
 * @see sdd-pack-submission.md §5.1 countRecentSubmissions
 */
export async function countRecentSubmissions(
  userId: string,
  hoursAgo: number = 24
): Promise<number> {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  // Get user's packs
  const userPacks = await db
    .select({ id: packs.id })
    .from(packs)
    .where(eq(packs.ownerId, userId));

  if (userPacks.length === 0) return 0;

  const packIds = userPacks.map(p => p.id);

  // Count recent submissions for user's packs
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(packSubmissions)
    .where(
      and(
        gte(packSubmissions.submittedAt, cutoff),
        inArray(packSubmissions.packId, packIds)
      )
    );

  return result?.count ?? 0;
}

/**
 * Update pack status
 * @see sdd-pack-submission.md §5.1 updatePackStatus
 */
export async function updatePackStatus(
  packId: string,
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deprecated'
): Promise<void> {
  await db
    .update(packs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(packs.id, packId));

  logger.info({ packId, status }, 'Pack status updated');
}

/**
 * Get pack with owner information
 * Used by admin review endpoint to fetch creator details
 */
export async function getPackWithOwner(packId: string): Promise<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    name: string;
  } | null;
} | null> {
  const [pack] = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      description: packs.description,
      status: packs.status,
      ownerId: packs.ownerId,
    })
    .from(packs)
    .where(eq(packs.id, packId))
    .limit(1);

  if (!pack) return null;

  // Get owner info
  const [owner] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, pack.ownerId))
    .limit(1);

  return {
    ...pack,
    owner: owner || null,
  };
}

/**
 * Get submission history for a pack
 */
export async function getPackSubmissionHistory(
  packId: string
): Promise<PackSubmission[]> {
  return db
    .select()
    .from(packSubmissions)
    .where(eq(packSubmissions.packId, packId))
    .orderBy(desc(packSubmissions.submittedAt));
}

/**
 * Get pending submissions for admin review queue
 * Returns packs in pending_review status with submission and creator info
 */
export async function getPendingSubmissions(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    tierRequired: string | null;
    createdAt: Date | null;
    submission: {
      submittedAt: Date;
      submissionNotes: string | null;
    } | null;
    creatorEmail: string | null;
    creatorName: string | null;
    latestVersion: string | null;
  }>
> {
  // Get packs with pending_review status
  const pendingPacks = await db
    .select({
      id: packs.id,
      name: packs.name,
      slug: packs.slug,
      description: packs.description,
      status: packs.status,
      ownerId: packs.ownerId,
      tierRequired: packs.tierRequired,
      createdAt: packs.createdAt,
    })
    .from(packs)
    .where(eq(packs.status, 'pending_review'))
    .orderBy(packs.createdAt); // Oldest first

  // Enrich with submission data and owner info
  const enrichedPacks = await Promise.all(
    pendingPacks.map(async (pack) => {
      // Get latest submission
      const submission = await getLatestPackSubmission(pack.id);

      // Get owner info
      const [owner] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, pack.ownerId))
        .limit(1);

      // Get latest version
      const [latestVersion] = await db
        .select({ version: packVersions.version })
        .from(packVersions)
        .where(eq(packVersions.packId, pack.id))
        .orderBy(desc(packVersions.publishedAt))
        .limit(1);

      return {
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        description: pack.description,
        status: pack.status,
        tierRequired: pack.tierRequired,
        createdAt: pack.createdAt,
        submission: submission
          ? {
              submittedAt: submission.submittedAt,
              submissionNotes: submission.submissionNotes,
            }
          : null,
        creatorEmail: owner?.email ?? null,
        creatorName: owner?.name ?? null,
        latestVersion: latestVersion?.version ?? null,
      };
    })
  );

  return enrichedPacks;
}
