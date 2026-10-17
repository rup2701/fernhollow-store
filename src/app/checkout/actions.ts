"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getProductsByIds } from "@/lib/catalog";
import { cartPayloadSchema, validateCustomer, type CheckoutState } from "@/lib/checkout-schema";
import { normalizePersonalization, validatePersonalization } from "@/lib/personalization";
import { lineTotal, totals } from "@/lib/pricing";

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newReference() {
  const pick = (n: number) => Array.from({ length: n }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");
  return `FH-${pick(4)}-${pick(4)}`;
}

async function findByIdempotencyKey(key: string) {
  const [existing] = await db
    .select({ reference: schema.orders.reference })
    .from(schema.orders)
    .where(eq(schema.orders.idempotencyKey, key))
    .limit(1);
  return existing?.reference ?? null;
}

/**
 * Creates a DEMO order. No payment details are accepted and no payment
 * provider is called. Prices and availability are re-checked here against
 * the database so the browser cart can never set its own prices.
 */
export async function placeDemoOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
    return { status: "error", fieldErrors: {}, formError: "Your session looks out of date. Refresh the page and try again." };
  }

  // A resubmission of an order we already created returns that same order.
  const already = await findByIdempotencyKey(idempotencyKey);
  if (already) return { status: "success", reference: already };

  const customer = validateCustomer({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    address1: formData.get("address1") ?? "",
    address2: formData.get("address2") ?? "",
    city: formData.get("city") ?? "",
    region: formData.get("region") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country") ?? "",
  });

  let cart;
  try {
    cart = cartPayloadSchema.parse(JSON.parse(String(formData.get("cart") ?? "[]")));
  } catch {
    return { status: "error", fieldErrors: customer.ok ? {} : customer.errors, formError: "We couldn't read your cart. Please return to the cart and try again." };
  }
  if (cart.length === 0) {
    return { status: "error", fieldErrors: {}, formError: "Your cart is empty, so there's nothing to check out yet." };
  }
  if (!customer.ok) {
    return { status: "error", fieldErrors: customer.errors, formError: "Please fix the highlighted fields." };
  }

  // Re-price and re-validate every line from the database.
  const products = await getProductsByIds([...new Set(cart.map((l) => l.productId))]);
  const unavailable: { id: string; name: string }[] = [];
  const priceUpdates: Record<string, number> = {};
  const priced: Omit<typeof schema.orderItems.$inferInsert, "orderId">[] & { unitPriceCents: number; quantity: number }[] = [];

  for (const line of cart) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.key === line.variantKey);
    if (!product || !product.isAvailable || !variant || !variant.isAvailable) {
      unavailable.push({ id: line.id, name: product?.name ?? "An item" });
      continue;
    }

    let personalization: string | null = null;
    if (line.personalization) {
      if (!product.personalization || validatePersonalization(line.personalization, product.personalization)) {
        unavailable.push({ id: line.id, name: product.name });
        continue;
      }
      personalization = normalizePersonalization(line.personalization);
    }

    const valueIds = line.variantKey === "" ? [] : line.variantKey.split(".").map(Number);
    const options = product.options.map((o, i) => {
      const value = o.values.find((v) => v.id === valueIds[i])!;
      return { name: o.name, value: value.label, delta: value.priceDeltaCents };
    });
    const unitPriceCents = product.basePriceCents + options.reduce((sum, o) => sum + o.delta, 0);
    if (unitPriceCents !== line.unitPriceCents) priceUpdates[line.id] = unitPriceCents;

    const color = product.options
      .map((o, i) => o.values.find((v) => v.id === valueIds[i])?.swatch)
      .find((s): s is string => Boolean(s));

    priced.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      options: options.map(({ name, value }) => ({ name, value })),
      personalization,
      art: { ...product.art, primary: color ?? product.art.primary },
      unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: lineTotal(unitPriceCents, line.quantity),
    });
  }

  if (unavailable.length > 0) {
    const names = [...new Set(unavailable.map((u) => u.name))].join(", ");
    return {
      status: "error",
      fieldErrors: {},
      formError: `Some items are no longer available (${names}). Remove them from your cart to continue.`,
      unavailableLineIds: unavailable.map((u) => u.id),
    };
  }
  if (Object.keys(priceUpdates).length > 0) {
    return {
      status: "error",
      fieldErrors: {},
      formError: "A price changed since you added it to your cart. We've updated your summary. Please review it and place your order again.",
      priceUpdates,
    };
  }

  const sums = totals(priced);
  const c = customer.data;

  try {
    const reference = await db.transaction(async (tx) => {
      // Retry on the (very unlikely) chance of a reference collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        const reference = newReference();
        const [order] = await tx
          .insert(schema.orders)
          .values({
            reference,
            idempotencyKey,
            fullName: c.fullName,
            email: c.email,
            address1: c.address1,
            address2: c.address2 || null,
            city: c.city,
            region: c.region,
            postalCode: c.postalCode,
            country: c.country,
            ...sums,
          })
          .onConflictDoNothing({ target: schema.orders.reference })
          .returning({ id: schema.orders.id });
        if (!order) continue;
        await tx.insert(schema.orderItems).values(priced.map((p) => ({ ...p, orderId: order.id })));
        return reference;
      }
      throw new Error("Could not allocate an order reference");
    });
    return { status: "success", reference };
  } catch (err) {
    // A concurrent duplicate submission may have won the race: return its order.
    const existing = await findByIdempotencyKey(idempotencyKey);
    if (existing) return { status: "success", reference: existing };
    console.error(err);
    return { status: "error", fieldErrors: {}, formError: "Something went wrong placing your demo order. Nothing was charged. Please try again." };
  }
}
