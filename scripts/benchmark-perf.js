const { chromium } = require('playwright');

async function measureNavigation(baseUrl) {
  console.log(`\n========================================`);
  console.log(`Benchmarking Navigations on ${baseUrl}`);
  console.log(`========================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Sign In
  const loginStart = Date.now();
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"]', 'owner@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/today');
  console.log(`Login & reach /today: ${Date.now() - loginStart}ms`);

  // Cold Navigations (first hit on this server instance)
  console.log(`\n--- Cold Navigations ---`);
  
  // Today -> Inbox
  let start = Date.now();
  await page.click('aside nav a:has-text("Inbox")');
  await page.waitForURL('**/inbox');
  await page.waitForSelector('text=Inbox');
  const coldTodayToInbox = Date.now() - start;
  console.log(`Cold Today -> Inbox: ${coldTodayToInbox}ms`);

  // Inbox -> Today
  await page.click('aside nav a:has-text("Today")');
  await page.waitForURL('**/today');
  await page.waitForSelector('text=Today');

  // Today -> Week
  start = Date.now();
  await page.click('aside nav a:has-text("Week")');
  await page.waitForURL('**/week');
  await page.waitForSelector('text=Week');
  const coldTodayToWeek = Date.now() - start;
  console.log(`Cold Today -> Week: ${coldTodayToWeek}ms`);

  // Week -> Month
  start = Date.now();
  await page.click('aside nav a:has-text("Month")');
  await page.waitForURL('**/month');
  await page.waitForSelector('text=Month');
  const coldWeekToMonth = Date.now() - start;
  console.log(`Cold Week -> Month: ${coldWeekToMonth}ms`);

  // Warm Navigations (second hit, already compiled)
  console.log(`\n--- Warm Navigations ---`);
  
  // Back to Today
  await page.click('aside nav a:has-text("Today")');
  await page.waitForURL('**/today');

  // Warm Today -> Inbox
  start = Date.now();
  await page.click('aside nav a:has-text("Inbox")');
  await page.waitForURL('**/inbox');
  const warmTodayToInbox = Date.now() - start;
  console.log(`Warm Today -> Inbox: ${warmTodayToInbox}ms`);

  // Back to Today
  await page.click('aside nav a:has-text("Today")');
  await page.waitForURL('**/today');

  // Warm Today -> Week
  start = Date.now();
  await page.click('aside nav a:has-text("Week")');
  await page.waitForURL('**/week');
  const warmTodayToWeek = Date.now() - start;
  console.log(`Warm Today -> Week: ${warmTodayToWeek}ms`);

  // Warm Week -> Month
  start = Date.now();
  await page.click('aside nav a:has-text("Month")');
  await page.waitForURL('**/month');
  const warmWeekToMonth = Date.now() - start;
  console.log(`Warm Week -> Month: ${warmWeekToMonth}ms`);

  await browser.close();

  return {
    coldTodayToInbox,
    coldTodayToWeek,
    coldWeekToMonth,
    warmTodayToInbox,
    warmTodayToWeek,
    warmWeekToMonth,
  };
}

(async () => {
  const url = process.argv[2] || 'http://localhost:3011';
  try {
    const results = await measureNavigation(url);
    console.log('\nResults Summary:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
