# Fernhollow Goods: handmade store (AI Builder benchmark)

A Next.js storefront generated from the spec files in `specs/`:
`vision.md`, `requirements.json`, `domain-model.json`, `experience.json`, `edges.json`.
It includes a private owner area at `/admin` (CR-006).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL · Zod

## Run it

Requires Node 20.12+ and a Postgres database (local or Neon).

```bash
cp .env.example .env          # then set DATABASE_URL
createdb handmade_store       # local Postgres only; skip for Neon
npm install
npm run db:setup              # applies migrations + seeds the catalog
npm run dev                   # http://localhost:3000
```

Re-run `npm run db:seed` any time to reset the catalog. Existing demo orders are kept.
Once the owner has uploaded photos, `db:seed` refuses to run so their work is not wiped by accident; use `npm run db:seed -- --force` to reset everything anyway.

## Owner area

Open `/admin`. There is no link to it from the store.

1. Make your credentials: `npm run owner:hash -- "a password of at least 8 characters"`. Paste the three lines it prints into `.env` (and into your host's environment settings).
2. Photos: in development they are saved to `.uploads/` and need no setup. On Vercel, add a **Blob** store to the project (Storage tab). It sets `BLOB_READ_WRITE_TOKEN` for you. **A deployed build with no storage refuses to start**, by design, so uploads are never lost.
3. Sign in, add products, upload photos, publish.

What the owner can do: sign in, see all products (search, filter by category or status), create and edit a product with options, upload up to 8 photos per product (cover, order, alt text), publish or unpublish, set stock, and manage categories. The product form edits everything the product page shows: description, Materials & care, the maker line and Specifications (one item per line; `[text](https://...)` makes a link). Drafts are hidden from shoppers; the owner can preview them.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Create a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Reset and reseed the product catalog (refuses if owner photos exist) |
| `npm run owner:hash -- "password"` | Print the owner sign-in settings for `.env` |
| `npm run db:setup` | Migrate + seed |

## Tests

Browser tests live in `e2e/` and check the acceptance criteria from `specs/requirements.json`:

- `e2e/storefront.mjs`: the original features (46 checks)
- `e2e/change-requests.mjs`: CR-001 returns page and CR-002 footer, help and contact (32 checks)
- `e2e/edges.mjs`: the tested entries in `specs/edges.json` (11 checks)
- `e2e/layout.mjs`: CR-003 full width and CR-004 image-first cards (21 checks)
- `e2e/admin.mjs`: CR-006 owner area and CR-007 product-page content and stock messages (101 checks). Needs `OWNER_EMAIL` and `OWNER_PASSWORD` (the plain password) in the environment, and creates test products and categories in your database

```bash
npm run test:e2e:install   # one time: downloads Playwright's Chromium
npm run dev                # in one terminal
npm run test:e2e           # in another
```

Screenshots land in `e2e/screenshots/`. The storefront suite places real demo orders in your database. Point it at another server with `BASE_URL=http://localhost:3001 npm run test:e2e`.

## Where things live

```
src/db/schema.ts            Data model (from domain-model.json)
src/db/seed.ts              Original catalog: 11 products, options, sold-out variants
src/lib/configuration.ts    Variant/price/availability rules, shared by client and server
src/lib/pricing.ts          Money, demo shipping, totals
src/lib/checkout-schema.ts  Checkout validation (shared client + server)
src/app/checkout/actions.ts Demo order creation: re-prices from DB, checks stock, idempotent
src/app/admin/              Owner area: sign-in, products, categories, photo upload route, server actions
src/lib/owner-auth.ts       Owner sign-in, signed session cookie, lockout after 5 failures
src/lib/storage/            Photo storage adapter: local disk (dev) or Vercel Blob (deployed)
src/lib/admin/              Owner-area validation and queries
src/lib/spec-lines.ts       Owner-typed lists and the one allowed link format (http/https only)
src/lib/stock.ts            How many of a cart line the stock allows (stock is per product)
src/components/cart/        Cart state (localStorage), cart page, line items
src/components/product-art.tsx  Code-drawn product illustrations (no stock photos)
specs/                      The four input spec files
```

See **BUILD_NOTES.md** for assumptions, deviations, verification results and the spec gaps found.
