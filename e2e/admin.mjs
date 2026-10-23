// Acceptance checks for the owner area (CR-006): sign-in, products, photos, publish and stock, categories.
// Needs the app running with OWNER_EMAIL, OWNER_PASSWORD_HASH and SESSION_SECRET set, and the matching
// password in OWNER_PASSWORD. Run: OWNER_EMAIL=... OWNER_PASSWORD=... node e2e/admin.mjs
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.OWNER_EMAIL ?? "owner@fernhollow.test";
const PASSWORD = process.env.OWNER_PASSWORD ?? "fernhollow-owner-test";
const RUN = Date.now().toString(36);
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const newCtx = (headers) => browser.newContext({ viewport: { width: 1280, height: 1000 }, extraHTTPHeaders: headers });
const png = (w, h, color) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
const file = (name, mimeType, buffer) => ({ name, mimeType, buffer });

async function signIn(page, email = EMAIL, password = PASSWORD) {
  await page.goto(BASE + "/admin/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// ------------------------------------------------------------------ owner-sign-in
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  await page.goto(BASE + "/admin/products");
  check("sign-in: signed-out /admin/products redirects to sign-in", page.url().endsWith("/admin/sign-in"));
  for (const path of ["/admin/products/new", "/admin/categories", "/admin/products/1"]) {
    await page.goto(BASE + path);
    check(`sign-in: signed-out ${path} is protected`, page.url().endsWith("/admin/sign-in"));
  }
  const api = await ctx.request.post(BASE + "/admin/api/photos", { multipart: { productId: "1", file: file("a.png", "image/png", await png(10, 10, "#fff")) } });
  check("sign-in: owner API returns 401 without a session", api.status() === 401);

  // No link to the owner area in the shopper experience.
  for (const path of ["/", "/shop", "/cart", "/help"]) {
    await page.goto(BASE + path);
    const links = await page.locator("a[href^='/admin']").count();
    check(`sign-in: no owner-area link on ${path}`, links === 0);
  }

  await signIn(page, EMAIL, "wrong-password");
  const wrongPw = await page.locator("form [role=alert]").textContent();
  await signIn(page, "someone-else@example.com", PASSWORD);
  const wrongEmail = await page.locator("form [role=alert]").textContent();
  check("sign-in: wrong password shows a generic message", /don.t match/i.test(wrongPw));
  check("sign-in: wrong email shows the same message", wrongPw === wrongEmail);
  check("sign-in: email is kept after a failed attempt", (await page.getByLabel("Email").inputValue()) === "someone-else@example.com");
  await ctx.close();

  // Lockout uses its own address so it never locks out the rest of this run.
  const lock = await newCtx({ "x-forwarded-for": `203.0.113.${(Date.now() % 200) + 10}` });
  const lp = await lock.newPage();
  for (let i = 0; i < 5; i++) await signIn(lp, EMAIL, "nope" + i);
  await signIn(lp, EMAIL, PASSWORD);
  check("E-035 sign-in pauses after 5 failed attempts, even with the right password", /paused for 15 minutes/i.test((await lp.locator("form [role=alert]").textContent()) ?? "") && lp.url().endsWith("/admin/sign-in"));
  await lock.close();
}

const ctx = await newCtx();
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await signIn(page);
await page.waitForURL("**/admin/products");
check("sign-in: right credentials land on the product list", page.url().endsWith("/admin/products"));

// ------------------------------------------------------------------ owner-product-list
{
  const row = page.locator("tbody tr", { hasText: "Speckled Stoneware Mug" });
  const text = (await row.textContent()) ?? "";
  const stockCell = (await row.locator("td").nth(3).textContent()) ?? "";
  check("list: row shows category, price, stock and status", /Ceramics/.test(text) && /\$34\.00/.test(text) && /^\d+$/.test(stockCell.trim()) && /Published/.test(text));
  check("list: row shows a cover photo", (await row.locator("img").count()) === 1);
  await page.getByLabel("Search by name").fill("mug");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForURL("**q=mug**");
  check("list: search finds a product by part of its name", (await page.locator("tbody tr").count()) === 1);
  await page.goto(BASE + "/admin/products?status=draft");
  check("list: draft filter shows the draft", (await page.locator("tbody tr", { hasText: "Winter Solstice Candle" }).count()) === 1 && (await page.locator("tbody tr", { hasText: "Published" }).count()) === 0);
  await page.goto(BASE + "/admin/products?category=Textiles");
  check("list: category filter", (await page.locator("tbody tr").count()) >= 2 && (await page.locator("tbody tr", { hasText: "Ceramics" }).count()) === 0);
  await page.goto(BASE + "/admin/products?q=zzzzzz");
  check("list: no-results state offers to clear filters", (await page.getByText("No products match").count()) === 1);
  await page.goto(BASE + "/admin/products");
  check("list: Add product button is visible", (await page.getByRole("link", { name: "Add product" }).first().isVisible()));
}

// ------------------------------------------------------------------ owner-product-form
const name = `Test Lantern ${RUN}`;
const slug = `test-lantern-${RUN}`;
await page.goto(BASE + "/admin/products/new");
await page.getByLabel("Description").fill("Kept after a failed save.");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText("Nothing was saved").waitFor();
check("form: empty save shows errors next to fields", (await page.getByText("Enter a product name.").count()) === 1 && (await page.getByText(/price/i).filter({ hasText: "Enter a price" }).count()) === 1 && (await page.getByText("Choose a category.").count()) === 1);
check("form: typed values are kept after a failed save", (await page.getByLabel("Description").inputValue()) === "Kept after a failed save.");
await page.getByLabel("Name", { exact: true }).fill(name);
check("form: slug is generated from the name", (await page.getByLabel("Web address").inputValue()) === slug);
await page.getByLabel("Price (USD)").fill("0");
await page.getByLabel("Category").selectOption("Candles");
await page.getByLabel("In stock").fill("-1");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText("The price must be greater than $0.").waitFor();
check("form: price of 0 and negative stock are refused", (await page.getByText("The price must be greater than $0.").count()) === 1 && (await page.getByText("Stock must be a whole number, 0 or more.").count()) === 1);
await page.getByLabel("Name", { exact: true }).fill("x".repeat(81));
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText("Keep the name to 80 characters or fewer.").waitFor();
check("form: name over 80 characters is refused", true);

await page.getByLabel("Name", { exact: true }).fill(name);
await page.getByLabel("Web address").fill(slug);
await page.getByLabel("Price (USD)").fill("48");
await page.getByLabel("In stock").fill("5");
await page.getByRole("button", { name: "Add an option" }).click();
await page.getByLabel("Option name").fill("Size");
await page.getByLabel("Choice 1 of Size").fill("Small");
await page.getByRole("button", { name: "Add a choice" }).click();
await page.getByLabel("Choice 2 of Size").fill("Large");
await page.getByLabel("Price adjustment in dollars for Large").fill("10");
await page.getByRole("radio").first().check();
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.waitForURL(/\/admin\/products\/\d+\?saved=created/);
const productUrl = page.url().split("?")[0];
const productId = Number(productUrl.split("/").pop());
check("form: valid product is created as a draft and says what comes next", (await page.getByText(/created as a draft/i).count()) === 1 && (await page.getByText(/add photos below/i).count()) === 1);

await page.goto(BASE + "/admin/products/new");
await page.getByLabel("Name", { exact: true }).fill(name);
await page.getByLabel("Price (USD)").fill("10");
await page.getByLabel("Category").selectOption("Candles");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/already used by another product/).waitFor();
check("E-029 duplicate slug is refused and an alternative suggested", (await page.getByText(new RegExp(`already used.*Try "${slug}-2"`)).count()) === 1);
check("E-029 duplicate slug keeps what was typed", (await page.getByLabel("Price (USD)").inputValue()) === "10");

