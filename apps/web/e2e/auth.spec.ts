import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * @see sprint.md T12.1: E2E Testing - Registration → Login → Skill browse
 */

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/email.*required|invalid email/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/invalid|unauthorized|incorrect/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test('should have link to register page', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
      await expect(registerLink).toBeVisible();
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.getByRole('link', { name: /forgot.*password/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      await expect(page.getByRole('heading', { name: /create.*account|sign up|register/i })).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
    });

    test('should show validation for weak password', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('weak');

      await page.getByRole('button', { name: /sign up|register|create/i }).click();

      await expect(page.getByText(/password.*8.*characters|too short/i)).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: /sign in|login|already have/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(page.getByRole('heading', { name: /forgot.*password|reset.*password/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
    });

    test('should show success message after submission', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();

      // Should always show success (email enumeration prevention)
      await expect(page.getByText(/sent|check your email|if.*account exists/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from skills page', async ({ page }) => {
      await page.goto('/skills');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from billing page', async ({ page }) => {
      await page.goto('/billing');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
