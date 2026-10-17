import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { AnnouncerProvider } from "@/components/announcer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { default: "Fernhollow Goods · Handmade in small batches", template: "%s · Fernhollow Goods" },
  description: "Ceramics, textiles, woodwork and candles made by hand in a small studio.",
};

export const viewport: Viewport = { themeColor: "#f7f2ea" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <AnnouncerProvider>
          <CartProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
          </CartProvider>
        </AnnouncerProvider>
      </body>
    </html>
  );
}
