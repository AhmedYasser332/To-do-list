import { test, expect } from '@playwright/test';

test.describe('Unlimited Hierarchy & Context Inheritance (US3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
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

    // Trigger child creation on parent using discoverable button (T072)
    const addChildBtn = parentRow.locator('[data-testid="add-subtask-btn"]');
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

    // Verify expanded subtask button is visible and usable (T072)
    const expandedAddBtn = page.locator('[data-testid="expanded-add-subtask-btn"]').first();
    await expect(expandedAddBtn).toBeVisible();

    // Test collapse chevron
    const chevronBtn = parentRow.locator('[data-testid="disclosure-chevron"]');
    await chevronBtn.click();
    await expect(childRow).not.toBeVisible();

    // Test expand chevron
    await chevronBtn.click();
    await expect(childRow).toBeVisible();
  });

  test('child under Week parent does not inherit Week schedule (T070)', async ({ page }) => {
    await page.goto('/week');
    await expect(page).toHaveURL(/\/week/);

    const weekParentTitle = `Week Parent ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', weekParentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const weekParentRow = page.locator(`[data-testid="item-row"]:has-text("${weekParentTitle}")`);
    await expect(weekParentRow).toBeVisible();

    // Add subtask under week parent
    await weekParentRow.hover();
    await weekParentRow.locator('[data-testid="add-subtask-btn"]').click();
    const subtaskTitle = `Unscheduled Subtask ${Date.now()}`;
    await page.fill('[data-testid="inline-child-input"]', subtaskTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');

    // Child is visible under week parent in Week view
    await expect(page.locator(`[data-testid="item-row"]:has-text("${subtaskTitle}")`)).toBeVisible();

    // Open subtask detail drawer and verify horizon is inbox (unscheduled)
    const subtaskRow = page.locator(`[data-testid="item-row"]:has-text("${subtaskTitle}")`);
    await subtaskRow.click();
    const drawer = page.locator('[data-testid="item-detail-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('select').first()).toHaveValue('inbox');
    await page.click('[data-testid="detail-close-btn"]');
  });

  test('Quick Add with selected parent obeys child invariants (inherits Area)', async ({ page }) => {
    // 1. Create an Area
    await page.goto('/settings');
    const areaName = `QuickParentArea ${Date.now()}`;
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="color-picker-steel-blue"]').click();
    await page.click('[data-testid="add-area-btn"]');
    await expect(page.locator(`[data-testid="area-row"]:has-text("${areaName}")`)).toBeVisible();

    // 2. Go to Today and create a Parent task in that Area
    await page.goto('/today');
    const parentTitle = `QA Parent ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.click('[data-testid="quick-add-options-toggle"]');
    await page.selectOption('[data-testid="quick-add-area-select"]', { label: areaName });
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // 3. Create child via Quick Add selecting the parent in the options
    const childTitle = `QA Child ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', childTitle);
    await page.click('[data-testid="quick-add-options-toggle"]');
    await page.selectOption('[data-testid="quick-add-parent-select"]', { label: parentTitle });
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    // 4. Reveal child by expanding parent and verify child inherits the parent Area
    const chevron = parentRow.locator('[data-testid="disclosure-chevron"]');
    await expect(chevron).toBeVisible();
    await chevron.click();
    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();
    await expect(childRow).toContainText(areaName);
  });
});
