/**
 * Category Service
 * API-driven category taxonomy for constructs
 * @see prd.md §FR-1 Category Derivation Pipeline (cycle-041)
 * @see sdd.md §4.2 Category Counts (cycle-041)
 */

import { eq, asc, sql } from 'drizzle-orm';
import { db, categories, skills, packs } from '../db/index.js';
import { getRedis, isRedisConfigured, CACHE_KEYS, CACHE_TTL } from './redis.js';
import { logger } from '../lib/logger.js';
import { normalizeCategory, CATEGORIES } from '@loa-constructs/shared';

// Re-export normalizeCategory for existing consumers
export { normalizeCategory };

// --- Types ---

export interface Category {
  id: string;
  slug: string;
  label: string;
  color: string;
  description: string | null;
  sortOrder: number;
  constructCount: number;
}

export interface CategoryWithoutCount {
  id: string;
  slug: string;
  label: string;
  color: string;
  description: string | null;
  sortOrder: number;
}

// --- Core Functions ---

/**
 * List all categories with construct counts (skills + packs)
 * @see sdd.md §4.2 Category Counts (cycle-041)
 */
export async function listCategories(): Promise<Category[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.categoryList();
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<Category[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read categories from cache');
    }
  }

  try {
    // Get all categories
    const categoriesData = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    // Get skill counts per category
    const skillCounts = await db
      .select({
        category: skills.category,
        count: sql<number>`count(*)::int`,
      })
      .from(skills)
      .where(eq(skills.isPublic, true))
      .groupBy(skills.category);

    // Get pack counts per category (cycle-041)
    const packCounts = await db
      .select({
        category: packs.category,
        count: sql<number>`count(*)::int`,
      })
      .from(packs)
      .where(eq(packs.status, 'published'))
      .groupBy(packs.category);

    // Build count map from both skills and packs
    const countMap = new Map<string, number>();
    for (const sc of skillCounts) {
      if (sc.category) {
        const normalized = normalizeCategory(sc.category);
        countMap.set(normalized, (countMap.get(normalized) || 0) + sc.count);
      }
    }
    for (const pc of packCounts) {
      if (pc.category) {
        const normalized = normalizeCategory(pc.category);
        countMap.set(normalized, (countMap.get(normalized) || 0) + pc.count);
      }
    }

    // Map to response format
    const result: Category[] = categoriesData.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      label: cat.label,
      color: cat.color,
      description: cat.description,
      sortOrder: cat.sortOrder,
      constructCount: countMap.get(cat.slug) || 0,
    }));

    // Cache result
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.categories });
      } catch (error) {
        logger.warn({ error }, 'Failed to cache categories list');
      }
    }

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch categories from database');
    // Return defaults on error (from shared package)
    return CATEGORIES.map((cat, index) => ({
      id: `default-${index}`,
      slug: cat.slug,
      label: cat.label,
      color: cat.color,
      description: cat.description,
      sortOrder: cat.sortOrder,
      constructCount: 0,
    }));
  }
}

/**
 * Get a single category by slug (with legacy mapping support)
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const normalizedSlug = normalizeCategory(slug);

  // Check cache
  const cacheKey = CACHE_KEYS.categoryDetail(normalizedSlug);
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<Category>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.warn({ error, slug: normalizedSlug }, 'Failed to read category from cache');
    }
  }

  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, normalizedSlug))
      .limit(1);

    if (!category) {
      return null;
    }

    // Count skills with this category (raw SQL avoids legacy Drizzle enum constraint)
    const [skillsWithCategory] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(skills)
      .where(sql`${skills.category} = ${normalizedSlug}`);

    // Count packs with this category (cycle-041)
    const [packsWithCategory] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(packs)
      .where(sql`${packs.category} = ${normalizedSlug} AND ${packs.status} = 'published'`);

    const totalCount = (skillsWithCategory?.count || 0) + (packsWithCategory?.count || 0);

    const result: Category = {
      id: category.id,
      slug: category.slug,
      label: category.label,
      color: category.color,
      description: category.description,
      sortOrder: category.sortOrder,
      constructCount: totalCount,
    };

    // Cache result
    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.categories });
      } catch (error) {
        logger.warn({ error, slug: normalizedSlug }, 'Failed to cache category');
      }
    }

    return result;
  } catch (error) {
    logger.error({ error, slug: normalizedSlug }, 'Failed to fetch category from database');
    const defaultCat = CATEGORIES.find((c) => c.slug === normalizedSlug);
    if (defaultCat) {
      return {
        id: `default-${normalizedSlug}`,
        slug: defaultCat.slug,
        label: defaultCat.label,
        color: defaultCat.color,
        description: defaultCat.description,
        sortOrder: defaultCat.sortOrder,
        constructCount: 0,
      };
    }
    return null;
  }
}

/**
 * Check if a category exists
 */
export async function categoryExists(slug: string): Promise<boolean> {
  const normalizedSlug = normalizeCategory(slug);

  try {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, normalizedSlug))
      .limit(1);

    return !!category;
  } catch (error) {
    logger.error({ error, slug: normalizedSlug }, 'Failed to check category existence');
    return CATEGORIES.some((c) => c.slug === normalizedSlug);
  }
}
