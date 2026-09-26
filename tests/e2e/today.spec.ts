import { test, expect } from '@playwright/test';

test.describe('Today View & Quick Add Flow (US1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and sign in as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('creates title-only task in Anytime section and toggles completion', async ({ page }) => {
    const taskTitle = `Anytime task ${Date.now()}`;

    // Fill Quick Add title-only
    const quickAddInput = page.locator('[data-testid="quick-add-title"]');
    await quickAddInput.fill(taskTitle);
    await quickAddInput.press('Enter');

    // Verify task appears in Anytime section
    const anytimeSection = page.locator('[data-testid="anytime-section"]');
    await expect(anytimeSection).toContainText(taskTitle);

    // Toggle completion on
    const taskRow = page.locator(`[data-testid="item-row"]:has-text("${taskTitle}")`);
    const completionCheckbox = taskRow.locator('[role="checkbox"]');
    await completionCheckbox.click();

    // Verify task is marked completed
    await expect(completionCheckbox).toHaveAttribute('data-state', 'checked');

    // Toggle completion off
    await completionCheckbox.click();
    await expect(completionCheckbox).toHaveAttribute('data-state', 'unchecked');
  });

  test('creates task with time and renders in Timed section', async ({ page }) => {
    const timedTaskTitle = `Timed lecture ${Date.now()}`;

    // Fill Quick Add
    await page.fill('[data-testid="quick-add-title"]', timedTaskTitle);

    // Click optional + Time affordance and set time
    const timeButton = page.locator('[data-testid="quick-add-time-toggle"]');
    if (await timeButton.isVisible()) {
      await timeButton.click();
      await page.fill('[data-testid="quick-add-time-input"]', '09:30');
    }

    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    // Verify task appears in Timed section
    const timedSection = page.locator('[data-testid="timed-section"]');
    await expect(timedSection).toContainText(timedTaskTitle);
    await expect(timedSection).toContainText('09:30');
  });
});
