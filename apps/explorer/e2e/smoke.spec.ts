import { test, expect } from '@playwright/test';

test('3D graph loads on / without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/Constructs/);

  // Canvas should be present (Three.js renders to canvas)
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  expect(errors).toHaveLength(0);
});

test('middleware redirects dashboard to login', async ({ page }) => {
  const response = await page.goto('/dashboard');
  const url = page.url();
  expect(url).toContain('/login');
  expect(url).toContain('redirect=%2Fdashboard');
});