// leaving with unsaved changes
await page.goto(productUrl);
await page.getByLabel("Description").fill("Unsaved words");
let dialogMessage = "";
page.once("dialog", (d) => {
  dialogMessage = d.message();
  d.dismiss();
});
await page.getByRole("link", { name: "Cancel" }).click();
check("form: leaving with unsaved changes asks first", /unsaved changes/i.test(dialogMessage) && page.url() === productUrl);
await page.getByLabel("Description").fill("A hand-forged lantern for the porch.");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/^Saved\./).waitFor();
check("form: saving confirms and names the next step", (await page.getByText(/Saved\. Next: add photos/).count()) === 1);

// publish without a photo
await page.getByRole("button", { name: "Save and publish" }).click();
await page.getByText(/was not published/i).waitFor();
check("publish: refused without a photo, with a reason", (await page.getByText(/Add at least one photo before publishing/).count()) >= 1);

// ------------------------------------------------------------------ owner-photo-upload
const input = page.locator("#photo-input");
await input.setInputFiles(file("one.png", "image/png", await png(1600, 1200, "#aa5533")));
await page.getByText("Cover", { exact: true }).waitFor();
check("photos: first upload becomes the cover with the product name as alt text", (await page.locator("input[id^='alt-']").first().inputValue()) === name);
await input.setInputFiles([file("two.png", "image/png", await png(1400, 1000, "#336699")), file("three.png", "image/png", await png(1000, 1000, "#559933"))]);
await page.getByText("Photo 3", { exact: true }).waitFor();
check("photos: several files upload at once", (await page.locator("ul li img[src^='/media/']").count()) === 3);

