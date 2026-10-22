CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"previous_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"original_url" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_key" text NOT NULL,
	"alt" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options" ADD COLUMN "default_value_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip","at");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
-- Existing stores: start every product with stock on hand, and create categories from the ones in use.
UPDATE "products" SET "stock" = 25;--> statement-breakpoint
INSERT INTO "categories" ("name", "slug", "position")
SELECT "category", regexp_replace(lower("category"), '[^a-z0-9]+', '-', 'g'), (row_number() OVER (ORDER BY min("sort_order")) - 1)::int
FROM "products" GROUP BY "category";
