"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { isOwner, signIn, signOut } from "@/lib/owner-auth";
import { getStorage } from "@/lib/storage";
import { withPhoto } from "@/lib/product-photos";
import { slugify } from "@/lib/slug";
import { dollarsToCents, validateProductFields, type OptionsInput, type ProductFormState } from "@/lib/admin/validation";

async function requireOwner() {
  if (!(await isOwner())) redirect("/admin/sign-in");
}

function refreshStore() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- sign in

export type SignInState = { message?: string; email?: string };

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await signIn(email, password);
  if (!result.ok) return { message: result.message, email };
  redirect("/admin/products");
}

export async function signOutAction() {
  await signOut();
  redirect("/admin/sign-in");
}

// ---------------------------------------------------------------- products

async function freeSlug(base: string, exceptId: number | null) {
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`.slice(0, 80);
    const clash = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, candidate)).limit(1);
    if (clash.length === 0 || clash[0].id === exceptId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function productHasPhoto(productId: number, slug: string, art: typeof schema.products.$inferSelect.art) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId));
  return n > 0 || Boolean(withPhoto(slug, art).photo);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Make the product's options, choices and sellable combinations match the form. */
async function syncOptions(tx: Tx, productId: number, options: OptionsInput) {
  const existing = await tx.select().from(schema.productOptions).where(eq(schema.productOptions.productId, productId));
  const keep = new Set(options.flatMap((o) => (o.id ? [o.id] : [])));
  for (const e of existing) if (!keep.has(e.id)) await tx.delete(schema.productOptions).where(eq(schema.productOptions.id, e.id));

  const optionValueIds: { required: boolean; ids: number[] }[] = [];
  for (const [position, o] of options.entries()) {
    let optionId = o.id && existing.some((e) => e.id === o.id) ? o.id : null;
    if (optionId) {
      await tx.update(schema.productOptions).set({ name: o.name, required: o.required, position }).where(eq(schema.productOptions.id, optionId));
    } else {
      const [row] = await tx.insert(schema.productOptions).values({ productId, name: o.name, required: o.required, position }).returning();
      optionId = row.id;
    }

    const existingValues = await tx.select().from(schema.optionValues).where(eq(schema.optionValues.optionId, optionId));
    const keepValues = new Set(o.values.flatMap((v) => (v.id ? [v.id] : [])));
    for (const ev of existingValues) if (!keepValues.has(ev.id)) await tx.delete(schema.optionValues).where(eq(schema.optionValues.id, ev.id));

    const ids: number[] = [];
    for (const [i, v] of o.values.entries()) {
      const cents = v.priceDelta === "" ? 0 : dollarsToCents(v.priceDelta)!;
      const fields = { label: v.label, priceDeltaCents: cents, swatch: v.swatch ?? null, position: i };
      if (v.id && existingValues.some((ev) => ev.id === v.id)) {
        await tx.update(schema.optionValues).set(fields).where(eq(schema.optionValues.id, v.id));
        ids.push(v.id);
      } else {
        const [row] = await tx.insert(schema.optionValues).values({ optionId, ...fields }).returning();
        ids.push(row.id);
      }
    }
    const defaultId = o.defaultIndex !== null && ids[o.defaultIndex] ? ids[o.defaultIndex] : null;
    await tx.update(schema.productOptions).set({ defaultValueId: defaultId }).where(eq(schema.productOptions.id, optionId));
    optionValueIds.push({ required: o.required, ids });
  }

  // Every combination is sellable. Combinations that already existed keep their sold-out flag.
  // An optional option left unchosen uses 0 in the key.
  let keys: string[][] = [[]];
  for (const o of optionValueIds) {
    const choices = (o.required ? o.ids : [...o.ids, 0]).map(String);
    keys = keys.flatMap((prefix) => choices.map((c) => [...prefix, c]));
  }
  const wanted = new Set(keys.map((k) => k.join(".")));
  const current = await tx.select().from(schema.variants).where(eq(schema.variants.productId, productId));
  for (const v of current) if (!wanted.has(v.key)) await tx.delete(schema.variants).where(eq(schema.variants.id, v.id));
  const have = new Set(current.map((v) => v.key));
  const fresh = [...wanted].filter((k) => !have.has(k));
  if (fresh.length) await tx.insert(schema.variants).values(fresh.map((key) => ({ productId, key, isAvailable: true })));
}

export async function saveProduct(productId: number | null, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireOwner();
  const field = (k: string) => String(formData.get(k) ?? "");
  const raw = {
    name: field("name"),
    slug: field("slug"),
    tagline: field("tagline"),
    description: field("description"),
    price: field("price"),
    category: field("category"),
    stock: field("stock"),
    options: field("options") || "[]",
    details: field("details"),
    maker: field("maker"),
    specifications: field("specifications"),
  };
  const intent = field("intent") || "save";

  const cats = await db.select().from(schema.categories);
  const checked = validateProductFields(raw, cats.map((c) => c.name));
  if (!checked.ok) {
    return { status: "error", fieldErrors: checked.errors, formError: "Nothing was saved. Please fix the highlighted fields.", values: raw };
  }
  const { data, options } = checked;

  const [clash] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, data.slug)).limit(1);
  if (clash && clash.id !== productId) {
    const alt = await freeSlug(data.slug, productId);
    return {
      status: "error",
      fieldErrors: { slug: `"${data.slug}" is already used by another product. Try "${alt}".` },
      formError: "Nothing was saved. Please fix the highlighted fields.",
      values: { ...raw, slug: data.slug },
    };
  }

  const saved = await db.transaction(async (tx) => {
    let id = productId;
    if (id === null) {
      const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${schema.products.sortOrder}), -1) + 1` }).from(schema.products);
      const [row] = await tx
        .insert(schema.products)
        .values({
          slug: data.slug,
          name: data.name,
          tagline: data.tagline,
          description: data.description,
          details: data.details,
          specifications: data.specifications,
          category: data.category,
          basePriceCents: data.priceCents,
          isAvailable: false,
          stock: data.stock,
          art: { kind: "vase", primary: "#d9c7a7", accent: "#5b4636", backdrop: "#efe4d2" },
          maker: data.maker,
          sortOrder: next,
        })
        .returning();
      id = row.id;
    } else {
      await tx
        .update(schema.products)
        .set({ slug: data.slug, name: data.name, tagline: data.tagline, description: data.description, category: data.category, basePriceCents: data.priceCents, stock: data.stock, details: data.details, maker: data.maker, specifications: data.specifications })
        .where(eq(schema.products.id, id));
    }
    await syncOptions(tx, id, options);
    const [row] = await tx.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
    return row;
  });

  // Publish and unpublish.
  let refused: string | null = null;
  if (intent === "publish") {
    if (await productHasPhoto(saved.id, saved.slug, saved.art)) {
      await db.update(schema.products).set({ isAvailable: true }).where(eq(schema.products.id, saved.id));
    } else {
      refused = "Add at least one photo before publishing.";
    }
  } else if (intent === "unpublish") {
    await db.update(schema.products).set({ isAvailable: false }).where(eq(schema.products.id, saved.id));
  }
  refreshStore();

  if (productId === null) {
    redirect(`/admin/products/${saved.id}?saved=created${refused ? "&refused=photo" : ""}`);
  }
  if (refused) {
    return { status: "error", fieldErrors: {}, formError: `Your changes were saved, but the product was not published. ${refused}`, values: raw };
  }
  const hasPhoto = await productHasPhoto(saved.id, saved.slug, saved.art);
  const [after] = await db.select().from(schema.products).where(eq(schema.products.id, saved.id)).limit(1);
  const next =
    intent === "publish"
      ? "It is now live in the store."
      : intent === "unpublish"
        ? "It is now a draft and hidden from shoppers."
        : !hasPhoto
          ? "Next: add photos below."
          : !after.isAvailable
            ? "Next: publish it when you are ready."
            : "The changes are live.";
  return { status: "saved", fieldErrors: {}, message: `Saved. ${next}`, values: raw };
}

