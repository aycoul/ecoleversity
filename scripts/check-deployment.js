const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Fetch the earnings page HTML (no auth needed — we just need to see if new code exists)
  console.log('Fetching earnings page source...');
  await page.goto('https://ecoleversity.com/fr/dashboard/teacher/earnings', { waitUntil: 'networkidle', timeout: 30000 });

  const html = await page.content();

  // 2. Check for new code markers
  const hasPayoutSection = html.includes('payoutMethod') || html.includes('requestPayout');
  const hasLast7DaysTranslation = html.includes('7 derniers jours');
  const hasRawKey = html.includes('earnings.last7Days');
  const hasForceDynamic = html.includes('force-dynamic'); // won't be in HTML but checking anyway

  console.log('\n=== DEPLOYMENT CHECK RESULTS ===');
  console.log('Has payout section code:', hasPayoutSection);
  console.log('Has "7 derniers jours" translation:', hasLast7DaysTranslation);
  console.log('Has raw translation key (earnings.last7Days):', hasRawKey);
  console.log('\nHTML length:', html.length, 'chars');

  // 3. Check for Next.js build ID or data
  const nextDataMatch = html.match(/"buildId":"([^"]+)"/);
  if (nextDataMatch) {
    console.log('Next.js buildId:', nextDataMatch[1]);
  }

  // 4. Save raw HTML for inspection
  const fs = require('fs');
  fs.writeFileSync('C:\\Ecoleversity\\scripts\\earnings-source.html', html);
  console.log('\nRaw HTML saved to scripts/earnings-source.html');

  // 5. Take screenshot anyway
  await page.screenshot({ path: 'C:\\Ecoleversity\\scripts\\earnings-check.png', fullPage: true });
  console.log('Screenshot saved to scripts/earnings-check.png');

  await browser.close();
})();