await page.getByRole("button", { name: "Make cover" }).first().click();
await page.waitForFunction(() => document.querySelectorAll("ul li img[src^='/media/']").length === 3);
await page.waitForTimeout(500);
const coverSrc = await page.locator("ul li img[src^='/media/']").first().getAttribute("src");
await page.reload();
check("photos: the second photo can be made the cover, and it persists after reload", (await page.locator("ul li img[src^='/media/']").first().getAttribute("src")) === coverSrc && (await page.locator("ul li img[src^='/media/']").count()) === 3);

const altBox = page.locator("input[id^='alt-']").first();
await altBox.fill("Black lantern on a stone step");
await altBox.blur();
await page.waitForTimeout(600);
await page.reload();
check("photos: alt text can be edited", (await page.locator("input[id^='alt-']").first().inputValue()) === "Black lantern on a stone step");

// wrong type and size, through the UI and straight at the server
await input.setInputFiles(file("menu.pdf", "application/pdf", Buffer.from("%PDF-1.4 test")));
await page.getByText(/isn.t a JPEG, PNG or WebP/).waitFor();
check("E-030 a PDF is refused with a clear message (screen)", true);
const pdfRes = await page.request.post(BASE + "/admin/api/photos", { multipart: { productId: String(productId), file: file("menu.pdf", "image/png", Buffer.from("%PDF-1.4 not an image")) } });
check("E-030 a non-image is refused by the server even if labelled as an image", pdfRes.status() === 415 && /JPEG, PNG or WebP/.test((await pdfRes.json()).message));
const bigRes = await page.request.post(BASE + "/admin/api/photos", { multipart: { productId: String(productId), file: file("huge.jpg", "image/jpeg", Buffer.alloc(6 * 1024 * 1024, 1)) } });
check("E-030 a 6 MB file is refused with the 5 MB limit named", bigRes.status() === 413 && /5 MB/.test((await bigRes.json()).message));
check("E-030 the other photos are untouched", (await page.locator("ul li img[src^='/media/']").count()) === 3);

// soft width
await input.setInputFiles(file("small.png", "image/png", await png(500, 500, "#999999")));
await page.getByText(/Only 500 pixels wide/).waitFor();
check("photos: an image under 800 px is accepted with a warning", true);

// big photo is resized for shoppers and the original kept
const bigPhoto = await page.request.post(BASE + "/admin/api/photos", { multipart: { productId: String(productId), file: file("wide.png", "image/png", await png(3200, 2000, "#224466")) } });
const bigJson = await bigPhoto.json();
const served = await sharp(Buffer.from(await (await page.request.get(BASE + bigJson.image.url)).body())).metadata();
check("E-036 a 3200 px photo is served resized to 2000 px", bigJson.ok && bigJson.resized === true && served.width === 2000);

// failed upload can be retried without losing the form
await page.getByLabel("Short line (optional)").fill("typed before upload");
let failOnce = true;
await page.route("**/admin/api/photos", (route) => {
  if (failOnce) {
    failOnce = false;
    return route.abort();
  }
  return route.continue();
});
await input.setInputFiles(file("retry.png", "image/png", await png(1200, 800, "#885522")));
await page.getByText(/interrupted/i).waitFor();
check("photos: a failed upload says so", (await page.getByText(/interrupted/i).count()) === 1);
check("photos: the form keeps what was typed", (await page.getByLabel("Short line (optional)").inputValue()) === "typed before upload");
await page.getByRole("button", { name: "Retry" }).last().click();
await page.getByText(/^Added/).last().waitFor();
check("photos: retry succeeds", true);
await page.unroute("**/admin/api/photos");

