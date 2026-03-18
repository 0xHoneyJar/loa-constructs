/**
 * Packs Service
 * @see sdd-v2.md §2 Pack Management Architecture
 * @see sprint-v2.md T13.4: Pack CRUD API
 */

import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import * as semver from 'semver';
import {
  db,
  packs,
  packVersions,
  packFiles,
  packInstallations,
  teamMembers,
} from '../db/index.js';
import { logger } from '../lib/logger.js';
import { classifyClient } from '../lib/classify-client.js';
import type { InferSelectModel } from 'drizzle-orm';
import type { Context } from 'hono';
import type { AuthUser } from '../middleware/auth.js';

// --- Types ---

export type Pack = InferSelectModel<typeof packs>;
export type PackVersion = InferSelectModel<typeof packVersions>;
export type PackFile = InferSelectModel<typeof packFiles>;
export type PackStatus = Pack['status'];
export type PackPricingType = Pack['pricingType'];
export type OwnerType = Pack['ownerType'];

// --- Visibility Access Control (cycle-038) ---

export interface PackAccessContext {
  userId?: string;
  isOrgMember: boolean;
  isAdmin: boolean;
}

export function getAccessContext(c: Context): PackAccessContext {
  const user = c.get('user') as AuthUser | undefined;
  return {
    userId: user?.id,
    isOrgMember: c.get('isOrgMember') ?? false,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
  };
}

/**
 * Synchronous visibility check — used inline for fast access decisions.
 * For user-owned packs, checks direct ownership.
 * For team-owned packs, returns 'maybe' (needs async team membership check).
 * @returns true (allowed), false (denied), or 'team_check_needed' for team ownership
 */
export function canAccessPack(
  pack: { visibility: string | null; ownerId: string; ownerType: string; status: string },
  access?: PackAccessContext
): boolean {
  const visibility = pack.visibility ?? 'internal';

  // Public: anyone
  if (visibility === 'public') return true;

  // Unlisted: anyone with the slug (accessible but not listed)
  if (visibility === 'unlisted') return true;

  // Internal: requires org membership, ownership, or admin
  if (visibility === 'internal') {
    if (!access) return false;
    if (access.isAdmin) return true;
    if (access.isOrgMember) return true;
    // Direct user ownership
    if (access.userId && pack.ownerType === 'user' && pack.ownerId === access.userId) return true;
    // Team ownership is checked async in getPackBySlug() via isPackOwnerAsync()
    // — canAccessPack returns false here, but getPackBySlug has an additional
    // team ownership check before the final denial (GPT review FINDING-5)
    return false;
  }

  return false;
}

async function isPackOwnerAsync(
  pack: { ownerId: string; ownerType: string },
  userId?: string
): Promise<boolean> {
  if (!userId) return false;
  if (pack.ownerType === 'user') return pack.ownerId === userId;
  if (pack.ownerType === 'team') {
    const membership = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, pack.ownerId), eq(teamMembers.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);
    return membership?.role === 'owner' || membership?.role === 'admin';
  }
  return false;
}

export interface CreatePackInput {
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  ownerId: string;
  ownerType?: OwnerType;
  pricingType?: PackPricingType;
  tierRequired?: 'free' | 'pro' | 'team' | 'enterprise';
  stripeProductId?: string;
  stripeMonthlyPriceId?: string;
  stripeAnnualPriceId?: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  documentationUrl?: string;
  constructType?: string;
  forkedFrom?: string;
  // cycle-038: visibility + submission source
  visibility?: 'public' | 'internal' | 'unlisted';
  submissionSource?: 'org_sync' | 'external';
  status?: PackStatus;
}

export interface UpdatePackInput {
  name?: string;
  description?: string;
  longDescription?: string;
  icon?: string | null;
  pricingType?: PackPricingType;
  tierRequired?: 'free' | 'pro' | 'team' | 'enterprise';
  stripeProductId?: string | null;
  stripeMonthlyPriceId?: string | null;
  stripeAnnualPriceId?: string | null;
  repositoryUrl?: string | null;
  homepageUrl?: string | null;
  documentationUrl?: string | null;
  status?: PackStatus;
  isFeatured?: boolean;
}

