/**
 * Packs Service
 * @see sdd-v2.md §2 Pack Management Architecture
 * @see sprint-v2.md T13.4: Pack CRUD API
 */

import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import {
  db,
  packs,
  packVersions,
  packFiles,
  packInstallations,
} from '../db/index.js';
import { logger } from '../lib/logger.js';
import type { InferSelectModel } from 'drizzle-orm';

// --- Types ---

export type Pack = InferSelectModel<typeof packs>;
export type PackVersion = InferSelectModel<typeof packVersions>;
export type PackFile = InferSelectModel<typeof packFiles>;
export type PackStatus = Pack['status'];
export type PackPricingType = Pack['pricingType'];
export type OwnerType = Pack['ownerType'];

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
}

export interface UpdatePackInput {
  name?: string;
  description?: string;
  longDescription?: string;
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
      status: 'draft',
    })
    .returning();

  logger.info({ packId: pack.id, slug: pack.slug }, 'Pack created');
  return pack;
}

/**
 * Get pack by slug
 */
export async function getPackBySlug(slug: string): Promise<Pack | null> {
  const [pack] = await db
    .select()
    .from(packs)
    .where(eq(packs.slug, slug.toLowerCase()))
    .limit(1);

  return pack || null;
}

/**
 * Get pack by ID
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
 * List packs with filtering and pagination
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

  // For team-owned packs, check team membership (to be implemented)
  // For now, return false for team-owned packs
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
  const [version] = await db
    .select()
    .from(packVersions)
    .where(and(eq(packVersions.packId, packId), eq(packVersions.isLatest, true)))
    .limit(1);

  return version || null;
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

  await db.insert(packInstallations).values({
    packId,
    versionId,
    userId,
    teamId,
    action,
    metadata,
    ipAddress: cleanIpAddress,
    userAgent,
  });

  // Update download count for installs
  if (action === 'install') {
    await db
      .update(packs)
      .set({ downloads: sql`${packs.downloads} + 1` })
      .where(eq(packs.id, packId));
  }

  logger.info({ packId, versionId, action }, 'Pack installation tracked');
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
