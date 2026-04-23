/**
 * Teacher Role Full Audit
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://ecoleversity.com/fr';
const OUT = 'C:\\Ecoleversity\\scripts\\audit-results\\teacher';
const REPORT = { role: 'teacher', pages: [], errors: [], links: [] };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email"), label:has-text("Email")').first();
  await emailTab.waitFor({ timeout: 10000 });
  await emailTab.click();
  await page.waitForTimeout(300);
  await page.locator('input[type="email"], input[name="email"], input[id="email"]').first().fill('test-teacher-e2e@ecoleversity.dev');
  await page.locator('input[type="password"], input[name="password"]').first().fill('teacher2026');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function auditPage(page, name, url, actions = []) {
  const start = Date.now();
  const consoleErrors = [];
  const pageErrors = [];
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
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
            await el.click();
            await page.waitForTimeout(action.wait ?? 1000);
          }
        }
        if (action.type === 'screenshot') {
          await page.screenshot({ path: `${OUT}/${action.name}.png`, fullPage: action.fullPage ?? false });
        }
      } catch (e) {
        REPORT.errors.push({ page: name, action: action.name ?? action.selector, error: e.message });
      }
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

  console.log('=== TEACHER AUDIT ===');
  await login(page);
  console.log('Logged in');

  await auditPage(page, 'Dashboard Overview', '/dashboard/teacher');
  await auditPage(page, 'Availability', '/dashboard/teacher/availability');
  await auditPage(page, 'Sessions', '/dashboard/teacher/sessions');
  await auditPage(page, 'Classes', '/dashboard/teacher/classes');
  await auditPage(page, 'Recorded Courses', '/dashboard/teacher/courses');
  await auditPage(page, 'Earnings', '/dashboard/teacher/earnings', [
    { type: 'click', selector: 'button:has-text("Modifier")', name: 'click_edit_payout', wait: 1000 },
    { type: 'screenshot', name: 'earnings_edit_open', fullPage: true },
  ]);
  await auditPage(page, 'Transactions', '/dashboard/teacher/transactions');
  await auditPage(page, 'Messages', '/dashboard/teacher/messages');
  await auditPage(page, 'Settings', '/dashboard/settings/notifications');
  await auditPage(page, 'Public Teachers', '/teachers');
  await auditPage(page, 'Public Courses', '/courses');

  // Sidebar link check
  console.log('Checking sidebar links...');
  await page.goto(`${BASE}/dashboard/teacher`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const links = await page.locator('aside a[href^="/"]').all().catch(() => []);
  for (const link of links) {
    try {
      const href = await link.getAttribute('href', { timeout: 5000 });
      if (href && href.startsWith('/')) {
        const res = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (res?.status() >= 400) REPORT.links.push({ href, status: res.status() });
      }
    } catch (e) {
      /* ignore individual link errors */
    }
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(REPORT, null, 2));
  console.log('\n=== TEACHER AUDIT COMPLETE ===');
  console.log(`Pages: ${REPORT.pages.length}, Errors: ${REPORT.errors.length}, Broken links: ${REPORT.links.length}`);
  REPORT.errors.forEach(e => console.log(`  ERR: ${e.page}: ${e.error}`));
  REPORT.links.forEach(l => console.log(`  404: ${l.href}`));
})();