// eight photos at most
let last;
for (let i = 0; i < 6; i++) last = await page.request.post(BASE + "/admin/api/photos", { multipart: { productId: String(productId), file: file(`f${i}.png`, "image/png", await png(900, 700, "#123456")) } });
const nine = await page.request.post(BASE + "/admin/api/photos", { multipart: { productId: String(productId), file: file("ninth.png", "image/png", await png(900, 700, "#654321")) } });
check("photos: a ninth photo is refused", nine.status() === 400 && /8 photos/.test((await nine.json()).message));

// remove down to three photos again
await page.reload();
page.on("dialog", (d) => d.accept());
while ((await page.locator("ul li img[src^='/media/']").count()) > 3) {
  await page.getByRole("button", { name: "Remove" }).last().click();
  await page.waitForTimeout(500);
}
check("photos: photos can be removed", (await page.locator("ul li img[src^='/media/']").count()) === 3);

// ------------------------------------------------------------------ owner-publish-and-stock
await page.reload();
await page.getByRole("button", { name: "Save and publish" }).click();
await page.getByText(/now live in the store/).waitFor();
check("publish: succeeds once there is a photo", true);

const shopper = await newCtx();
const sp = await shopper.newPage();
let res = await sp.goto(BASE + "/shop/" + slug);
check("publish: shopper sees the published product", res.status() === 200 && (await sp.getByRole("heading", { name }).count()) === 1);
check("photos: shopper sees all photos on the product page", (await sp.locator("main img[src^='/media/']").count()) >= 3);
await sp.goto(BASE + "/shop?category=candles");
const card = sp.locator("main article", { hasText: name });
check("photos: the cover shows on the catalog card", (await card.locator("img").getAttribute("src")) === coverSrc);
await sp.goto(BASE + "/shop/" + slug);
check("options: the owner's default choice is preselected", (await sp.getByText("Size: Small").count()) === 1);
check("options: price adjustment applies", (await sp.getByRole("button", { name: /Add to cart/ }).textContent()).includes("$48.00"));

// order snapshot and stock decrement
await sp.getByRole("button", { name: /Add to cart/ }).click();
await sp.getByText("Added to your cart").waitFor();
await sp.goto(BASE + "/checkout");
await sp.getByLabel("Full name").fill("Ada Okafor");
await sp.getByLabel("Email").fill("ada@example.com");
await sp.getByLabel("Street address").fill("12 Kiln Lane");
await sp.getByLabel("City").fill("Oakland");
await sp.getByLabel("State / Region").fill("CA");
await sp.getByLabel("Postal code").fill("94607");
await sp.getByRole("button", { name: "Place demo order" }).click();
await sp.waitForURL("**/orders/FH-*");
const orderUrl = sp.url();
await page.goto(productUrl);
await page.getByLabel("Price (USD)").fill("50");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/^Saved\./).waitFor();
await sp.goto(orderUrl);
check("price change: an earlier order still shows the price it was bought at", (await sp.getByText("$48.00").count()) >= 1 && (await sp.getByText("$50.00").count()) === 0);
await page.goto(BASE + "/admin/products?q=" + RUN);
check("stock: an order takes stock (5 becomes 4)", (await page.locator("tbody tr").first().textContent()).includes("4"));

// price changed while in a cart: shopper is told, checkout uses the new price
await sp.goto(BASE + "/shop/" + slug);
check("E-034 shopper sees the new price", (await sp.getByRole("button", { name: /Add to cart/ }).textContent()).includes("$50.00"));

// unpublished while in a cart
await sp.getByRole("button", { name: /Add to cart/ }).click();
await sp.getByText("Added to your cart").waitFor();
await page.goto(productUrl);
await page.getByRole("button", { name: "Save and unpublish" }).click();
await page.getByText(/now a draft/).waitFor();
await sp.goto(BASE + "/checkout");
await sp.getByLabel("Full name").fill("Ada Okafor");
await sp.getByLabel("Email").fill("ada@example.com");
await sp.getByLabel("Street address").fill("12 Kiln Lane");
await sp.getByLabel("City").fill("Oakland");
await sp.getByLabel("State / Region").fill("CA");
await sp.getByLabel("Postal code").fill("94607");
await sp.getByRole("button", { name: "Place demo order" }).click();
await sp.locator("main [role=alert]").first().waitFor();
const msg = (await sp.locator("main [role=alert]").first().textContent()) ?? "";
check("E-033 checkout names the item that is no longer available and what to do", msg.includes(name) && /Remove/.test(msg));
check("E-033 no order was created", sp.url().endsWith("/checkout"));
check("CR-007 an unpublished item keeps a 'no longer available' message", /no longer available/.test(msg) && !/in stock/.test(msg));

