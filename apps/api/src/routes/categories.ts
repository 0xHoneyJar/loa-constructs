/**
 * Categories Routes
 * API-driven category taxonomy for constructs
 * @see prd-category-taxonomy.md §4 API Contract
 * @see sdd-category-taxonomy.md §5 API Routes
 */

import { Hono } from 'hono';
import { skillsRateLimiter } from '../middleware/rate-limiter.js';
import { listCategories, getCategoryBySlug, normalizeCategory } from '../services/category.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// --- Route Instance ---

export const categoriesRouter = new Hono();

// Apply rate limiting
categoriesRouter.use('*', skillsRateLimiter());

// --- Formatters ---

function formatCategory(c: {
  id: string;
  slug: string;
  label: string;
  color: string;
  description: string | null;
  sortOrder: number;
  constructCount: number;
}) {
  return {
    id: c.slug, // Use slug as public ID for simplicity
    slug: c.slug,
    label: c.label,
    color: c.color,
    description: c.description,
    construct_count: c.constructCount,
  };
}

// --- Routes ---

/**
 * GET /v1/categories
 * List all categories with construct counts
 * @see prd-category-taxonomy.md §4.1 Categories Endpoint
 */
categoriesRouter.get('/', async (c) => {
  const requestId = c.get('requestId');

  const categories = await listCategories();

  logger.info(
    { request_id: requestId, count: categories.length },
    'Categories listed'
  );

  return c.json({
    data: categories.map(formatCategory),
    request_id: requestId,
  });
});

/**
 * GET /v1/categories/:slug
 * Get single category by slug (supports legacy mappings)
 * @see prd-category-taxonomy.md §4.1 Categories Endpoint
 */
categoriesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId');

  // Log if this is a legacy slug
  const normalizedSlug = normalizeCategory(slug);
  if (normalizedSlug !== slug) {
    logger.info(
      { request_id: requestId, original: slug, normalized: normalizedSlug },
      'Legacy category slug mapped'
    );
  }

  const category = await getCategoryBySlug(slug);

  if (!category) {
    throw Errors.NotFound('Category');
  }

  logger.info(
    { request_id: requestId, slug: category.slug },
    'Category retrieved'
  );

  return c.json({
    data: formatCategory(category),
    request_id: requestId,
  });
});
