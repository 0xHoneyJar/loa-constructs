import { test, expect } from '@playwright/test';

/**
 * Marketing Pages E2E Tests
 * @see sprint.md T26.18: Integration Test Marketing Pages
 */

test.describe('Marketing Pages', () => {
  test.describe('Landing Page', () => {
    test('should display hero section with main headline', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { name: /skill packs.*claude code/i })).toBeVisible();
      await expect(page.getByText(/beyond coding/i)).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
      await page.goto('/');

      // Check navigation links
      await expect(page.getByRole('link', { name: /packs/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /pricing/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /docs/i })).toBeVisible();
    });

    test('should display CTA buttons', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /browse packs/i })).toBeVisible();
    });

    test('should display pricing section', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText(/\$0/)).toBeVisible();
      await expect(page.getByText(/\$29/)).toBeVisible();
      await expect(page.getByText(/\$99/)).toBeVisible();
    });
  });

  test.describe('Pricing Page', () => {
    test('should display all pricing tiers', async ({ page }) => {
      await page.goto('/pricing');

      await expect(page.getByRole('heading', { name: /pricing/i })).toBeVisible();
      await expect(page.getByText(/free/i).first()).toBeVisible();
      await expect(page.getByText(/pro/i).first()).toBeVisible();
      await expect(page.getByText(/team/i).first()).toBeVisible();
      await expect(page.getByText(/enterprise/i).first()).toBeVisible();
    });

    test('should display feature comparison table', async ({ page }) => {
      await page.goto('/pricing');

      await expect(page.getByText(/compare plans/i)).toBeVisible();
      await expect(page.getByText(/api keys/i)).toBeVisible();
    });

    test('should display FAQ section', async ({ page }) => {
      await page.goto('/pricing');

      await expect(page.getByText(/frequently asked questions/i)).toBeVisible();
      await expect(page.getByText(/money-back guarantee/i)).toBeVisible();
    });
  });

  test.describe('About Page', () => {
    test('should display about content', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByRole('heading', { name: /about/i })).toBeVisible();
      await expect(page.getByText(/the honey jar/i)).toBeVisible();
    });

    test('should display origin story', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByText(/why we built this/i)).toBeVisible();
    });

    test('should have contact information', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByText(/hello@thehoneyjar/i)).toBeVisible();
    });
  });

  test.describe('Packs Catalog Page', () => {
    test('should display packs grid', async ({ page }) => {
      await page.goto('/packs');

      await expect(page.getByRole('heading', { name: /skill packs/i })).toBeVisible();
      await expect(page.getByText(/gtm collective/i)).toBeVisible();
    });

    test('should display category filters', async ({ page }) => {
      await page.goto('/packs');

      await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /security/i })).toBeVisible();
    });

    test('should have working pack links', async ({ page }) => {
      await page.goto('/packs');

      const packLink = page.getByRole('link', { name: /gtm collective/i }).first();
      await expect(packLink).toBeVisible();
    });
  });

  test.describe('Pack Detail Page', () => {
    test('should display pack information', async ({ page }) => {
      await page.goto('/packs/gtm-collective');

      await expect(page.getByRole('heading', { name: /gtm collective/i })).toBeVisible();
      await expect(page.getByText(/premium/i)).toBeVisible();
    });

    test('should display install command', async ({ page }) => {
      await page.goto('/packs/gtm-collective');

      await expect(page.getByText(/claude skills add/i)).toBeVisible();
    });

    test('should display commands table', async ({ page }) => {
      await page.goto('/packs/gtm-collective');

      await expect(page.getByText(/\/gtm-setup/i)).toBeVisible();
      await expect(page.getByText(/\/analyze-market/i)).toBeVisible();
    });

    test('should return 404 for non-existent pack', async ({ page }) => {
      const response = await page.goto('/packs/non-existent-pack');

      // Next.js notFound() returns 404
      expect(response?.status()).toBe(404);
    });
  });

  test.describe('Documentation Page', () => {
    test('should display docs content', async ({ page }) => {
      await page.goto('/docs');

      await expect(page.getByRole('heading', { name: /documentation/i })).toBeVisible();
      await expect(page.getByText(/quick start/i)).toBeVisible();
    });

    test('should display CLI reference', async ({ page }) => {
      await page.goto('/docs');

      await expect(page.getByText(/cli reference/i)).toBeVisible();
      await expect(page.getByText(/claude skills add/i)).toBeVisible();
    });
  });

  test.describe('Blog Pages', () => {
    test('should display blog listing', async ({ page }) => {
      await page.goto('/blog');

      await expect(page.getByRole('heading', { name: /blog/i })).toBeVisible();
      await expect(page.getByText(/introducing loa constructs/i)).toBeVisible();
    });

    test('should display blog post', async ({ page }) => {
      await page.goto('/blog/launch');

      await expect(page.getByRole('heading', { name: /introducing loa constructs/i })).toBeVisible();
      await expect(page.getByText(/the honey jar/i)).toBeVisible();
    });
  });

  test.describe('Legal Pages', () => {
    test('should display terms of service', async ({ page }) => {
      await page.goto('/terms');

      await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
      await expect(page.getByText(/account terms/i)).toBeVisible();
    });

    test('should display privacy policy', async ({ page }) => {
      await page.goto('/privacy');

      await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
      await expect(page.getByText(/information we collect/i)).toBeVisible();
    });

    test('should have cross-links between legal pages', async ({ page }) => {
      await page.goto('/terms');

      const privacyLink = page.getByRole('link', { name: /privacy policy/i });
      await expect(privacyLink).toBeVisible();
    });
  });

  test.describe('SEO & Meta', () => {
    test('should have proper meta tags on landing page', async ({ page }) => {
      await page.goto('/');

      const title = await page.title();
      expect(title).toContain('Loa Constructs');

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
    });

    test('should have robots.txt', async ({ page }) => {
      const response = await page.goto('/robots.txt');
      expect(response?.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('sitemap');
    });

    test('should have sitemap.xml', async ({ page }) => {
      const response = await page.goto('/sitemap.xml');
      expect(response?.status()).toBe(200);
    });
  });

  test.describe('Navigation & Footer', () => {
    test('should have consistent header across pages', async ({ page }) => {
      const pages = ['/', '/pricing', '/about', '/docs'];

      for (const url of pages) {
        await page.goto(url);
        await expect(page.getByRole('link', { name: /loa|constructs/i }).first()).toBeVisible();
      }
    });

    test('should have footer with all links', async ({ page }) => {
      await page.goto('/');

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      await expect(page.getByText(/the honey jar/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /github/i }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: /discord/i }).first()).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show mobile menu on small screens', async ({ page }) => {
      await page.goto('/');

      // Mobile menu toggle should be visible on small screens
      const menuButton = page.getByRole('button', { name: /menu/i });
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await expect(page.getByRole('link', { name: /packs/i })).toBeVisible();
      }
    });

    test('should stack pricing cards on mobile', async ({ page }) => {
      await page.goto('/pricing');

      // Page should load without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50); // Allow small tolerance
    });
  });
});
