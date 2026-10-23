import { z } from "zod";

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Australia",
  "New Zealand",
  "Germany",
  "France",
  "Netherlands",
  "India",
  "Japan",
  "Other",
] as const;

const required = (label: string) => z.string().trim().min(1, `Enter your ${label}.`);

export const customerSchema = z.object({
  fullName: required("full name").max(100, "Full name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address, like name@example.com."),
  address1: required("street address").max(200, "Address is too long."),
  address2: z.string().trim().max(200, "Address line 2 is too long.").optional().default(""),
  city: required("city").max(100, "City is too long."),
  region: required("state or region").max(100, "State or region is too long."),
  postalCode: z
    .string()
    .trim()
    .min(1, "Enter your postal code.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/, "Enter a valid postal code (letters, numbers, spaces or hyphens)."),
  country: z.enum(COUNTRIES, { errorMap: () => ({ message: "Choose a country." }) }),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerField = keyof CustomerInput;
export type FieldErrors = Partial<Record<CustomerField, string>>;

export const FIELD_ORDER: CustomerField[] = ["fullName", "email", "address1", "address2", "city", "region", "postalCode", "country"];

export function validateCustomer(values: Record<string, unknown>): { ok: true; data: z.output<typeof customerSchema> } | { ok: false; errors: FieldErrors } {
  const result = customerSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CustomerField;
    if (!errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

export const cartPayloadSchema = z
  .array(
    z.object({
      id: z.string(),
      productId: z.number().int(),
      variantKey: z.string(),
      personalization: z.string().nullable(),
      quantity: z.number().int().min(1).max(10),
      unitPriceCents: z.number().int().nonnegative(),
    }),
  )
  .max(50);

export type CartPayload = z.infer<typeof cartPayloadSchema>;

export type CheckoutState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: FieldErrors;
      formError?: string;
      /** Server-confirmed prices for lines whose price changed, keyed by cart line id. */
      priceUpdates?: Record<string, number>;
      /** Cart line ids that can no longer be purchased. */
      unavailableLineIds?: string[];
      /** For lines held back by a stock limit: the quantity they can be lowered to, keyed by cart line id. */
      stockLimits?: Record<string, number>;
    }
  | { status: "success"; reference: string };