// drafts are hidden from shoppers, visible to the owner
res = await sp.goto(BASE + "/shop/" + slug);
check("publish: a draft's page is not found for shoppers", res.status() === 404);
await sp.goto(BASE + "/shop");
check("publish: a draft is not in the catalog", (await sp.getByText(name).count()) === 0);
await page.goto(BASE + "/shop/" + slug);
check("publish: the owner can preview a draft", (await page.getByText("Draft preview").count()) === 1);

// sold out
await page.goto(productUrl);
await page.getByLabel("In stock").fill("0");
await page.getByRole("button", { name: "Save and publish" }).click();
await page.getByText(/now live in the store/).waitFor();
await sp.goto(BASE + "/shop/" + slug);
check("stock: stock 0 shows Sold out and no add-to-cart button", (await sp.getByText("Sold out").count()) >= 1 && (await sp.getByRole("button", { name: /Add to cart/ }).count()) === 0);
await sp.goto(BASE + "/shop?category=candles");
check("stock: the catalog card shows Sold out", (await sp.locator("main article", { hasText: name }).getByText("Sold out").count()) === 1);

// restock
await page.goto(productUrl);
await page.getByLabel("In stock").fill("3");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/^Saved\./).waitFor();

// ------------------------------------------------------------------ CR-007: Materials & care, maker line, Specifications
{
  const save = async () => {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText(/^Saved\./).waitFor();
  };
  const setStock = async (n) => {
    await page.goto(productUrl);
    await page.getByLabel("In stock").fill(String(n));
    await save();
  };

  // existing products keep what they had, and show it in the form
  await page.goto(BASE + "/admin/products?q=Tea+Towels");
  const towelHref = await page.locator("tbody a[href^='/admin/products/']").first().getAttribute("href");
  await page.goto(BASE + towelHref);
  check("CR-007 an existing product shows its Materials & care in the form", (await page.getByLabel("Materials & care").inputValue()).split("\n").length >= 3);
  check("CR-007 an existing product shows its maker line in the form", (await page.getByLabel("Maker line").inputValue()).length > 3);
  await sp.goto(BASE + "/shop/striped-linen-tea-towels");
  check("CR-007 an existing product still shows Materials & care and its maker line", (await sp.getByRole("heading", { name: "Materials & care" }).count()) === 1 && (await sp.locator("main p.italic").count()) === 1);

  // a new product starts with nothing: no empty cards, no maker line
  await sp.goto(BASE + "/shop/" + slug);
  check("E-039 empty Materials & care shows no card", (await sp.getByRole("heading", { name: "Materials & care" }).count()) === 0);
  check("E-039 empty specifications show no card", (await sp.getByRole("heading", { name: "Specifications" }).count()) === 0);
  check("E-039 empty maker line is not shown", (await sp.locator("main p.italic").count()) === 0);

  // limits are explained next to the field, and the typed text is kept
  await page.goto(productUrl);
  const tooMany = Array.from({ length: 21 }, (_, i) => `Line ${i + 1}`).join("\n");
  await page.getByLabel("Specifications").fill(tooMany);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Nothing was saved").waitFor();
  check("CR-007 21 specification lines are refused next to the field", (await page.getByText("Specifications can have 20 lines at most (now 21).").count()) === 1);
  check("CR-007 the typed specifications are kept", (await page.getByLabel("Specifications").inputValue()) === tooMany);
  await page.getByLabel("Specifications").fill("x".repeat(301));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText(/Keep each line of Specifications to 300 characters/).waitFor();
  check("CR-007 a specification line over 300 characters is refused", true);
  await page.getByLabel("Specifications").fill(Array.from({ length: 20 }, () => "y".repeat(300)).join("\n"));
  await page.getByLabel("Materials & care").fill("m".repeat(301));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText(/Keep each line of Materials & care to 300 characters/).waitFor();
  check("CR-007 20 lines of 300 characters are accepted, an overlong care line is not", (await page.getByText(/Keep each line of Specifications/).count()) === 0);

  // save real content
  await page.getByLabel("Materials & care").fill("Brass frame\n\n  Hand wash only  \n");
  await page.getByLabel("Maker line").fill("Cast by Ines in the studio's back room");
  await page.getByLabel("Specifications").fill(
    [
      "Scented wax in a glass jar",
      "Small: 40-hour burn time",
      "Large: 85-hour burn time",
      "[Candle care guide](https://example.com/candle-care)",
      "[Bad one](javascript:alert(1)) stays text",
      "[Mail us](mailto:a@b.example) too",
      "**not bold** <b>not html</b>",
    ].join("\n"),
  );
  await save();
  await sp.goto(BASE + "/shop/" + slug);
  check("CR-007 shoppers see the owner's Materials & care (blank lines dropped)", (await sp.locator("main li", { hasText: /^Brass frame$|^Hand wash only$/ }).count()) === 2);
  check("CR-007 shoppers see the maker line", (await sp.getByText("Cast by Ines in the studio's back room").count()) === 1);
  const card = sp.getByTestId("specifications");
  check("CR-007 Specifications is its own card under Materials & care", (await card.getByRole("heading", { name: "Specifications" }).count()) === 1 && (await card.locator("li").count()) === 7);
  const above = await sp.getByRole("heading", { name: "Materials & care" }).boundingBox();
  const below = await card.boundingBox();
  check("CR-007 Specifications sits below Materials & care", above.y < below.y);
  const link = card.getByRole("link", { name: "Candle care guide" });
  check("E-038 https link opens in a new tab", (await link.getAttribute("href")) === "https://example.com/candle-care" && (await link.getAttribute("target")) === "_blank" && /noopener/.test((await link.getAttribute("rel")) ?? ""));
  check("E-038 javascript: and mailto: links are plain text", (await card.getByRole("link").count()) === 1 && (await card.getByText("[Bad one](javascript:alert(1)) stays text").count()) === 1 && (await card.getByText("[Mail us](mailto:a@b.example) too").count()) === 1);
  check("CR-007 no other formatting is applied", (await card.getByText("**not bold** <b>not html</b>").count()) === 1 && (await card.locator("b, strong").count()) === 0);
  await page.goto(productUrl);
  check("CR-007 the form shows what was saved", (await page.getByLabel("Maker line").inputValue()).startsWith("Cast by Ines") && (await page.getByLabel("Materials & care").inputValue()) === "Brass frame\nHand wash only");

  // clearing them again hides the card and the line
  await page.getByLabel("Specifications").fill("");
  await page.getByLabel("Maker line").fill("");
  await save();
  await sp.goto(BASE + "/shop/" + slug);
  check("E-039 clearing specifications and the maker line hides both", (await sp.getByRole("heading", { name: "Specifications" }).count()) === 0 && (await sp.locator("main p.italic").count()) === 0);

  // ---------------------------------------------------------------- stock messages in the cart and at checkout
  const lines = sp.locator("section[aria-label='Items in your cart'] > ul > li");
  const qty = (l) => l.locator("span.tabular-nums").first();
  await sp.evaluate(() => localStorage.clear());
  await setStock(3);
  await sp.goto(BASE + "/shop/" + slug);
  await sp.getByRole("button", { name: /Add to cart/ }).click();
  await sp.getByText("Added to your cart").waitFor();
  await sp.goto(BASE + "/cart");
  let line = lines.first();
  await line.waitFor();
  await line.getByRole("button", { name: /Increase/ }).click();
  await line.getByRole("button", { name: /Increase/ }).click();
  await sp.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Increase/.test(b.getAttribute("aria-label") ?? "") && b.disabled));
  check("E-037 quantity stepper stops at stock (3 of 3)", (await qty(line).textContent()) === "3" && (await line.getByRole("button", { name: /Increase/ }).isDisabled()));
  check("E-037 no stock notice while the cart is within stock", (await sp.getByTestId("stock-notice").count()) === 0);

  await setStock(2);
  await sp.reload();
  await lines.first().waitFor();
  const notice = sp.getByTestId("stock-notice");
  await notice.waitFor();
  check("E-037 cart line above stock shows how many are available", /Only 2 available/.test((await notice.textContent()) ?? ""));
  await sp.getByRole("button", { name: "Change to 2", exact: true }).click();
  check("E-037 Change to N sets the quantity and clears the notice", (await qty(lines.first()).textContent()) === "2" && (await sp.getByTestId("stock-notice").count()) === 0);
  check("E-037 the stepper now stops at 2", await lines.first().getByRole("button", { name: /Increase/ }).isDisabled());

  // checkout: a stock limit is not 'no longer available'
  await setStock(1);
  await sp.goto(BASE + "/checkout");
  await sp.getByLabel("Full name").fill("Ada Okafor");
  await sp.getByLabel("Email").fill("ada@example.com");
  await sp.getByLabel("Street address").fill("12 Kiln Lane");
  await sp.getByLabel("City").fill("Oakland");
  await sp.getByLabel("State / Region").fill("CA");
  await sp.getByLabel("Postal code").fill("94607");
  await sp.getByRole("button", { name: "Place demo order" }).click();
  const alert = sp.locator("main [role=alert]").first();
  await alert.waitFor();
  const text = ((await alert.locator("p").first().textContent()) ?? "").trim();
  check("E-037 checkout says 'Only 1 of <name> are in stock. Lower the quantity to continue.'", text === `Only 1 of ${name} are in stock. Lower the quantity to continue.`, text);
  check("E-037 checkout does not say 'no longer available' for a stock limit", !/no longer available/.test((await alert.textContent()) ?? ""));
  await alert.getByRole("button", { name: "Change to 1" }).click();
  await sp.getByRole("button", { name: "Place demo order" }).click();
  await sp.waitForURL("**/orders/FH-*");
  check("E-037 after lowering the quantity the order goes through", true);

  // leave the lantern as the later sections expect it
  await setStock(3);
}

