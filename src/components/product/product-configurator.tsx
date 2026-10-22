"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/catalog";
import {
  artColorFor,
  describeSelections,
  isConfigurationAvailable,
  isValueSelectable,
  missingOptions,
  priceFor,
  type Selections,
  variantKey,
} from "@/lib/configuration";
import { normalizePersonalization, validatePersonalization } from "@/lib/personalization";
import { MAX_QUANTITY, formatMoney } from "@/lib/pricing";
import { lineIdFor, useCart } from "@/components/cart/cart-context";
import { useAnnounce } from "@/components/announcer";
import { ProductArt, type ArtView } from "@/components/product-art";
import { buttonStyles } from "@/components/ui";

const VIEWS: { id: ArtView; label: string }[] = [
  { id: "hero", label: "Front view" },
  { id: "detail", label: "Close-up" },
  { id: "lifestyle", label: "On the table" },
];

type Errors = { options: Record<number, string>; personalization?: string; summary?: string };

export function ProductConfigurator({ product }: { product: ProductDetail }) {
  const { addLine, itemCount, lines } = useCart();
  const announce = useAnnounce();
  const uid = useId();
  // A photo has no "on the table" scene, so only the full shot and a close-up are offered.
  const views = product.art.photo ? VIEWS.filter((v) => v.id !== "lifestyle") : VIEWS;

  // The owner's default is preselected. A required option with a single value needs no decision, so it is too.
  const [selections, setSelections] = useState<Selections>(() => {
    const initial: Selections = {};
    for (const o of product.options) {
      if (o.defaultValueId && o.values.some((v) => v.id === o.defaultValueId)) initial[o.id] = o.defaultValueId;
      else if (o.required && o.values.length === 1) initial[o.id] = o.values[0].id;
    }
    return initial;
  });
  const [imageIndex, setImageIndex] = useState(0);
  const hasImages = product.images.length > 0;
  const soldOut = product.stock <= 0;
  const [personalization, setPersonalization] = useState("");
  const [errors, setErrors] = useState<Errors>({ options: {} });
  const [view, setView] = useState<ArtView>("hero");
  const [added, setAdded] = useState<{ summary: string } | null>(null);
  const optionRefs = useRef<Record<number, HTMLFieldSetElement | null>>({});
  const personalizationRef = useRef<HTMLInputElement>(null);

  const missing = missingOptions(product, selections);
  const complete = missing.length === 0;
  const available = complete && isConfigurationAvailable(product, selections);
  const anyAvailable = product.isAvailable && !soldOut && product.variants.some((v) => v.isAvailable);
  const chosen = describeSelections(product, selections);
  const color = artColorFor(product, selections);
  const colorLabel = chosen.find((c) => product.options.find((o) => o.id === c.optionId)?.values.find((v) => v.id === c.valueId)?.swatch)?.value;

  // Price: exact when fully configured, otherwise the lowest it could be.
  const { price, isFrom } = useMemo(() => {
    let p = priceFor(product, selections);
    let from = false;
    for (const o of product.options) {
      if (selections[o.id] !== undefined) continue;
      const deltas = o.values.map((v) => v.priceDeltaCents);
      const min = Math.min(...deltas);
      if (Math.max(...deltas) !== min) from = true;
      p += min;
    }
    return { price: p, isFrom: from };
  }, [product, selections]);

  function select(optionId: number, valueId: number) {
    setSelections((s) => ({ ...s, [optionId]: valueId }));
    setErrors((e) => {
      const options = { ...e.options };
      delete options[optionId];
      return { ...e, options, summary: undefined };
    });
    setAdded(null);
  }

  function clear(optionId: number) {
    setSelections((s) => ({ ...s, [optionId]: undefined }));
    setAdded(null);
  }

  function handleAdd() {
    const nextErrors: Errors = { options: {} };

    for (const o of product.options) {
      if (o.required && selections[o.id] === undefined) nextErrors.options[o.id] = `Choose a ${o.name.toLowerCase()}.`;
    }
    const personalizationError = product.personalization ? validatePersonalization(personalization, product.personalization) : null;
    if (personalizationError) nextErrors.personalization = personalizationError;

    if (Object.keys(nextErrors.options).length > 0) {
      const names = missing.map((m) => m.toLowerCase());
      nextErrors.summary = `Please choose a ${names.join(" and ")} before adding to your cart.`;
    } else if (!isConfigurationAvailable(product, selections)) {
      nextErrors.summary = `${chosen.map((c) => c.value).join(" / ")} is sold out. Pick a different option to continue; your other choices are kept.`;
    }

    if (nextErrors.summary || nextErrors.personalization) {
      setErrors(nextErrors);
      setAdded(null);
      // Move focus to the first thing that needs attention.
      const firstMissing = product.options.find((o) => nextErrors.options[o.id]);
      if (firstMissing) optionRefs.current[firstMissing.id]?.querySelector<HTMLInputElement>("input")?.focus();
      else if (nextErrors.personalization) personalizationRef.current?.focus();
      announce(nextErrors.summary ?? nextErrors.personalization ?? "");
      return;
    }

    const text = product.personalization ? normalizePersonalization(personalization) : "";

    // Adding more than the per-item maximum used to be silently ignored while the page said "Added".
    const lineId = lineIdFor(product.id, variantKey(product, selections) ?? "", text || null);
    const inCart = lines.find((l) => l.id === lineId)?.quantity ?? 0;
    if (inCart >= MAX_QUANTITY) {
      const summary = `You already have ${inCart} of this in your cart, which is the most we can send per item. Remove some from your cart or choose a different option.`;
      setErrors({ options: {}, summary });
      setAdded(null);
      announce(summary);
      return;
    }

    addLine({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      art: { ...product.art, primary: color },
      variantKey: variantKey(product, selections) ?? "",
      options: chosen,
      personalization: text || null,
      unitPriceCents: priceFor(product, selections),
    });
    setErrors({ options: {} });
    const summary = [product.name, ...chosen.map((c) => c.value), text ? `"${text}"` : null].filter(Boolean).join(" · ");
    setAdded({ summary });
    announce(`Added ${product.name} to your cart.`);
  }

  const errorId = `${uid}-error`;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
      {/* Gallery */}
      <div>
        {hasImages ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.images[imageIndex].url} alt={product.images[imageIndex].alt} className="aspect-square w-full object-cover" />
            </div>
            {product.images.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5" role="group" aria-label="Product images">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-pressed={imageIndex === i}
                    aria-label={`Show photo ${i + 1} of ${product.images.length}`}
                    className={`overflow-hidden rounded-xl border-2 transition-colors ${imageIndex === i ? "border-ink" : "border-transparent hover:border-line"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
        <>
        <div className="overflow-hidden rounded-3xl border border-line bg-card">
          <ProductArt
            art={product.art}
            color={color}
            personalization={personalization}
            view={view}
            label={`${VIEWS.find((v) => v.id === view)?.label} of the ${product.name}${colorLabel && !product.art.photo ? ` in ${colorLabel}` : ""}`}
            className="aspect-square w-full"
            showPreview={view === "hero"}
          />
        </div>
        <div className={`mt-3 grid gap-3 ${views.length === 2 ? "grid-cols-2 sm:max-w-[66%]" : "grid-cols-3"}`} role="group" aria-label="Product images">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              aria-label={`Show ${v.label.toLowerCase()}`}
              className={`overflow-hidden rounded-xl border-2 transition-colors ${view === v.id ? "border-ink" : "border-transparent hover:border-line"}`}
            >
              <ProductArt art={product.art} color={color} personalization={personalization} view={v.id} label="" className="aspect-square w-full" />
            </button>
          ))}
        </div>
        </>
        )}
      </div>

      {/* Details & configuration */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">{product.category}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-2 text-lg text-ink-soft">{product.tagline}</p>

        <p className="mt-5 text-2xl font-semibold tabular-nums" aria-live="polite">
          {isFrom ? <span className="text-base font-normal text-ink-soft">From </span> : null}
          {formatMoney(price)}
        </p>

        <Availability productAvailable={product.isAvailable} soldOut={soldOut} anyAvailable={anyAvailable} complete={complete} available={available} />

        {soldOut && product.isAvailable ? (
          <div className="mt-8 rounded-2xl border border-line bg-card p-6">
            <p className="font-semibold">Sold out</p>
            <p className="mt-1 text-sm text-ink-soft">This piece has sold through. New pieces come out of the studio most weeks.</p>
            <Link href="/shop" className={`${buttonStyles.secondary} mt-4`}>
              Browse the shop
            </Link>
          </div>
        ) : !product.isAvailable ? (
          <div className="mt-8 rounded-2xl border border-line bg-card p-6">
            <p className="font-semibold">This piece isn&apos;t available right now.</p>
            <p className="mt-1 text-sm text-ink-soft">It&apos;s out of season. Take a look at what&apos;s in the shop today.</p>
            <Link href="/shop" className={`${buttonStyles.secondary} mt-4`}>
              Browse the shop
            </Link>
          </div>
        ) : (
          <form
            className="mt-8 space-y-7"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            {product.options.map((option) => {
              const error = errors.options[option.id];
              const legendId = `${uid}-opt-${option.id}`;
              const selectedValue = option.values.find((v) => v.id === selections[option.id]);
              return (
                <fieldset
                  key={option.id}
                  ref={(el) => {
                    optionRefs.current[option.id] = el;
                  }}
                  aria-describedby={error ? `${legendId}-err` : undefined}
                  aria-invalid={error ? true : undefined}
                >
                  <legend className="text-sm font-semibold">
                    {option.name}
                    <span className="font-normal text-ink-soft">
                      {selectedValue ? `: ${selectedValue.label}` : option.required ? " (required)" : " (optional)"}
                    </span>
                    {!option.required && selectedValue ? (
                      <button type="button" onClick={() => clear(option.id)} className="ml-2 text-sm font-medium text-clay underline underline-offset-4">
                        Clear
                      </button>
                    ) : null}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const selectable = isValueSelectable(product, selections, option.id, value.id);
                      const checked = selections[option.id] === value.id;
                      return (
                        <label
                          key={value.id}
                          className={`relative flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay ${
                            checked
                              ? "border-ink bg-ink text-paper"
                              : error
                                ? "border-danger/60 bg-card hover:border-ink/50"
                                : "border-line bg-card hover:border-ink/50"
                          } ${selectable ? "" : "text-ink-soft"}`}
                        >
                          <input
                            type="radio"
                            name={`option-${option.id}`}
                            value={value.id}
                            checked={checked}
                            onChange={() => select(option.id, value.id)}
                            className="sr-only"
                          />
                          {value.swatch ? (
                            <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/15" style={{ backgroundColor: value.swatch }} />
                          ) : null}
                          <span className={selectable ? "" : "line-through decoration-1"}>{value.label}</span>
                          {value.priceDeltaCents !== 0 ? (
                            <span className={checked ? "text-paper/75" : "text-ink-soft"}>
                              {value.priceDeltaCents > 0 ? "+" : "−"}
                              {formatMoney(Math.abs(value.priceDeltaCents))}
                            </span>
                          ) : null}
                          {!selectable ? <span className={`text-xs ${checked ? "text-paper/80" : "text-ink-soft"}`}>Sold out</span> : null}
                        </label>
                      );
                    })}
                  </div>
                  {error ? (
                    <p id={`${legendId}-err`} className="mt-2 text-sm font-medium text-danger">
                      {error}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}

            {product.personalization ? (
              <PersonalizationField
                id={`${uid}-personalization`}
                inputRef={personalizationRef}
                rule={product.personalization}
                value={personalization}
                error={errors.personalization}
                onChange={(v) => {
                  setPersonalization(v);
                  setAdded(null);
                  if (errors.personalization) setErrors((e) => ({ ...e, personalization: undefined }));
                }}
                onBlur={() => {
                  const err = validatePersonalization(personalization, product.personalization!);
                  setErrors((e) => ({ ...e, personalization: err ?? undefined }));
                }}
              />
            ) : null}

            {errors.summary ? (
              <div id={errorId} role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
                {errors.summary}
              </div>
            ) : null}

            <button
              type="submit"
              className={`${buttonStyles.primary} w-full py-4 text-base sm:w-auto sm:min-w-64`}
              aria-describedby={errors.summary ? errorId : undefined}
            >
              Add to cart · {formatMoney(price)}
            </button>

            {added ? (
              <div role="status" className="animate-rise rounded-2xl border border-moss/30 bg-moss-soft p-5">
                <p className="flex items-center gap-2 font-semibold text-moss">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-1.2 12.1L5 9.8l1.6-1.6 2.2 2.2 4.6-4.6L15 7.4l-6.2 6.2Z" />
                  </svg>
                  Added to your cart
                </p>
                <p className="mt-1 text-sm text-ink">{added.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/cart" className={buttonStyles.primary}>
                    View cart ({itemCount})
                  </Link>
                  <Link href="/shop" className={buttonStyles.secondary}>
                    Keep shopping
                  </Link>
                </div>
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

function Availability({
  productAvailable,
  soldOut,
  anyAvailable,
  complete,
  available,
}: {
  productAvailable: boolean;
  soldOut: boolean;
  anyAvailable: boolean;
  complete: boolean;
  available: boolean;
}) {
  let tone: "ok" | "out" = "ok";
  let text = "In stock · ships in 3–5 days";
  if (productAvailable && soldOut) {
    tone = "out";
    text = "Sold out";
  } else if (!productAvailable || !anyAvailable) {
    tone = "out";
    text = "Currently unavailable";
  } else if (complete && !available) {
    tone = "out";
    text = "Sold out in this combination";
  }
  return (
    <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${tone === "ok" ? "text-moss" : "text-danger"}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone === "ok" ? "bg-moss" : "bg-danger"}`} />
      {text}
    </p>
  );
}

