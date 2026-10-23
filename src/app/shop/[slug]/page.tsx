import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { isOwner } from "@/lib/owner-auth";
import { ProductConfigurator } from "@/components/product/product-configurator";
import { Container } from "@/components/ui";
import { parseSpecLine } from "@/lib/spec-lines";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product && (product.isAvailable || (await isOwner())) ? { title: product.name, description: product.tagline } : { title: "Product not found" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const owner = await isOwner();
  // A draft looks like any other missing page to shoppers. Only the owner can preview it.
  if (!product || (!product.isAvailable && !owner)) notFound();

  return (
    <Container  className="py-6 sm:py-8">
      {!product.isAvailable ? (
        <p role="status" className="mb-4 rounded-xl border border-clay/30 bg-paper-deep px-4 py-3 text-sm font-medium">
          Draft preview. Only you can see this page.{" "}
          <Link href={`/admin/products`} className="text-clay underline underline-offset-4">
            Back to the owner area
          </Link>
        </p>
      ) : null}
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/shop" className="underline-offset-4 hover:text-ink hover:underline">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/shop?category=${product.categorySlug}`}
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              {product.category}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductConfigurator product={product} />

      <section aria-labelledby="about-heading" className="mt-16 grid gap-10 border-t border-line pt-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 id="about-heading" className="font-display text-2xl font-semibold">
            About this piece
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">{product.description}</p>
          {product.maker.trim() ? <p className="mt-6 text-sm italic text-moss">{product.maker}</p> : null}
        </div>
        {product.details.length > 0 || product.specifications.length > 0 ? (
          <div className="space-y-6">
            {product.details.length > 0 ? (
              <div className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-display text-lg font-semibold">Materials &amp; care</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {product.details.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.specifications.length > 0 ? (
              <div data-testid="specifications" className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-display text-lg font-semibold">Specifications</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {product.specifications.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                      <span className="min-w-0 break-words">
                        {parseSpecLine(line).map((part, k) =>
                          part.href ? (
                            <a key={k} href={part.href} target="_blank" rel="noopener noreferrer" className="font-medium text-clay underline underline-offset-4">
                              {part.text}
                            </a>
                          ) : (
                            <span key={k}>{part.text}</span>
                          ),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </Container>
  );
}
