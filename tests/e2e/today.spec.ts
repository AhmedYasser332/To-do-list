import { test, expect } from '@playwright/test';

test.describe('Today View & Quick Add Flow (US1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and sign in as owner
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator('h1')).toHaveText('Today');
  });

  test('creates title-only task in Anytime section and toggles completion', async ({ page }) => {
    const taskTitle = `Anytime task ${Date.now()}`;

    // Fill Quick Add title-only and ensure hydration
    const quickAddInput = page.locator('[data-testid="quick-add-title"]');
    await expect(quickAddInput).toBeEnabled();
    await quickAddInput.fill(taskTitle);
    const submitBtn = page.locator('[data-testid="quick-add-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify task appears and toggle completion on
    const taskRow = page.locator(`[data-testid="item-row"]:has-text("${taskTitle}")`);
    await expect(taskRow).toBeVisible();
    const completionCheckbox = taskRow.locator('[role="checkbox"]');
    await expect(completionCheckbox).toBeEnabled();
    await completionCheckbox.click();

    // Verify task is marked completed
    await expect(completionCheckbox).toHaveAttribute('data-state', 'checked');

    // Wait past debounce window (400ms) before toggling completion off
    await page.waitForTimeout(600);
    await expect(completionCheckbox).toBeEnabled();
    await completionCheckbox.click();
    await expect(completionCheckbox).toHaveAttribute('data-state', 'unchecked');
  });

  test('creates task with time and renders in Timed section', async ({ page }) => {
    const timedTaskTitle = `Timed lecture ${Date.now()}`;

    // Fill Quick Add
    const input = page.locator('[data-testid="quick-add-title"]');
    await expect(input).toBeEnabled();
    await input.fill(timedTaskTitle);

    // Click optional + Time affordance and set time
    const timeButton = page.locator('[data-testid="quick-add-time-toggle"]');
    await expect(timeButton).toBeVisible();
    await timeButton.click();
    await page.fill('[data-testid="quick-add-time-input"]', '09:30');

    const submitBtn = page.locator('[data-testid="quick-add-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify task appears in Timed section
    const timedRow = page.locator(`[data-testid="item-row"]:has-text("${timedTaskTitle}")`);
    await expect(timedRow).toBeVisible();
    await expect(timedRow).toContainText('09:30');
  });

  test('displays compact completion summary updating on task completion', async ({ page }) => {
    const summaryTask = `Summary Task ${Date.now()}`;

    // Add a task
    const input = page.locator('[data-testid="quick-add-title"]');
    await expect(input).toBeEnabled();
    await input.fill(summaryTask);
    const submitBtn = page.locator('[data-testid="quick-add-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for the task to be visible
    const taskRow = page.locator(`[data-testid="item-row"]:has-text("${summaryTask}")`);
    await expect(taskRow).toBeVisible();

    const summary = page.locator('[data-testid="today-completion-summary"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('completed');

    // Complete the task
    await taskRow.locator('[role="checkbox"]').click();

    // Verify summary reflects completion
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('completed');
  });

  test('Planning Context finds nested horizon items and respects Area filter', async ({ page }) => {
    const stamp = Date.now();
    const areaA = `Ctx Area A ${stamp}`;
    const areaB = `Ctx Area B ${stamp}`;
    const parentTitle = `Ctx Parent ${stamp}`;
    const weekChild = `Nested Week Task ${stamp}`;

    // Provision two Areas
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    for (const name of [areaA, areaB]) {
      await page.fill('[data-testid="new-area-name-input"]', name);
      await page.locator('[data-testid="add-area-btn"]').click();
      await expect(page.locator(`[data-testid="area-row"]:has-text("${name}")`)).toBeVisible();
    }

    // Create a Day parent tagged with Area A
    await page.goto('/today');
    await page.click('[data-testid="quick-add-options-toggle"]');
    await page.selectOption('[data-testid="quick-add-area-select"]', { label: areaA });
    const quickAddInput = page.locator('[data-testid="quick-add-title"]');
    await expect(quickAddInput).toBeEnabled();
    await quickAddInput.fill(parentTitle);
    const submitBtn = page.locator('[data-testid="quick-add-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // Add a subtask (inherits Area A and Day context)
    await parentRow.hover();
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    const childInput = page.locator('[data-testid="inline-child-input"]');
    await expect(childInput).toBeVisible();
    await childInput.fill(weekChild);
    await childInput.press('Enter');
    const childRow = page.locator(`[data-testid="item-row"]:has-text("${weekChild}")`);
    await expect(childRow).toBeVisible();

    // Repoint the subtask at the Week horizon via the details drawer;
    // scheduling resolves to the current week while it stays nested under the Day parent
    await childRow.click();
    const drawer = page.locator('[data-testid="item-detail-drawer"]');
    await expect(drawer).toBeVisible();
    await drawer.locator('select').first().selectOption('week');
    await page.click('[data-testid="detail-save-btn"]');
    await expect(page.locator('[data-testid="detail-save-btn"]')).toBeEnabled();
    await page.click('[data-testid="detail-close-btn"]');
    await expect(drawer).not.toBeVisible();

    // Match only this test's Area so other tests' week items cannot disguise
    // a failed save. The Week item remains nested under the Day parent.
    await page.selectOption('[data-testid="area-filter-select"]', { label: areaA });
    await expect(page.getByText('This Week (1)')).toBeVisible();
    // The nested Week item is planning context, not an extra Day task.
    await expect(page.locator('[data-testid="today-completion-summary"]'))
      .toContainText('0 of 1 completed (0%)');

    // Non-matching Area removes the whole subtree from Today
    await page.locator('[data-testid="clear-area-filter"]').click();
    await page.selectOption('[data-testid="area-filter-select"]', { label: areaB });
    await expect(page.getByText(weekChild)).toHaveCount(0);
    await expect(page.getByText(parentTitle)).toHaveCount(0);
  });
});
