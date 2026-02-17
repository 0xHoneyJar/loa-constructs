import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain('redirect=%2Fdashboard');
  });

  test('login page renders with form and OAuth buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('login form shows validation errors for empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /login/i }).click();
    // Zod validation should show error messages
    await expect(page.locator('text=Please enter a valid email')).toBeVisible({ timeout: 3000 });
  });

  test('register page renders with all fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('logout redirects to login (via middleware)', async ({ page, context }) => {
    // Set auth cookies to simulate logged-in state
    await context.addCookies([
      { name: 'access_token', value: 'mock-token', domain: 'localhost', path: '/' },
    ]);
    // After cookie removal, dashboard should redirect
    await context.clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
