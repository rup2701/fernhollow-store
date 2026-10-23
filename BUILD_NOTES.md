# Build notes

How the specs were turned into this app: what was decided where the specs were silent, where the build deviates, how it was verified, and what the spec format should capture next time.

## 1. Decisions made where the specs were silent

| Area | Decision | Why |
| --- | --- | --- |
| Store identity | "Fernhollow Goods", a fictional four-maker studio. Original name, logo, copy and catalog. | vision.md requires an original identity. |
| Imagery | Products are drawn as SVG illustrations in code (`product-art.tsx`), with three views each: front, close-up and on a table. They re-colour live when a glaze or yarn is picked and preview engraving, initials or cover text. | No licensed photography available, and the specs forbid copied assets. The art tracks configuration, so it also helps "understand what they will receive". |
| Catalog | 11 products in 6 categories, with 1–2 options each and 4 deliberately sold-out combinations. One product is unavailable and hidden from the catalog. | Exercises every rule in domain-model.json. |
| Options | Every option is required. Options with a single value are preselected; multi-value options start unselected. | Spec states "Required option missing" but never says which options are required. |
| Sold-out values | Shown with a strike-through and "Sold out" label but still selectable, so the shopper gets a clear message on add. | Matches the "invalid-product-selection" journey (attempt → guidance → correct). |
| Price display | "From $X" until all price-affecting options are chosen, then the exact price, also shown on the Add button. | Spec says price must reflect options but not what to show before selection. |
| Personalization | Optional free text, product-specific max length (24 / 3 / 20), allowed characters: letters, numbers, spaces, `& . , ' -`. Whitespace is normalized. | Spec requires "a clear character limit or validation rule" but gives none. |
| Cart identity | Line = product + variant + normalized personalization. Identical lines merge. | Directly from requirements. |
| Quantity | 1–10 per line; minus button disabled at 1; Remove is separate. | Spec sets the floor (1) but no ceiling. |
| Demo charges | Shipping: $6 flat, free over $75, labelled "demo estimate". Tax: shown as "Not calculated in this demo". | Vision allows demo values if clearly labelled. Showing tax as $0 would read as a real number. |
| Country | Select with 11 common countries + "Other". | Spec requires a country field but not a list. |
| Postal code | 2–10 letters, numbers, spaces or hyphens. | Must work internationally; spec only says "validated". |
| Order reference | `FH-XXXX-XXXX` (no ambiguous characters such as 0/O, 1/I). | Spec only says "unique". |
| Idempotency | The browser cart carries a checkout token, and orders have a unique index on it. Resubmitting returns the existing order. The confirmation page is read-only. | Covers "refresh must not duplicate" and double-clicks. |
| Server trust | Checkout re-prices every line from the database and rejects unavailable configurations. On a price change it updates the cart and asks the shopper to review. | The cart lives in localStorage, so the browser can't be trusted to set prices. |

## 2. Deviations from the specs

- **"Front-end demonstration" vs. a database.** vision.md says static/local data is fine. This build uses Postgres for the catalog and orders because that was the requested stack. Order storage is still demo-only: there are no emails, no payments and no fulfillment.
- **ORM:** Drizzle instead of Prisma. Prisma's engine binaries couldn't be downloaded in the build sandbox, so Drizzle was used to keep the build testable end to end.
- **No component library.** Components are hand-built with Tailwind instead of shadcn/ui, since the shadcn CLI pulls from the network. Shared styles are in `components/ui.tsx`.

## 3. Verification

An automated Playwright run against the production build + Postgres covered the `verification` steps in requirements.json. **46/46 checks passed**, including:

- catalog → filter → clear filter → product detail; unknown product URL shows not-found (404)
- missing required option blocked; sold-out variant blocked; price changes with variant
- invalid personalization rejected; valid personalization carried to cart, checkout and confirmation
- identical configurations merge, different ones stay separate; line totals and subtotal add up after quantity changes and removals; header count stays in sync; cart survives navigation and reload
- checkout: empty-cart state, validation messages, values kept after failed submit, summary equals cart, no card fields
- confirmation: reference, demo label, totals equal cart, cart cleared, refresh doesn't duplicate, unknown reference shows not-found
- keyboard: skip link is the first tab stop
- no horizontal overflow at 375 px on any page; no console errors

