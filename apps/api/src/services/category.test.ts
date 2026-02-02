import { describe, it, expect } from 'vitest';
import { normalizeCategory, DEFAULT_CATEGORIES } from './category.js';

/**
 * Category Service Tests
 * @see prd-category-taxonomy.md §3.3 Legacy Mapping
 * @see sdd-category-taxonomy.md §4 Service Layer
 */
describe('Category Service', () => {
  describe('normalizeCategory', () => {
    it('maps gtm to marketing', () => {
      expect(normalizeCategory('gtm')).toBe('marketing');
    });

    it('maps dev to development', () => {
      expect(normalizeCategory('dev')).toBe('development');
    });

    it('maps docs to documentation', () => {
      expect(normalizeCategory('docs')).toBe('documentation');
    });

    it('maps ops to operations', () => {
      expect(normalizeCategory('ops')).toBe('operations');
    });

    it('maps data to analytics', () => {
      expect(normalizeCategory('data')).toBe('analytics');
    });

    it('maps devops to operations', () => {
      expect(normalizeCategory('devops')).toBe('operations');
    });

    it('maps infra to infrastructure', () => {
      expect(normalizeCategory('infra')).toBe('infrastructure');
    });

    it('returns original slug for non-legacy categories', () => {
      expect(normalizeCategory('marketing')).toBe('marketing');
      expect(normalizeCategory('security')).toBe('security');
      expect(normalizeCategory('design')).toBe('design');
    });

    it('handles case insensitivity', () => {
      expect(normalizeCategory('GTM')).toBe('marketing');
      expect(normalizeCategory('Dev')).toBe('development');
      expect(normalizeCategory('DOCS')).toBe('documentation');
    });

    it('trims whitespace', () => {
      expect(normalizeCategory('  gtm  ')).toBe('marketing');
      expect(normalizeCategory('\tdev\n')).toBe('development');
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('has exactly 8 categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(8);
    });

    it('has unique slugs', () => {
      const slugs = DEFAULT_CATEGORIES.map((c) => c.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(8);
    });

    it('has unique colors', () => {
      const colors = DEFAULT_CATEGORIES.map((c) => c.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(8);
    });

    it('has sequential sort orders', () => {
      const sortOrders = DEFAULT_CATEGORIES.map((c) => c.sortOrder);
      expect(sortOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('includes marketing category (formerly gtm)', () => {
      const marketing = DEFAULT_CATEGORIES.find((c) => c.slug === 'marketing');
      expect(marketing).toBeDefined();
      expect(marketing?.label).toBe('Marketing');
      expect(marketing?.color).toBe('#FF44FF');
    });

    it('includes design category (new)', () => {
      const design = DEFAULT_CATEGORIES.find((c) => c.slug === 'design');
      expect(design).toBeDefined();
      expect(design?.label).toBe('Design');
      expect(design?.color).toBe('#FF7B9C');
    });

    it('includes infrastructure category (new)', () => {
      const infra = DEFAULT_CATEGORIES.find((c) => c.slug === 'infrastructure');
      expect(infra).toBeDefined();
      expect(infra?.label).toBe('Infrastructure');
      expect(infra?.color).toBe('#9B7EDE');
    });

    it('all colors are valid hex codes', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i;
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.color).toMatch(hexRegex);
      }
    });
  });
});
