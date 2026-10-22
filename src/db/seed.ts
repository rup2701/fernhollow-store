import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { PersonalizationRule, ProductArt } from "./schema";

/**
 * Original catalog for "Fernhollow Goods", an invented independent studio.
 * Every product, maker and description here is fictional.
 */

type SeedOption = {
  name: string;
  values: { label: string; delta?: number; swatch?: string }[];
};

type SeedProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  details: string[];
  category: string;
  basePriceCents: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  maker: string;
  art: ProductArt;
  personalization?: PersonalizationRule;
  options?: SeedOption[];
  /** Combinations (by value label, in option order) that are sold out. */
  unavailable?: string[][];
};

const catalog: SeedProduct[] = [
  {
    slug: "speckled-stoneware-mug",
    name: "Speckled Stoneware Mug",
    tagline: "Wheel-thrown, holds a generous 12 oz pour.",
    description:
      "Each mug is thrown on the wheel from iron-flecked stoneware, trimmed by hand, and dipped in one of three glazes. The speckles come from the clay itself, so no two mugs carry the same pattern. A wide, thumb-friendly handle makes it the mug you reach for first.",
    details: ["Stoneware clay, food-safe glaze", "12 oz / 350 ml", "Dishwasher and microwave safe", "Approx. 3.75 in tall"],
    category: "Ceramics",
    basePriceCents: 3400,
    isFeatured: true,
    maker: "Thrown by Ines in the studio's back room",
    art: { kind: "mug", primary: "#d9c7a7", accent: "#5b4636", backdrop: "#efe4d2" },
    options: [
      {
        name: "Glaze",
        values: [
          { label: "Oat", swatch: "#d9c7a7" },
          { label: "Sage", swatch: "#9aab8a" },
          { label: "Midnight", delta: 400, swatch: "#2f3a4f" },
        ],
      },
    ],
    unavailable: [["Midnight"]],
  },
  {
    slug: "hand-thrown-serving-bowl",
    name: "Hand-Thrown Serving Bowl",
    tagline: "A wide, shallow bowl for salads, fruit and family dinners.",
    description:
      "A low, open form with a softly rolled rim, glazed inside and left raw at the foot so you can feel the clay. It's sized for the middle of the table and looks just as good empty on a shelf.",
    details: ["Stoneware clay, food-safe glaze", "Unglazed foot ring", "Hand wash recommended", "Small 8 in · Medium 10 in · Large 12 in"],
    category: "Ceramics",
    basePriceCents: 4800,
    isFeatured: true,
    maker: "Thrown by Ines",
    art: { kind: "bowl", primary: "#d9c7a7", accent: "#7a5a44", backdrop: "#e9e1d3" },
    options: [
      {
        name: "Size",
        values: [{ label: "Small" }, { label: "Medium", delta: 1200 }, { label: "Large", delta: 2400 }],
      },
      {
        name: "Glaze",
        values: [
          { label: "Oat", swatch: "#d9c7a7" },
          { label: "Sage", swatch: "#9aab8a" },
        ],
      },
    ],
    unavailable: [["Large", "Sage"]],
  },
  {
    slug: "amber-jar-soy-candle",
    name: "Amber Jar Soy Candle",
    tagline: "Hand-poured soy wax with a cotton wick.",
    description:
      "Poured in small batches of twenty, cured for two weeks, and finished with a letterpress label. The amber jar keeps going long after the candle is done, as a pencil cup, a planter or a home for matches.",
    details: ["100% soy wax, cotton wick", "Phthalate-free fragrance oils", "8 oz burns ~45 hours, 12 oz ~70 hours", "Trim wick to 1/4 in before each burn"],
    category: "Candles",
    basePriceCents: 2600,
    isFeatured: true,
    maker: "Poured by Theo on Thursdays",
    art: { kind: "candle", primary: "#a8641f", accent: "#f3e6cf", backdrop: "#f1e2cc" },
    options: [
      { name: "Scent", values: [{ label: "Cedar & Smoke" }, { label: "Fig Leaf" }, { label: "Sea Salt" }] },
      { name: "Size", values: [{ label: "8 oz" }, { label: "12 oz", delta: 800 }] },
    ],
    unavailable: [["Fig Leaf", "12 oz"]],
  },
  {
    slug: "engraved-walnut-board",
    name: "Engraved Walnut Board",
    tagline: "End-grain walnut, oiled and ready for the kitchen.",
    description:
      "Cut from a single slab of black walnut, sanded through five grits and finished with food-safe oil and beeswax. Add a short engraving along the lower edge for a housewarming or wedding gift that gets used every day.",
    details: ["Solid black walnut", "Food-safe mineral oil & beeswax finish", "Medium 9 × 14 in · Large 12 × 18 in", "Hand wash, re-oil monthly"],
    category: "Woodwork",
    basePriceCents: 6800,
    isFeatured: true,
    maker: "Made by Marguerite at the bench",
    art: { kind: "board", primary: "#6b4a33", accent: "#3e2a1d", backdrop: "#eadfce" },
    personalization: {
      label: "Engraving",
      help: "Up to 24 characters: letters, numbers, spaces and & . , ' -",
      maxLength: 24,
      placeholder: "e.g. The Okafors · 2026",
    },
    options: [{ name: "Size", values: [{ label: "Medium" }, { label: "Large", delta: 2200 }] }],
  },
  {
    slug: "hand-stamped-brass-pendant",
    name: "Hand-Stamped Brass Pendant",
    tagline: "A small brass disc stamped letter by letter.",
    description:
      "We cut each disc from brass sheet, file the edges smooth, and stamp your initials one strike at a time, so the letters sit a little unevenly, the way handmade lettering should. It comes on a fine brass chain in your choice of length.",
    details: ["Solid brass pendant, 5/8 in", "Brass cable chain with lobster clasp", "Will develop a warm patina over time", "Arrives in a recycled-card gift box"],
    category: "Jewelry",
    basePriceCents: 4200,
    maker: "Stamped by Theo",
    art: { kind: "necklace", primary: "#c9a24a", accent: "#8a6a24", backdrop: "#f0e7d6" },
    personalization: {
      label: "Initials",
      help: "Up to 3 letters",
      maxLength: 3,
      placeholder: "e.g. ARJ",
    },
    options: [{ name: "Chain length", values: [{ label: '16"' }, { label: '18"' }, { label: '20"', delta: 300 }] }],
  },
  {
    slug: "herringbone-wool-throw",
    name: "Herringbone Wool Throw",
    tagline: "Woven on a floor loom from undyed and plant-dyed wool.",
    description:
      "Woven in a tight herringbone on an eight-shaft floor loom, washed to soften, then finished with a hand-twisted fringe. It's heavy enough to matter on a cold evening and light enough to leave on the back of the sofa all year.",
    details: ["100% wool", "50 × 60 in, plus 3 in fringe", "Dry clean or cold hand wash", "Each throw takes about two days at the loom"],
    category: "Textiles",
    basePriceCents: 18500,
    isFeatured: true,
    maker: "Woven by Ade",
    art: { kind: "blanket", primary: "#b0583a", accent: "#f2e6d6", backdrop: "#ece2d4" },
    options: [
      {
        name: "Color",
        values: [
          { label: "Rust", swatch: "#b0583a" },
          { label: "Moss", swatch: "#6f7a4a" },
          { label: "Charcoal", swatch: "#45444a" },
        ],
      },
    ],
    unavailable: [["Charcoal"]],
  },
  {
    slug: "striped-linen-tea-towels",
    name: "Striped Linen Tea Towels, Set of 2",
    tagline: "Stone-washed linen that gets softer with every wash.",
    description:
      "Cut and hemmed by hand from heavyweight European linen with a woven indigo stripe. Linen dries glassware without lint and only gets better as it ages.",
    details: ["100% linen", "Two towels, 18 × 28 in each", "Hanging loop on one corner", "Machine wash warm, tumble dry low"],
    category: "Textiles",
    basePriceCents: 2800,
    maker: "Sewn by Ade",
    art: { kind: "towel", primary: "#ece4d6", accent: "#3b4f6b", backdrop: "#e6e2d9" },
  },
  {
    slug: "leather-bound-journal",
    name: "Leather-Bound Journal",
    tagline: "Hand-stitched signatures in a vegetable-tanned cover.",
    description:
      "Six signatures of heavy cotton paper, sewn with waxed linen thread into a vegetable-tanned leather cover with a wrap-around tie. Add a name to the front cover and it's blind-debossed by hand.",
    details: ["Vegetable-tanned leather", "144 pages of 120 gsm cotton paper", "A5 (5.8 × 8.3 in)", "Lies flat when open"],
    category: "Paper Goods",
    basePriceCents: 5400,
    isFeatured: true,
    maker: "Bound by Marguerite",
    art: { kind: "journal", primary: "#8a5a3b", accent: "#e9dcc4", backdrop: "#efe5d6" },
    personalization: {
      label: "Name on cover",
      help: "Up to 20 characters: letters, numbers, spaces and & . , ' -",
      maxLength: 20,
      placeholder: "e.g. Field Notes",
    },
    options: [{ name: "Paper", values: [{ label: "Lined" }, { label: "Dotted" }, { label: "Blank" }] }],
  },
  {
    slug: "macrame-plant-hanger",
    name: "Macramé Plant Hanger",
    tagline: "Knotted cotton cord with a solid oak ring.",
    description:
      "Knotted by hand from soft, undyed cotton cord and hung from a solid oak ring. It holds pots up to 7 in across. Hang it in a sunny window and let the plant take over.",
    details: ["Natural cotton cord, oak ring", "Fits pots up to 7 in diameter", "Pot and plant not included", "Short 30 in · Long 42 in"],
    category: "Textiles",
    basePriceCents: 3200,
    maker: "Knotted by Ade",
    art: { kind: "hanger", primary: "#efe3cf", accent: "#5f7a4c", backdrop: "#e7e4d5" },
    options: [{ name: "Length", values: [{ label: "Short" }, { label: "Long", delta: 600 }] }],
  },
  {
    slug: "porcelain-bud-vase",
    name: "Porcelain Bud Vase",
    tagline: "A single-stem vase in translucent porcelain.",
    description:
      "Thin enough that light passes through the walls. Made for one stem from the garden or a sprig from the market.",
    details: ["Porcelain, clear glaze inside", "Approx. 5 in tall", "Hand wash"],
    category: "Ceramics",
    basePriceCents: 2400,
    maker: "Thrown by Ines",
    art: { kind: "vase", primary: "#f2efe8", accent: "#6f7a4a", backdrop: "#ebe6dc" },
  },
  {
    slug: "winter-solstice-candle",
    name: "Winter Solstice Candle",
    tagline: "Our seasonal pour. Back next December.",
    description: "A limited seasonal candle with clove, orange peel and pine. It's out of season, so it doesn't appear in the catalog.",
    details: ["100% soy wax", "8 oz"],
    category: "Candles",
    basePriceCents: 2800,
    isAvailable: false,
    maker: "Poured by Theo",
    art: { kind: "candle", primary: "#7a2f2a", accent: "#f3e6cf", backdrop: "#efe0d6" },
  },
];

