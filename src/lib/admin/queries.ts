import "server-only";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { withPhoto } from "@/lib/product-photos";

export type AdminRow = {
  id: number;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  stock: number;
  published: boolean;
  cover: { url: string; alt: string } | null;
  photoCount: number;
};

export async function listAdminProducts(filter: { q?: string; category?: string; status?: string }): Promise<{ rows: AdminRow[]; total: number }> {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.products);
  const where = [];
  if (filter.q) where.push(ilike(schema.products.name, `%${filter.q.replace(/[%_\\]/g, "\\$&")}%`));
  if (filter.category) where.push(eq(schema.products.category, filter.category));
  if (filter.status === "draft") where.push(eq(schema.products.isAvailable, false));
  if (filter.status === "published") where.push(eq(schema.products.isAvailable, true));
  if (filter.status === "soldout") where.push(sql`${schema.products.stock} <= 0`);
  const products = await db
    .select()
    .from(schema.products)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.products.id));
  const images = products.length
    ? await db
        .select()
        .from(schema.productImages)
        .where(inArray(schema.productImages.productId, products.map((p) => p.id)))
        .orderBy(asc(schema.productImages.position))
    : [];
  const rows = products.map((p) => {
    const mine = images.filter((i) => i.productId === p.id);
    const legacy = withPhoto(p.slug, p.art);
    const cover = mine[0] ? { url: mine[0].url, alt: mine[0].alt } : legacy.photo ? { url: legacy.photo, alt: legacy.photoAlt ?? p.name } : null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      priceCents: p.basePriceCents,
      stock: p.stock,
      published: p.isAvailable,
      cover,
      photoCount: mine.length || (legacy.photo ? 1 : 0),
    };
  });
  return { rows, total };
}

export async function getAdminProduct(id: number) {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!p) return null;
  const options = await db.select().from(schema.productOptions).where(eq(schema.productOptions.productId, id)).orderBy(asc(schema.productOptions.position));
  const values = options.length
    ? await db.select().from(schema.optionValues).where(inArray(schema.optionValues.optionId, options.map((o) => o.id))).orderBy(asc(schema.optionValues.position))
    : [];
  const images = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, id)).orderBy(asc(schema.productImages.position));
  const legacy = withPhoto(p.slug, p.art);
  return {
    product: p,
    legacyPhoto: legacy.photo ? { url: legacy.photo, alt: legacy.photoAlt ?? p.name } : null,
    options: options.map((o) => {
      const vs = values.filter((v) => v.optionId === o.id);
      return {
        id: o.id,
        name: o.name,
        required: o.required,
        defaultIndex: o.defaultValueId ? Math.max(0, vs.findIndex((v) => v.id === o.defaultValueId)) : null,
        values: vs.map((v) => ({ id: v.id, label: v.label, priceDelta: (v.priceDeltaCents / 100).toFixed(2), swatch: v.swatch })),
      };
    }),
    images,
  };
}

export async function listCategoriesWithCounts() {
  const cats = await db.select().from(schema.categories).orderBy(asc(schema.categories.position));
  const rows = await db.select({ category: schema.products.category, published: schema.products.isAvailable }).from(schema.products);
  return cats.map((c) => {
    const mine = rows.filter((r) => r.category === c.name);
    return { ...c, total: mine.length, published: mine.filter((r) => r.published).length };
  });
}
