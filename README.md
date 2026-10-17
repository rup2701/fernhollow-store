# Fernhollow Goods: handmade store (AI Builder benchmark)

A Next.js storefront generated from the four spec files in `specs/`:
`vision.md`, `requirements.json`, `domain-model.json`, `experience.json`.

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

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Create a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Reset and reseed the product catalog |
| `npm run db:setup` | Migrate + seed |

## Tests

Browser tests live in `e2e/` and check the acceptance criteria from `specs/requirements.json`:

- `e2e/storefront.mjs`: the original features (46 checks)
- `e2e/change-requests.mjs`: CR-001 returns page and CR-002 footer, help and contact (32 checks)
- `e2e/edges.mjs`: the tested entries in `specs/edges.json` (11 checks)
- `e2e/layout.mjs`: CR-003 full width and CR-004 image-first cards (14 checks)

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
src/app/checkout/actions.ts Demo order creation: re-prices from DB, idempotent
src/components/cart/        Cart state (localStorage), cart page, line items
src/components/product-art.tsx  Code-drawn product illustrations (no stock photos)
specs/                      The four input spec files
```

See **BUILD_NOTES.md** for assumptions, deviations, verification results and the spec gaps found.
# fernhollow-store
