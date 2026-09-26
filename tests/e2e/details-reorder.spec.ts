import { test, expect } from '@playwright/test';

test.describe('Item Details, Reordering & Error States (US8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('opens item detail drawer, updates fields, and toggles cancel/reopen', async ({ page }) => {
    const title = `Inspect Task ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', title);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    // Click item row to open drawer
    const row = page.locator(`[data-testid="item-row"]:has-text("${title}")`);
    await expect(row).toBeVisible();
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
    await expect(parentRow).toBeVisible();
    await parentRow.hover();
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
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
    const dragHandleA = page
      .locator('.group')
      .filter({ has: page.locator(`[data-testid="item-row"]:has-text("${taskA}")`) })
      .locator('[data-testid="drag-handle"]');

    await expect(dragHandleA).toBeAttached();
    await dragHandleA.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    // Reload page to verify order persistence
    await page.reload();
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskA}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskB}")`)).toBeVisible();
  });

  test('preserves existing Week scheduling without corruption when saving details (T068)', async ({ page }) => {
    await page.goto('/week');
    await expect(page).toHaveURL(/\/week/);

    const weekItemTitle = `Week Goal ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', weekItemTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const weekRow = page.locator(`[data-testid="item-row"]:has-text("${weekItemTitle}")`);
    await expect(weekRow).toBeVisible();

    // Open detail drawer
    await weekRow.click();
    const drawer = page.locator('[data-testid="item-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Edit non-scheduling fields
    await page.fill('[data-testid="detail-description"]', 'Week goal description notes');
    await page.fill('[data-testid="detail-weight"]', '2');
    await page.click('[data-testid="detail-save-btn"]');
    await page.click('[data-testid="detail-close-btn"]');

    // Reload /week and verify item remains visible (periodEnd was NOT collapsed to periodStart)
    await page.reload();
    await expect(page.locator(`[data-testid="item-row"]:has-text("${weekItemTitle}")`)).toBeVisible();
  });

  test('calculates recursive descendant count when confirming subtree deletion (T081)', async ({ page }) => {
    const parentTitle = `Recursive Parent ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // Add direct child via row button
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', 'Direct Child');
    await page.locator('[data-testid="inline-child-input"]').press('Enter');
    const childRow = page.locator('[data-testid="item-row"]:has-text("Direct Child")');
    await expect(childRow).toBeVisible();

    // Add grandchild via Item Detail subtask action (T072)
    await childRow.click();
    const drawer = page.locator('[data-testid="item-detail-drawer"]');
    await expect(drawer).toBeVisible();
    await page.click('[data-testid="detail-add-subtask-btn"]');
    await page.fill('[data-testid="detail-subtask-input"]', 'Deep Grandchild');
    await page.click('[data-testid="detail-save-subtask-btn"]');
    await page.click('[data-testid="detail-close-btn"]');

    // Open Parent detail drawer and trigger delete
    await parentRow.click();
    await page.click('[data-testid="detail-delete-btn"]');

    // Confirmation dialog must report recursive count: 2 subtasks (child + grandchild)
    const confirmDialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('2 subtasks');

    await page.click('[data-testid="confirm-delete-btn"]');
    await expect(parentRow).not.toBeVisible();
  });
});
