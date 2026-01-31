/**
 * Graduation Service
 * Manages construct maturity lifecycle
 * @see prd.md §4 Graduation System
 * @see sdd.md §5 Service Layer Design
 */

import { eq, and, sql, lt, gte } from 'drizzle-orm';
import {
  db,
  skills,
  packs,
  skillVersions,
  packVersions,
  skillFiles,
  packFiles,
  graduationRequests,
} from '../db/index.js';
import { logger } from '../lib/logger.js';
import { Errors } from '../lib/errors.js';

// --- Types (T16.1) ---

export type MaturityLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';
export type GraduationRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type ConstructType = 'skill' | 'pack';

export interface GraduationCriteria {
  met: Record<string, boolean>;
  missing: Array<{
    key: string;
    current: number | boolean | null;
    required: number | boolean;
  }>;
}

export interface GraduationStatus {
  constructType: ConstructType;
  constructId: string;
  currentMaturity: MaturityLevel;
  nextLevel: MaturityLevel | null;
  criteria: GraduationCriteria;
  eligibleForAutoGraduation: boolean;
  canRequest: boolean;
  pendingRequest: {
    id: string;
    targetMaturity: MaturityLevel;
    status: GraduationRequestStatus;
    requestedAt: Date;
  } | null;
}

export interface GraduationRequest {
  id: string;
  constructType: ConstructType;
  constructId: string;
  currentMaturity: MaturityLevel;
  targetMaturity: MaturityLevel;
  status: GraduationRequestStatus;
  requestedBy: string;
  requestedAt: Date;
  requestNotes: string | null;
  criteriaSnapshot: GraduationCriteria;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
}

// --- Constants ---

const EXPERIMENTAL_TO_BETA_CRITERIA = {
  minDownloads: 10,
  minDaysPublished: 7,
};

const BETA_TO_STABLE_CRITERIA = {
  minDownloads: 100,
  minDaysInBeta: 30,
  minRating: 3.5,
};

const AUTO_GRADUATION_DAYS = 14;
const BATCH_SIZE = 100;

// --- Helper Functions ---

function getNextMaturityLevel(current: MaturityLevel): MaturityLevel | null {
  switch (current) {
    case 'experimental':
      return 'beta';
    case 'beta':
      return 'stable';
    case 'stable':
    case 'deprecated':
      return null;
    default:
      return null;
  }
}

function daysBetween(date1: Date, date2: Date): number {
  const diffMs = date2.getTime() - date1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculateRating(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount === 0) return null;
  return ratingSum / ratingCount;
}

// --- Core Functions ---

/**
 * Calculate criteria met for target maturity (T16.2)
 * @see sdd.md §5.2 Criteria Evaluation
 */
