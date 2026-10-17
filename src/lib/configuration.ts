/**
 * Pure helpers for turning a shopper's option selections into a priced,
 * validated configuration. Shared by the product page (client) and the
 * checkout action (server) so both apply exactly the same rules.
 */

export type ConfigurableProduct = {
  basePriceCents: number;
  isAvailable: boolean;
  art: { primary: string };
  options: {
    id: number;
    name: string;
    values: { id: number; label: string; priceDeltaCents: number; swatch: string | null }[];
  }[];
  variants: { key: string; isAvailable: boolean }[];
};

/** optionId -> valueId */
export type Selections = Record<number, number | undefined>;

export function variantKey(product: ConfigurableProduct, selections: Selections): string | null {
  const ids: number[] = [];
  for (const option of product.options) {
    const valueId = selections[option.id];
    if (valueId === undefined) return null;
    ids.push(valueId);
  }
  return ids.join(".");
}

export function missingOptions(product: ConfigurableProduct, selections: Selections): string[] {
  return product.options.filter((o) => selections[o.id] === undefined).map((o) => o.name);
}

export function priceFor(product: ConfigurableProduct, selections: Selections): number {
  let price = product.basePriceCents;
  for (const option of product.options) {
    const value = option.values.find((v) => v.id === selections[option.id]);
    if (value) price += value.priceDeltaCents;
  }
  return price;
}

export function isConfigurationAvailable(product: ConfigurableProduct, selections: Selections): boolean {
  if (!product.isAvailable) return false;
  const key = variantKey(product, selections);
  if (key === null) return false;
  return product.variants.some((v) => v.key === key && v.isAvailable);
}

/**
 * Whether picking `valueId` for `optionId` could still lead to an available
 * configuration, given the shopper's other current selections.
 */
export function isValueSelectable(
  product: ConfigurableProduct,
  selections: Selections,
  optionId: number,
  valueId: number,
): boolean {
  const index = product.options.findIndex((o) => o.id === optionId);
  return product.variants.some((variant) => {
    if (!variant.isAvailable) return false;
    const parts = variant.key.split(".").map(Number);
    if (parts[index] !== valueId) return false;
    return product.options.every((o, i) => i === index || selections[o.id] === undefined || parts[i] === selections[o.id]);
  });
}

/** Colour of the selected swatch (e.g. glaze or yarn), falling back to the product's own colour. */
export function artColorFor(product: ConfigurableProduct, selections: Selections): string {
  for (const option of product.options) {
    const value = option.values.find((v) => v.id === selections[option.id]);
    if (value?.swatch) return value.swatch;
  }
  return product.art.primary;
}

export function describeSelections(product: ConfigurableProduct, selections: Selections) {
  return product.options
    .map((o) => {
      const value = o.values.find((v) => v.id === selections[o.id]);
      return value ? { optionId: o.id, valueId: value.id, name: o.name, value: value.label } : null;
    })
    .filter((x): x is { optionId: number; valueId: number; name: string; value: string } => x !== null);
}
