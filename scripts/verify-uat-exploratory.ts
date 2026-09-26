import { chromium, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function runExploratoryPass() {
  const outputDir = path.join(process.cwd(), 'uat-verification');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3011';
  const email = process.env.OWNER_EMAIL || 'owner@example.com';
  const password = process.env.OWNER_PASSWORD || 'password123';

  const browser = await chromium.launch({ headless: true });

  console.log('--- Starting Exploratory Desktop Pass (1280x800) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();

  // 1. Sign in & Navigation responsiveness
  const t0 = Date.now();
  await desktopPage.goto(`${baseUrl}/login`);
  await desktopPage.fill('input[type="email"]', email);
  await desktopPage.fill('input[type="password"]', password);
  await desktopPage.click('button[type="submit"]');
  await expect(desktopPage).toHaveURL(/\/today/);
  const loginDuration = Date.now() - t0;
  console.log(`1. Navigation responsiveness: Arrived at /today in ${loginDuration}ms`);

  // 4. Create Day task with optional time directly in Quick Add without opening Item Detail
  const timedTitle = `Timed Task ${Date.now()}`;
  const quickAddTitle = desktopPage.locator('[data-testid="quick-add-title"]');
  await quickAddTitle.fill(timedTitle);
  const timeToggle = desktopPage.locator('[data-testid="quick-add-time-toggle"]');
  await expect(timeToggle).toBeVisible();
  await timeToggle.click();
  await desktopPage.fill('[data-testid="quick-add-time-input"]', '14:30');
  await desktopPage.click('[data-testid="quick-add-submit-btn"]');

  const timedSection = desktopPage.locator('[data-testid="timed-section"]');
  await expect(timedSection).toContainText(timedTitle, { timeout: 15000 });
  await expect(timedSection).toContainText('14:30');
  console.log('4. Direct Day task creation with time: PASSED');
  await desktopPage.screenshot({ path: path.join(outputDir, 'desktop-01-timed-quick-add.png') });

  // 5. Create task for specific day directly from Week view
  await desktopPage.goto(`${baseUrl}/week`);
  await expect(desktopPage).toHaveURL(/\/week/);
  const weekDayTitle = `Week Day Direct Task ${Date.now()}`;
  const dayAddBtn = desktopPage.locator('[data-testid^="add-day-task-btn-"]').first();
  await dayAddBtn.click();
  const dayInput = desktopPage.locator('[data-testid="quick-add-title"]').last();
  await dayInput.fill(weekDayTitle);
  await desktopPage.locator('[data-testid="quick-add-submit-btn"]').last().click();
  await expect(desktopPage.locator('body')).toContainText(weekDayTitle, { timeout: 15000 });
  console.log('5. Direct task creation from Week day breakdown: PASSED');
  await desktopPage.screenshot({ path: path.join(outputDir, 'desktop-02-week-day-direct.png') });

  // 6. Area colors selectable and visible
  await desktopPage.goto(`${baseUrl}/settings`);
  await expect(desktopPage).toHaveURL(/\/settings/);
  const areaName = `Sage Area ${Date.now()}`;
  await desktopPage.fill('[data-testid="new-area-name-input"]', areaName);
  await desktopPage.click('[data-testid="color-picker-sage-green"]');
  await desktopPage.click('[data-testid="add-area-btn"]');
  const areaRow = desktopPage.locator(`[data-testid="area-row"]:has-text("${areaName}")`);
  await expect(areaRow).toBeVisible({ timeout: 15000 });
  console.log('6. Area color selection and visibility: PASSED');
  await desktopPage.screenshot({ path: path.join(outputDir, 'desktop-03-area-colors.png') });

  // 7. Weight meaning understandable in Item Detail
  await desktopPage.goto(`${baseUrl}/today`);
  await expect(desktopPage).toHaveURL(/\/today/);
  const testRow = desktopPage.locator('[data-testid="item-row"]').first();
  await testRow.click();
  const drawer = desktopPage.locator('[data-testid="item-detail-drawer"]');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Progress weight');
  await expect(drawer).toContainText('Root item');
  console.log('7. Weight clarity (label & explanation for root/nested): PASSED');
  await desktopPage.screenshot({ path: path.join(outputDir, 'desktop-04-weight-detail.png') });
  await desktopContext.close();

  console.log('--- Starting Exploratory Mobile Pass (iPhone 14: 390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  // Sign in on mobile
  await mobilePage.goto(`${baseUrl}/login`);
  await mobilePage.fill('input[type="email"]', email);
  await mobilePage.fill('input[type="password"]', password);
  await mobilePage.click('button[type="submit"]');
  await expect(mobilePage).toHaveURL(/\/today/);

  // 2. Mobile Plan navigation chooser
  await mobilePage.click('[data-testid="mobile-plan-tab"]');
  const chooser = mobilePage.locator('[data-testid="mobile-plan-chooser"]');
  await expect(chooser).toBeVisible();
  console.log('2. Mobile Plan chooser opens: PASSED');
  await mobilePage.screenshot({ path: path.join(outputDir, 'mobile-01-plan-chooser.png') });

  // Navigate to Month from chooser
  await mobilePage.click('[data-testid="plan-nav-month"]');
  await expect(mobilePage).toHaveURL(/\/month/);
  console.log('2b. Mobile Plan reaches /month: PASSED');
  await mobilePage.screenshot({ path: path.join(outputDir, 'mobile-02-month-view.png') });

  // 3. Subtask discovery on mobile
  await mobilePage.goto(`${baseUrl}/today`);
  await expect(mobilePage).toHaveURL(/\/today/);
  const mobileParentTitle = `Mobile Parent ${Date.now()}`;
  await mobilePage.fill('[data-testid="quick-add-title"]', mobileParentTitle);
  await mobilePage.locator('[data-testid="quick-add-title"]').press('Enter');
  const mobileParentRow = mobilePage.locator(`[data-testid="item-row"]:has-text("${mobileParentTitle}")`);
  await expect(mobileParentRow).toBeVisible({ timeout: 15000 });

  // Subtask button is directly visible on mobile without hover
  const mobileSubtaskBtn = mobileParentRow.locator('[data-testid="add-subtask-btn"]');
  await expect(mobileSubtaskBtn).toBeVisible();
  console.log('3. Subtask button discoverable on mobile touch: PASSED');
  await mobileSubtaskBtn.click();
  const mobileChildTitle = `Mobile Subtask ${Date.now()}`;
  await mobilePage.fill('[data-testid="inline-child-input"]', mobileChildTitle);
  await mobilePage.locator('[data-testid="inline-child-input"]').press('Enter');
  await expect(mobilePage.locator(`[data-testid="item-row"]:has-text("${mobileChildTitle}")`)).toBeVisible({ timeout: 15000 });
  console.log('3b. Subtask created successfully on mobile: PASSED');
  await mobilePage.screenshot({ path: path.join(outputDir, 'mobile-03-subtask-created.png') });

  await mobileContext.close();
  await browser.close();
  console.log('--- All Exploratory Checks Passed Successfully ---');
}

runExploratoryPass().catch((err) => {
  console.error('Exploratory verification failed:', err);
  process.exit(1);
});
