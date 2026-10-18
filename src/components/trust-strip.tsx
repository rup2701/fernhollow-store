import Link from "next/link";
import { Container } from "@/components/ui";
import { DEMO_SHIPPING_CENTS, FREE_SHIPPING_THRESHOLD_CENTS, formatMoney } from "@/lib/pricing";

/**
 * A row of four reassurances just above the footer (CR-005). The numbers come from
 * the same settings checkout uses, so this strip can't drift from what a shopper pays.
 */

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconMaker() {
  // A small vase resting on an open palm.
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0" aria-hidden="true" {...ICON}>
      <path d="M21 6h6M22 6v5c-5 3-7 7-7 11 0 3 2 5 5 5h8c3 0 5-2 5-5 0-4-2-8-7-11V6" />
      <path d="M6 35l9-3h12c3 0 4 3 1 4l-7 1" />
      <path d="M15 32l12 0 11-6c2-1 4 1 2 3l-12 10H15L6 38" />
    </svg>
  );
}

function IconReturns() {
  // A box with a circular arrow around it.
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0" aria-hidden="true" {...ICON}>
      <path d="M24 13l11 5.5v11L24 35l-11-5.5v-11z" />
      <path d="M13 18.5L24 24l11-5.5M24 24v11" />
      <path d="M7 21a17 17 0 0 1 28-10" />
      <path d="M36 5v7h-7" />
      <path d="M41 27a17 17 0 0 1-28 10" />
      <path d="M12 43v-7h7" />
    </svg>
  );
}

function IconShipping() {
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0" aria-hidden="true" {...ICON}>
      <path d="M14 14h20v18H14zM34 20h6l5 6v6H34z" />
      <circle cx="21" cy="34" r="3.5" />
      <circle cx="39" cy="34" r="3.5" />
      <path d="M3 19h8M5 25h6M7 31h4" />
    </svg>
  );
}

function IconReply() {
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0" aria-hidden="true" {...ICON}>
      <path d="M9 10h30a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H25l-8 7v-7H9a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" />
      <path d="M17 21.5h.01M24 21.5h.01M31 21.5h.01" strokeWidth={3.5} />
    </svg>
  );
}

const linkClass = "font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink";

export function TrustStrip() {
  const items = [
    {
      key: "makers",
      icon: <IconMaker />,
      title: "Made by people you can name",
      body: <>Every piece lists the maker who threw, wove or poured it.</>,
    },
    {
      key: "returns",
      icon: <IconReturns />,
      title: "30-day returns",
      body: (
        <>
          Easy returns within 30 days of delivery.{" "}
          <Link href="/returns" className={linkClass}>
            Read our policy
          </Link>
          .
        </>
      ),
    },
    {
      key: "shipping",
      icon: <IconShipping />,
      title: `Free shipping over ${formatMoney(FREE_SHIPPING_THRESHOLD_CENTS).replace(".00", "")}`,
      body: <>Ships in 3–5 business days. A flat {formatMoney(DEMO_SHIPPING_CENTS).replace(".00", "")} below that (demo estimate).</>,
    },
    {
      key: "reply",
      icon: <IconReply />,
      title: "A real person replies",
      body: (
        <>
          Questions about an order or a custom piece? We reply within two business days.{" "}
          <Link href="/contact" className={linkClass}>
            Contact us
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    // -mb-24 cancels the footer's own top margin so the strip sits flush against it.
    <section aria-labelledby="trust-heading" className="-mb-24 mt-16 border-y border-line">
      <h2 id="trust-heading" className="sr-only">
        Shopping with Fernhollow
      </h2>
      <Container wide>
        <ul data-testid="trust-strip" className="grid sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-5 border-t border-line px-2 py-8 first:border-t-0 sm:px-8 sm:[&:nth-child(2)]:border-t-0 sm:even:border-l lg:border-t-0 lg:border-l lg:first:border-l-0 lg:first:pl-2"
            >
              <span className="text-ink">{item.icon}</span>
              <div>
                <h3 className="font-display text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
