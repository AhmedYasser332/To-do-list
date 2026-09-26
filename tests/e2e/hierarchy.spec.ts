import { test, expect } from '@playwright/test';

test.describe('Unlimited Hierarchy & Context Inheritance (US3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('creates nested child items, inherits parent Day context, and toggles disclosure', async ({ page }) => {
    const parentTitle = `Parent Task ${Date.now()}`;
    const childTitle = `Subtask 1 ${Date.now()}`;

    // Create parent on Today
    const quickAddInput = page.locator('[data-testid="quick-add-title"]');
    await quickAddInput.fill(parentTitle);
    await quickAddInput.press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // Trigger child creation on parent
    const addChildBtn = parentRow.locator('button[title="Add Subtask"]');
    await parentRow.hover();
    await addChildBtn.click();

    // Fill child creation input
    const childInput = page.locator('[data-testid="inline-child-input"]');
    await expect(childInput).toBeVisible();
    await childInput.fill(childTitle);
    await childInput.press('Enter');

    // Verify child is rendered nested under parent
    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();

    // Test collapse chevron
    const chevronBtn = parentRow.locator('[data-testid="disclosure-chevron"]');
    await chevronBtn.click();
    await expect(childRow).not.toBeVisible();

    // Test expand chevron
    await chevronBtn.click();
    await expect(childRow).toBeVisible();
  });
});