## 4. Spec gaps: what the builder's spec format should capture

These are the places where the four files left the agent guessing. Each one is a candidate field for the onboarding conversation or a default the builder should state explicitly.

1. **Which options are required, and default selections.** Add `required` and `default` per option.
2. **The actual catalog.** The specs describe the *shape* of products, not the products. A real client build needs product data (or a "generate sample catalog" flag) with names, prices, options, sold-out combos and images.
3. **Imagery source.** Photos supplied by the client, AI-generated, or illustrated? This was the single largest unknown.
4. **Personalization rules.** Max length, allowed characters, extra price, and whether it's per product or per option.
5. **Demo charges.** Shipping and tax amounts or rules, free-shipping threshold, currency formatting.
6. **Quantity limits** per line and per order.
7. **Address model.** Country list, region/postal rules, and whether the address is international or US-only.
8. **Brand inputs.** Name, tone, palette, type. "Personal, trustworthy, craft-focused" is a mood, not a brand. The builder should either ask or record what it chose.
9. **Data persistence choice.** domain-model.json says "not a schema" while the build wanted Postgres. The spec should state storage expectations (static, local, DB) so the agent doesn't have to reconcile them.
10. **Price-change and stock-change behavior** between add-to-cart and checkout. Not mentioned; it was handled here, but it's a real decision for a client.
11. **Order reference format** and what the shopper can do with it (look-up page? email?).
13. **Design intent.** Overall style (modern, contemporary or antique), layout density and how image-led the cards should be were left to the builder. Ask during onboarding; the choice drives typefaces, palette, corner radius, borders, image treatment, ornament and copy tone. A first slot for it is `design_intent` in `experience.json`.
12. **Acceptance checks as executable tests.** The `verification` arrays are close to Playwright steps already. Making them structured (action, target, expectation) would let the builder generate the test suite automatically.

## 5. Change requests

Each change was applied to the specs first (see the change log in `specs/vision.md`), then to the code, then verified.

### CR-001: "Add a return and refund page"
- **Specs:** new `returns-policy` feature in requirements.json; new `returns-policy` page in experience.json; scope line in vision.md.
- **Code:** `/returns` page. A final-sale note under every personalization field (linked to the input for screen readers) and a returns link in the cart summary, because a returns policy that says "personalized = final sale" has to be visible where shoppers personalize.
- **Decisions:** 30-day window, unused condition, buyer pays return shipping unless it's our error, refunds issued within 3 business days to the original payment method, damaged items reported within 7 days, personalized pieces final sale. Labelled as a sample policy.

### CR-002: "Add a subfooter with payment types accepted and contact us and help links"
- **Specs:** new `site-footer` feature; global `footer` + new `help` and `contact` pages in experience.json; scope line + conflict note in vision.md.
- **Code:** rebuilt footer (Shop and Help columns) + subfooter (payment methods, Help/Returns/Contact links, copyright). New `/help` (FAQ accordions) and `/contact` pages, because links need somewhere to go. Added a favicon.
- **Conflict resolved:** the vision says no payment is collected. Payment methods are therefore shown as text labels marked "shown for demonstration". No card-brand logos are drawn; official marks should come from the payment provider's asset kit.
- **Contact page has no form**, because a form that silently goes nowhere would mislead. Addresses use the reserved `.example` domain.

### CR-003: "Online stores should occupy full width"
- **Specs:** new `full-width-layout` feature; `design_intent.layout` in experience.json; scope line in vision.md.
- **Code:** shared `WIDE_SHELL` width (up to 1920 px, 16/24/40 px side padding) used by the header, footer, home, catalog and product pages. Catalog columns: 2, 3, 4, 5, 6 as the screen widens. Product page gives the gallery 1.3x the width of the details. Cart, checkout, policies, help, contact and order pages keep the narrow column so text stays readable.

