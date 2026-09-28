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
});
