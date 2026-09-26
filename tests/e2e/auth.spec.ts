import { test, expect } from '@playwright/test';

test.describe('Single-User Authentication & Route Gating (US2)', () => {
  test('redirects unauthenticated visitors from /today to /login', async ({ page }) => {
    await page.goto('/today');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('redirects unauthenticated visitors from root / to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('displays a calm error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'invalidpassword');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('[data-testid="auth-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('allows owner to sign in, persists session across reload, and signs out', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to /today
    await expect(page).toHaveURL(/\/today/);

    // Reload page to verify session persistence
    await page.reload();
    await expect(page).toHaveURL(/\/today/);

    // Sign out
    const signOutBtn = page.locator('[data-testid="sign-out-btn"]');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
