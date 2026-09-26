import { test, expect } from '@playwright/test';

test.describe('Categorization with Areas & Hierarchy Filtering (US6, T083)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.OWNER_EMAIL || 'owner@example.com');
    await page.fill('input[type="password"]', process.env.OWNER_PASSWORD || 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('filters view by Area and clears filter restoring all items', async ({ page }) => {
    // 1. Ensure an Area exists by creating one in Settings
    await page.goto('/settings');
    const areaName = `FilterArea ${Date.now()}`;
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="color-picker-sage-green"]').click();
    await page.click('[data-testid="add-area-btn"]');
    await expect(page.locator(`[data-testid="area-row"]:has-text("${areaName}")`)).toBeVisible();

    // 2. Go to Today and add a task in this Area
    await page.goto('/today');
    const taskInArea = `Task In Area ${Date.now()}`;
    const taskOther = `Task Unassigned ${Date.now()}`;

    // Create task in area via Quick Add progressive disclosure (T073)
    await page.fill('[data-testid="quick-add-title"]', taskInArea);
    await page.click('[data-testid="quick-add-options-toggle"]');
    await page.selectOption('[data-testid="quick-add-area-select"]', { label: areaName });
    await page.locator('[data-testid="quick-add-title"]').press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskInArea}")`)).toBeVisible();

    // Create unassigned task
    await page.fill('[data-testid="quick-add-title"]', taskOther);
    await page.locator('[data-testid="quick-add-title"]').press('Enter');
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskOther}")`)).toBeVisible();

    // 3. Filter by Area using the AreaFilter dropdown
    const filterSelect = page.locator('[data-testid="area-filter-select"]');
    await expect(filterSelect).toBeVisible();
    await filterSelect.selectOption({ label: areaName });

    // 4. Verify Area filter badge appears with area name
    const clearBtn = page.locator('[data-testid="clear-area-filter"]');
    await expect(clearBtn).toBeVisible();
    await expect(page.locator(`text=Area: ${areaName}`)).toBeVisible();

    // 5. Clear filter
    await clearBtn.click();
    await expect(clearBtn).not.toBeVisible();
    await expect(page.locator(`[data-testid="item-row"]:has-text("${taskOther}")`)).toBeVisible();
  });
});