export interface CreatePackVersionInput {
  packId: string;
  version: string;
  changelog?: string;
  manifest: Record<string, unknown>;
  minLoaVersion?: string;
  maxLoaVersion?: string;
}

export interface PackFileInput {
  path: string;
  content: string; // base64 encoded
  mimeType?: string;
}

export interface ListPacksOptions {
  query?: string;
  tag?: string;
  featured?: boolean;
  status?: PackStatus;
  page?: number;
  limit?: number;
}

// --- Pack CRUD ---

/**
 * Create a new pack
 */
export async function createPack(input: CreatePackInput): Promise<Pack> {
  const [pack] = await db
    .insert(packs)
    .values({
      name: input.name,
      slug: input.slug.toLowerCase(),
      description: input.description,
      longDescription: input.longDescription,
      ownerId: input.ownerId,
      ownerType: input.ownerType || 'user',
      pricingType: input.pricingType || 'free',
      tierRequired: input.tierRequired || 'free',
      stripeProductId: input.stripeProductId,
      stripeMonthlyPriceId: input.stripeMonthlyPriceId,
      stripeAnnualPriceId: input.stripeAnnualPriceId,
      repositoryUrl: input.repositoryUrl,
      homepageUrl: input.homepageUrl,
      documentationUrl: input.documentationUrl,
      constructType: input.constructType || 'skill-pack',
      forkedFrom: input.forkedFrom,
      status: input.status || 'draft',
      // cycle-038: visibility + submission source
      ...(input.visibility && { visibility: input.visibility }),
      ...(input.submissionSource && { submissionSource: input.submissionSource }),
    })
    .returning();

  logger.info({ packId: pack.id, slug: pack.slug }, 'Pack created');
  return pack;
}

/**
 * Get pack by slug — central visibility + status guard (cycle-038)
 * @see sdd.md §6.1
 */
export async function getPackBySlug(
  slug: string,
  access?: PackAccessContext
): Promise<Pack | null> {
  const [pack] = await db
    .select()
    .from(packs)
    .where(eq(packs.slug, slug.toLowerCase()))
    .limit(1);

  if (!pack) return null;

  // Status enforcement — draft/pending_review visible only to owner + admin
  if (pack.status !== 'published') {
    if (!access) return null;
    if (!access.isAdmin && !(await isPackOwnerAsync(pack, access.userId))) return null;
  }

  // Visibility enforcement (sync check — handles user ownership + org + admin)
  if (!canAccessPack(pack, access)) {
    // Fallback: async team ownership check for internal team-owned packs (GPT review FINDING-5)
    // canAccessPack is sync so can't check team membership — do it here
    if (pack.ownerType === 'team' && access?.userId) {
      const isTeamOwner = await isPackOwnerAsync(pack, access.userId);
      if (isTeamOwner) return pack;
    }
    return null;
  }

  return pack;
}

/**
 * Get pack by ID — @internal admin/system use only.
 * Bypasses visibility and status checks intentionally.
 * Do NOT call from user-facing routes without additional access checks.
 */
export async function getPackById(id: string): Promise<Pack | null> {
  const [pack] = await db.select().from(packs).where(eq(packs.id, id)).limit(1);

  return pack || null;
}

/**
 * Update a pack
 */
export async function updatePack(
  id: string,
  input: UpdatePackInput
): Promise<Pack | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.longDescription !== undefined)
    updateData.longDescription = input.longDescription;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.pricingType !== undefined) updateData.pricingType = input.pricingType;
  if (input.tierRequired !== undefined) updateData.tierRequired = input.tierRequired;
  if (input.stripeProductId !== undefined)
    updateData.stripeProductId = input.stripeProductId;
  if (input.stripeMonthlyPriceId !== undefined)
    updateData.stripeMonthlyPriceId = input.stripeMonthlyPriceId;
  if (input.stripeAnnualPriceId !== undefined)
    updateData.stripeAnnualPriceId = input.stripeAnnualPriceId;
  if (input.repositoryUrl !== undefined) updateData.repositoryUrl = input.repositoryUrl;
  if (input.homepageUrl !== undefined) updateData.homepageUrl = input.homepageUrl;
  if (input.documentationUrl !== undefined)
    updateData.documentationUrl = input.documentationUrl;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.isFeatured !== undefined) updateData.isFeatured = input.isFeatured;

  const [pack] = await db
    .update(packs)
    .set(updateData)
    .where(eq(packs.id, id))
    .returning();

  if (pack) {
    logger.info({ packId: pack.id }, 'Pack updated');
  }

  return pack || null;
}

