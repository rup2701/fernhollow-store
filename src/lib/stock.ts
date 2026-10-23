import { MAX_QUANTITY } from "@/lib/pricing";

/** What the server says about one product right now. */
export type StockInfo = { stock: number; available: boolean };
export type StockMap = Record<number, StockInfo>;

type StockLine = { id: string; productId: number; quantity: number };

/**
 * How many of this line the shopper may have. Stock is counted per product, so the
 * quantities on the product's other cart lines come off first. Null when stock is not known yet.
 */
export function lineAllowance(lines: StockLine[], line: StockLine, stock: StockMap): number | null {
  const info = stock[line.productId];
  if (!info) return null;
  if (!info.available || info.stock <= 0) return 0;
  const others = lines.filter((l) => l.productId === line.productId && l.id !== line.id).reduce((n, l) => n + l.quantity, 0);
  return Math.max(0, info.stock - others);
}

/** Highest quantity the stepper may reach for a line. */
export function maxForLine(lines: StockLine[], line: StockLine, stock: StockMap): number {
  const allowed = lineAllowance(lines, line, stock);
  return allowed === null ? MAX_QUANTITY : Math.min(MAX_QUANTITY, allowed);
}
