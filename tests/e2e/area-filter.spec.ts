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
    const addBtn1 = page.locator('[data-testid="add-area-btn"]');
    await expect(addBtn1).toBeEnabled();
    await addBtn1.click();
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

  test('preserves period query parameters when applying and clearing Area filters', async ({ page }) => {
    // 1. Create an Area in settings
    await page.goto('/settings');
    const areaName = `PreserveParamArea ${Date.now()}`;
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="color-picker-steel-blue"]').click();
    const addBtn2 = page.locator('[data-testid="add-area-btn"]');
    await expect(addBtn2).toBeEnabled();
    await addBtn2.click();
    await expect(page.locator(`[data-testid="area-row"]:has-text("${areaName}")`)).toBeVisible();

    // 2. Navigate to Week view with explicit date query
    const targetDate = '2026-09-21';
    await page.goto(`/week?date=${targetDate}`);
    await expect(page).toHaveURL(new RegExp(`date=${targetDate}`));

    // 3. Apply Area filter
    const filterSelect = page.locator('[data-testid="area-filter-select"]');
    await expect(filterSelect).toBeVisible();
    await filterSelect.selectOption({ label: areaName });

    // Verify date param is preserved and area param is added
    await expect(page).toHaveURL(new RegExp(`date=${targetDate}`));
    await expect(page).toHaveURL(/area=/);
    await page.waitForTimeout(300);

    // 4. Clear Area filter via clear button
    await expect(page.locator(`text=Area: ${areaName}`)).toBeVisible();
    const clearBtn = page.locator('[data-testid="clear-area-filter"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(clearBtn).not.toBeVisible();

    // Verify date param is still retained after clearing area filter
    await expect(page).toHaveURL(new RegExp(`date=${targetDate}`));
    await expect(page).not.toHaveURL(/area=/);
  });

  test('renders semantic Area color token correctly on item rows', async ({ page }) => {
    // 1. Create an Area with sage-green color
    await page.goto('/settings');
    const areaName = `SageArea ${Date.now()}`;
    await page.fill('[data-testid="new-area-name-input"]', areaName);
    await page.locator('[data-testid="color-picker-sage-green"]').click();
    const addBtn = page.locator('[data-testid="add-area-btn"]');
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    await expect(page.locator(`[data-testid="area-row"]:has-text("${areaName}")`)).toBeVisible();

    // 2. Add an item with this Area on Today
    await page.goto('/today');
    const taskName = `Sage Task ${Date.now()}`;
    await page.fill('[data-testid="quick-add-title"]', taskName);
    await page.click('[data-testid="quick-add-options-toggle"]');
    await page.selectOption('[data-testid="quick-add-area-select"]', { label: areaName });
    await page.locator('[data-testid="quick-add-title"]').press('Enter');

    const itemRow = page.locator(`[data-testid="item-row"]:has-text("${taskName}")`);
    await expect(itemRow).toBeVisible();

    // 3. Verify the area color indicator dot on the row has the hex color #4A7C59 (or rgb(74, 124, 89))
    const colorDot = itemRow.locator(`span:has-text("${areaName}")`).locator('..').locator('span.rounded-full');
    await expect(colorDot).toBeVisible();
    const bg = await colorDot.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // sage-green is #4A7C59 -> rgb(74, 124, 89)
    expect(bg).toBe('rgb(74, 124, 89)');
  });
});
