import { describe, it, expect, vi } from 'vitest';
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

  describe('Response Shape Contract (T2.2)', () => {
    it('every category has id, slug, label, color, description, construct_count', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      expect(body.data.length).toBeGreaterThan(0);

      for (const cat of body.data) {
        // Required fields present
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('slug');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('color');
        expect(cat).toHaveProperty('description');
        expect(cat).toHaveProperty('construct_count');

        // Type constraints
        expect(typeof cat.id).toBe('string');
        expect(typeof cat.slug).toBe('string');
        expect(typeof cat.label).toBe('string');
        expect(typeof cat.color).toBe('string');
        // description can be string or null
        expect(cat.description === null || typeof cat.description === 'string').toBe(true);
        expect(typeof cat.construct_count).toBe('number');
        expect(cat.construct_count).toBeGreaterThanOrEqual(0);

        // Color must be hex format
        expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);

        // Slug is lowercase alphanumeric with hyphens
        expect(cat.slug).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it('id matches slug (public-facing simplification)', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      for (const cat of body.data) {
        // formatCategory uses slug as public ID
        expect(cat.id).toBe(cat.slug);
      }
    });

    it('sort order is consistent (ascending by sortOrder)', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      // The mock data is sorted by sortOrder 1-8
      // Verify the data comes back in the same order
      const slugs = body.data.map((c: { slug: string }) => c.slug);
      expect(slugs).toEqual([
        'marketing',
        'development',
        'security',
        'analytics',
        'documentation',
        'operations',
        'design',
        'infrastructure',
      ]);
    });

    it('no unexpected fields in category response', async () => {
      const res = await app.request('/v1/categories');
      const body = await res.json();

      const allowedFields = ['id', 'slug', 'label', 'color', 'description', 'construct_count'];

      for (const cat of body.data) {
        const keys = Object.keys(cat);
        for (const key of keys) {
          expect(allowedFields).toContain(key);
        }
      }
    });

    it('detail response has same shape as list item', async () => {
      const res = await app.request('/v1/categories/marketing');
      const body = await res.json();

      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('slug');
      expect(body.data).toHaveProperty('label');
      expect(body.data).toHaveProperty('color');
      expect(body.data).toHaveProperty('description');
      expect(body.data).toHaveProperty('construct_count');

      // Same set of fields as list items
      const allowedFields = ['id', 'slug', 'label', 'color', 'description', 'construct_count'];
      const keys = Object.keys(body.data);
      for (const key of keys) {
        expect(allowedFields).toContain(key);
      }
    });
  });
});
