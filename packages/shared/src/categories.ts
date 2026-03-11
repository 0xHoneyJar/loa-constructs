/**
 * Construct Category Taxonomy
 * Single source of truth — imported by API, explorer, and seed scripts.
 * @see prd.md §FR-2 Shared Category Constants (cycle-041)
 * @see sdd.md §3.3 Shared Constants
 */

/** The 8 canonical category slugs */
export const CATEGORY_SLUGS = [
  'marketing',
  'development',
  'security',
  'analytics',
  'documentation',
  'operations',
  'design',
  'infrastructure',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface CategoryDefinition {
  slug: CategorySlug;
  label: string;
  color: string;
  description: string;
  sortOrder: number;
}

/** Canonical category definitions with display metadata */
export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'marketing', label: 'Marketing', color: '#FF44FF', description: 'GTM, campaigns, content, social media', sortOrder: 1 },
  { slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding, testing, debugging, refactoring', sortOrder: 2 },
  { slug: 'security', label: 'Security', color: '#FF8844', description: 'Auditing, scanning, compliance, secrets', sortOrder: 3 },
  { slug: 'analytics', label: 'Analytics', color: '#FFDD44', description: 'Data, metrics, reporting, insights', sortOrder: 4 },
  { slug: 'documentation', label: 'Documentation', color: '#44DDFF', description: 'Docs, guides, READMEs, knowledge bases', sortOrder: 5 },
  { slug: 'operations', label: 'Operations', color: '#4488FF', description: 'DevOps, deployment, monitoring, CI/CD', sortOrder: 6 },
  { slug: 'design', label: 'Design', color: '#FF7B9C', description: 'UI/UX, prototyping, design systems', sortOrder: 7 },
  { slug: 'infrastructure', label: 'Infrastructure', color: '#9B7EDE', description: 'Cloud, networking, IaC, containers', sortOrder: 8 },
];

/** Legacy slug → canonical slug mappings */
export const LEGACY_SLUG_MAPPINGS: Record<string, CategorySlug> = {
  gtm: 'marketing',
  dev: 'development',
  docs: 'documentation',
  ops: 'operations',
  data: 'analytics',
  devops: 'operations',
  infra: 'infrastructure',
};

/**
 * Normalize a category slug, handling legacy mappings.
 * Always returns a valid canonical CategorySlug — defaults to 'development'.
 */
export function normalizeCategory(slug: string): CategorySlug {
  const normalized = slug.toLowerCase().trim();
  const mapped = LEGACY_SLUG_MAPPINGS[normalized] ?? normalized;
  return isValidCategory(mapped) ? mapped : 'development';
}

/**
 * Check if a string is a valid canonical category slug.
 */
export function isValidCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug.toLowerCase().trim());
}
