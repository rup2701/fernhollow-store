// Executable checks for the entries in specs/edges.json that are marked tested.
// Run with the app already running: npm run test:e2e
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const launch = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launch);
const fresh = async (init) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (init) await ctx.addInitScript(init);
  return { ctx, page: await ctx.newPage() };
};
const cartLines = (page) => page.locator("section[aria-label='Items in your cart'] > ul > li");

// E-007: adding beyond the per-item maximum explains itself instead of silently doing nothing
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + "/shop/striped-linen-tea-towels");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.getByText("Added to your cart").waitFor();
  await page.goto(BASE + "/cart");
  const line = cartLines(page).first();
  await line.waitFor();
  for (let i = 0; i < 9; i++) await line.getByRole("button", { name: /Increase/ }).click();
  check("E-007 cart line reaches the maximum of 10", (await line.locator("span.tabular-nums").first().textContent()) === "10");
  check("E-007 increase button disabled at the maximum", await line.getByRole("button", { name: /Increase/ }).isDisabled());
  await page.goto(BASE + "/shop/striped-linen-tea-towels");
  await page.getByRole("button", { name: /add to cart/i }).click();
  const alert = page.locator("main [role=alert]");
  await alert.waitFor({ timeout: 5000 }).catch(() => {});
  check("E-007 adding beyond the maximum explains why", /already have 10/.test((await alert.textContent({ timeout: 1000 }).catch(() => "")) ?? ""));
  check("E-007 no false 'Added to your cart' confirmation", (await page.getByText("Added to your cart").count()) === 0);
  await page.goto(BASE + "/cart");
  await cartLines(page).first().waitFor();
  check("E-007 quantity stays at 10", (await cartLines(page).first().locator("span.tabular-nums").first().textContent()) === "10");
  await ctx.close();
}

// E-004: an engraving made only of spaces is treated as no personalization
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + "/shop/engraved-walnut-board");
  await page.getByText("Medium", { exact: true }).click();
  await page.getByLabel(/Engraving/).fill("     ");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.getByText("Added to your cart").waitFor();
  await page.goto(BASE + "/cart");
  await cartLines(page).first().waitFor();
  check("E-004 spaces-only engraving is not stored as personalization", (await page.getByText("Personalization:").count()) === 0);
  await ctx.close();
}

// E-006: a bookmarked link to an unpublished (draft) product cannot be bought and looks like any missing page
{
  const { ctx, page } = await fresh();
  const res = await page.goto(BASE + "/shop/winter-solstice-candle");
  check("E-006 draft product shows the standard not-found page", res.status() === 404 && (await page.getByText(/couldn.t find|not found/i).count()) >= 1);
  check("E-006 draft product has no add-to-cart button", (await page.getByRole("button", { name: /add to cart/i }).count()) === 0);
  await ctx.close();
}

// E-010: browser storage blocked (private mode): cart still works for the visit
{
  const errors = [];
  const { ctx, page } = await fresh(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("storage blocked");
      },
    });
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/shop/striped-linen-tea-towels");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.getByText("Added to your cart").waitFor();
  await page.getByRole("link", { name: /View cart/ }).click();
  await page.waitForURL("**/cart");
  await cartLines(page).first().waitFor({ timeout: 5000 }).catch(() => {});
  check("E-010 cart works for this visit when storage is blocked", (await cartLines(page).count()) === 1);
  check("E-010 no crash when storage is blocked", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}

// E-011: a second open tab stays in sync
{
  const { ctx, page: a } = await fresh();
  await a.goto(BASE + "/cart");
  await a.getByText("Your cart is empty").waitFor();
  const b = await ctx.newPage();
  await b.goto(BASE + "/shop/striped-linen-tea-towels");
  await b.getByRole("button", { name: /add to cart/i }).click();
  await b.getByText("Added to your cart").waitFor();
  const synced = await a.locator("header").getByText(/1\s*item/).waitFor({ timeout: 5000 }).then(() => true, () => false);
  check("E-011 other tab's cart count updates without reload", synced);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