// ---------------------------------------------------------------- photos

async function renumber(productId: number) {
  const rows = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, productId)).orderBy(asc(schema.productImages.position), asc(schema.productImages.id));
  for (const [i, r] of rows.entries()) if (r.position !== i) await db.update(schema.productImages).set({ position: i }).where(eq(schema.productImages.id, r.id));
}

export async function updatePhotoAlt(imageId: number, alt: string) {
  await requireOwner();
  const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.id, imageId)).limit(1);
  if (!img) return;
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, img.productId)).limit(1);
  const text = alt.trim().slice(0, 200) || product.name;
  await db.update(schema.productImages).set({ alt: text }).where(eq(schema.productImages.id, imageId));
  refreshStore();
}

export async function movePhoto(imageId: number, direction: "up" | "down" | "cover") {
  await requireOwner();
  const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.id, imageId)).limit(1);
  if (!img) return;
  const rows = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, img.productId)).orderBy(asc(schema.productImages.position), asc(schema.productImages.id));
  const order = rows.map((r) => r.id);
  const at = order.indexOf(imageId);
  if (direction === "cover") order.splice(0, 0, ...order.splice(at, 1));
  else {
    const to = direction === "up" ? at - 1 : at + 1;
    if (to < 0 || to >= order.length) return;
    [order[at], order[to]] = [order[to], order[at]];
  }
  for (const [i, id] of order.entries()) await db.update(schema.productImages).set({ position: i }).where(eq(schema.productImages.id, id));
  refreshStore();
}

