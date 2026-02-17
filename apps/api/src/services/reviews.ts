/**
 * Reviews Service
 * @see sprint.md T2.1, T2.2: Reviews + Rating Aggregation
 *
 * Handles CRUD for construct reviews with transactional rating aggregation.
 */

import { db, constructReviews, packs } from '../db/index.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface CreateReviewInput {
  packId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
}

export interface ReviewResponse {
  id: string;
  packId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorResponse: string | null;
  authorRespondedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// --- Functions ---

/**
 * Create a review with transactional rating aggregate update.
 * Returns the created review or throws on duplicate.
 */
export async function createReview(input: CreateReviewInput): Promise<ReviewResponse> {
  const { packId, userId, rating, title, body } = input;

  const result = await db.transaction(async (tx) => {
    // Insert review — use onConflictDoNothing to handle race conditions gracefully
    const [review] = await tx
      .insert(constructReviews)
      .values({
        packId,
        userId,
        rating,
        title: title || null,
        body: body || null,
      })
      .onConflictDoNothing({
        target: [constructReviews.packId, constructReviews.userId],
      })
      .returning();

    if (!review) {
      throw new Error('DUPLICATE_REVIEW');
    }

    // Update rating aggregates on packs table (NULL-safe with COALESCE)
    await tx
      .update(packs)
      .set({
        ratingSum: sql`coalesce(${packs.ratingSum}, 0) + ${rating}`,
        ratingCount: sql`coalesce(${packs.ratingCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(packs.id, packId));

    return review;
  });

  logger.info({ packId, userId, rating }, 'Review created');

  return formatReview(result);
}

/**
 * Get paginated reviews for a pack.
 */
export async function getPackReviews(
  packId: string,
  options: {
    sort?: 'newest' | 'highest' | 'lowest';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ reviews: ReviewResponse[]; total: number }> {
  const { sort = 'newest', limit = 20, offset = 0 } = options;

  const orderBy =
    sort === 'highest'
      ? desc(constructReviews.rating)
      : sort === 'lowest'
        ? asc(constructReviews.rating)
        : desc(constructReviews.createdAt);

  const [reviews, countResult] = await Promise.all([
    db
      .select()
      .from(constructReviews)
      .where(
        and(
          eq(constructReviews.packId, packId),
          eq(constructReviews.isHidden, false)
        )
      )
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructReviews)
      .where(
        and(
          eq(constructReviews.packId, packId),
          eq(constructReviews.isHidden, false)
        )
      ),
  ]);

  return {
    reviews: reviews.map(formatReview),
    total: countResult[0]?.count ?? 0,
  };
}

/**
 * Get a user's review for a specific pack (if exists).
 */
export async function getUserReview(
  packId: string,
  userId: string
): Promise<ReviewResponse | null> {
  const [review] = await db
    .select()
    .from(constructReviews)
    .where(
      and(
        eq(constructReviews.packId, packId),
        eq(constructReviews.userId, userId)
      )
    );

  return review ? formatReview(review) : null;
}

/**
 * Add author response to a review.
 */
export async function addAuthorResponse(
  reviewId: string,
  packId: string,
  response: string
): Promise<ReviewResponse> {
  const [updated] = await db
    .update(constructReviews)
    .set({
      authorResponse: response,
      authorRespondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(constructReviews.id, reviewId), eq(constructReviews.packId, packId)))
    .returning();

  if (!updated) {
    throw new Error('Review not found');
  }

  logger.info({ reviewId, packId }, 'Author response added');
  return formatReview(updated);
}

function formatReview(review: typeof constructReviews.$inferSelect): ReviewResponse {
  return {
    id: review.id,
    packId: review.packId,
    userId: review.userId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    authorResponse: review.authorResponse,
    authorRespondedAt: review.authorRespondedAt?.toISOString() ?? null,
    createdAt: review.createdAt?.toISOString() ?? null,
    updatedAt: review.updatedAt?.toISOString() ?? null,
  };
}