function PersonalizationField({
  id,
  inputRef,
  rule,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  rule: NonNullable<ProductDetail["personalization"]>;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const remaining = rule.maxLength - value.length;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {rule.label} <span className="font-normal text-ink-soft">(optional)</span>
      </label>
      <p id={`${id}-help`} className="mt-1 text-sm text-ink-soft">
        {rule.help}. Previewed on the image.
      </p>
      <p id={`${id}-final`} className="mt-1 text-sm text-ink-soft">
        Personalized pieces are final sale.{" "}
        <Link href="/returns#final-sale" className="font-medium text-clay underline underline-offset-4">
          Returns policy
        </Link>
      </p>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        maxLength={rule.maxLength}
        placeholder={rule.placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help ${id}-final ${id}-count${error ? ` ${id}-err` : ""}`}
        className={`mt-2 w-full rounded-xl border bg-card px-4 py-3 text-base placeholder:text-ink-soft/60 ${
          error ? "border-danger" : "border-line focus:border-ink/50"
        }`}
      />
      <div className="mt-1.5 flex justify-between gap-4 text-sm">
        {error ? (
          <p id={`${id}-err`} className="font-medium text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        <p id={`${id}-count`} className="shrink-0 tabular-nums text-ink-soft">
          {value.length}/{rule.maxLength}
          <span className="sr-only"> characters used, {remaining} remaining</span>
        </p>
      </div>
    </div>
  );
}
