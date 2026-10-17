"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { Logo } from "@/components/logo";
import { WIDE_SHELL } from "@/components/ui";

const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/shop", label: "Shop", match: (p: string) => p.startsWith("/shop") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();
  const cartActive = pathname.startsWith("/cart") || pathname.startsWith("/checkout");

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className={`${WIDE_SHELL} flex h-16 items-center justify-between gap-4`}>
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="Fernhollow Goods, home">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="whitespace-nowrap font-display text-base font-semibold tracking-tight min-[400px]:text-lg sm:text-xl">Fernhollow Goods</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 sm:gap-2">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href} className={item.href === "/" ? "hidden sm:block" : undefined}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/cart"
                aria-current={cartActive ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  cartActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" strokeLinejoin="round" />
                  <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
                </svg>
                <span className="max-[420px]:sr-only">Cart</span>
                <span
                  className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                    cartActive ? "bg-paper text-ink" : "bg-clay text-white"
                  } ${hydrated ? "" : "opacity-0"}`}
                >
                  <span className="sr-only">, </span>
                  {itemCount}
                  <span className="sr-only"> {itemCount === 1 ? "item" : "items"}</span>
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