/**
 * List packs with filtering and pagination — @internal admin/system use only.
 * Bypasses visibility checks. User-facing listing goes through listConstructs().
 */
export async function listPacks(options: ListPacksOptions = {}): Promise<{
  packs: Pack[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [];

  // Only show published packs by default (unless status specified)
  if (options.status) {
    conditions.push(eq(packs.status, options.status));
  } else {
    conditions.push(eq(packs.status, 'published'));
  }

  // Search query
  if (options.query) {
    conditions.push(
      or(
        ilike(packs.name, `%${options.query}%`),
        ilike(packs.description, `%${options.query}%`)
      )
    );
  }

  // Featured filter
  if (options.featured) {
    conditions.push(eq(packs.isFeatured, true));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(packs)
    .where(and(...conditions));

  // Get packs
  const results = await db
    .select()
    .from(packs)
    .where(and(...conditions))
    .orderBy(desc(packs.downloads))
    .limit(limit)
    .offset(offset);

  return {
    packs: results,
    total: Number(count),
    page,
    limit,
  };
}

/**
 * Check if user is pack owner
 */
export async function isPackOwner(
  packId: string,
  userId: string
): Promise<boolean> {
  const [pack] = await db
    .select({ ownerId: packs.ownerId, ownerType: packs.ownerType })
    .from(packs)
    .where(eq(packs.id, packId))
    .limit(1);

  if (!pack) return false;

  // For user-owned packs, direct ownership check
  if (pack.ownerType === 'user') {
    return pack.ownerId === userId;
  }

  // For team-owned packs, check team membership (cycle-038 fix)
  if (pack.ownerType === 'team') {
    const membership = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, pack.ownerId), eq(teamMembers.userId, userId)))
      .limit(1)
      .then((rows) => rows[0]);
    return membership?.role === 'owner' || membership?.role === 'admin';
  }

  return false;
}

// --- Pack Versions ---

/**
 * Create a new pack version
 * @see sdd-infrastructure-migration.md §4.2 Auto-Publish on First Version (Bug Fix)
 * @see prd-infrastructure-migration.md FR-2.1 Auto-publish on first version
 *
 * Uses transaction with FOR UPDATE lock to prevent race conditions:
 * - Concurrent uploads cannot both see count=0
 * - isLatest flag is atomically updated
 * - Pack status is updated to 'published' on first version in same transaction
 */
export async function createPackVersion(
  input: CreatePackVersionInput
): Promise<PackVersion> {
  return await db.transaction(async (tx) => {
    // Lock the pack row to prevent concurrent version creation race
    const [pack] = await tx
      .select()
      .from(packs)
      .where(eq(packs.id, input.packId))
      .for('update');

    if (!pack) {
      throw new Error(`Pack not found: ${input.packId}`);
    }

    // Check existing versions count within transaction
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(packVersions)
      .where(eq(packVersions.packId, input.packId));

    const isFirstVersion = count === 0;

    // Clear isLatest on previous versions
    if (count > 0) {
      await tx
        .update(packVersions)
        .set({ isLatest: false })
        .where(
          and(
            eq(packVersions.packId, input.packId),
            eq(packVersions.isLatest, true)
          )
        );
    }

    // Create the new version
    const [version] = await tx
      .insert(packVersions)
      .values({
        packId: input.packId,
        version: input.version,
        changelog: input.changelog,
        manifest: input.manifest,
        minLoaVersion: input.minLoaVersion,
        maxLoaVersion: input.maxLoaVersion,
        isLatest: true,
        publishedAt: new Date(),
      })
      .returning();

    // Auto-publish pack on first version (within same transaction)
    // This fixes Issue #74: Packs stuck in draft status
    if (isFirstVersion && pack.status === 'draft') {
      await tx
        .update(packs)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(packs.id, input.packId));

      logger.info({ packId: input.packId }, 'Pack auto-published on first version');
    }

    logger.info(
      { packId: input.packId, versionId: version.id, version: input.version, isFirstVersion },
      'Pack version created'
    );

    return version;
  });
}