export async function calculateCriteriaMet(
  constructType: ConstructType,
  constructId: string,
  targetMaturity: MaturityLevel
): Promise<GraduationCriteria> {
  const met: Record<string, boolean> = {};
  const missing: GraduationCriteria['missing'] = [];

  if (constructType === 'skill') {
    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, constructId))
      .limit(1);

    if (!skill) {
      throw Errors.NotFound('Skill');
    }

    // Get latest version for manifest check
    const [latestVersion] = await db
      .select()
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, constructId), eq(skillVersions.isLatest, true)))
      .limit(1);

    if (targetMaturity === 'beta') {
      // experimental → beta criteria
      const downloads = skill.downloads || 0;
      const daysPublished = skill.createdAt ? daysBetween(skill.createdAt, new Date()) : 0;
      const hasVersion = !!latestVersion;

      // Check file existence
      let readmeExists = false;
      let changelogExists = false;
      if (latestVersion) {
        const files = await db
          .select({ path: skillFiles.path })
          .from(skillFiles)
          .where(eq(skillFiles.versionId, latestVersion.id));

        readmeExists = files.some((f) => f.path.toLowerCase().includes('readme'));
        changelogExists = files.some((f) => f.path.toLowerCase().includes('changelog'));
      }

      // Downloads check
      if (downloads >= EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads) {
        met.min_downloads = true;
      } else {
        missing.push({
          key: 'min_downloads',
          current: downloads,
          required: EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads,
        });
      }

      // Days published check
      if (daysPublished >= EXPERIMENTAL_TO_BETA_CRITERIA.minDaysPublished) {
        met.min_days_published = true;
      } else {
        missing.push({
          key: 'min_days_published',
          current: daysPublished,
          required: EXPERIMENTAL_TO_BETA_CRITERIA.minDaysPublished,
        });
      }

      // Manifest valid check
      if (hasVersion) {
        met.manifest_valid = true;
      } else {
        missing.push({ key: 'manifest_valid', current: false, required: true });
      }

      // README check
      if (readmeExists) {
        met.readme_exists = true;
      } else {
        missing.push({ key: 'readme_exists', current: false, required: true });
      }

      // CHANGELOG check
      if (changelogExists) {
        met.changelog_exists = true;
      } else {
        missing.push({ key: 'changelog_exists', current: false, required: true });
      }
    } else if (targetMaturity === 'stable') {
      // beta → stable criteria
      const downloads = skill.downloads || 0;
      const daysInBeta = skill.graduatedAt ? daysBetween(skill.graduatedAt, new Date()) : 0;
      const hasDocumentation = !!skill.documentationUrl;
      const rating = calculateRating(skill.ratingSum || 0, skill.ratingCount || 0);

      // Downloads check
      if (downloads >= BETA_TO_STABLE_CRITERIA.minDownloads) {
        met.min_downloads = true;
      } else {
        missing.push({
          key: 'min_downloads',
          current: downloads,
          required: BETA_TO_STABLE_CRITERIA.minDownloads,
        });
      }

      // Days in beta check
      if (daysInBeta >= BETA_TO_STABLE_CRITERIA.minDaysInBeta) {
        met.min_days_in_beta = true;
      } else {
        missing.push({
          key: 'min_days_in_beta',
          current: daysInBeta,
          required: BETA_TO_STABLE_CRITERIA.minDaysInBeta,
        });
      }

      // Documentation check
      if (hasDocumentation) {
        met.documentation_exists = true;
      } else {
        missing.push({ key: 'documentation_exists', current: false, required: true });
      }

      // No breaking changes check (simplified - would need version history in production)
      met.no_breaking_changes = true;

      // Rating check (skip if no ratings)
      if (rating === null) {
        met.min_rating = true; // Skip if no ratings
      } else if (rating >= BETA_TO_STABLE_CRITERIA.minRating) {
        met.min_rating = true;
      } else {
        missing.push({
          key: 'min_rating',
          current: rating,
          required: BETA_TO_STABLE_CRITERIA.minRating,
        });
      }
    }
  } else {
    // Pack type
    const [pack] = await db
      .select()
      .from(packs)
      .where(eq(packs.id, constructId))
      .limit(1);

    if (!pack) {
      throw Errors.NotFound('Pack');
    }

    const [latestVersion] = await db
      .select()
      .from(packVersions)
      .where(and(eq(packVersions.packId, constructId), eq(packVersions.isLatest, true)))
      .limit(1);

    if (targetMaturity === 'beta') {
      // experimental → beta criteria for packs
      const downloads = pack.downloads || 0;
      const daysPublished = pack.createdAt ? daysBetween(pack.createdAt, new Date()) : 0;
      const hasVersion = !!latestVersion;

      // Check file existence
      let readmeExists = false;
      let changelogExists = false;
      if (latestVersion) {
        const files = await db
          .select({ path: packFiles.path })
          .from(packFiles)
          .where(eq(packFiles.versionId, latestVersion.id));

        readmeExists = files.some((f) => f.path.toLowerCase().includes('readme'));
        changelogExists = files.some((f) => f.path.toLowerCase().includes('changelog'));
      }

      if (downloads >= EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads) {
        met.min_downloads = true;
      } else {
        missing.push({
          key: 'min_downloads',
          current: downloads,
          required: EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads,
        });
      }

      if (daysPublished >= EXPERIMENTAL_TO_BETA_CRITERIA.minDaysPublished) {
        met.min_days_published = true;
      } else {
        missing.push({
          key: 'min_days_published',
          current: daysPublished,
          required: EXPERIMENTAL_TO_BETA_CRITERIA.minDaysPublished,
        });
      }

      if (hasVersion && latestVersion.manifest) {
        met.manifest_valid = true;
      } else {
        missing.push({ key: 'manifest_valid', current: false, required: true });
      }

      if (readmeExists) {
        met.readme_exists = true;
      } else {
        missing.push({ key: 'readme_exists', current: false, required: true });
      }

      if (changelogExists) {
        met.changelog_exists = true;
      } else {
        missing.push({ key: 'changelog_exists', current: false, required: true });
      }
    } else if (targetMaturity === 'stable') {
      // beta → stable criteria for packs
      const downloads = pack.downloads || 0;
      const daysInBeta = pack.graduatedAt ? daysBetween(pack.graduatedAt, new Date()) : 0;
      const hasDocumentation = !!pack.documentationUrl;
      const rating = calculateRating(pack.ratingSum || 0, pack.ratingCount || 0);

      if (downloads >= BETA_TO_STABLE_CRITERIA.minDownloads) {
        met.min_downloads = true;
      } else {
        missing.push({
          key: 'min_downloads',
          current: downloads,
          required: BETA_TO_STABLE_CRITERIA.minDownloads,
        });
      }

      if (daysInBeta >= BETA_TO_STABLE_CRITERIA.minDaysInBeta) {
        met.min_days_in_beta = true;
      } else {
        missing.push({
          key: 'min_days_in_beta',
          current: daysInBeta,
          required: BETA_TO_STABLE_CRITERIA.minDaysInBeta,
        });
      }

      if (hasDocumentation) {
        met.documentation_exists = true;
      } else {
        missing.push({ key: 'documentation_exists', current: false, required: true });
      }

      met.no_breaking_changes = true;

      if (rating === null) {
        met.min_rating = true;
      } else if (rating >= BETA_TO_STABLE_CRITERIA.minRating) {
        met.min_rating = true;
      } else {
        missing.push({
          key: 'min_rating',
          current: rating,
          required: BETA_TO_STABLE_CRITERIA.minRating,
        });
      }
    }
  }

  return { met, missing };
}