// ------------------------------------------------------------------ owner-categories
const catA = `Test Soaps ${RUN}`;
const catB = `Test Bars ${RUN}`;
const slugA = `test-soaps-${RUN}`;
const slugB = `test-bars-${RUN}`;
await page.goto(BASE + "/admin/categories");
await page.getByLabel("New category").fill(catA);
await page.getByRole("button", { name: "Add category" }).click();
await page.getByText(`Added "${catA}"`).waitFor();
await sp.goto(BASE + "/shop");
check("categories: an empty category is hidden from shoppers", (await sp.getByRole("link", { name: new RegExp(catA) }).count()) === 0);
await page.goto(BASE + "/admin/categories");
await page.getByLabel("New category").fill(catA);
await page.getByRole("button", { name: "Add category" }).click();
await page.getByText(/already a category called/).waitFor();
check("categories: a duplicate name is refused", true);

// move the lantern into the new category
await page.goto(productUrl);
await page.getByLabel("Category").selectOption(catA);
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/^Saved\./).waitFor();
await sp.goto(BASE + "/shop");
check("categories: a category with a published product shows to shoppers", (await sp.getByRole("link", { name: new RegExp(catA) }).count()) >= 1);

await page.goto(BASE + "/admin/categories");
await page.getByRole("button", { name: `Delete ${catA}` }).click();
await page.getByText(/still has 1 product/).waitFor();
check("E-032 deleting a category with products is blocked and says how many must move", true);

