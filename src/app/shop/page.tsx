import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getCategories } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Container, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const params = await searchParams;
  const requested = typeof params.category === "string" ? params.category : undefined;

  const categories = await getCategories();
  const active = requested ? categories.find((c) => c.slug === requested) : undefined;
  const products = requested ? (active ? await getCatalog({ categorySlug: active.slug }) : []) : await getCatalog();

  return (
    <Container wide className="py-8 sm:py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{active ? active.name : "The shop"}</h1>
        <p className="mt-2 text-ink-soft">
          {active
            ? `${products.length} ${products.length === 1 ? "piece" : "pieces"} in ${active.name.toLowerCase()}.`
            : "Everything we currently have in stock, made by hand in our studio."}
        </p>
      </header>

      <nav aria-label="Filter by category" className="mt-8">
        <ul className="relative flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] sm:flex-wrap">
          <li>
            <FilterChip href="/shop" active={!requested} label="All" />
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <FilterChip href={`/shop?category=${c.slug}`} active={active?.slug === c.slug} label={c.name} count={c.count} />
            </li>
          ))}
        </ul>
        {requested ? (
          <p className="mt-3 text-sm">
            <Link href="/shop" className="font-semibold text-clay underline underline-offset-4 hover:text-clay-deep">
              Clear filter
            </Link>
            <span className="text-ink-soft"> to see the full collection.</span>
          </p>
        ) : null}
      </nav>

      <div className="mt-10">
        {products.length === 0 ? (
          <EmptyState
            title={requested && !active ? "We couldn't find that category" : "Nothing here right now"}
            body={
              requested && !active
                ? "That category doesn't exist or has nothing in stock. Try the full collection instead."
                : "This batch has sold through. New pieces come out of the studio most weeks."
            }
            action={{ href: "/shop", label: "See all products" }}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} headingLevel="h2" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function FilterChip({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-ink/40"
      }`}
    >
      {label}
      {count !== undefined ? (
        <span className={`ml-1.5 ${active ? "text-paper/70" : "text-ink-soft"}`}>
          {count}
          <span className="sr-only"> products</span>
        </span>
      ) : null}
    </Link>
  );
}