/**
 * Get graduation status for a construct (T16.3)
 * @see sdd.md §5.1 getGraduationStatus
 */
export async function getGraduationStatus(
  constructType: ConstructType,
  constructId: string
): Promise<GraduationStatus> {
  // Get current maturity
  let currentMaturity: MaturityLevel;
  let createdAt: Date;

  if (constructType === 'skill') {
    const [skill] = await db
      .select({ maturity: skills.maturity, createdAt: skills.createdAt })
      .from(skills)
      .where(eq(skills.id, constructId))
      .limit(1);

    if (!skill) {
      throw Errors.NotFound('Skill');
    }
    currentMaturity = (skill.maturity || 'experimental') as MaturityLevel;
    createdAt = skill.createdAt || new Date();
  } else {
    const [pack] = await db
      .select({ maturity: packs.maturity, createdAt: packs.createdAt })
      .from(packs)
      .where(eq(packs.id, constructId))
      .limit(1);

    if (!pack) {
      throw Errors.NotFound('Pack');
    }
    currentMaturity = (pack.maturity || 'experimental') as MaturityLevel;
    createdAt = pack.createdAt || new Date();
  }

  const nextLevel = getNextMaturityLevel(currentMaturity);

  // Calculate criteria for next level
  let criteria: GraduationCriteria = { met: {}, missing: [] };
  if (nextLevel) {
    criteria = await calculateCriteriaMet(constructType, constructId, nextLevel);
  }

  // Check for pending graduation request
  const [pendingRequest] = await db
    .select({
      id: graduationRequests.id,
      targetMaturity: graduationRequests.targetMaturity,
      status: graduationRequests.status,
      requestedAt: graduationRequests.requestedAt,
    })
    .from(graduationRequests)
    .where(
      and(
        eq(graduationRequests.constructType, constructType),
        eq(graduationRequests.constructId, constructId),
        eq(graduationRequests.status, 'pending')
      )
    )
    .limit(1);

  // Calculate eligibility for auto-graduation
  const daysPublished = daysBetween(createdAt, new Date());
  const eligibleForAutoGraduation =
    currentMaturity === 'experimental' &&
    daysPublished >= AUTO_GRADUATION_DAYS &&
    criteria.missing.length === 0;

  // Can request if criteria met and no pending request
  const canRequest = nextLevel !== null && criteria.missing.length === 0 && !pendingRequest;

  return {
    constructType,
    constructId,
    currentMaturity,
    nextLevel,
    criteria,
    eligibleForAutoGraduation,
    canRequest,
    pendingRequest: pendingRequest
      ? {
          id: pendingRequest.id,
          targetMaturity: pendingRequest.targetMaturity as MaturityLevel,
          status: pendingRequest.status as GraduationRequestStatus,
          requestedAt: pendingRequest.requestedAt || new Date(),
        }
      : null,
  };
}

