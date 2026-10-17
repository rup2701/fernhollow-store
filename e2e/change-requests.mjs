// Acceptance checks for change requests CR-001 (returns page) and CR-002 (footer, help, contact).
// Run with the app already running: npm run test:e2e
import { chromium } from "playwright";

// Checks for CR-001 (returns page) and CR-002 (footer/subfooter, help, contact).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./screenshots/", import.meta.url).pathname;
await import("node:fs").then((fs) => fs.mkdirSync(OUT, { recursive: true }));
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// Footer present everywhere with the three links + payment list
for (const path of ["/", "/shop", "/shop/engraved-walnut-board", "/cart", "/checkout", "/returns", "/help", "/contact"]) {
  await page.goto(BASE + path);
  const footer = page.locator("footer");
  const links = await Promise.all(["Help & FAQ", "Returns & refunds", "Contact us"].map((n) => footer.getByRole("link", { name: n, exact: true }).count()));
  const payments = await footer.getByRole("list", { name: "We accept" }).locator("li").count();
  check(`footer on ${path}: help/returns/contact links + payments`, links.every((c) => c >= 1) && payments >= 5, `${payments} methods`);
}
check("no brand images in footer", (await page.locator("footer img, footer svg[aria-label]").count()) === 0);
check("subfooter says payment is demo-only", (await page.locator("footer").getByText(/never collects payment/).count()) === 1);

// Follow each footer link
for (const [name, h1] of [
  ["Returns & refunds", "Returns & refunds"],
  ["Help & FAQ", "Help & FAQ"],
  ["Contact us", "Get in touch"],
]) {
  await page.goto(BASE + "/");
  await page.locator("footer").getByRole("link", { name, exact: true }).first().click();
  await page.waitForLoadState("networkidle");
  check(`footer link "${name}" opens page`, (await page.getByRole("heading", { level: 1 }).textContent()) === h1);
}

// Returns page content
await page.goto(BASE + "/returns");
const text = await page.locator("main").innerText();
for (const [label, re] of [
  ["return window", /30 days of delivery/],
  ["condition", /original condition/],
  ["how to start", /How to start a return/],
  ["refund method/timing", /original payment method[\s\S]*business days/],
  ["return shipping", /Return shipping is paid by you/],
  ["damaged items", /damaged or incorrect/i],
  ["final sale", /can.t be returned/],
  ["demo notice", /Sample policy/],
]) check(`returns page: ${label}`, re.test(text));
await page.screenshot({ path: OUT + "returns-desktop.png", fullPage: true });

// Final-sale note on personalizable product only
await page.goto(BASE + "/shop/engraved-walnut-board");
check("final-sale note on personalizable product", (await page.getByText("Personalized pieces are final sale.").count()) === 1);
const describedBy = await page.getByLabel(/Engraving/).getAttribute("aria-describedby");
check("final-sale note linked to input via aria-describedby", describedBy.includes("-final"));
await page.goto(BASE + "/shop/speckled-stoneware-mug");
check("no final-sale note on non-personalizable product", (await page.getByText("Personalized pieces are final sale.").count()) === 0);

// Cart links to returns
await page.goto(BASE + "/shop/striped-linen-tea-towels");
await page.getByRole("button", { name: /add to cart/i }).click();
await page.goto(BASE + "/cart");
await page.locator("aside").getByRole("link", { name: "Returns & refunds" }).click();
await page.waitForURL("**/returns");
check("cart links to returns policy", true);

// Help: accordions keyboard operable
await page.goto(BASE + "/help");
const firstSummary = page.locator("summary").first();
await firstSummary.focus();
await page.keyboard.press("Enter");
check("help answer opens with keyboard", await page.locator("details").first().evaluate((d) => d.open));
await page.screenshot({ path: OUT + "help-desktop.png", fullPage: true });

// Contact: no forms
await page.goto(BASE + "/contact");
check("contact page has no form", (await page.locator("main form, main input, main textarea").count()) === 0);
await page.screenshot({ path: OUT + "contact-desktop.png", fullPage: true });

// Mobile overflow for new pages and footer
const mp = await (await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })).newPage();
for (const path of ["/", "/returns", "/help", "/contact"]) {
  await mp.goto(BASE + path);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`mobile ${path}: no horizontal overflow`, overflow <= 0, `${overflow}px`);
}
await mp.goto(BASE + "/returns");
await mp.screenshot({ path: OUT + "returns-mobile.png", fullPage: true });

check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
