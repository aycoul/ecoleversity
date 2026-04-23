const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Login
  await page.goto('https://ecoleversity.com/fr/login', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Email")');
  await page.fill('input[type="email"]', 'test-teacher-e2e@ecoleversity.dev');
  await page.fill('input[type="password"]', 'teacher2026');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  // Go to earnings and get HTML
  await page.goto('https://ecoleversity.com/fr/dashboard/teacher/earnings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const html = await page.content();

  // Check for key markers
  console.log('HTML length:', html.length);
  console.log('Contains "payoutMethod":', html.includes('payoutMethod'));
  console.log('Contains "requestPayout":', html.includes('requestPayout'));
  console.log('Contains "7 derniers jours":', html.includes('7 derniers jours'));
  console.log('Contains "earnings.last7Days":', html.includes('earnings.last7Days'));
  console.log('Contains "Moyen de paiement":', html.includes('Moyen de paiement'));
  console.log('Contains "Demander un retrait":', html.includes('Demander un retrait'));

  // Save HTML
  fs.writeFileSync('C:\\Ecoleversity\\scripts\\earnings-page-source.html', html);
  console.log('Saved to earnings-page-source.html');

  await browser.close();
})();
