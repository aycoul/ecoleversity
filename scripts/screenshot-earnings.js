const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. Go to login page
  console.log('Navigating to login...');
  await page.goto('https://ecoleversity.com/fr/login', { waitUntil: 'networkidle', timeout: 60000 });

  // 2. Click the "Email" tab
  console.log('Clicking Email tab...');
  const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email"), label:has-text("Email")').first();
  await emailTab.waitFor({ timeout: 10000 });
  await emailTab.click();
  await page.waitForTimeout(500);

  // 3. Fill email
  console.log('Filling email...');
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill('test-teacher-e2e@ecoleversity.dev');

  // 4. Fill password
  console.log('Filling password...');
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.fill('teacher2026');

  // 5. Click login
  console.log('Clicking login...');
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // 6. Wait for dashboard
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  console.log('Logged in');

  // 7. Go to earnings
  await page.goto('https://ecoleversity.com/fr/dashboard/teacher/earnings', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  console.log('On earnings page');

  // 8. Screenshot
  await page.screenshot({ path: 'C:\\Ecoleversity\\scripts\\earnings-screenshot.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
})();
