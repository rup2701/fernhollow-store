import Link from "next/link";
import { getCatalog, getCategories } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { ProductArt } from "@/components/product-art";
import { Container, buttonStyles } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getCatalog({ featuredOnly: true }), getCategories()]);
  const [first, second, third] = featured;

  return (
    <>
      {/* Hero */}
      <section className="grain border-b border-line">
        <Container wide className="grid items-center gap-10 py-10 sm:py-12 lg:grid-cols-[1fr_1.25fr] lg:py-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Small-batch studio · Est. 2019</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Everyday things, made slowly by hand.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Four makers share one workshop. We throw mugs, weave throws, pour candles and bind journals in batches small enough that we know every piece
              before it leaves.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={buttonStyles.primary}>
                Browse the shop
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#featured" className={buttonStyles.secondary}>
                See this week&apos;s picks
              </a>
            </div>
          </div>
          {first && second && third ? (
            <div className="grid grid-cols-5 grid-rows-2 gap-3 sm:gap-4" aria-hidden="true">
              <div className="col-span-3 row-span-2 overflow-hidden rounded-3xl border border-line">
                <ProductArt art={first.art} view="lifestyle" label="" className="h-full w-full" />
              </div>
              <div className="col-span-2 overflow-hidden rounded-3xl border border-line">
                <ProductArt art={second.art} label="" className="aspect-square h-full w-full" />
              </div>
              <div className="col-span-2 overflow-hidden rounded-3xl border border-line">
                <ProductArt art={third.art} label="" className="aspect-square h-full w-full" />
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      {/* Values */}
      <Container wide className="py-10">
        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            { title: "Made in batches of 20 or fewer", body: "So every piece gets looked over twice: once at the wheel or loom, once at the packing table." },
            { title: "Natural, honest materials", body: "Stoneware, linen, wool, walnut, soy wax and brass, chosen to age well and be used every day." },
            { title: "Personal touches, by hand", body: "Engravings, initials and cover names are stamped or debossed by the maker who made the piece." },
          ].map((v) => (
            <li key={v.title} className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-display text-lg font-semibold">{v.title}</h2>
              <p className="mt-2 text-sm text-ink-soft">{v.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      {/* Featured */}
      <section id="featured" aria-labelledby="featured-heading" className="scroll-mt-20">
        <Container wide>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="font-display text-3xl font-semibold tracking-tight">
                Fresh from the studio
              </h2>
              <p className="mt-1 text-ink-soft">A few favourites from this month&apos;s batches.</p>
            </div>
            <Link href="/shop" className={buttonStyles.ghost}>
              Shop everything <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 xl:grid-cols-6">
            {featured.slice(0, 6).map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="mt-16">
        <Container wide>
          <div className="rounded-3xl bg-ink px-6 py-10 text-paper sm:px-10">
            <h2 id="categories-heading" className="font-display text-2xl font-semibold">
              Shop by craft
            </h2>
            <ul className="mt-6 flex flex-wrap gap-3">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-paper hover:text-ink"
                  >
                    {c.name}
                    <span className="text-paper/70">
                      {c.count}
                      <span className="sr-only"> products</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
