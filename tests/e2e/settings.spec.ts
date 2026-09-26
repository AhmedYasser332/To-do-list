import { test, expect } from '@playwright/test';

test.describe('Settings & Area Management (US6, US7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
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

    // Create Area
    const input = page.locator('input[placeholder*="New Area name"]');
    await input.fill(areaName);
    await page.click('button:has-text("Add Area")');

    // Verify it appears in the areas list
    const areaRow = page.locator(`[data-testid="area-row"]:has-text("${areaName}")`);
    await expect(areaRow).toBeVisible();

    // Edit Area
    await areaRow.locator('[data-testid="edit-area-btn"]').click();
    const editInput = page.locator('input[autoFocus], input.h-7').first();
    await editInput.fill(updatedName);
    await page.locator('[data-testid="save-area-btn"]').click();

    // Verify updated name appears
    const updatedRow = page.locator(`[data-testid="area-row"]:has-text("${updatedName}")`);
    await expect(updatedRow).toBeVisible();

    // Delete Area
    await updatedRow.locator('[data-testid="delete-area-btn"]').click();
    await expect(page.locator(`[data-testid="area-row"]:has-text("${updatedName}")`)).not.toBeVisible();
  });
});
