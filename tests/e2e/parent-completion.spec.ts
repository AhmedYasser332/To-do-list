import { test, expect } from '@playwright/test';

test.describe('Direct Parent Completion with Descendant Resolution (US5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('completes parent only: sets parent 100% with manual badge while children stay incomplete', async ({ page }) => {
    const parentTitle = `Parent Goal ${Date.now()}`;
    const childTitle = `Subtask A ${Date.now()}`;

    // Create parent on Today
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // Add child
    await parentRow.hover().catch(() => {});
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', childTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');

    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();

    // Click completion circle on parent
    await parentRow.locator('[role="checkbox"]').click();

    // Dialog should appear with 3 options
    const dialog = page.locator('[data-testid="completion-dialog"]');
    await expect(dialog).toBeVisible();

    // Select "Complete parent only"
    await page.click('[data-testid="complete-parent-only-btn"]');

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Parent displays manual badge and checked checkbox
    await expect(parentRow).toContainText('Manual');
    await expect(parentRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');

    // Child is still incomplete
    await expect(childRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'unchecked');

    // Reopen parent
    const parentCheckbox = parentRow.locator('[role="checkbox"]');
    await expect(parentCheckbox).toBeEnabled();
    await parentCheckbox.click();
    await expect(parentRow).not.toContainText('Manual');
    await expect(parentCheckbox).toHaveAttribute('data-state', 'unchecked');
  });

  test('completes parent and all descendants: marks both complete', async ({ page }) => {
    const parentTitle = `Full Parent ${Date.now()}`;
    const childTitle = `Full Subtask ${Date.now()}`;

    // Create parent and child
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();
    await parentRow.hover().catch(() => {});
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', childTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');

    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();

    // Click parent checkbox
    await parentRow.locator('[role="checkbox"]').click();
    await expect(page.locator('[data-testid="completion-dialog"]')).toBeVisible();

    // Select "Complete parent and all descendants"
    await page.click('[data-testid="complete-all-descendants-btn"]');

    // Both should be checked
    await expect(parentRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');
    await expect(childRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');
  });

  test('cancels completion prompt: leaves parent and child states untouched', async ({ page }) => {
    const parentTitle = `Cancel Parent ${Date.now()}`;
    const childTitle = `Cancel Subtask ${Date.now()}`;

    // Create parent and child
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();
    await parentRow.hover().catch(() => {});
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', childTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');

    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();

    // Click parent checkbox
    await parentRow.locator('[role="checkbox"]').click();
    const dialog = page.locator('[data-testid="completion-dialog"]');
    await expect(dialog).toBeVisible();

    // Click Cancel in dialog
    await page.click('[data-testid="completion-cancel-btn"]');
    await expect(dialog).not.toBeVisible();

    // Both should still be unchecked
    await expect(parentRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'unchecked');
    await expect(childRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'unchecked');
  });

  test('prompts 3-option dialog when direct child is complete but deep grandchild is incomplete (T082)', async ({ page }) => {
    const parentTitle = `Deep Grandparent ${Date.now()}`;
    const childTitle = `Middle Child ${Date.now()}`;
    const grandchildTitle = `Deep Grandchild ${Date.now()}`;

    // 1. Create parent
    await page.fill('[data-testid="quick-add-title"]', parentTitle);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');
    const parentRow = page.locator(`[data-testid="item-row"]:has-text("${parentTitle}")`);
    await expect(parentRow).toBeVisible();

    // 2. Add middle child
    await parentRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', childTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');
    const childRow = page.locator(`[data-testid="item-row"]:has-text("${childTitle}")`);
    await expect(childRow).toBeVisible();

    // 3. Add deep grandchild under middle child
    await childRow.locator('[data-testid="add-subtask-btn"]').click();
    await page.fill('[data-testid="inline-child-input"]', grandchildTitle);
    await page.locator('[data-testid="inline-child-input"]').press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${grandchildTitle}")`)).toBeVisible();

    // 4. Mark middle child complete directly: triggers 3-option dialog because grandchild is incomplete
    await childRow.locator('[role="checkbox"]').click();
    const dialog = page.locator('[data-testid="completion-dialog"]');
    await expect(dialog).toBeVisible();
    await page.click('[data-testid="complete-parent-only-btn"]'); // Child is complete manually, grandchild incomplete
    await expect(dialog).not.toBeVisible();
    await expect(childRow).toContainText('Manual');

    // 5. Now try to complete Grandparent: direct child is complete, but deep grandchild is incomplete!
    await parentRow.locator('[role="checkbox"]').click();
    // 3-option dialog MUST trigger recursively (T082)!
    await expect(dialog).toBeVisible();

    // Complete all descendants
    await page.click('[data-testid="complete-all-descendants-btn"]');
    await expect(dialog).not.toBeVisible();
    await expect(parentRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');
    await expect(childRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');
    await expect(childRow.locator('[role="checkbox"]')).toHaveAttribute('data-state', 'checked');
  });
});
