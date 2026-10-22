import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner-auth";
import { getStorage } from "@/lib/storage";
import { signOutAction } from "@/app/admin/actions";
import { Notice } from "@/components/admin/ui";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Owner area", template: "%s · Owner area" }, robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  if (!(await isOwner())) redirect("/admin/sign-in");
  const storage = getStorage();
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin/products" className="flex items-center gap-2 text-ink">
            <Logo className="h-7 w-7" />
            <span className="font-display text-lg font-semibold">Owner area</span>
          </Link>
          <nav aria-label="Owner" className="flex gap-4 text-sm font-semibold">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="underline-offset-4 hover:underline">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="font-medium text-clay underline underline-offset-4">
              View the store
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="font-semibold underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!storage.ok ? (
          <div className="mb-6">
            <Notice tone="error">{storage.message}</Notice>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