/**
 * Request graduation to next level (T16.4)
 * @see sdd.md §5.1 requestGraduation
 */
export async function requestGraduation(
  constructType: ConstructType,
  constructId: string,
  requestedBy: string,
  notes?: string
): Promise<{ request: GraduationRequest; autoApproved: boolean }> {
  // Get current status
  const status = await getGraduationStatus(constructType, constructId);

  if (!status.nextLevel) {
    throw Errors.BadRequest('Construct is already at maximum maturity level');
  }

  if (status.pendingRequest) {
    throw Errors.BadRequest('A graduation request is already pending');
  }

  if (status.criteria.missing.length > 0) {
    throw Errors.BadRequest('Not all graduation criteria are met');
  }

  // Check if auto-approval applies (experimental → beta with 14+ days)
  const shouldAutoApprove =
    status.currentMaturity === 'experimental' && status.eligibleForAutoGraduation;

  const now = new Date();

  // Create graduation request
  const [request] = await db
    .insert(graduationRequests)
    .values({
      constructType,
      constructId,
      currentMaturity: status.currentMaturity,
      targetMaturity: status.nextLevel,
      requestedBy,
      requestNotes: notes || null,
      criteriaSnapshot: status.criteria,
      status: shouldAutoApprove ? 'approved' : 'pending',
      reviewedAt: shouldAutoApprove ? now : null,
      reviewNotes: shouldAutoApprove ? 'Auto-approved: all criteria met after 14+ days' : null,
    })
    .returning();

  // If auto-approved, update construct maturity
  if (shouldAutoApprove) {
    if (constructType === 'skill') {
      await db
        .update(skills)
        .set({
          maturity: status.nextLevel,
          graduatedAt: now,
          graduationNotes: 'Auto-graduated from experimental',
          updatedAt: now,
        })
        .where(eq(skills.id, constructId));
    } else {
      await db
        .update(packs)
        .set({
          maturity: status.nextLevel,
          graduatedAt: now,
          graduationNotes: 'Auto-graduated from experimental',
          updatedAt: now,
        })
        .where(eq(packs.id, constructId));
    }

    logger.info(
      { constructType, constructId, newMaturity: status.nextLevel },
      'Construct auto-graduated'
    );
  }

  return {
    request: {
      id: request.id,
      constructType: request.constructType as ConstructType,
      constructId: request.constructId,
      currentMaturity: request.currentMaturity as MaturityLevel,
      targetMaturity: request.targetMaturity as MaturityLevel,
      status: request.status as GraduationRequestStatus,
      requestedBy: request.requestedBy,
      requestedAt: request.requestedAt || now,
      requestNotes: request.requestNotes,
      criteriaSnapshot: request.criteriaSnapshot as GraduationCriteria,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy,
      reviewNotes: request.reviewNotes,
      rejectionReason: request.rejectionReason,
    },
    autoApproved: shouldAutoApprove,
  };
}

/**
 * Withdraw pending graduation request (T16.5)
 * @see sdd.md §5.1 withdrawGraduationRequest
 */
