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

  test('Year view exposes Month Item tree progress in constituent month card', async ({ page }) => {
    // Isolate this run with its own Area rather than deleting other items in
    // a fixed month. This also keeps repeated runs independent of prior data.
    const areaName = `Year Progress Area ${Date.now()}`;
    await page.goto('/settings');
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="add-area-btn"]').click();
    await expect(page.locator(`[data-testid="area-row"]:has-text("${areaName}")`)).toBeVisible();

    await page.goto('/month?month=2032-05');
    await page.selectOption('[data-testid="area-filter-select"]', { label: areaName });
    await expect(page).toHaveURL(/month=2032-05.*area=/);
    await expect(page.getByText('Monthly Outcomes (0)')).toBeVisible();

    // Create a monthly outcome in the isolated Area.
    const monthGoal = `May Goal ${Date.now()}`;
    const quickAdd = page.locator('[data-testid="quick-add-title"]');
    await expect(quickAdd).toBeEnabled();
    await quickAdd.fill(monthGoal);
    await quickAdd.press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${monthGoal}")`)).toBeVisible();

    // The same Area must be carried into the Year view so its two-item preview
    // cannot be crowded out by data from other test runs.
    const areaId = new URL(page.url()).searchParams.get('area');
    expect(areaId).toBeTruthy();
    await page.goto(`/year?year=2032&area=${areaId}`);
    await expect(page).toHaveURL(/year=2032/);

    // Find the May constituent month card and its real Item progress.
    const mayCard = page.locator('a[href*="month=2032-05"]');
    await expect(mayCard).toBeVisible();
    await expect(mayCard).toContainText(monthGoal);
    await expect(mayCard).toContainText('0%');
  });
});
