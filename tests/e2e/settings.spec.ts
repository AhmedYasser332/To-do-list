import { test, expect } from '@playwright/test';

test.describe('Settings & Area Management (US6, US7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('updates first day of week preference and persists', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    const select = page.locator('#first-day-select');
    await expect(select).toBeVisible();

    // Select Sunday
    await select.selectOption('sunday');

    // Click Save
    const saveBtn = page.locator('button:has-text("Save Preference")');
    await saveBtn.click();

    // Verification message appears
    await expect(page.locator('text=Preference saved successfully.')).toBeVisible();

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator('#first-day-select')).toHaveValue('sunday');

    // Revert back to Monday default
    await page.locator('#first-day-select').selectOption('monday');
    await page.locator('button:has-text("Save Preference")').click();
    await expect(page.locator('text=Preference saved successfully.')).toBeVisible();
  });

  test('creates, edits, and deletes an Area', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    const areaName = `Study ${Date.now()}`;
    const updatedName = `${areaName} Advanced`;

    // Create Area with color and icon selection (T075, Item 8)
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="color-picker-sage-green"]').click();
    await page.locator('[data-testid="icon-picker-book"]').click();
    await page.locator('[data-testid="add-area-btn"]').click();

    // Verify it appears in the areas list
    const areaRow = page.locator(`[data-testid="area-row"]:has-text("${areaName}")`);
    await expect(areaRow).toBeVisible();

    // Edit Area name, change color and icon
    await areaRow.locator('[data-testid="edit-area-btn"]').click();
    const editInput = page.locator('input[autoFocus], input.h-7').first();
    await editInput.fill(updatedName);
    await page.locator('[data-testid="edit-color-picker-warm-amber"]').click();
    await page.locator('[data-testid="edit-icon-picker-dumbbell"]').click();
    await page.locator('[data-testid="save-area-btn"]').click();

    // Verify updated name appears
    const updatedRow = page.locator(`[data-testid="area-row"]:has-text("${updatedName}")`);
    await expect(updatedRow).toBeVisible();

    // Delete Area
    const deleteBtn = updatedRow.locator('[data-testid="delete-area-btn"]');
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();
    await expect(page.locator(`[data-testid="area-row"]:has-text("${updatedName}")`)).not.toBeVisible();
  });
});
