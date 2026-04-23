const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://ecoleversity.com/fr/login', { waitUntil: 'networkidle', timeout: 60000 });
  const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email"), label:has-text("Email")').first();
  await emailTab.waitFor({ timeout: 10000 });
  await emailTab.click();
  await page.waitForTimeout(500);

  await page.locator('input[type="email"], input[name="email"], input[id="email"]').first().fill('test-teacher-e2e@ecoleversity.dev');
  await page.locator('input[type="password"], input[name="password"]').first().fill('teacher2026');
  await page.locator('button[type="submit"]').first().click();

  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:\\Ecoleversity\\scripts\\teacher-dashboard.png', fullPage: false });
  console.log('Teacher dashboard screenshot saved');

  await browser.close();
})();
