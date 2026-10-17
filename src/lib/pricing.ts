/** Shared money and demo-charge rules, used by both the browser cart and the server order. */

export const CURRENCY = "USD";

/** Demo flat-rate shipping; clearly labelled as an estimate everywhere it appears. */
export const DEMO_SHIPPING_CENTS = 600;
export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY });

export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

export function lineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

export function shippingFor(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : DEMO_SHIPPING_CENTS;
}

export function totals(lines: { unitPriceCents: number; quantity: number }[]) {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l.unitPriceCents, l.quantity), 0);
  const shippingCents = shippingFor(subtotalCents);
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

export const MAX_QUANTITY = 10;
