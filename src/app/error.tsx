"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container, buttonStyles } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center" role="alert">
        <h1 className="font-display text-3xl font-semibold">The shop is having a moment</h1>
        <p className="mt-3 text-ink-soft">
          We couldn&apos;t load this page, usually because the catalog database isn&apos;t reachable. Your cart is saved in this browser, so nothing is
          lost.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonStyles.primary}>
            Try again
          </button>
          <Link href="/cart" className={buttonStyles.secondary}>
            Go to your cart
          </Link>
        </div>
      </div>
    </Container>
  );
}
