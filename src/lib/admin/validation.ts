import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/slug";
import { LIST_LIMITS, linesFromText } from "@/lib/spec-lines";

export const LIMITS = { name: 80, description: 2000, tagline: 120, photos: 8, photoBytes: 5 * 1024 * 1024, softWidth: 800 };

export const optionsSchema = z
  .array(
    z.object({
      id: z.number().int().positive().optional(),
      name: z.string().trim().min(1, "Give each option a name.").max(40, "Option names can be 40 characters at most."),
      required: z.boolean(),
      defaultIndex: z.number().int().min(0).nullable(),
      values: z
        .array(
          z.object({
            id: z.number().int().positive().optional(),
            label: z.string().trim().min(1, "Give each choice a name.").max(40, "Choice names can be 40 characters at most."),
            /** Price adjustment in dollars, as typed. */
            priceDelta: z.string().trim(),
            swatch: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
          }),
        )
        .min(1, "Each option needs at least one choice.")
        .max(10, "An option can have 10 choices at most."),
    }),
  )
  .max(4, "A product can have 4 options at most.");

export type OptionsInput = z.infer<typeof optionsSchema>;

/** "12.50" -> 1250. Null when not a valid money amount. */
export function dollarsToCents(input: string): number | null {
  const s = input.trim().replace(/^\$/, "");
  if (!/^-?\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export const centsToDollars = (c: number) => (c / 100).toFixed(2);

export type ProductFormState = {
  status: "idle" | "error" | "saved";
  fieldErrors: Record<string, string>;
  formError?: string;
  message?: string;
  /** What the owner typed, so nothing is lost when validation fails. */
  values?: Record<string, string>;
};

export type ProductFields = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  priceCents: number;
  category: string;
  stock: number;
  details: string[];
  maker: string;
  specifications: string[];
};

function checkList(text: string, label: string): { lines: string[]; error?: string } {
  const lines = linesFromText(text);
  if (lines.length > LIST_LIMITS.lines) return { lines, error: `${label} can have ${LIST_LIMITS.lines} lines at most (now ${lines.length}).` };
  const longest = lines.findIndex((l) => l.length > LIST_LIMITS.lineLength);
  if (longest >= 0) return { lines, error: `Keep each line of ${label} to ${LIST_LIMITS.lineLength} characters or fewer (line ${longest + 1} has ${lines[longest].length}).` };
  return { lines };
}

/** Validate the plain fields. Option errors are returned under "options". */
export function validateProductFields(
  raw: Record<string, string>,
  categoryNames: string[],
): { ok: true; data: ProductFields; options: OptionsInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = raw.name.trim();
  if (!name) errors.name = "Enter a product name.";
  else if (name.length > LIMITS.name) errors.name = `Keep the name to ${LIMITS.name} characters or fewer.`;

  let slug = raw.slug.trim().toLowerCase();
  if (!slug) slug = name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slug) errors.slug = "Enter a slug, or a name to make one from.";
  else if (!SLUG_PATTERN.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens only.";

  const tagline = raw.tagline.trim();
  if (tagline.length > LIMITS.tagline) errors.tagline = `Keep the tagline to ${LIMITS.tagline} characters or fewer.`;

  const description = raw.description.trim();
  if (description.length > LIMITS.description) errors.description = `Keep the description to ${LIMITS.description} characters or fewer (now ${description.length}).`;

  const priceCents = dollarsToCents(raw.price);
  if (priceCents === null) errors.price = "Enter a price in dollars, like 34 or 34.50.";
  else if (priceCents <= 0) errors.price = "The price must be greater than $0.";

  if (!raw.category) errors.category = "Choose a category.";
  else if (!categoryNames.includes(raw.category)) errors.category = "That category no longer exists. Choose another.";

  const stockText = raw.stock.trim();
  const stock = Number(stockText);
  if (stockText === "" || !Number.isInteger(stock) || stock < 0 || stock > 100000) errors.stock = "Stock must be a whole number, 0 or more.";

  const detailsChecked = checkList(raw.details ?? "", "Materials & care");
  if (detailsChecked.error) errors.details = detailsChecked.error;
  const specsChecked = checkList(raw.specifications ?? "", "Specifications");
  if (specsChecked.error) errors.specifications = specsChecked.error;
  const maker = (raw.maker ?? "").trim();
  if (maker.length > LIST_LIMITS.maker) errors.maker = `Keep the maker line to ${LIST_LIMITS.maker} characters or fewer.`;

  let options: OptionsInput = [];
  try {
    const parsed = optionsSchema.safeParse(JSON.parse(raw.options || "[]"));
    if (!parsed.success) errors.options = parsed.error.issues[0]?.message ?? "Check the options.";
    else {
      options = parsed.data;
      const names = options.map((o) => o.name.toLowerCase());
      if (new Set(names).size !== names.length) errors.options = "Two options have the same name.";
      for (const o of options) {
        const labels = o.values.map((v) => v.label.toLowerCase());
        if (new Set(labels).size !== labels.length) errors.options = `"${o.name}" has two choices with the same name.`;
        if (o.values.some((v) => (v.priceDelta !== "" && dollarsToCents(v.priceDelta) === null))) errors.options = `Check the price adjustments for "${o.name}".`;
      }
      const combos = options.reduce((n, o) => n * (o.values.length + (o.required ? 0 : 1)), 1);
      if (combos > 200) errors.options = "That is too many combinations. Remove a choice or an option.";
    }
  } catch {
    errors.options = "Check the options.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, slug, tagline, description, priceCents: priceCents!, category: raw.category, stock, details: detailsChecked.lines, maker, specifications: specsChecked.lines }, options };
}
