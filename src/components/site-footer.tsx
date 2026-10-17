import Link from "next/link";
import { Logo } from "@/components/logo";
import { WIDE_SHELL } from "@/components/ui";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "Shop all" },
      { href: "/shop?category=ceramics", label: "Ceramics" },
      { href: "/shop?category=textiles", label: "Textiles" },
      { href: "/cart", label: "Your cart" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help", label: "Help & FAQ" },
      { href: "/returns", label: "Returns & refunds" },
      { href: "/contact", label: "Contact us" },
    ],
  },
];

/**
 * Payment methods planned for launch. Shown as plain text labels on purpose:
 * official card-brand artwork should come from the payment provider's asset kit.
 */
const PAYMENT_METHODS = ["Visa", "Mastercard", "American Express", "Discover", "Apple Pay", "Google Pay", "PayPal"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep/60">
      <div className={`${WIDE_SHELL} grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]`}>
        <div className="flex items-start gap-3">
          <Logo className="h-9 w-9 shrink-0" />
          <div>
            <p className="font-display text-lg font-semibold">Fernhollow Goods</p>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">Four makers, one small studio, everything made by hand.</p>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={`Footer: ${col.title}`}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link className="text-ink-soft underline-offset-4 hover:text-ink hover:underline" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Subfooter */}
      <div className="border-t border-line">
        <div className={`${WIDE_SHELL} flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <h2 id="payments-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
              We accept
            </h2>
            <ul aria-labelledby="payments-heading" className="mt-2 flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <li key={m} className="rounded-md border border-line bg-card px-2 py-1 text-xs font-medium text-ink-soft">
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-soft">Shown for demonstration. This store&apos;s checkout is simulated and never collects payment.</p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-ink-soft lg:items-end">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <li>
                <Link href="/help" className="underline-offset-4 hover:text-ink hover:underline">
                  Help
                </Link>
              </li>
              <li>
                <Link href="/returns" className="underline-offset-4 hover:text-ink hover:underline">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/contact" className="underline-offset-4 hover:text-ink hover:underline">
                  Contact us
                </Link>
              </li>
            </ul>
            <p>© {new Date().getFullYear()} Fernhollow Goods · A fictional demo store</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
