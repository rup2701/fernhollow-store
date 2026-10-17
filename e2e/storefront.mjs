// Acceptance checks for requirements.json (original features).
// Run with the app already running: npm run test:e2e  (BASE_URL defaults to http://localhost:3000)
// Note: places real demo orders in your database.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./screenshots/", import.meta.url).pathname;
await import("node:fs").then((fs) => fs.mkdirSync(OUT, { recursive: true }));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const money = (s) => Math.round(parseFloat(s.replace(/[^0-9.]/g, "")) * 100);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// --- catalog-browse
await page.goto(BASE + "/");
await page.screenshot({ path: OUT + "home-desktop.png", fullPage: true });
await page.getByRole("link", { name: /browse the shop/i }).click();
await page.waitForURL("**/shop");
await page.locator("main article").first().waitFor();
const cards = page.locator("main article");
check("catalog shows multiple products", (await cards.count()) >= 6, `${await cards.count()} cards`);
check("unavailable product hidden from catalog", (await page.getByText("Winter Solstice Candle").count()) === 0);
await page.screenshot({ path: OUT + "shop-desktop.png", fullPage: true });
await page.locator("main").getByRole("link", { name: /^Ceramics/ }).click();
await page.waitForURL("**category=ceramics");
const ceramicCount = await cards.count();
check("category filter narrows results", ceramicCount > 0 && ceramicCount < 10, `${ceramicCount}`);
await page.getByRole("link", { name: "Clear filter" }).click();
await page.waitForURL(/\/shop$/);
check("clear filter restores full catalog", (await cards.count()) >= 9);
await page.getByRole("link", { name: "Speckled Stoneware Mug" }).click();
await page.waitForURL("**/shop/speckled-stoneware-mug");
check("card opens matching detail page", (await page.getByRole("heading", { level: 1 }).textContent()) === "Speckled Stoneware Mug");
const nf = await page.goto(BASE + "/shop/does-not-exist");
check("unknown product → not found", nf.status() === 404 && (await page.getByText("We couldn't find that product").count()) === 1);

// --- product-details: mug (required option, unavailable variant, price change)
await page.goto(BASE + "/shop/speckled-stoneware-mug");
await page.getByRole("button", { name: /add to cart/i }).click();
check("missing required option blocked", (await page.locator("main [role=alert]").textContent()).includes("choose a glaze"));
check("header count still 0 after blocked add", (await page.locator("header").getByText(/0\s*items/).count()) === 1);
await page.getByText("Midnight", { exact: true }).click();
const midnightPrice = await page.locator("main p.text-2xl").textContent();
check("variant price adjustment shown", midnightPrice.includes("38.00"), midnightPrice);
await page.getByRole("button", { name: /add to cart/i }).click();
check("unavailable variant blocked", (await page.locator("main [role=alert]").textContent()).includes("sold out"));
await page.getByText("Sage", { exact: true }).click();
check("price updates on reselect", (await page.locator("main p.text-2xl").textContent()).includes("34.00"));
await page.getByRole("button", { name: /add to cart/i }).click();
await page.getByText("Added to your cart").waitFor();
check("add feedback shown", true);
await page.screenshot({ path: OUT + "product-added-desktop.png", fullPage: true });

// add the same config again (should merge) and another config (separate line)
await page.getByRole("button", { name: /add to cart/i }).click();
await page.getByText("Oat", { exact: true }).click();
await page.getByRole("button", { name: /add to cart/i }).click();

// --- personalization: board
await page.goto(BASE + "/shop/engraved-walnut-board");
const eng = page.getByLabel(/Engraving/);
await eng.fill("Hello <script>");
await page.getByText("Medium", { exact: true }).click();
await page.getByRole("button", { name: /add to cart/i }).click();
check("invalid personalization blocked", (await page.locator("text=can only use letters").count()) === 1);
await eng.fill("The Okafors · 2026");
await page.getByRole("button", { name: /add to cart/i }).click();
check("middle dot rejected by charset", (await page.locator("text=can only use letters").count()) === 1);
await eng.fill("The Okafors 2026");
await page.getByRole("button", { name: /add to cart/i }).click();
await page.getByText("Added to your cart").waitFor();
check("valid personalization added", true);
check("maxLength enforced on input", (await eng.getAttribute("maxlength")) === "24");
await page.screenshot({ path: OUT + "product-personalized.png" });
// Non-personalizable product shows no field
await page.goto(BASE + "/shop/striped-linen-tea-towels");
check("no personalization on unsupported product", (await page.getByLabel(/Engraving|Initials|Name on cover/).count()) === 0);