function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])), [[]]);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  // The owner area lets the owner add products and photos. Never wipe that by accident.
  const [{ n }] = (await pool.query("select count(*)::int as n from product_images")).rows;
  if (n > 0 && !process.argv.includes("--force")) {
    await pool.end();
    console.error(`Refusing to reseed: ${n} owner-uploaded photo(s) would be deleted. Run "npm run db:seed -- --force" to reset the whole catalog anyway.`);
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    // Reset catalog data. Orders keep their own snapshots, so they survive a reseed.
    await tx.delete(schema.variants);
    await tx.delete(schema.optionValues);
    await tx.delete(schema.productOptions);
    await tx.update(schema.orderItems).set({ productId: null });
    await tx.delete(schema.products);
    await tx.delete(schema.categories);

    const categoryNames = [...new Set(catalog.map((p) => p.category))].sort();
    await tx.insert(schema.categories).values(
      categoryNames.map((name, position) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), position })),
    );

    for (const [index, p] of catalog.entries()) {
      const [product] = await tx
        .insert(schema.products)
        .values({
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          details: p.details,
          category: p.category,
          basePriceCents: p.basePriceCents,
          isAvailable: p.isAvailable ?? true,
          stock: 25,
          isFeatured: p.isFeatured ?? false,
          personalization: p.personalization ?? null,
          art: p.art,
          maker: p.maker,
          sortOrder: index,
        })
        .returning();

      // Options and their values, remembering ids by label for variant keys.
      const valueIdsByOption: { id: number; label: string }[][] = [];
      for (const [position, option] of (p.options ?? []).entries()) {
        const [row] = await tx
          .insert(schema.productOptions)
          .values({ productId: product.id, name: option.name, position })
          .returning();
        const values = await tx
          .insert(schema.optionValues)
          .values(
            option.values.map((v, i) => ({
              optionId: row.id,
              label: v.label,
              priceDeltaCents: v.delta ?? 0,
              swatch: v.swatch ?? null,
              position: i,
            })),
          )
          .returning();
        valueIdsByOption.push(values.map((v) => ({ id: v.id, label: v.label })));
      }

      // Every combination is a valid configuration; some are sold out.
      const combos = cartesian(valueIdsByOption);
      const soldOut = new Set((p.unavailable ?? []).map((c) => c.join("|")));
      await tx.insert(schema.variants).values(
        combos.map((combo) => ({
          productId: product.id,
          key: combo.map((v) => v.id).join("."),
          isAvailable: !soldOut.has(combo.map((v) => v.label).join("|")),
        })),
      );
    }
  });

  await pool.end();
  console.log(`✓ Seeded ${catalog.length} products`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
