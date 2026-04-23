const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://ecoleversity.com/fr';
const OUT = 'C:\\Ecoleversity\\scripts\\audit-results\\admin';
const REPORT = { role: 'admin', pages: [], errors: [], links: [] };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email"), label:has-text("Email")').first();
  await emailTab.waitFor({ timeout: 10000 });
  await emailTab.click();
  await page.waitForTimeout(300);
  await page.locator('input[type="email"]').first().fill('aycoul@gmail.com');
  await page.locator('input[type="password"]').first().fill('zmYg6fZaHSmh0X');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function auditPage(page, name, url, actions = []) {
  const start = Date.now();
  const consoleErrors = [], pageErrors = [];
  const consoleHandler = msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  const responseHandler = res => { if (res.status() >= 400) pageErrors.push(`${res.url()} -> ${res.status()}`); };
  page.on('console', consoleHandler);
  page.on('response', responseHandler);
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    for (const action of actions) {
      try {
        if (action.type === 'click') {
          const el = page.locator(action.selector).first();
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) { await el.click(); await page.waitForTimeout(action.wait ?? 1000); }
        }
      } catch (e) { REPORT.errors.push({ page: name, action: action.name ?? action.selector, error: e.message }); }
    }
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    await page.screenshot({ path: `${OUT}/${safeName}.png`, fullPage: true });
    REPORT.pages.push({ name, url, duration: Date.now() - start, consoleErrors, pageErrors });
  } catch (e) {
    REPORT.errors.push({ page: name, url, error: e.message });
    await page.screenshot({ path: `${OUT}/${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ERROR.png`, fullPage: true });
  }
  page.off('console', consoleHandler);
  page.off('response', responseHandler);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  console.log('=== ADMIN AUDIT ===');
  await login(page);
  await auditPage(page, 'Admin Overview', '/dashboard/admin');
  await auditPage(page, 'Verification', '/dashboard/admin/verification');
  await auditPage(page, 'Payments', '/dashboard/admin/payments');
  await auditPage(page, 'Payouts', '/dashboard/admin/payouts');
  await auditPage(page, 'Reports', '/dashboard/admin/reports');
  await auditPage(page, 'Strikes', '/dashboard/admin/strikes');
  await auditPage(page, 'Tickets', '/dashboard/admin/tickets');
  await auditPage(page, 'Agents', '/dashboard/admin/agents');
  await auditPage(page, 'Analytics', '/dashboard/admin/analytics');
  await auditPage(page, 'AI Twins', '/dashboard/admin/ai-twins');
  await auditPage(page, 'AI Settings', '/dashboard/admin/ai-settings');
  await auditPage(page, 'Settings', '/dashboard/settings/notifications');
  await page.goto(`${BASE}/dashboard/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  const links = await page.locator('aside a[href^="/"]').all().catch(() => []);
  for (const link of links) {
    try {
      const href = await link.getAttribute('href', { timeout: 5000 });
      if (href && href.startsWith('/')) {
        const res = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (res?.status() >= 400) REPORT.links.push({ href, status: res.status() });
      }
    } catch (e) { /* ignore */ }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(REPORT, null, 2));
  console.log('\n=== ADMIN COMPLETE ===');
  console.log(`Pages: ${REPORT.pages.length}, Errors: ${REPORT.errors.length}, Broken links: ${REPORT.links.length}`);
  REPORT.errors.forEach(e => console.log(`  ERR: ${e.page}: ${e.error}`));
  REPORT.links.forEach(l => console.log(`  404: ${l.href}`));
})();