// --- cart
await page.goto(BASE + "/cart");
const lines = page.locator("section[aria-label='Items in your cart'] > ul > li");
check("cart has 3 distinct lines (merged identical, kept distinct configs)", (await lines.count()) === 3, `${await lines.count()}`);
const sageLine = lines.filter({ hasText: "Sage" });
check("identical config merged qty 2", (await sageLine.locator("span.tabular-nums").first().textContent()) === "2");
check("personalization visible in cart", (await page.getByText("“The Okafors 2026”").count()) === 1);
const sumLines = async () => {
  let s = 0;
  for (const t of await page.locator("text=/^Line total:/").locator("..").allTextContents()) s += money(t);
  return s;
};
const subtotal = async () => money(await page.locator("dt:text('Subtotal') + dd").textContent());
check("subtotal = sum of line totals", (await sumLines()) === (await subtotal()), `${await sumLines()} vs ${await subtotal()}`);
await sageLine.getByRole("button", { name: /Increase/ }).click();
check("qty change updates line + subtotal", (await sumLines()) === (await subtotal()) && (await sageLine.locator("span.tabular-nums").first().textContent()) === "3");
const oatLine = lines.filter({ hasText: "Oat" });
check("decrease disabled at 1", await oatLine.getByRole("button", { name: /Decrease/ }).isDisabled());
await oatLine.getByRole("button", { name: /^Remove/ }).click();
check("remove updates lines", (await lines.count()) === 2);
check("header count matches cart", (await page.locator("header").getByText(/4\s*items/).count()) === 1);
await page.screenshot({ path: OUT + "cart-desktop.png", fullPage: true });
await page.goto(BASE + "/shop");
await page.goto(BASE + "/cart");
check("cart persists across navigation/reload", (await lines.count()) === 2);
const cartSubtotal = await subtotal();

// --- checkout
await page.getByRole("link", { name: "Go to checkout" }).click();
await page.waitForURL("**/checkout");
check("demo notice shown", (await page.getByText("This checkout is simulated.").count()) === 1);
check("no card fields", (await page.locator("input[autocomplete^='cc-'], input[name*='card' i]").count()) === 0);
await page.getByLabel("Full name").fill("Ada Okafor");
await page.getByLabel("Email").fill("ada@");
await page.getByRole("button", { name: "Place demo order" }).click();
check("validation errors shown", (await page.getByText("Enter a valid email address").count()) >= 1 && (await page.getByText("Enter your city.").count()) >= 1);
check("values preserved after failed validation", (await page.getByLabel("Full name").inputValue()) === "Ada Okafor");
await page.screenshot({ path: OUT + "checkout-errors.png", fullPage: true });
const summarySubtotal = money(await page.locator("aside dt:text('Subtotal') + dd").textContent());
check("checkout summary agrees with cart", summarySubtotal === cartSubtotal);
await page.getByLabel("Email").fill("ada@example.com");
await page.getByLabel("Street address").fill("12 Kiln Lane");
await page.getByLabel("City").fill("Oakland");
await page.getByLabel("State / Region").fill("CA");
await page.getByLabel("Postal code").fill("94607");
await page.getByRole("button", { name: "Place demo order" }).click();
await page.waitForURL("**/orders/FH-*");
const url = page.url();
check("order confirmation reached", true, url);
check("confirmation shows reference", (await page.getByText(url.split("/").pop()).count()) >= 1);
check("confirmation marked as demo", (await page.getByText("This was a demo order.").count()) === 1);
const confTotal = money(await page.locator("dt:text('Subtotal') + dd").textContent());
check("confirmation subtotal matches cart", confTotal === cartSubtotal);
check("cart cleared", (await page.locator("header").getByText(/0\s*items/).count()) === 1);
await page.screenshot({ path: OUT + "confirmation-desktop.png", fullPage: true });
await page.reload();
check("refresh keeps same order", page.url() === url && (await page.getByText("Thank you, Ada").count()) === 1);
const bad = await page.goto(BASE + "/orders/FH-ZZZZ-9999");
check("unknown order → not found", bad.status() === 404 && (await page.getByText("We couldn't find that order").count()) === 1);
await page.goto(BASE + "/checkout");
await page.getByText("There's nothing to check out yet").waitFor({ timeout: 5000 }).catch(() => {});
check("checkout unavailable with empty cart", (await page.getByText("There's nothing to check out yet").count()) === 1);

// --- idempotency: resubmit same token directly via a second form post is covered by DB unique index; check order count
// --- keyboard: tab to skip link
await page.goto(BASE + "/");
await page.keyboard.press("Tab");
check("first tab stop is skip link", (await page.evaluate(() => document.activeElement?.textContent)) === "Skip to content");

// --- mobile layout
const m = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const mp = await m.newPage();
for (const [name, path] of [["home", "/"], ["shop", "/shop"], ["product", "/shop/hand-thrown-serving-bowl"], ["cart", "/cart"], ["checkout", "/checkout"]]) {
  await mp.goto(BASE + path);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`mobile ${name}: no horizontal overflow`, overflow <= 0, `${overflow}px`);
  await mp.screenshot({ path: OUT + `${name}-mobile.png`, fullPage: true });
}

const realErrors = errors.filter((e) => !e.includes("404"));
check("no console/page errors (excluding intentional 404s)", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