export async function removePhoto(imageId: number) {
  await requireOwner();
  const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.id, imageId)).limit(1);
  if (!img) return;
  await db.delete(schema.productImages).where(eq(schema.productImages.id, imageId));
  const status = getStorage();
  if (status.ok) {
    await status.storage.remove(img.storageKey, img.url).catch(() => {});
    await status.storage.remove(img.originalKey, img.originalUrl).catch(() => {});
  }
  await renumber(img.productId);
  // A product with no photo cannot stay published.
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, img.productId)).limit(1);
  if (product?.isAvailable && !(await productHasPhoto(product.id, product.slug, product.art))) {
    await db.update(schema.products).set({ isAvailable: false }).where(eq(schema.products.id, product.id));
  }
  refreshStore();
}

// ---------------------------------------------------------------- categories

function back(kind: "notice" | "error", text: string): never {
  redirect(`/admin/categories?${kind}=${encodeURIComponent(text)}`);
}

export async function addCategory(formData: FormData) {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) back("error", "Enter a name for the new category.");
  if (name.length > 40) back("error", "Keep category names to 40 characters or fewer.");
  const slug = slugify(name);
  if (!slug) back("error", "Use at least one letter or number in the name.");
  const clash = await db.select().from(schema.categories).where(sql`lower(${schema.categories.name}) = ${name.toLowerCase()} or ${schema.categories.slug} = ${slug}`).limit(1);
  if (clash.length) back("error", `There is already a category called "${clash[0].name}".`);
  const [{ next }] = await db.select({ next: sql<number>`coalesce(max(${schema.categories.position}), -1) + 1` }).from(schema.categories);
  await db.insert(schema.categories).values({ name, slug, position: next });
  refreshStore();
  back("notice", `Added "${name}". It appears to shoppers once a published product is in it.`);
}

export async function renameCategory(formData: FormData) {
  await requireOwner();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
  if (!cat) back("error", "That category no longer exists.");
  if (!name) back("error", "Enter a name.");
  if (name.length > 40) back("error", "Keep category names to 40 characters or fewer.");
  if (name === cat.name) back("notice", "Nothing changed.");
  const slug = slugify(name);
  if (!slug) back("error", "Use at least one letter or number in the name.");
  const clash = await db
    .select()
    .from(schema.categories)
    .where(and(ne(schema.categories.id, id), sql`(lower(${schema.categories.name}) = ${name.toLowerCase()} or ${schema.categories.slug} = ${slug})`))
    .limit(1);
  if (clash.length) back("error", `There is already a category called "${clash[0].name}".`);
  await db.transaction(async (tx) => {
    const previous = slug === cat.slug ? cat.previousSlugs : [...new Set([...cat.previousSlugs.filter((s) => s !== slug), cat.slug])];
    await tx.update(schema.categories).set({ name, slug, previousSlugs: previous }).where(eq(schema.categories.id, id));
    await tx.update(schema.products).set({ category: name }).where(eq(schema.products.category, cat.name));
  });
  refreshStore();
  back("notice", `Renamed "${cat.name}" to "${name}". Every product in it moved with it, and old links still work.`);
}

export async function moveCategory(formData: FormData) {
  await requireOwner();
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir"));
  const cats = await db.select().from(schema.categories).orderBy(asc(schema.categories.position), asc(schema.categories.id));
  const at = cats.findIndex((c) => c.id === id);
  const to = dir === "up" ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= cats.length) back("notice", "Already there.");
  const order = cats.map((c) => c.id);
  [order[at], order[to]] = [order[to], order[at]];
  for (const [i, cid] of order.entries()) await db.update(schema.categories).set({ position: i }).where(eq(schema.categories.id, cid));
  refreshStore();
  back("notice", "Order updated.");
}

export async function deleteCategory(formData: FormData) {
  await requireOwner();
  const id = Number(formData.get("id"));
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
  if (!cat) back("error", "That category no longer exists.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.category, cat.name));
  if (n > 0) back("error", `"${cat.name}" still has ${n} ${n === 1 ? "product" : "products"}. Move ${n === 1 ? "it" : "them"} to another category first, then delete.`);
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  refreshStore();
  back("notice", `Deleted "${cat.name}".`);
}