### CR-004: "Cards should maximize for image over whitespace"
- **Specs:** new `image-first-cards` feature.
- **Code:** product cards lose the frame, with smaller corner radius, tighter text (one-line tagline) and 12–16 px gaps. Image is about 75% of the card.
- **Not changed:** the product page image is square and tall, so on a short screen the options sit beside it rather than under it. A height cap is a design decision for the owner.

### What the change round revealed for the builder
- **A one-line request fans out.** "Add a returns page" touched the product page and cart too. "Add a subfooter with links" required two pages that didn't exist. The agent needs a step that asks "what else does this imply?" before it edits code.
- **Requests can conflict with the vision.** "Payment types accepted" vs. "no payment collected". The builder should detect the conflict and either ask or record its resolution, as was done here.
- **Requests carry hidden content decisions.** A returns page needs an actual policy (window, fees, timing). For a real client, those are business decisions to ask about, not things to invent.
- **Tests broke on layout, not behavior.** The new footer duplicated a "Ceramics" link, which broke one selector in the original suite. Generated tests should scope selectors to regions (`main`, `footer`) from the start.
- **Verification after the change:** original suite 46/46, change-request suite 32/32 (footer on 8 pages, every policy element present, final-sale note only on personalizable products, keyboard-operable FAQ, no form on contact, no overflow at 375 px, no console errors).

## 6. Edge register (`specs/edges.json`)

A fifth spec file listing the things that go wrong or get awkward in an online store that neither shopper nor owner will specify: 28 edges, each with what the shopper sees, what the owner sees, the default behavior, whether it is handled, and which automated check proves it.

- **Status:** 19 handled, 4 partial, 5 open.
- **Found while writing it:** adding an 11th item to a cart that held 10 was silently ignored while the page said "Added to your cart" (E-007). Fixed, with checks in `e2e/edges.mjs`. Without the fix the check stalls waiting for an explanation that never appears.
- **Left open for the owner to decide** (each has a plain-language `owner_decision`): stock counting (E-023), reseeding wiping the catalog (E-024), seeing and managing orders (E-026), order emails (E-027), cancellations and refunds (E-028).
- **Partial** (the app copes but nobody is told): owner never hears about failed checkouts or an unreachable database (E-019, E-025); shoppers in private mode aren't told their cart won't be saved (E-010); the cart shows stale prices until checkout (E-012).

## Product photos (interim)

Ten products now show real photos instead of drawn illustrations. Photos are mapped by slug in
`src/lib/product-photos.ts` (no database change, so no reseed on deploy); a product with no entry
keeps its drawing. Known limits of the photo path, each a candidate edge for the register:

- Colour and glaze swatches no longer recolour the image, so a shopper can pick a colour the photo does not show.
- The live personalization preview is a caption on the image (`Preview: "text"`), not text drawn on the product.
- Product pages offer a full shot and a close-up (zoom); the "on the table" scene only exists for drawings.
- Sources, licences and match confidence are in `IMAGE_CREDITS.md`. The photos are unlicensed and for private demo use only.

## CR-005: reassurance strip above the footer

`src/components/trust-strip.tsx`, rendered last on the home page. Four items (named makers, 30-day returns, free shipping over $75, reply within two business days). The shipping numbers are read from `src/lib/pricing.ts`, the same settings checkout uses, so they cannot drift. The reference image claimed years trading and customer counts; those were deliberately not copied because this store has no such facts. `-mb-24` on the section cancels the footer's own top margin on this page only. Seven checks added to `e2e/layout.mjs` (suite now 21).

## CR-006: owner area (added 2026-10-22)

Built into v1 by hand from the owner items in the v2 base specs (`owner-*` requirements, `admin-*` pages, E-029 to E-036).

