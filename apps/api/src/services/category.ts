/**
 * Category Service
 * API-driven category taxonomy for constructs
 * @see prd-category-taxonomy.md §3 Category Taxonomy
 * @see sdd-category-taxonomy.md §4 Service Layer
 */

import { eq, asc, sql } from 'drizzle-orm';
import { db, categories, skills } from '../db/index.js';
import { getRedis, isRedisConfigured, CACHE_KEYS, CACHE_TTL } from './redis.js';
import { logger } from '../lib/logger.js';

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

// --- Legacy Slug Mapping ---

/**
 * Legacy category slug mappings
 * @see prd-category-taxonomy.md §3.3 Legacy Mapping
 */
const LEGACY_SLUG_MAPPINGS: Record<string, string> = {
  gtm: 'marketing',
  dev: 'development',
  docs: 'documentation',
  ops: 'operations',
  data: 'analytics',
  devops: 'operations',
  infra: 'infrastructure',
};

/**
 * Normalize a category slug, handling legacy mappings
 * @param slug - The category slug (may be legacy)
 * @returns The normalized category slug
 */
export function normalizeCategory(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  return LEGACY_SLUG_MAPPINGS[normalized] || normalized;
}

// --- Default Categories ---

/**
 * Default categories for fallback and seeding
 * @see prd-category-taxonomy.md §3.1 The 8 Categories
 */
export const DEFAULT_CATEGORIES: Omit<CategoryWithoutCount, 'id'>[] = [
  {
    slug: 'marketing',
    label: 'Marketing',
    color: '#FF44FF',
    description: 'GTM, campaigns, content, social media',
    sortOrder: 1,
  },
  {
    slug: 'development',
    label: 'Development',
    color: '#44FF88',
    description: 'Coding, testing, debugging, refactoring',
    sortOrder: 2,
  },
  {
    slug: 'security',
    label: 'Security',
    color: '#FF8844',
    description: 'Auditing, scanning, compliance, secrets',
    sortOrder: 3,
  },
  {
    slug: 'analytics',
    label: 'Analytics',
    color: '#FFDD44',
    description: 'Data, metrics, reporting, insights',
    sortOrder: 4,
  },
  {
    slug: 'documentation',
    label: 'Documentation',
    color: '#44DDFF',
    description: 'Docs, guides, READMEs, knowledge bases',
    sortOrder: 5,
  },
  {
    slug: 'operations',
    label: 'Operations',
    color: '#4488FF',
    description: 'DevOps, deployment, monitoring, CI/CD',
    sortOrder: 6,
  },
  {
    slug: 'design',
    label: 'Design',
    color: '#FF7B9C',
    description: 'UI/UX, prototyping, design systems',
    sortOrder: 7,
  },
  {
    slug: 'infrastructure',
    label: 'Infrastructure',
    color: '#9B7EDE',
    description: 'Cloud, networking, IaC, containers',
    sortOrder: 8,
  },
];

// --- Core Functions ---

/**
 * List all categories with construct counts
 * @see prd-category-taxonomy.md §4.1 Categories Endpoint
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

    // Build count map
    const countMap = new Map<string, number>();
    for (const sc of skillCounts) {
      if (sc.category) {
        // Normalize legacy categories when counting
        const normalized = normalizeCategory(sc.category);
        countMap.set(normalized, (countMap.get(normalized) || 0) + sc.count);
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
    // Return defaults on error
    return DEFAULT_CATEGORIES.map((cat, index) => ({
      id: `default-${index}`,
      ...cat,
      constructCount: 0,
    }));
  }
}

/**
 * Get a single category by slug (with legacy mapping support)
 * @see prd-category-taxonomy.md §4.1 Categories Endpoint
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  // Normalize legacy slugs
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
    // Get category
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, normalizedSlug))
      .limit(1);

    if (!category) {
      return null;
    }

    // Count skills with this category (including legacy mappings)
    const [skillsWithCategory] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(skills)
      .where(eq(skills.category, normalizedSlug as 'marketing' | 'development' | 'security' | 'analytics' | 'devops' | 'other'));

    const result: Category = {
      id: category.id,
      slug: category.slug,
      label: category.label,
      color: category.color,
      description: category.description,
      sortOrder: category.sortOrder,
      constructCount: skillsWithCategory?.count || 0,
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
    // Try to find in defaults
    const defaultCat = DEFAULT_CATEGORIES.find((c) => c.slug === normalizedSlug);
    if (defaultCat) {
      return {
        id: `default-${normalizedSlug}`,
        ...defaultCat,
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
    // Check defaults
    return DEFAULT_CATEGORIES.some((c) => c.slug === normalizedSlug);
  }
}
