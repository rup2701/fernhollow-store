import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SummaryLine, Totals } from "@/components/cart/line-item";
import { Container, DemoNotice, buttonStyles } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

/** Read-only: viewing or refreshing this page never creates an order. */
export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference: raw } = await params;
  const reference = decodeURIComponent(raw).trim().toUpperCase();
  if (!/^FH-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reference)) notFound();

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.reference, reference)).limit(1);
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(asc(schema.orderItems.id));
  const firstName = order.fullName.split(" ")[0];
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-moss text-paper" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Thank you, {firstName}. Your demo order is in.</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Order reference{" "}
          <strong className="rounded-md bg-paper-deep px-2 py-0.5 font-mono text-base tracking-wider text-ink">{order.reference}</strong>
        </p>

        <DemoNotice className="mt-6">
          <strong>This was a demo order.</strong> Nothing was charged, nothing will ship, and no email has been sent.
        </DemoNotice>

        <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_16rem]">
          <section aria-labelledby="items-heading" className="rounded-2xl border border-line bg-card p-6">
            <h2 id="items-heading" className="font-display text-xl font-semibold">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {items.map((i) => (
                <SummaryLine
                  key={i.id}
                  line={{
                    name: i.productName,
                    slug: i.productSlug,
                    options: i.options.map((o) => ({ ...o, optionId: 0, valueId: 0 })),
                    personalization: i.personalization,
                    art: i.art,
                    unitPriceCents: i.unitPriceCents,
                    quantity: i.quantity,
                  }}
                />
              ))}
            </ul>
            <div className="mt-2 border-t border-line pt-4">
              <Totals subtotalCents={order.subtotalCents} shippingCents={order.shippingCents} totalCents={order.totalCents} />
            </div>
          </section>

          <section aria-labelledby="ship-heading" className="h-fit rounded-2xl border border-line bg-card p-6 text-sm">
            <h2 id="ship-heading" className="font-display text-lg font-semibold">
              Shipping to
            </h2>
            <address className="mt-3 not-italic leading-relaxed text-ink-soft">
              <span className="text-ink">{order.fullName}</span>
              <br />
              {order.address1}
              {order.address2 ? (
                <>
                  <br />
                  {order.address2}
                </>
              ) : null}
              <br />
              {order.city}, {order.region} {order.postalCode}
              <br />
              {order.country}
            </address>
            <p className="mt-4 break-all text-ink-soft">{order.email}</p>
            <p className="mt-4 text-xs text-ink-soft">
              Placed {order.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/shop" className={buttonStyles.primary}>
            Keep shopping
          </Link>
          <Link href="/" className={buttonStyles.secondary}>
            Back to home
          </Link>
        </div>
      </div>
    </Container>
  );
}