export async function withdrawGraduationRequest(
  constructType: ConstructType,
  constructId: string,
  _requestedBy: string // Ownership validation done at route layer
): Promise<GraduationRequest> {
  // Find pending request
  const [pendingRequest] = await db
    .select()
    .from(graduationRequests)
    .where(
      and(
        eq(graduationRequests.constructType, constructType),
        eq(graduationRequests.constructId, constructId),
        eq(graduationRequests.status, 'pending')
      )
    )
    .limit(1);

  if (!pendingRequest) {
    throw Errors.BadRequest('No pending graduation request found');
  }

  // Update status to withdrawn
  const [updated] = await db
    .update(graduationRequests)
    .set({ status: 'withdrawn' })
    .where(eq(graduationRequests.id, pendingRequest.id))
    .returning();

  logger.info({ constructType, constructId, requestId: updated.id }, 'Graduation request withdrawn');

  return {
    id: updated.id,
    constructType: updated.constructType as ConstructType,
    constructId: updated.constructId,
    currentMaturity: updated.currentMaturity as MaturityLevel,
    targetMaturity: updated.targetMaturity as MaturityLevel,
    status: updated.status as GraduationRequestStatus,
    requestedBy: updated.requestedBy,
    requestedAt: updated.requestedAt || new Date(),
    requestNotes: updated.requestNotes,
    criteriaSnapshot: updated.criteriaSnapshot as GraduationCriteria,
    reviewedAt: updated.reviewedAt,
    reviewedBy: updated.reviewedBy,
    reviewNotes: updated.reviewNotes,
    rejectionReason: updated.rejectionReason,
  };
}

/**
 * Review graduation request - admin only (T16.6)
 * @see sdd.md §5.1 reviewGraduation
 */
