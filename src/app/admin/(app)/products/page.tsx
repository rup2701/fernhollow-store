import Link from "next/link";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { listAdminProducts } from "@/lib/admin/queries";
import { formatMoney } from "@/lib/pricing";
import { buttonStyles } from "@/components/ui";
import { Notice, StatusBadge, inputClass } from "@/components/admin/ui";

type Search = { q?: string; category?: string; status?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const filter = { q: params.q?.trim() || undefined, category: params.category || undefined, status: params.status || undefined };
  const [{ rows, total }, categories] = await Promise.all([listAdminProducts(filter), db.select().from(schema.categories).orderBy(asc(schema.categories.position))]);
  const filtered = Boolean(filter.q || filter.category || filter.status);
  const drafts = rows.filter((r) => !r.published).length;
  const soldOut = rows.filter((r) => r.stock <= 0).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Products</h1>
          <p className="mt-1 text-ink-soft">
            {total} {total === 1 ? "product" : "products"} in the store.
          </p>
        </div>
        <Link href="/admin/products/new" className={buttonStyles.primary}>
          Add product
        </Link>
      </div>

      {!filtered && (drafts > 0 || soldOut > 0) ? (
        <div className="mt-5">
          <Notice tone="info">
            {drafts > 0 ? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} hidden from shoppers. ` : ""}
            {soldOut > 0 ? `${soldOut} ${soldOut === 1 ? "product is" : "products are"} sold out.` : ""}
          </Notice>
        </div>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3" role="search" aria-label="Find products">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="text-sm font-semibold">
            Search by name
          </label>
          <input id="q" name="q" defaultValue={filter.q} className={`${inputClass} mt-1.5 border-line`} />
        </div>
        <div>
          <label htmlFor="category" className="text-sm font-semibold">
            Category
          </label>
          <select id="category" name="category" defaultValue={filter.category ?? ""} className={`${inputClass} mt-1.5 border-line`}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-semibold">
            Status
          </label>
          <select id="status" name="status" defaultValue={filter.status ?? ""} className={`${inputClass} mt-1.5 border-line`}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="soldout">Sold out</option>
          </select>
        </div>
        <button type="submit" className={buttonStyles.secondary}>
          Apply
        </button>
        {filtered ? (
          <Link href="/admin/products" className={buttonStyles.ghost}>
            Clear
          </Link>
        ) : null}
      </form>

      {total === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-semibold">Add your first product</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">Start with a name, a price and a category. You can add photos and publish it right after.</p>
          <Link href="/admin/products/new" className={`${buttonStyles.primary} mt-6`}>
            Add product
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-card/60 px-6 py-12 text-center">
          <h2 className="font-display text-xl font-semibold">No products match</h2>
          <p className="mt-2 text-ink-soft">Try a different search or clear the filters.</p>
          <Link href="/admin/products" className={`${buttonStyles.secondary} mt-5`}>
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/70 last:border-0 hover:bg-paper-deep/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      {r.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.cover.url} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
                      ) : (
                        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-soft">
                          No photo
                        </span>
                      )}
                      <span>{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.priceCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.stock}</td>
                  <td className="px-4 py-3">
                    <StatusBadge published={r.published} soldOut={r.stock <= 0} />
                    {!r.cover ? <span className="mt-1 block text-xs text-ink-soft">Needs a photo</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
