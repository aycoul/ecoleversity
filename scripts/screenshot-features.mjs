import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";

const BASE_URL = "http://localhost:3456/fr";
const OUTDIR = "scripts/screenshots";
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

async function screenshot(page, path, filename) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUTDIR}/${filename}`, fullPage: false });
  console.log(`✅ ${filename}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  // Switch to Email tab
  const emailBtn = page.locator('button', { hasText: /Email/i });
  if (await emailBtn.count() > 0) await emailBtn.click();
  await page.waitForTimeout(500);
  // Find email/password inputs by placeholder or type
  const emailInput = page.locator('input').nth(0);
  const pwInput = page.locator('input[type="password"]');
  await emailInput.fill(email);
  await pwInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
}

// ── 1. Parent: Recordings page ──
const parentPage = await context.newPage();
await login(parentPage, "test-parent-e2e@ecoleversity.dev", "parent2026");
await screenshot(parentPage, "/dashboard/parent/recordings", "01-parent-recordings.png");

// ── 2. Parent: Saved classes page ──
await screenshot(parentPage, "/dashboard/parent/saved-classes", "02-parent-saved-classes.png");

// ── 3. Parent: Payments page (shows refund buttons) ──
await screenshot(parentPage, "/dashboard/parent/payments", "03-parent-payments.png");

// ── 4. Teacher: Classes page (shows trial toggle) ──
const teacherPage = await context.newPage();
await login(teacherPage, "test-teacher-e2e@ecoleversity.dev", "teacher2026");
await screenshot(teacherPage, "/dashboard/teacher/classes", "04-teacher-classes.png");

// ── 5. Teacher: New class form ──
await screenshot(teacherPage, "/dashboard/teacher/classes/new", "05-teacher-new-class.png");

// ── 6. Admin: Refunds page ──
const adminPage = await context.newPage();
await login(adminPage, "aycoul@gmail.com", "zmYg6fZaHSmh0X");
await screenshot(adminPage, "/dashboard/admin/refunds", "06-admin-refunds.png");

// ── 7. Admin: Featured teachers page ──
await screenshot(adminPage, "/dashboard/admin/featured-teachers", "07-admin-featured-teachers.png");

// ── 8. Homepage (shows featured teachers section) ──
const homePage = await context.newPage();
await homePage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
await homePage.waitForTimeout(1500);
await homePage.screenshot({ path: `${OUTDIR}/08-homepage.png`, fullPage: false });
console.log("✅ 08-homepage.png");

await browser.close();
console.log("\nAll screenshots saved to", OUTDIR);
