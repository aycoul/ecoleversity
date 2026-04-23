import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

// Teacher login
await p.goto("http://localhost:3456/fr/login", { waitUntil: "networkidle" });
await p.click("button:has-text('Email')");
await p.waitForTimeout(800);
await p.fill("input >> nth=0", "test-teacher-e2e@ecoleversity.dev");
await p.fill('input[type="password"]', "teacher2026");
await p.click('button[type="submit"]');
await p.waitForTimeout(4000);

console.log("Teacher URL:", p.url());

// Try to find a class and go to its session room
// First, let's see what sessions exist
await p.goto("http://localhost:3456/fr/dashboard/teacher/sessions", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.screenshot({ path: "scripts/screenshots/09-teacher-sessions.png", fullPage: false });
console.log("✅ teacher sessions");

// Check if there's a "Rejoindre" or session link
const links = await p.locator("a[href*='session']").all();
console.log("Session links:", links.length);
for (const link of links.slice(0, 5)) {
  const href = await link.getAttribute("href");
  const text = await link.textContent();
  console.log(" -", href, text?.trim());
}

// Also try learner room for child Awa
await p.goto("http://localhost:3456/fr/k/awa/classes", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.screenshot({ path: "scripts/screenshots/10-learner-classes.png", fullPage: false });
console.log("✅ learner classes");

await b.close();
