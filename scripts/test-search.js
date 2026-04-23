const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://ecoleversity.com/fr', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  // Click the search button in header
  const searchBtn = page.locator('button[aria-label="Rechercher"]').first();
  await searchBtn.waitFor({ timeout: 10000 });
  await searchBtn.click();
  await page.waitForTimeout(500);

  // Take screenshot of the open dialog
  await page.screenshot({ path: 'C:\\Ecoleversity\\scripts\\search-dialog.png', fullPage: false });
  console.log('Search dialog screenshot saved');

  // Try typing in the input
  const input = page.locator('input[cmdk-input]').first();
  const isVisible = await input.isVisible().catch(() => false);
  console.log('Input visible:', isVisible);

  if (isVisible) {
    await input.fill('cours');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:\\Ecoleversity\\scripts\\search-typed.png', fullPage: false });
    console.log('Search typed screenshot saved');
  }

  await browser.close();
})();
