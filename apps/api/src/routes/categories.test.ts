import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../app.js';

/**
 * Categories Route Tests
 * @see prd-category-taxonomy.md §4 API Contract
 * @see sdd-category-taxonomy.md §5 API Routes
 */

// Mock the category service to avoid database dependency
vi.mock('../services/category.js', () => ({
  normalizeCategory: (slug: string) => {
    const mappings: Record<string, string> = {
      gtm: 'marketing',
      dev: 'development',
      docs: 'documentation',
      ops: 'operations',
      data: 'analytics',
      devops: 'operations',
      infra: 'infrastructure',
    };
    const normalized = slug.toLowerCase().trim();
    return mappings[normalized] || normalized;
  },
  listCategories: vi.fn().mockResolvedValue([
    {
      id: '1',
      slug: 'marketing',
      label: 'Marketing',
      color: '#FF44FF',
      description: 'GTM, campaigns, content, social media',
      sortOrder: 1,
      constructCount: 5,
    },
    {
      id: '2',
      slug: 'development',
      label: 'Development',
      color: '#44FF88',
      description: 'Coding, testing, debugging, refactoring',
      sortOrder: 2,
      constructCount: 10,
    },
    {
      id: '3',
      slug: 'security',
      label: 'Security',
      color: '#FF8844',
      description: 'Auditing, scanning, compliance, secrets',
      sortOrder: 3,
      constructCount: 3,
    },
    {
      id: '4',
      slug: 'analytics',
      label: 'Analytics',
      color: '#FFDD44',
      description: 'Data, metrics, reporting, insights',
      sortOrder: 4,
      constructCount: 2,
    },
    {
      id: '5',
      slug: 'documentation',
      label: 'Documentation',
      color: '#44DDFF',
      description: 'Docs, guides, READMEs, knowledge bases',
      sortOrder: 5,
      constructCount: 4,
    },
    {
      id: '6',
      slug: 'operations',
      label: 'Operations',
      color: '#4488FF',
      description: 'DevOps, deployment, monitoring, CI/CD',
      sortOrder: 6,
      constructCount: 6,
    },
    {
      id: '7',
      slug: 'design',
      label: 'Design',
      color: '#FF7B9C',
      description: 'UI/UX, prototyping, design systems',
      sortOrder: 7,
      constructCount: 1,
    },
    {
      id: '8',
      slug: 'infrastructure',
      label: 'Infrastructure',
      color: '#9B7EDE',
      description: 'Cloud, networking, IaC, containers',
      sortOrder: 8,
      constructCount: 2,
    },
  ]),
  getCategoryBySlug: vi.fn().mockImplementation(async (slug: string) => {
    const categories = [
      {
        id: '1',
        slug: 'marketing',
        label: 'Marketing',
        color: '#FF44FF',
        description: 'GTM, campaigns, content, social media',
        sortOrder: 1,
        constructCount: 5,
      },
      {
        id: '2',
        slug: 'development',
        label: 'Development',
        color: '#44FF88',
        description: 'Coding, testing, debugging, refactoring',
        sortOrder: 2,
        constructCount: 10,
      },
    ];
    // Normalize legacy slugs
    const normalizeCategory = (s: string) => {
      const mappings: Record<string, string> = {
        gtm: 'marketing',
        dev: 'development',
      };
      return mappings[s.toLowerCase()] || s.toLowerCase();
    };
    const normalizedSlug = normalizeCategory(slug);
    return categories.find((c) => c.slug === normalizedSlug) || null;
  }),
}));

describe('Categories Routes', () => {
  describe('GET /v1/categories', () => {
    it('returns 200 with list of categories', async () => {
      const res = await app.request('/v1/categories');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(8);
      expect(body).toHaveProperty('request_id');
    });

    it('returns categories with correct shape', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      const marketing = body.data.find((c: { slug: string }) => c.slug === 'marketing');
      expect(marketing).toBeDefined();
      expect(marketing).toHaveProperty('id', 'marketing');
      expect(marketing).toHaveProperty('slug', 'marketing');
      expect(marketing).toHaveProperty('label', 'Marketing');
      expect(marketing).toHaveProperty('color', '#FF44FF');
      expect(marketing).toHaveProperty('description');
      expect(marketing).toHaveProperty('construct_count', 5);
    });

    it('includes all 8 categories', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      const slugs = body.data.map((c: { slug: string }) => c.slug);
      expect(slugs).toContain('marketing');
      expect(slugs).toContain('development');
      expect(slugs).toContain('security');
      expect(slugs).toContain('analytics');
      expect(slugs).toContain('documentation');
      expect(slugs).toContain('operations');
      expect(slugs).toContain('design');
      expect(slugs).toContain('infrastructure');
    });
  });

  describe('GET /v1/categories/:slug', () => {
    it('returns 200 with category by slug', async () => {
      const res = await app.request('/v1/categories/marketing');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('slug', 'marketing');
      expect(body.data).toHaveProperty('label', 'Marketing');
      expect(body.data).toHaveProperty('color', '#FF44FF');
      expect(body).toHaveProperty('request_id');
    });

    it('handles legacy slug gtm -> marketing', async () => {
      const res = await app.request('/v1/categories/gtm');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveProperty('slug', 'marketing');
    });

    it('handles legacy slug dev -> development', async () => {
      const res = await app.request('/v1/categories/dev');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveProperty('slug', 'development');
    });

    it('returns 404 for non-existent category', async () => {
      const res = await app.request('/v1/categories/nonexistent');

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});
