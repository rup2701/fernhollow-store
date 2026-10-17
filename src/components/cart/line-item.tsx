"use client";

import Link from "next/link";
import type { CartLine } from "@/components/cart/cart-context";
import { ProductArt } from "@/components/product-art";
import { formatMoney, lineTotal } from "@/lib/pricing";

/** Product name, chosen options and personalization: shared by cart, checkout and confirmation. */
export function LineDescription({
  name,
  slug,
  options,
  personalization,
  linked = true,
}: {
  name: string;
  slug: string;
  options: { name: string; value: string }[];
  personalization: string | null;
  linked?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="font-display text-base font-semibold leading-snug sm:text-lg">
        {linked ? (
          <Link href={`/shop/${slug}`} className="underline-offset-4 hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </p>
      {options.length > 0 || personalization ? (
        <dl className="mt-1 space-y-0.5 text-sm text-ink-soft">
          {options.map((o) => (
            <div key={o.name} className="flex gap-1">
              <dt>{o.name}:</dt>
              <dd className="text-ink">{o.value}</dd>
            </div>
          ))}
          {personalization ? (
            <div>
              <dt className="inline">Personalization: </dt>
              <dd className="inline break-words text-ink">&ldquo;{personalization}&rdquo;</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export function LineThumb({ line }: { line: Pick<CartLine, "art" | "personalization"> }) {
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line sm:h-24 sm:w-24">
      <ProductArt art={line.art} personalization={line.personalization} label="" className="h-full w-full" />
    </div>
  );
}

export function SummaryLine({ line }: { line: Pick<CartLine, "name" | "slug" | "options" | "personalization" | "art" | "unitPriceCents" | "quantity"> }) {
  return (
    <li className="flex gap-3 py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line">
        <ProductArt art={line.art} personalization={line.personalization} label="" className="h-full w-full" />
        <span className="absolute -right-0 -top-0 rounded-bl-lg bg-ink px-1.5 text-xs font-semibold text-paper" aria-hidden="true">
          {line.quantity}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 justify-between gap-3">
        <div className="min-w-0 text-sm">
          <LineDescription name={line.name} slug={line.slug} options={line.options} personalization={line.personalization} linked={false} />
          <p className="mt-1 text-ink-soft">
            {line.quantity} × {formatMoney(line.unitPriceCents)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(lineTotal(line.unitPriceCents, line.quantity))}</p>
      </div>
    </li>
  );
}

export function Totals({
  subtotalCents,
  shippingCents,
  totalCents,
}: {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd className="font-semibold tabular-nums">{formatMoney(subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">
          Shipping <span className="text-xs">(demo estimate, free over $75)</span>
        </dt>
        <dd className="tabular-nums">{shippingCents === 0 ? "Free" : formatMoney(shippingCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Tax</dt>
        <dd className="text-right text-xs text-ink-soft">Not calculated in this demo</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base">
        <dt className="font-semibold">Demo total</dt>
        <dd className="font-semibold tabular-nums">{formatMoney(totalCents)}</dd>
      </div>
    </dl>
  );
}
