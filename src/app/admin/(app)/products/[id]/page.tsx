import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAdminProduct } from "@/lib/admin/queries";
import { centsToDollars } from "@/lib/admin/validation";
import { getStorage } from "@/lib/storage";
import { ProductForm } from "@/components/admin/product-form";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Notice, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; refused?: string }>;
}) {
  const { id } = await params;
  const { saved, refused } = await searchParams;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const data = await getAdminProduct(productId);
  if (!data) notFound();
  const { product: p, options, images, legacyPhoto } = data;
  const categories = await db.select().from(schema.categories).orderBy(asc(schema.categories.position));
  const storage = getStorage();
  const hasPhoto = images.length > 0 || Boolean(legacyPhoto);

  return (
    <>
      <p className="text-sm">
        <Link href="/admin/products" className="font-medium text-clay underline underline-offset-4">
          All products
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">{p.name}</h1>
        <StatusBadge published={p.isAvailable} soldOut={p.stock <= 0} />
      </div>
      {!p.isAvailable ? (
        <p className="mt-1 text-sm">
          <Link href={`/shop/${p.slug}`} target="_blank" className="font-medium text-clay underline underline-offset-4">
            Preview the draft page
          </Link>
          <span className="text-ink-soft"> (only you can see it)</span>
        </p>
      ) : (
        <p className="mt-1 text-sm">
          <Link href={`/shop/${p.slug}`} target="_blank" className="font-medium text-clay underline underline-offset-4">
            View in the store
          </Link>
        </p>
      )}

      <div className="mt-5 space-y-3">
        {saved === "created" ? (
          <Notice tone="ok">Product created as a draft. {hasPhoto ? "Next: publish it when you are ready." : "Next: add photos below, then publish."}</Notice>
        ) : null}
        {refused === "photo" ? <Notice tone="error">It was not published: add at least one photo first.</Notice> : null}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ProductForm
          productId={p.id}
          categories={categories.map((c) => c.name)}
          published={p.isAvailable}
          hasPhoto={hasPhoto}
          slugLocked
          initial={{
            name: p.name,
            slug: p.slug,
            tagline: p.tagline,
            description: p.description,
            price: centsToDollars(p.basePriceCents),
            category: p.category,
            stock: String(p.stock),
            options,
          }}
        />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PhotoManager
            productId={p.id}
            photos={images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, width: i.width }))}
            starterPhoto={legacyPhoto}
            storageMessage={storage.ok ? null : storage.message}
          />
        </div>
      </div>
    </>
  );
}
