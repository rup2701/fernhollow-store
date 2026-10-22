import { listCategoriesWithCounts } from "@/lib/admin/queries";
import { addCategory, deleteCategory, moveCategory, renameCategory } from "@/app/admin/actions";
import { buttonStyles } from "@/components/ui";
import { Notice, inputClass } from "@/components/admin/ui";

type Search = { notice?: string; error?: string };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { notice, error } = await searchParams;
  const categories = await listCategoriesWithCounts();
  const small = "rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-ink/40 disabled:opacity-40";

  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Categories</h1>
      <p className="mt-1 max-w-2xl text-ink-soft">
        Categories group your products in the shop filter and on the home page. A category with no published products is hidden from shoppers.
      </p>

      <div className="mt-5 space-y-3" aria-live="polite">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="ok">{notice}</Notice> : null}
      </div>

      {categories.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-card/60 px-6 py-10 text-center text-ink-soft">No categories yet. Add your first one below.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line/70 rounded-2xl border border-line bg-card">
          {categories.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
              <form action={renameCategory} className="flex min-w-64 flex-1 items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <label htmlFor={`name-${c.id}`} className="sr-only">
                  Name of {c.name}
                </label>
                <input id={`name-${c.id}`} name="name" defaultValue={c.name} maxLength={40} className={`${inputClass} border-line py-2`} />
                <button type="submit" className={small}>
                  Rename
                </button>
              </form>
              <p className="w-40 text-sm text-ink-soft">
                {c.total} {c.total === 1 ? "product" : "products"}
                {c.total > 0 ? ` · ${c.published} published` : ""}
              </p>
              <div className="flex items-center gap-2">
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" className={small} disabled={i === 0} aria-label={`Move ${c.name} up`}>
                    Up
                  </button>
                </form>
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" className={small} disabled={i === categories.length - 1} aria-label={`Move ${c.name} down`}>
                    Down
                  </button>
                </form>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={`${small} text-danger`} aria-label={`Delete ${c.name}`}>
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={addCategory} className="mt-8 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1 sm:max-w-sm">
          <label htmlFor="new-category" className="text-sm font-semibold">
            New category
          </label>
          <input id="new-category" name="name" maxLength={40} placeholder="For example, Soaps" className={`${inputClass} mt-1.5 border-line`} />
        </div>
        <button type="submit" className={buttonStyles.primary}>
          Add category
        </button>
      </form>
    </>
  );
}
