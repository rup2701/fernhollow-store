"use client";

import { usePathname } from "next/navigation";

/** The shopper header and footer do not belong in the owner area. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
