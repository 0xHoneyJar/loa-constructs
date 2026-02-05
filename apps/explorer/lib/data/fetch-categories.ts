/**
 * Fetch Categories from API
 * @see prd-category-taxonomy.md §5.2 Fetch Categories
 * @see sdd-category-taxonomy.md §6 Explorer Integration
 */

import type { Category } from '@/lib/types/graph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';

/**
 * Default categories for fallback when API is unavailable
 * @see prd-category-taxonomy.md §3.1 The 8 Categories
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'marketing',
    slug: 'marketing',
    label: 'Marketing',
    color: '#FF44FF',
    description: 'GTM, campaigns, content, social media',
    constructCount: 0,
  },
  {
    id: 'development',
    slug: 'development',
    label: 'Development',
    color: '#44FF88',
    description: 'Coding, testing, debugging, refactoring',
    constructCount: 0,
  },
  {
    id: 'security',
    slug: 'security',
    label: 'Security',
    color: '#FF8844',
    description: 'Auditing, scanning, compliance, secrets',
    constructCount: 0,
  },
  {
    id: 'analytics',
    slug: 'analytics',
    label: 'Analytics',
    color: '#FFDD44',
    description: 'Data, metrics, reporting, insights',
    constructCount: 0,
  },
  {
    id: 'documentation',
    slug: 'documentation',
    label: 'Documentation',
    color: '#44DDFF',
    description: 'Docs, guides, READMEs, knowledge bases',
    constructCount: 0,
  },
  {
    id: 'operations',
    slug: 'operations',
    label: 'Operations',
    color: '#4488FF',
    description: 'DevOps, deployment, monitoring, CI/CD',
    constructCount: 0,
  },
  {
    id: 'design',
    slug: 'design',
    label: 'Design',
    color: '#FF7B9C',
    description: 'UI/UX, prototyping, design systems',
    constructCount: 0,
  },
  {
    id: 'infrastructure',
    slug: 'infrastructure',
    label: 'Infrastructure',
    color: '#9B7EDE',
    description: 'Cloud, networking, IaC, containers',
    constructCount: 0,
  },
];

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
 */
export function normalizeCategory(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  return LEGACY_SLUG_MAPPINGS[normalized] || normalized;
}

/**
 * Fetch categories from API with ISR caching
 * Falls back to defaults on error
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE}/categories`, {
      next: { revalidate: 3600 }, // ISR: 1 hour
    });

    if (!response.ok) {
      console.warn('Failed to fetch categories, using defaults');
      return DEFAULT_CATEGORIES;
    }

    const json = await response.json();

    return json.data.map((cat: {
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
  } catch (error) {
    console.warn('Error fetching categories, using defaults:', error);
    return DEFAULT_CATEGORIES;
  }
}
