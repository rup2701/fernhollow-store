import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PersonalizationRule, ProductArt } from "@/db/schema";
import { withPhoto } from "@/lib/product-photos";

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  basePriceCents: number;
  /** Lowest possible price across available configurations (for "From $X"). */
  fromPriceCents: number;
  hasPriceRange: boolean;
  art: ProductArt;
  personalizable: boolean;
  soldOut: boolean;
};

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  details: string[];
  category: string;
  maker: string;
  basePriceCents: number;
  categorySlug: string;
  isAvailable: boolean;
  stock: number;
  art: ProductArt;
  /** Owner-uploaded photos in order; the first is the cover. Empty means the legacy photo or illustration is used. */
  images: { id: number; url: string; alt: string }[];
  personalization: PersonalizationRule | null;
  options: {
    id: number;
    name: string;
    required: boolean;
    defaultValueId: number | null;
    values: { id: number; label: string; priceDeltaCents: number; swatch: string | null }[];
  }[];
  variants: { key: string; isAvailable: boolean }[];
};

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Categories shoppers can see: in the owner's order, hiding any with no published products. */
export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  const [cats, rows] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.position)),
    db.select({ category: schema.products.category }).from(schema.products).where(eq(schema.products.isAvailable, true)),
  ]);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return cats.filter((c) => (counts.get(c.name) ?? 0) > 0).map((c) => ({ name: c.name, slug: c.slug, count: counts.get(c.name)! }));
}

/** If `slug` is an old name of a renamed category, the current slug to redirect to. */
export async function currentSlugForOld(slug: string): Promise<string | null> {
  const cats = await db.select().from(schema.categories);
  return cats.find((c) => c.previousSlugs.includes(slug))?.slug ?? null;
}

/** Cover photos for a set of products: the owner's first photo, in order. */
async function coversFor(ids: number[]) {
  if (ids.length === 0) return new Map<number, { url: string; alt: string }>();
  const rows = await db
    .select()
    .from(schema.productImages)
    .where(inArray(schema.productImages.productId, ids))
    .orderBy(asc(schema.productImages.position));
  const covers = new Map<number, { url: string; alt: string }>();
  for (const r of rows) if (!covers.has(r.productId)) covers.set(r.productId, { url: r.url, alt: r.alt });
  return covers;
}

function artWith(slug: string, art: ProductArt, cover?: { url: string; alt: string }): ProductArt {
  return cover ? { ...art, photo: cover.url, photoAlt: cover.alt } : withPhoto(slug, art);
}

/** Available products only, optionally filtered by category slug and/or featured. */
export async function getCatalog(opts: { categorySlug?: string; featuredOnly?: boolean } = {}): Promise<CatalogProduct[]> {
  const where = [eq(schema.products.isAvailable, true)];
  if (opts.featuredOnly) where.push(eq(schema.products.isFeatured, true));
  const rows = await db
    .select()
    .from(schema.products)
    .where(and(...where))
    .orderBy(asc(schema.products.sortOrder));

  let filtered = rows;
  if (opts.categorySlug) {
    const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.slug, opts.categorySlug)).limit(1);
    filtered = cat ? rows.filter((r) => r.category === cat.name) : [];
  }
  if (filtered.length === 0) return [];
  const covers = await coversFor(filtered.map((r) => r.id));

  // Work out each product's price range from its option deltas.
  const ids = filtered.map((r) => r.id);
  const options = await db.select().from(schema.productOptions).where(inArray(schema.productOptions.productId, ids));
  const values = options.length
    ? await db.select().from(schema.optionValues).where(inArray(schema.optionValues.optionId, options.map((o) => o.id)))
    : [];

  return filtered.map((p) => {
    const productOptions = options.filter((o) => o.productId === p.id);
    let min = 0;
    let max = 0;
    for (const o of productOptions) {
      const deltas = values.filter((v) => v.optionId === o.id).map((v) => v.priceDeltaCents);
      min += Math.min(...deltas);
      max += Math.max(...deltas);
    }
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      category: p.category,
      basePriceCents: p.basePriceCents,
      fromPriceCents: p.basePriceCents + min,
      hasPriceRange: max !== min,
      art: artWith(p.slug, p.art, covers.get(p.id)),
      personalizable: p.personalization !== null,
      soldOut: p.stock <= 0,
    };
  });
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.slug, slug)).limit(1);
  if (!p) return null;
  return loadDetail(p);
}

export async function getProductsByIds(ids: number[]): Promise<ProductDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(schema.products).where(inArray(schema.products.id, ids));
  return Promise.all(rows.map(loadDetail));
}

async function loadDetail(p: typeof schema.products.$inferSelect): Promise<ProductDetail> {
  const options = await db
    .select()
    .from(schema.productOptions)
    .where(eq(schema.productOptions.productId, p.id))
    .orderBy(asc(schema.productOptions.position));
  const values = options.length
    ? await db
        .select()
        .from(schema.optionValues)
        .where(inArray(schema.optionValues.optionId, options.map((o) => o.id)))
        .orderBy(asc(schema.optionValues.position))
    : [];
  const images = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, p.id))
    .orderBy(asc(schema.productImages.position));
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.name, p.category)).limit(1);
  const variants = await db
    .select({ key: schema.variants.key, isAvailable: schema.variants.isAvailable })
    .from(schema.variants)
    .where(eq(schema.variants.productId, p.id));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    details: p.details,
    category: p.category,
    maker: p.maker,
    basePriceCents: p.basePriceCents,
    categorySlug: cat?.slug ?? categorySlug(p.category),
    isAvailable: p.isAvailable,
    stock: p.stock,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    art: artWith(p.slug, p.art, images[0] ? { url: images[0].url, alt: images[0].alt } : undefined),
    personalization: p.personalization ?? null,
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      required: o.required,
      defaultValueId: o.defaultValueId,
      values: values
        .filter((v) => v.optionId === o.id)
        .map((v) => ({ id: v.id, label: v.label, priceDeltaCents: v.priceDeltaCents, swatch: v.swatch })),
    })),
    variants,
  };
}
