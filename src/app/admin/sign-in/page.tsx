import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/owner-auth";
import { SignInForm } from "@/components/admin/sign-in-form";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner sign-in", robots: { index: false, follow: false } };

export default async function SignInPage() {
  if (await isOwner()) redirect("/admin/products");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <span className="font-display text-xl font-semibold">Fernhollow Goods</span>
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold">Owner sign-in</h1>
      <p className="mt-2 text-ink-soft">Sign in to manage products, photos and categories.</p>
      <SignInForm />
      <p className="mt-8 text-sm">
        <Link href="/" className="font-medium text-clay underline underline-offset-4">
          Back to the store
        </Link>
      </p>
    </div>
  );
}
