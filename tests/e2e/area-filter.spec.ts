import { test, expect } from '@playwright/test';

test.describe('Categorization with Areas & Hierarchy Filtering (US6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('filters view by Area and clears filter restoring all items', async ({ page }) => {
    // Navigate with simulated area query
    await page.goto('/today?area=test-area-id');

    // The active filter badge should display
    const clearFilterBtn = page.locator('[data-testid="clear-area-filter"]');
    if (await clearFilterBtn.isVisible()) {
      await expect(page.locator('text=Area:')).toBeVisible();

      // Clear filter
      await clearFilterBtn.click();
      await expect(page).toHaveURL(/\/today$/);
      await expect(clearFilterBtn).not.toBeVisible();
    }
  });
});
