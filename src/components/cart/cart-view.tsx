"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { useAnnounce } from "@/components/announcer";
import { LineDescription, LineThumb, Totals } from "@/components/cart/line-item";
import { Container, EmptyState, buttonStyles } from "@/components/ui";
import { getStockLevels } from "@/app/cart/actions";
import { formatMoney, lineTotal } from "@/lib/pricing";
import { lineAllowance, maxForLine, type StockMap } from "@/lib/stock";

export function CartView() {
  const { lines, hydrated, itemCount, subtotalCents, shippingCents, totalCents, setQuantity, removeLine } = useCart();
  const announce = useAnnounce();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stock, setStock] = useState<StockMap>({});

  // Ask the server how many of each product are in stock now (the cart itself only lives in this browser).
  const productKey = [...new Set(lines.map((l) => l.productId))].sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!productKey) return;
    let cancelled = false;
    getStockLevels(productKey.split(",").map(Number))
      .then((levels) => {
        if (!cancelled) setStock(levels);
      })
      .catch(() => {
        // Without stock numbers the cart works as before; checkout still checks.
      });
    return () => {
      cancelled = true;
    };
  }, [productKey]);

  if (!hydrated) {
    return (
      <Container className="py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your cart</h1>
        <p className="mt-6 text-ink-soft" role="status">
          Loading your cart…
        </p>
      </Container>
    );
  }

  if (lines.length === 0) {
    return (
      <Container className="py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your cart</h1>
        <div className="mt-10">
          <EmptyState
            title="Your cart is empty"
            body="Nothing in here yet. Find something made by hand and it'll wait for you here."
            action={{ href: "/shop", label: "Browse the shop" }}
          />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-14">
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl font-semibold tracking-tight">
        Your cart
      </h1>
      <p className="mt-2 text-ink-soft">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Items in your cart">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-4 py-6">
                <LineThumb line={line} />
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:justify-between">
                  <div className="min-w-0">
                    <LineDescription name={line.name} slug={line.slug} options={line.options} personalization={line.personalization} />
                    <p className="mt-2 text-sm text-ink-soft">
                      <span className="sr-only">Unit price: </span>
                      {formatMoney(line.unitPriceCents)} each
                    </p>
                    <StockNotice
                      quantity={line.quantity}
                      allowed={lineAllowance(lines, line, stock)}
                      stock={stock[line.productId]?.stock ?? 0}
                      shared={lines.some((l) => l.productId === line.productId && l.id !== line.id)}
                      onChange={(q) => {
                        setQuantity(line.id, q);
                        announce(`${line.name} quantity updated to ${q}.`);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
                    <QuantityControl
                      name={line.name}
                      quantity={line.quantity}
                      max={maxForLine(lines, line, stock)}
                      onChange={(q) => {
                        setQuantity(line.id, q);
                        announce(`${line.name} quantity updated to ${q}.`);
                      }}
                    />
                    <p className="font-semibold tabular-nums">
                      <span className="sr-only">Line total: </span>
                      {formatMoney(lineTotal(line.unitPriceCents, line.quantity))}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        removeLine(line.id);
                        announce(`Removed ${line.name} from your cart.`);
                        headingRef.current?.focus();
                      }}
                      className="text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-danger"
                    >
                      Remove<span className="sr-only"> {line.name}</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/shop" className={`${buttonStyles.ghost} mt-6`}>
            <span aria-hidden="true">←</span> Continue shopping
          </Link>
        </section>

        <aside aria-labelledby="summary-heading" className="h-fit rounded-2xl border border-line bg-card p-6 lg:sticky lg:top-24">
          <h2 id="summary-heading" className="font-display text-xl font-semibold">
            Order summary
          </h2>
          <div className="mt-4">
            <Totals subtotalCents={subtotalCents} shippingCents={shippingCents} totalCents={totalCents} />
          </div>
          <Link href="/checkout" className={`${buttonStyles.primary} mt-6 w-full py-4 text-base`}>
            Go to checkout
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">Checkout is simulated. No payment is taken.</p>
          <p className="mt-4 border-t border-line pt-4 text-center text-xs text-ink-soft">
            30-day returns on most pieces.{" "}
            <Link href="/returns" className="font-medium text-clay underline underline-offset-4">
              Returns &amp; refunds
            </Link>
          </p>
        </aside>
      </div>
    </Container>
  );
}

/** Shown when a line asks for more than is in stock (or the product is gone). */
function StockNotice({
  quantity,
  allowed,
  stock,
  shared,
  onChange,
}: {
  quantity: number;
  allowed: number | null;
  stock: number;
  shared: boolean;
  onChange: (q: number) => void;
}) {
  if (allowed === null || quantity <= allowed) return null;
  const gone = stock <= 0 || (allowed === 0 && !shared);
  return (
    <div data-testid="stock-notice" role="status" className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {gone ? (
        <p>This item is no longer available. Remove it to continue.</p>
      ) : allowed === 0 ? (
        <p>Your other lines of this item already use all {stock} in stock. Remove one to continue.</p>
      ) : (
        <>
          <p>
            {shared
              ? `Only ${allowed} more available for this line (${stock} in stock, shared with your other lines of this item).`
              : `Only ${allowed} available.`}
          </p>
          <button
            type="button"
            onClick={() => onChange(allowed)}
            className="mt-1 font-semibold underline underline-offset-4"
          >
            Change to {allowed}
          </button>
        </>
      )}
    </div>
  );
}

function QuantityControl({ name, quantity, max, onChange }: { name: string; quantity: number; max: number; onChange: (q: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-card" role="group" aria-label={`Quantity for ${name}`}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${name}`}
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg disabled:cursor-not-allowed disabled:opacity-35"
      >
        −
      </button>
      <span className="w-8 text-center font-semibold tabular-nums" aria-live="off">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        aria-label={`Increase quantity of ${name}`}
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg disabled:cursor-not-allowed disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}
