import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { db, schema } from "@/db";
import { isOwner } from "@/lib/owner-auth";
import { getStorage } from "@/lib/storage";
import { LIMITS } from "@/lib/admin/validation";

export const runtime = "nodejs";

const FORMATS: Record<string, { ext: string; type: string }> = {
  jpeg: { ext: "jpg", type: "image/jpeg" },
  png: { ext: "png", type: "image/png" },
  webp: { ext: "webp", type: "image/webp" },
};
const WEB_WIDTH = 2000;

const fail = (message: string, status: number) => Response.json({ ok: false, message }, { status });

/** Upload one photo for a product. The owner area calls this once per file. */
export async function POST(req: Request) {
  if (!(await isOwner())) return fail("Your session has ended. Sign in again, then retry.", 401);

  const storage = getStorage();
  if (!storage.ok) return fail(storage.message, 503);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("That upload didn't arrive in one piece. Please try again.", 400);
  }
  const productId = Number(form.get("productId"));
  const file = form.get("file");
  if (!Number.isInteger(productId) || !(file instanceof File)) return fail("Choose a photo to upload.", 400);

  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) return fail("That product no longer exists.", 404);

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.productImages).where(eq(schema.productImages.productId, productId));
  if (n >= LIMITS.photos) return fail(`A product can have ${LIMITS.photos} photos at most. Remove one to add another.`, 400);

  if (file.size > LIMITS.photoBytes) {
    return fail(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Photos can be 5 MB at most. Try a smaller export.`, 413);
  }

  const original = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(original).metadata();
  } catch {
    meta = null;
  }
  const format = meta?.format ? FORMATS[meta.format] : undefined;
  if (!meta || !format || !meta.width || !meta.height) {
    return fail(`"${file.name}" isn't a photo we can use. Upload a JPEG, PNG or WebP image.`, 415);
  }

  // Shoppers get a web-sized copy; the original is kept.
  let pipeline = sharp(original).rotate().resize({ width: WEB_WIDTH, withoutEnlargement: true });
  if (meta.format === "jpeg") pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
  else if (meta.format === "webp") pipeline = pipeline.webp({ quality: 85 });
  else pipeline = pipeline.png({ compressionLevel: 9 });
  const web = await pipeline.toBuffer();

  const id = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const key = `products/${productId}/${id}.${format.ext}`;
  const originalKey = `originals/${productId}/${id}.${format.ext}`;

  let url: string;
  let originalUrl: string;
  try {
    url = (await storage.storage.put(key, web, format.type)).url;
    originalUrl = (await storage.storage.put(originalKey, original, format.type)).url;
  } catch (err) {
    console.error(err);
    return fail("We couldn't save that photo. Nothing was added. Please try again.", 500);
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${schema.productImages.position}), -1) + 1` })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId));
  const rawAlt = String(form.get("alt") ?? "").trim().slice(0, 200);
  const [image] = await db
    .insert(schema.productImages)
    .values({
      productId,
      url,
      originalUrl,
      storageKey: key,
      originalKey,
      alt: rawAlt || product.name,
      position: next,
      width: meta.width,
      height: meta.height,
    })
    .returning();

  revalidatePath("/", "layout");
  return Response.json({
    ok: true,
    image: { id: image.id, url: image.url, alt: image.alt, width: image.width },
    softWidth: meta.width < LIMITS.softWidth,
    resized: meta.width > WEB_WIDTH,
  });
}