await page.getByLabel(`Name of ${catA}`).fill(catB);
await page.getByLabel(`Name of ${catA}`).locator("xpath=following-sibling::button").click();
await page.getByText(/Renamed/).waitFor();
await sp.goto(BASE + "/shop?category=" + slugA);
check("categories: renaming keeps the old link working (redirect)", sp.url().includes("category=" + slugB) && (await sp.getByText(name).count()) === 1);
await page.goto(productUrl);
check("categories: renaming updates the products in it", (await page.getByLabel("Category").inputValue()) === catB);

await page.goto(BASE + "/admin/categories");
const namesBefore = await page.locator("input[id^='name-']").evaluateAll((els) => els.map((e) => e.value));
await page.getByRole("button", { name: `Move ${catB} up` }).click();
await page.getByText("Order updated").waitFor();
const namesAfter = await page.locator("input[id^='name-']").evaluateAll((els) => els.map((e) => e.value));
check("categories: a category can be moved up", namesAfter.indexOf(catB) === namesBefore.indexOf(catB) - 1);

// put the lantern back, then an empty category can be deleted
await page.goto(productUrl);
await page.getByLabel("Category").selectOption("Candles");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByText(/^Saved\./).waitFor();
await page.goto(BASE + "/admin/categories");
await page.getByRole("button", { name: `Delete ${catB}` }).click();
await page.getByText(`Deleted "${catB}"`).waitFor();
check("categories: an empty category can be deleted", true);

// sign out
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL("**/admin/sign-in");
await page.goto(BASE + "/admin/products");
check("sign-in: signing out ends the session at once", page.url().endsWith("/admin/sign-in"));

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
