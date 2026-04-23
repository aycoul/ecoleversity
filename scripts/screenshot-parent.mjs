import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

// Parent login
await p.goto("http://localhost:3456/fr/login", { waitUntil: "networkidle" });
await p.click("button:has-text('Email')");
await p.waitForTimeout(800);
await p.fill("input >> nth=0", "test-parent-e2e@ecoleversity.dev");
await p.fill('input[type="password"]', "parent2026");
await p.click('button[type="submit"]');
await p.waitForTimeout(4000);

console.log("URL after login:", p.url());

// Recordings
await p.goto("http://localhost:3456/fr/dashboard/parent/recordings", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.screenshot({ path: "scripts/screenshots/01b-parent-recordings.png", fullPage: false });
console.log("✅ recordings");

// Saved classes
await p.goto("http://localhost:3456/fr/dashboard/parent/saved-classes", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: "scripts/screenshots/02b-parent-saved.png", fullPage: false });
console.log("✅ saved");

// Payments
await p.goto("http://localhost:3456/fr/dashboard/parent/payments", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: "scripts/screenshots/03b-parent-payments.png", fullPage: false });
console.log("✅ payments");

await b.close();
