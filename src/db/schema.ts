import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Data model derived from domain-model.json.
 *
 * Product        -> products
 * ProductOption  -> product_options + option_values (an option and its values)
 *                   + variants (availability of each valid configuration)
 * Cart           -> browser-local (localStorage), per requirements.json
 * Order          -> orders + order_items (snapshot of what was agreed at checkout)
 * Customer       -> embedded on orders (no accounts; out of scope)
 * Category       -> categories (owner-managed; products.category holds the category name)
 * ProductImage   -> product_images (stored through the storage adapter)
 * Owner          -> not in the database: email and password hash come from environment config
 *
 * All money is stored as integer cents (USD).
 */

export type ProductArt = {
  /** Which illustration to draw for this product. */
  kind:
    | "mug"
    | "bowl"
    | "candle"
    | "board"
    | "necklace"
    | "blanket"
    | "towel"
    | "journal"
    | "hanger"
    | "vase";
  /** Main colour of the object when no colour option is selected. */
  primary: string;
  /** Secondary/accent colour. */
  accent: string;
  /** Background tint for the product card. */
  backdrop: string;
  /** Real product photo (path under /public). When set it replaces the illustration. */
  photo?: string;
  /** Alt text for the photo. */
  photoAlt?: string;
};

export type PersonalizationRule = {
  label: string;
  help: string;
  maxLength: number;
  placeholder?: string;
};

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    /** Materials, dimensions and care notes shown as a list. */
    details: jsonb("details").$type<string[]>().notNull().default([]),
    /** Owner-typed bullets (CR-007). A line may hold [text](https://...) links. Empty hides the card. */
    specifications: jsonb("specifications").$type<string[]>().notNull().default([]),
    category: text("category").notNull(),
    basePriceCents: integer("base_price_cents").notNull(),
    /** Only products available for sale appear in the shopper catalog. */
    /** Published products are visible to shoppers; unpublished ones are drafts. */
    isAvailable: boolean("is_available").notNull().default(true),
    /** Units on hand. 0 shows "Sold out" and blocks purchase. */
    stock: integer("stock").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    /** Null means the product does not support personalization. */
    personalization: jsonb("personalization").$type<PersonalizationRule | null>(),
    art: jsonb("art").$type<ProductArt>().notNull(),
    maker: text("maker").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("products_slug_idx").on(t.slug), index("products_category_idx").on(t.category)],
);

export const productOptions = pgTable("product_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  /** A required option must be chosen before adding to the cart. */
  required: boolean("required").notNull().default(true),
  /** Value preselected on the product page. Null means the shopper chooses. */
  defaultValueId: integer("default_value_id"),
});

export const optionValues = pgTable("option_values", {
  id: serial("id").primaryKey(),
  optionId: integer("option_id")
    .notNull()
    .references(() => productOptions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  /** Price impact relative to the product's base price. */
  priceDeltaCents: integer("price_delta_cents").notNull().default(0),
  /** Optional colour used to tint the product illustration. */
  swatch: text("swatch"),
  position: integer("position").notNull().default(0),
});

/**
 * One row per valid configuration. `key` is the selected option value ids,
 * in option-position order, joined with "." ("" for products without options).
 */
export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (t) => [uniqueIndex("variants_product_key_idx").on(t.productId, t.key)],
);

export type OrderedOption = { name: string; value: string };

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull(),
    /** Client-generated token so a resubmitted checkout never creates a second order. */
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("demo_placed"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    region: text("region").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_reference_idx").on(t.reference),
    uniqueIndex("orders_idempotency_idx").on(t.idempotencyKey),
  ],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** Kept for reference only; the snapshot fields below are the source of truth. */
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  options: jsonb("options").$type<OrderedOption[]>().notNull().default([]),
  personalization: text("personalization"),
  art: jsonb("art").$type<ProductArt>().notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    position: integer("position").notNull().default(0),
    /** Earlier slugs, so a renamed category's old URL still works. */
    previousSlugs: jsonb("previous_slugs").$type<string[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug), uniqueIndex("categories_name_idx").on(t.name)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Web-sized image shown to shoppers. */
    url: text("url").notNull(),
    /** The file as uploaded, kept for the owner. */
    originalUrl: text("original_url").notNull(),
    storageKey: text("storage_key").notNull(),
    originalKey: text("original_key").notNull(),
    alt: text("alt").notNull(),
    /** Position 0 is the cover. */
    position: integer("position").notNull().default(0),
    /** Pixel size of the original upload. */
    width: integer("width").notNull(),
    height: integer("height").notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

/** Failed owner sign-in attempts, used to pause sign-in after repeated failures. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.at)],
);
