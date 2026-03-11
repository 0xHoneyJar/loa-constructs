/**
 * Fetch Categories from API
 * @see sdd.md §5.2 Explorer Changes (cycle-041)
 */

import type { Category } from '@/lib/types/graph';
import { normalizeCategory, CATEGORIES } from '@loa-constructs/shared';

// Re-export for use by fetch-constructs.ts
export { normalizeCategory };

const API_BASE = process.env.CONSTRUCTS_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Default categories for fallback when API is unavailable.
 * Built from shared CATEGORIES constant (single source of truth).
 */
export const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((cat, index) => ({
  id: `default-${index}`,
  slug: cat.slug,
  label: cat.label,
  color: cat.color,
  description: cat.description,
  constructCount: 0,
}));

/**
 * Fetch categories from API with ISR caching
 * Falls back to defaults on error
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(`${API_BASE}/categories`, {
      next: { revalidate: 3600 }, // ISR: 1 hour
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn('Failed to fetch categories, using defaults');
      return DEFAULT_CATEGORIES;
    }

    const json = await response.json();

    const categories = json.data.map((cat: {
      id: string;
      slug: string;
      label: string;
      color: string;
      description?: string;
      construct_count: number;
    }) => ({
      id: cat.id,
      slug: cat.slug,
      label: cat.label,
      color: cat.color,
      description: cat.description,
      constructCount: cat.construct_count,
    }));

    // API returned empty — use defaults so graph has categories to filter by
    if (categories.length === 0) {
      return DEFAULT_CATEGORIES;
    }

    return categories;
  } catch (error) {
    console.warn('Error fetching categories, using defaults:', error);
    return DEFAULT_CATEGORIES;
  }
}