**Verified:** `e2e/admin.mjs` 73/73, and the four earlier suites (46, 32, 11, 21) all pass against a production build. In dev mode one earlier check (`cart persists across navigation/reload`) fails the same way on the untouched v1 code, so it is a dev-server timing issue, not a regression.

**Decisions made without asking**
- "Published" reuses the existing `products.is_available` column. Unpublished products are drafts.
- Categories live in a new `categories` table. A product stores its category's name, and renaming updates those products in one step. The old slug is kept so old links redirect.
- Checkout now takes stock when an order is placed (not specified; without it stock would be a label only), and refuses a cart that asks for more than is on hand.
- A new product starts as a draft, with a drawn placeholder until it has a photo.
- A signed-in owner can preview a draft product page; shoppers get the normal not-found page. This changes E-006 (a bookmarked unavailable product used to explain itself): its test was updated.
- Existing products keep their starter photos from `public/products`. They count as "has a photo" for publishing, and the first owner upload replaces them.
- Migration `0001_owner_area.sql` also sets stock to 25 on existing products and creates categories from the ones in use.

**Known gaps**
- Sign-out deletes the browser cookie. The session token itself is not revoked on the server, so a copied token would work until it expires (7 days).
- On Vercel, a request body is limited to about 4.5 MB, so a photo between 4.5 and 5 MB may be refused by the host before our 5 MB check. Fix: upload straight from the browser to Blob.
- The Vercel Blob adapter is written but untested (no token in the build sandbox). Local-disk storage is what the tests exercised.
- Sign-in attempts are rate-limited by the address in `x-forwarded-for`.
- The empty-store state of the product list is built but not tested (the test database always has products).
- E-031: the "fails to start" check was verified by hand. The in-app message is not covered by a test.
- Orders and policies cannot be edited in the owner area (out of scope, planned later).

## CR-007: product form matches the product page, Specifications, clearer stock messages

**What changed.** The owner's product form now has Materials & care, Maker line and Specifications. New column `products.specifications` (migration `0002`, default empty, so existing databases keep working). The product page hides the Materials & care card, the Specifications card and the maker line when they are empty. The cart page asks the server for current stock (`src/app/cart/actions.ts`), stops the quantity stepper at stock, and shows "Only N available" with a "Change to N" button on a line above stock. Checkout says "Only N of X are in stock. Lower the quantity to continue." for stock limits, and keeps "no longer available" for sold-out and unpublished items. Edges E-037 to E-039 added.

**Decisions made without asking**
- Materials & care uses the same limits as Specifications (20 lines, 300 characters); the maker line is limited to 120 characters. The request only gave limits for Specifications.
- Over-limit input is refused with a message next to the field. It is not cut short.
- A product created in the owner area no longer gets the made-up line "Made in the Fernhollow studio". Its maker line is whatever the owner types, and empty means no line. Existing products are untouched.
- An empty Materials & care list now hides its card (it used to show a heading with nothing under it). The request only asked for this for Specifications.
- A link that is not a valid http or https link is shown exactly as typed, including the brackets, so the owner can see what is wrong. A link may not contain spaces or `)`.
- Stock is per product (as in checkout). In the cart, the other lines of the same product count against a line's allowance, so "Change to N" can be lower than the product's stock.
- On the cart page a line whose product is sold out or unpublished says "no longer available" with a note to remove it. The request did not ask for this on the cart page.
- At checkout, a line held back by a stock limit also gets a "Change to N" button next to Remove.
- Existing cart lines keep working if the stock request fails: the cart behaves as before and checkout still checks.

**Verified.** Production build: storefront 46/46, change-requests 32/32, edges 11/11, layout 21/21, admin 101/101; `tsc` clean.

**Not verified / limits**
- The cart fetches stock when it opens or when its products change, not live. If stock drops while the cart is open, the shopper learns at checkout.
- Tested only on Chromium. The Specifications card on a narrow phone screen was not separately checked (the layout suite's overflow checks do not open a product with specifications).
- The seed catalog has no specifications; the owner adds them.
