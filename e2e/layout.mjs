// CR-003 (full-width browsing pages) and CR-004 (image-first product cards).
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

async function open(width, path) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()));
  await page.goto(BASE + path);
  await page.locator("main").waitFor();
  return { ctx, page, errors };
}
const columns = (page) =>
  page.evaluate(() => {
    const cards = [...document.querySelectorAll("main ul li article")];
    const top = cards[0]?.getBoundingClientRect().top;
    return cards.filter((c) => Math.abs(c.getBoundingClientRect().top - top) < 2).length;
  });

// CR-003: width
{
  const { ctx, page } = await open(1440, "/shop");
  const grid = await page.evaluate(() => {
    const ul = document.querySelector("main ul li article")?.closest("ul");
    return ul.getBoundingClientRect().width;
  });
  check("CR-003 catalog grid spans at least 90% of a 1440 px screen", grid >= 1440 * 0.9, `${Math.round(grid)} px`);
  const edges = await page.evaluate(() => {
    const left = (el) => Math.round(el.getBoundingClientRect().left);
    const ul = document.querySelector("main ul li article").closest("ul");
    const logo = document.querySelector("header a[aria-label^='Fernhollow']");
    const foot = document.querySelector("footer > div") ?? document.querySelector("footer");
    const f = foot.firstElementChild ?? foot; return { grid: left(ul), logo: left(logo), foot: left(f) };
  });
  check("CR-003 header, grid and footer share the same left edge", edges.grid === edges.logo && edges.logo === edges.foot, JSON.stringify(edges));
  await ctx.close();
}
{
  const cols = {};
  for (const w of [390, 700, 1100, 1300, 1700]) {
    const { ctx, page } = await open(w, "/shop");
    cols[w] = await columns(page);
    await ctx.close();
  }
  check("CR-003 catalog gains columns as the screen widens", cols[390] === 2 && cols[700] === 3 && cols[1100] === 4 && cols[1300] === 5 && cols[1700] === 6, JSON.stringify(cols));
}
{
  const { ctx, page } = await open(1440, "/returns");
  const w = await page.evaluate(() => document.querySelector("main ol")?.closest("div")?.getBoundingClientRect().width ?? 0);
  check("CR-003 policy page keeps a readable column", w > 0 && w < 1440 * 0.8, `${Math.round(w)} px`);
  await ctx.close();
}
for (const path of ["/", "/shop", "/shop/striped-linen-tea-towels", "/cart", "/returns"]) {
  const { ctx, page, errors } = await open(375, path);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`CR-003 no horizontal overflow at 375 px on ${path}`, over <= 0 && errors.length === 0, errors[0] ?? "");
  await ctx.close();
}

// CR-004: image-first cards
{
  const { ctx, page } = await open(1440, "/shop");
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("main ul li article")];
    const a = cards[0];
    const img = a.querySelector("svg").parentElement;
    const ar = a.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    const second = cards[1].getBoundingClientRect();
    return {
      fill: ir.width / ar.width,
      share: ir.height / ar.height,
      border: parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop),
      gap: second.left - ar.right,
    };
  });
  check("CR-004 image fills the full card width", m.fill >= 0.99, m.fill.toFixed(2));
  check("CR-004 image has no border or padding", m.border === 0);
  check("CR-004 image is at least 70% of card height", m.share >= 0.7, `${Math.round(m.share * 100)}%`);
  check("CR-004 gap between cards is 16 px or less", m.gap <= 16, `${Math.round(m.gap)} px`);
  const stops = await page.evaluate(() => [...document.querySelectorAll("main article")].filter((a) => a.querySelectorAll("a, button").length !== 1).length);
  check("CR-004 each card is a single tab stop", stops === 0, `${stops} cards with extra stops`);
  await page.screenshot({ path: "e2e/screenshots/shop-wide-1440.png" });
  await ctx.close();
}
{
  const { ctx, page } = await open(1440, "/");
  await page.screenshot({ path: "e2e/screenshots/home-wide-1440.png" });
  const { ctx: c2, page: p2 } = await open(1440, "/shop/speckled-stoneware-mug").catch(() => ({}));
  if (p2) await p2.screenshot({ path: "e2e/screenshots/product-wide-1440.png" });
  await ctx.close();
  await c2?.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
