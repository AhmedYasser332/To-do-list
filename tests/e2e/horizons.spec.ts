import { test, expect } from '@playwright/test';

test.describe('Horizons Navigation & Period Quick Add (US7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('navigates to Inbox and captures an unscheduled item', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page).toHaveURL(/\/inbox/);

    const inboxTitle = `Inbox Idea ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', inboxTitle);
    const submitBtn = page.locator('[data-testid="quick-add-submit-btn"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    } else {
      await page.locator('[data-testid="quick-add-title"]').press('Enter');
    }

    await expect(page.locator(`text="${inboxTitle}"`)).toBeVisible();
  });

  test('navigates to Week view, switches periods, and creates a week-bound item', async ({ page }) => {
    await page.goto('/week');
    await expect(page).toHaveURL(/\/week/);

    // Verify next week button transitions period
    const nextBtn = page.locator('[data-testid="next-period-btn"]');
    await nextBtn.click();
    await expect(page).toHaveURL(/date=/);

    // Add item in selected week
    const weekTitle = `Selected Week Goal ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', weekTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    await expect(page.locator(`text="${weekTitle}"`)).toBeVisible();
  });

  test('navigates to Month and Year views through UI navigation', async ({ page, isMobile }) => {
    if (isMobile) {
      // Real Mobile Plan Chooser interaction (T071)
      const planTab = page.locator('[data-testid="mobile-plan-tab"]');
      await expect(planTab).toBeVisible();

      // 1. Tap Plan -> Select Month -> Verify /month
      await planTab.click();
      const chooser = page.locator('[data-testid="mobile-plan-chooser"]');
      await expect(chooser).toBeVisible();
      await page.locator('[data-testid="plan-nav-month"]').click();
      await expect(page).toHaveURL(/\/month/);
      await expect(chooser).not.toBeVisible();

      // 2. Reopen Plan -> Select Year -> Verify /year
      await planTab.click();
      await expect(chooser).toBeVisible();
      await page.locator('[data-testid="plan-nav-year"]').click();
      await expect(page).toHaveURL(/\/year/);
      await expect(chooser).not.toBeVisible();

      // 3. Reopen Plan -> Select Week -> Verify /week
      await planTab.click();
      await expect(chooser).toBeVisible();
      await page.locator('[data-testid="plan-nav-week"]').click();
      await expect(page).toHaveURL(/\/week/);
    } else {
      // Desktop Sidebar UI interaction
      await page.click('aside nav a:has-text("Month")');
      await expect(page).toHaveURL(/\/month/);

      await page.click('aside nav a:has-text("Year")');
      await expect(page).toHaveURL(/\/year/);

      await page.click('aside nav a:has-text("Week")');
      await expect(page).toHaveURL(/\/week/);
    }
  });
});
