import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await db.select().from(schema.categories).orderBy(asc(schema.categories.position));
  return (
    <>
      <p className="text-sm">
        <Link href="/admin/products" className="font-medium text-clay underline underline-offset-4">
          All products
        </Link>
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold">New product</h1>
      <p className="mt-1 text-ink-soft">Start with the basics. After you save, you can add photos and publish.</p>
      <div className="mt-8">
        <ProductForm
          productId={null}
          categories={categories.map((c) => c.name)}
          published={false}
          hasPhoto={false}
          slugLocked={false}
          initial={{ name: "", slug: "", tagline: "", description: "", price: "", category: "", stock: "0", details: "", maker: "", specifications: "", options: [] }}
        />
      </div>
    </>
  );
}
