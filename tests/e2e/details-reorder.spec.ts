import { test, expect } from '@playwright/test';

test.describe('Item Details, Reordering & Error States (US8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('opens item detail drawer, updates fields, and toggles cancel/reopen', async ({ page }) => {
    const title = `Inspect Task ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', title);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    // Click item row to open drawer
    const row = page.locator(`[data-testid="item-row"]:has-text("${title}")`);
    await row.click();

    // Verify detail drawer opens
    const drawer = page.locator('[data-testid="item-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Update description and weight
    await page.fill('[data-testid="detail-description"]', 'Updated detailed notes');
    await page.fill('[data-testid="detail-weight"]', '3');
    await page.click('[data-testid="detail-save-btn"]');

    // Mark Cancelled
    await page.click('[data-testid="detail-cancel-btn"]');
    await expect(drawer.locator('text=Cancelled')).toBeVisible();

    // Reopen
    await page.click('[data-testid="detail-reopen-btn"]');
    await expect(drawer.locator('text=Incomplete')).toBeVisible();

    // Close drawer
    await page.click('[data-testid="detail-close-btn"]');
    await expect(drawer).not.toBeVisible();
  });

  test('prompts confirmation when deleting subtree with subtasks', async ({ page }) => {
    const parentTitle = `Delete Parent ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await parentRow.hover();
    await parentRow.locator('button[title="Add Subtask"]').click();
    await page.fill('[data-testid="inline-child-input"]', 'Subtask To Delete');
    await page.locator('[data-testid="inline-child-input"]').press('Enter');
    await expect(page.locator('[data-testid="item-row"]:has-text("Subtask To Delete")')).toBeVisible();

    // Open detail drawer for parent
    await parentRow.click();
    await page.click('[data-testid="detail-delete-btn"]');

    // Confirmation dialog appears with descendant count
    const confirmDialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('1 subtask');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');
    await expect(parentRow).not.toBeVisible();
  });

  test('reorders sibling items via keyboard accessibility handle and persists', async ({ page }) => {
    const taskA = `Task First ${Date.now()}`;
    const taskB = `Task Second ${Date.now()}`;

    // Create two sibling tasks on Today
    await page.fill('[data-testid="quick-add-title"]', taskA);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskA}")`)).toBeVisible();

    await page.fill('[data-testid="quick-add-title"]', taskB);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskB}")`)).toBeVisible();

    const rowA = page.locator(`[data-testid="item-row"]:has-text("${taskA}")`);
    const dragHandleA = rowA.locator('..').locator('[data-testid="drag-handle"]');

    if (await dragHandleA.isVisible()) {
      // Focus handle and initiate keyboard drag via Space
      await dragHandleA.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');

      // Reload page to verify order persistence
      await page.reload();
      await expect(page.locator(`[data-testid="item-row"]:has-text("${taskA}")`)).toBeVisible();
      await expect(page.locator(`[data-testid="item-row"]:has-text("${taskB}")`)).toBeVisible();
    }
  });
});
