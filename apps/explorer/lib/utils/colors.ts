import type { Category } from '@/lib/types/graph';
import { DEFAULT_CATEGORIES, normalizeCategory } from '@/lib/data/fetch-categories';

// === CATEGORY CACHE ===
// Categories are cached at runtime after being fetched from API
let categoryCache: Map<string, Category> = new Map();

/**
 * Initialize category cache with fetched categories
 * Call this once at app initialization
 */
export function setCategoryCache(categories: Category[]): void {
  categoryCache = new Map(categories.map((c) => [c.slug, c]));
}

/**
 * Get a category by slug (with legacy mapping)
 */
export function getCategory(slug: string): Category | undefined {
  const normalized = normalizeCategory(slug);
  return categoryCache.get(normalized) || DEFAULT_CATEGORIES.find((c) => c.slug === normalized);
}

/**
 * Get category color by slug (with legacy mapping and fallback)
 */
export function getCategoryColor(slug: string): string {
  const category = getCategory(slug);
  return category?.color ?? '#44FF88'; // Default to development green
}

/**
 * Get category label by slug (with legacy mapping and fallback)
 */
export function getCategoryLabel(slug: string): string {
  const category = getCategory(slug);
  return category?.label ?? slug.toUpperCase();
}

/**
 * Get all cached categories
 */
export function getAllCategories(): Category[] {
  if (categoryCache.size === 0) {
    return DEFAULT_CATEGORIES;
  }
  return Array.from(categoryCache.values());
}

// === GRADUATION LEVELS ===
export type GraduationLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';

export interface GraduationConfig {
  badge: string;
  text: string;
  outline: 'dashed' | 'dotted' | 'solid';
  opacity: number;
}

export const GRADUATION_COLORS: Record<GraduationLevel, GraduationConfig> = {
  experimental: {
    badge: '#FF6B6B',
    text: '#FF6B6B',
    outline: 'dashed',
    opacity: 1,
  },
  beta: {
    badge: '#FFD93D',
    text: '#FFD93D',
    outline: 'dotted',
    opacity: 1,
  },
  stable: {
    badge: '#6BCB77',
    text: '#6BCB77',
    outline: 'solid',
    opacity: 1,
  },
  deprecated: {
    badge: '#888888',
    text: '#888888',
    outline: 'solid',
    opacity: 0.5,
  },
} as const;

// === HELPER FUNCTIONS ===
export function getGraduationConfig(level: GraduationLevel): GraduationConfig {
  return GRADUATION_COLORS[level] ?? GRADUATION_COLORS.stable;
}

/**
 * For multi-category constructs: generate gradient stops
 * @param categories Array of category slugs (primary first)
 * @returns CSS linear-gradient string or solid color
 */
export function getCategoryGradient(categories: string[]): string {
  if (categories.length === 0) return getCategoryColor('development');
  if (categories.length === 1) return getCategoryColor(categories[0]);

  const primary = getCategoryColor(categories[0]);
  const secondary = getCategoryColor(categories[1]);

  // 70/30 split with primary dominant
  return `linear-gradient(135deg, ${primary} 0%, ${primary} 70%, ${secondary} 100%)`;
}