/**
 * Get pack versions
 */
export async function getPackVersions(packId: string): Promise<PackVersion[]> {
  return db
    .select()
    .from(packVersions)
    .where(eq(packVersions.packId, packId))
    .orderBy(desc(packVersions.createdAt));
}

/**
 * Get latest pack version
 */
export async function getLatestPackVersion(
  packId: string
): Promise<PackVersion | null> {
  // Fetch all versions and determine latest by semver comparison
  // This avoids data integrity issues when multiple versions have isLatest=true
  const versions = await db
    .select()
    .from(packVersions)
    .where(eq(packVersions.packId, packId));

  if (versions.length === 0) {
    return null;
  }

  // Sort by semver (descending) and take the first
  const sorted = versions.sort((a, b) => {
    const versionA = semver.valid(a.version) ? a.version : '0.0.0';
    const versionB = semver.valid(b.version) ? b.version : '0.0.0';
    return semver.rcompare(versionA, versionB);
  });

  return sorted[0];
}

/**
 * Get specific pack version
 */
export async function getPackVersion(
  packId: string,
  version: string
): Promise<PackVersion | null> {
  const [result] = await db
    .select()
    .from(packVersions)
    .where(and(eq(packVersions.packId, packId), eq(packVersions.version, version)))
    .limit(1);

  return result || null;
}

// --- Pack Files ---

/**
 * Add file to pack version
 * @param content - Base64 encoded content stored as DB fallback when R2 is unavailable
 */
export async function addPackFile(
  versionId: string,
  path: string,
  contentHash: string,
  storageKey: string,
  sizeBytes: number,
  mimeType?: string,
  content?: string
): Promise<PackFile> {
  const [file] = await db
    .insert(packFiles)
    .values({
      versionId,
      path,
      contentHash,
      storageKey,
      sizeBytes,
      mimeType: mimeType || 'text/plain',
      content: content || null,
    })
    .returning();

  return file;
}

/**
 * Get files for a pack version
 */
export async function getPackVersionFiles(versionId: string): Promise<PackFile[]> {
  return db
    .select()
    .from(packFiles)
    .where(eq(packFiles.versionId, versionId));
}

/**
 * Update pack version statistics
 */
export async function updatePackVersionStats(
  versionId: string,
  fileCount: number,
  totalSizeBytes: number
): Promise<void> {
  await db
    .update(packVersions)
    .set({ fileCount, totalSizeBytes })
    .where(eq(packVersions.id, versionId));
}

// --- Pack Usage ---

/**
 * Track pack installation
 */
export async function trackPackInstallation(
  packId: string,
  versionId: string,
  userId: string | null,
  teamId: string | null,
  action: 'install' | 'update' | 'uninstall',
  metadata: Record<string, unknown> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Extract the first IP if multiple IPs are present (X-Forwarded-For header)
  // PostgreSQL inet type only accepts a single IP address
  const cleanIpAddress = ipAddress?.split(',')[0]?.trim() || null;

  const clientType = classifyClient(userAgent);

  await db.insert(packInstallations).values({
    packId,
    versionId,
    userId,
    teamId,
    action,
    metadata,
    ipAddress: cleanIpAddress,
    userAgent,
    clientType,
  });

  // Update download count for installs
  if (action === 'install') {
    await db
      .update(packs)
      .set({ downloads: sql`${packs.downloads} + 1` })
      .where(eq(packs.id, packId));
  }

  logger.info(
    { packId, versionId, action, clientType },
    'Pack installation tracked'
  );
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: packs.id })
    .from(packs)
    .where(eq(packs.slug, slug.toLowerCase()))
    .limit(1);

  return !existing;
}