export async function reviewGraduation(
  requestId: string,
  reviewedBy: string,
  decision: 'approved' | 'rejected',
  reviewNotes: string,
  rejectionReason?: string
): Promise<GraduationRequest> {
  // Find the request
  const [request] = await db
    .select()
    .from(graduationRequests)
    .where(eq(graduationRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw Errors.NotFound('Graduation request');
  }

  if (request.status !== 'pending') {
    throw Errors.BadRequest('Request has already been reviewed');
  }

  const now = new Date();

  // Update the request
  const [updated] = await db
    .update(graduationRequests)
    .set({
      status: decision,
      reviewedAt: now,
      reviewedBy,
      reviewNotes,
      rejectionReason: decision === 'rejected' ? rejectionReason : null,
    })
    .where(eq(graduationRequests.id, requestId))
    .returning();

  // If approved, update construct maturity
  if (decision === 'approved') {
    if (request.constructType === 'skill') {
      await db
        .update(skills)
        .set({
          maturity: request.targetMaturity,
          graduatedAt: now,
          graduationNotes: `Graduated to ${request.targetMaturity} - ${reviewNotes}`,
          updatedAt: now,
        })
        .where(eq(skills.id, request.constructId));
    } else {
      await db
        .update(packs)
        .set({
          maturity: request.targetMaturity,
          graduatedAt: now,
          graduationNotes: `Graduated to ${request.targetMaturity} - ${reviewNotes}`,
          updatedAt: now,
        })
        .where(eq(packs.id, request.constructId));
    }

    logger.info(
      {
        requestId,
        constructType: request.constructType,
        constructId: request.constructId,
        newMaturity: request.targetMaturity,
      },
      'Graduation approved'
    );
  } else {
    logger.info(
      {
        requestId,
        constructType: request.constructType,
        constructId: request.constructId,
        rejectionReason,
      },
      'Graduation rejected'
    );
  }

  return {
    id: updated.id,
    constructType: updated.constructType as ConstructType,
    constructId: updated.constructId,
    currentMaturity: updated.currentMaturity as MaturityLevel,
    targetMaturity: updated.targetMaturity as MaturityLevel,
    status: updated.status as GraduationRequestStatus,
    requestedBy: updated.requestedBy,
    requestedAt: updated.requestedAt || new Date(),
    requestNotes: updated.requestNotes,
    criteriaSnapshot: updated.criteriaSnapshot as GraduationCriteria,
    reviewedAt: updated.reviewedAt,
    reviewedBy: updated.reviewedBy,
    reviewNotes: updated.reviewNotes,
    rejectionReason: updated.rejectionReason,
  };
}

/**
 * List pending graduation requests - admin only (T16.7)
 * @see sdd.md §5.1 listPendingGraduationRequests
 */
export async function listPendingGraduationRequests(
  options: { page?: number; limit?: number } = {}
): Promise<{
  requests: GraduationRequest[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;

  const [requests, countResult] = await Promise.all([
    db
      .select()
      .from(graduationRequests)
      .where(eq(graduationRequests.status, 'pending'))
      .orderBy(graduationRequests.requestedAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(graduationRequests)
      .where(eq(graduationRequests.status, 'pending')),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    requests: requests.map((r) => ({
      id: r.id,
      constructType: r.constructType as ConstructType,
      constructId: r.constructId,
      currentMaturity: r.currentMaturity as MaturityLevel,
      targetMaturity: r.targetMaturity as MaturityLevel,
      status: r.status as GraduationRequestStatus,
      requestedBy: r.requestedBy,
      requestedAt: r.requestedAt || new Date(),
      requestNotes: r.requestNotes,
      criteriaSnapshot: r.criteriaSnapshot as GraduationCriteria,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      reviewNotes: r.reviewNotes,
      rejectionReason: r.rejectionReason,
    })),
    total,
    page,
    limit,
  };
}

/**
 * Auto-graduate eligible constructs - cron job (T16.8)
 * @see sdd.md §5.3 Auto-Graduation Logic
 */
export async function autoGraduateEligibleConstructs(): Promise<{
  processed: number;
  graduated: number;
  errors: number;
}> {
  let processed = 0;
  let graduated = 0;
  let errors = 0;

  const cutoffDate = new Date(Date.now() - AUTO_GRADUATION_DAYS * 24 * 60 * 60 * 1000);

  // Find eligible skills
  const eligibleSkills = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.maturity, 'experimental'),
        lt(skills.createdAt, cutoffDate),
        eq(skills.isPublic, true),
        gte(skills.downloads, EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads)
      )
    )
    .limit(BATCH_SIZE);

  // Process skills
  for (const skill of eligibleSkills) {
    processed++;
    try {
      const criteria = await calculateCriteriaMet('skill', skill.id, 'beta');
      if (criteria.missing.length === 0) {
        const now = new Date();

        // Create request record for audit
        await db.insert(graduationRequests).values({
          constructType: 'skill',
          constructId: skill.id,
          currentMaturity: 'experimental',
          targetMaturity: 'beta',
          requestedBy: skill.ownerId,
          criteriaSnapshot: criteria,
          status: 'approved',
          reviewedAt: now,
          reviewNotes: 'Auto-graduated: all criteria met after 14+ days',
        });

        // Update maturity
        await db
          .update(skills)
          .set({
            maturity: 'beta',
            graduatedAt: now,
            graduationNotes: 'Auto-graduated from experimental',
            updatedAt: now,
          })
          .where(eq(skills.id, skill.id));

        graduated++;
        logger.info({ skillId: skill.id, skillSlug: skill.slug }, 'Skill auto-graduated to beta');
      }
    } catch (error) {
      errors++;
      logger.error({ error, skillId: skill.id }, 'Failed to auto-graduate skill');
    }
  }

  // Find eligible packs
  const eligiblePacks = await db
    .select()
    .from(packs)
    .where(
      and(
        eq(packs.maturity, 'experimental'),
        lt(packs.createdAt, cutoffDate),
        eq(packs.status, 'published'),
        gte(packs.downloads, EXPERIMENTAL_TO_BETA_CRITERIA.minDownloads)
      )
    )
    .limit(BATCH_SIZE);

  // Process packs
  for (const pack of eligiblePacks) {
    processed++;
    try {
      const criteria = await calculateCriteriaMet('pack', pack.id, 'beta');
      if (criteria.missing.length === 0) {
        const now = new Date();

        await db.insert(graduationRequests).values({
          constructType: 'pack',
          constructId: pack.id,
          currentMaturity: 'experimental',
          targetMaturity: 'beta',
          requestedBy: pack.ownerId,
          criteriaSnapshot: criteria,
          status: 'approved',
          reviewedAt: now,
          reviewNotes: 'Auto-graduated: all criteria met after 14+ days',
        });

        await db
          .update(packs)
          .set({
            maturity: 'beta',
            graduatedAt: now,
            graduationNotes: 'Auto-graduated from experimental',
            updatedAt: now,
          })
          .where(eq(packs.id, pack.id));

        graduated++;
        logger.info({ packId: pack.id, packSlug: pack.slug }, 'Pack auto-graduated to beta');
      }
    } catch (error) {
      errors++;
      logger.error({ error, packId: pack.id }, 'Failed to auto-graduate pack');
    }
  }

  logger.info({ processed, graduated, errors }, 'Auto-graduation batch completed');

  return { processed, graduated, errors };
}
