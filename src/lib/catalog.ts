import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PersonalizationRule, ProductArt } from "@/db/schema";

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
  isAvailable: boolean;
  art: ProductArt;
  personalization: PersonalizationRule | null;
  options: {
    id: number;
    name: string;
    values: { id: number; label: string; priceDeltaCents: number; swatch: string | null }[];
  }[];
  variants: { key: string; isAvailable: boolean }[];
};

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  const rows = await db
    .select({ category: schema.products.category })
    .from(schema.products)
    .where(eq(schema.products.isAvailable, true));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, slug: categorySlug(name), count }));
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

  const filtered = opts.categorySlug ? rows.filter((r) => categorySlug(r.category) === opts.categorySlug) : rows;
  if (filtered.length === 0) return [];

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
      art: p.art,
      personalizable: p.personalization !== null,
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
    isAvailable: p.isAvailable,
    art: p.art,
    personalization: p.personalization ?? null,
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      values: values
        .filter((v) => v.optionId === o.id)
        .map((v) => ({ id: v.id, label: v.label, priceDeltaCents: v.priceDeltaCents, swatch: v.swatch })),
    })),
    variants,
  };
}
