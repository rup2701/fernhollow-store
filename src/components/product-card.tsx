import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { ProductArt } from "@/components/product-art";

export function ProductCard({ product, headingLevel = "h3" }: { product: CatalogProduct; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col">
      <div className="overflow-hidden rounded-md bg-card">
        <ProductArt
          art={product.art}
          label=""
          className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-2 flex flex-1 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">{product.category}</p>
        <Heading className="font-display text-base font-semibold leading-snug sm:text-lg">
          {/* The stretched link makes the whole card clickable while keeping one tab stop. */}
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </Heading>
        <p className="line-clamp-1 text-sm text-ink-soft">{product.tagline}</p>
        <p className="mt-1 font-semibold tabular-nums">
          {product.hasPriceRange ? <span className="font-normal text-ink-soft">From </span> : null}
          {formatMoney(product.fromPriceCents)}
          {product.personalizable ? (
            <span className="ml-2 rounded-full bg-paper-deep px-2 py-0.5 text-xs font-medium text-ink-soft">Personalizable</span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
