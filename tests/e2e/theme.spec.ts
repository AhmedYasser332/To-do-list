import { test, expect } from '@playwright/test';

test.describe('Theme System & Appearance (UAT Polish)', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'owner@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/);
  });

  test('switches between Light, Dark, and System, persisting across reload', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    const darkBtn = page.locator('[data-testid="theme-dark-btn"]');
    const lightBtn = page.locator('[data-testid="theme-light-btn"]');
    const systemBtn = page.locator('[data-testid="theme-system-btn"]');

    await expect(darkBtn).toBeVisible();
    await expect(lightBtn).toBeVisible();
    await expect(systemBtn).toBeVisible();

    // 1. Select Dark
    await darkBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(darkBtn).toHaveAttribute('aria-checked', 'true');

    // Verify localStorage persistence
    const storedDark = await page.evaluate(() => localStorage.getItem('planner-theme'));
    expect(storedDark).toBe('dark');

    // Reload page and verify dark mode is maintained immediately without flash
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('[data-testid="theme-dark-btn"]')).toHaveAttribute('aria-checked', 'true');

    // Verify app shell appearance in dark mode
    await page.goto('/today');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('[data-testid="quick-add-title"]')).toBeVisible();

    // 2. Select Light
    await page.goto('/settings');
    await page.locator('[data-testid="theme-light-btn"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('[data-testid="theme-light-btn"]')).toHaveAttribute('aria-checked', 'true');

    const storedLight = await page.evaluate(() => localStorage.getItem('planner-theme'));
    expect(storedLight).toBe('light');

    // Reload and verify light mode is maintained
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('[data-testid="theme-light-btn"]')).toHaveAttribute('aria-checked', 'true');

    // 3. Select System and verify OS preference response
    await page.locator('[data-testid="theme-system-btn"]').click();
    await expect(page.locator('[data-testid="theme-system-btn"]')).toHaveAttribute('aria-checked', 'true');

    const storedSystem = await page.evaluate(() => localStorage.getItem('planner-theme'));
    expect(storedSystem).toBe('system');

    // Emulate OS dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Emulate OS light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Ensure no hydration mismatches or critical console errors
    const hydrationErrors = consoleErrors.filter(
      (msg) => msg.includes('Hydration') || msg.includes('did not match')
    );
    expect(hydrationErrors).toHaveLength(0);
  });
});
