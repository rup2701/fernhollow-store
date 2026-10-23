"use server";

import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StockMap } from "@/lib/stock";

/** Current stock and publish state for the products in a cart. Public numbers only; nothing else is returned. */
export async function getStockLevels(productIds: number[]): Promise<StockMap> {
  const ids = [...new Set(productIds.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 50);
  if (ids.length === 0) return {};
  const rows = await db
    .select({ id: schema.products.id, stock: schema.products.stock, isAvailable: schema.products.isAvailable })
    .from(schema.products)
    .where(inArray(schema.products.id, ids));
  return Object.fromEntries(rows.map((r) => [r.id, { stock: r.stock, available: r.isAvailable }]));
}
