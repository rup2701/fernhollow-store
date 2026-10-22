"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveProduct } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import type { ProductFormState } from "@/lib/admin/validation";
import { buttonStyles } from "@/components/ui";
import { Field, Notice, describedBy, inputClass } from "@/components/admin/ui";

export type OptionDraft = {
  id?: number;
  name: string;
  required: boolean;
  defaultIndex: number | null;
  values: { id?: number; label: string; priceDelta: string; swatch?: string | null }[];
};

export type ProductDraft = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  options: OptionDraft[];
};

const EMPTY_OPTION: OptionDraft = { name: "", required: true, defaultIndex: null, values: [{ label: "", priceDelta: "" }] };

export function ProductForm({
  productId,
  initial,
  categories,
  published,
  hasPhoto,
  slugLocked,
}: {
  productId: number | null;
  initial: ProductDraft;
  categories: string[];
  published: boolean;
  hasPhoto: boolean;
  slugLocked: boolean;
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct.bind(null, productId), { status: "idle", fieldErrors: {} });
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(slugLocked);
  const baseline = useRef(JSON.stringify(initial));
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline.current, [draft]);

  // After a successful save, what is on screen is the new saved state.
  useEffect(() => {
    if (state.status === "saved") baseline.current = JSON.stringify(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Move focus to the first field with a problem.
  useEffect(() => {
    if (state.status !== "error") return;
    const first = Object.keys(state.fieldErrors)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"], #options-editor`)?.focus();
  }, [state]);

  const errors = state.fieldErrors;
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setOption = (i: number, patch: Partial<OptionDraft>) => setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  return (
    <form ref={formRef} action={action} noValidate className="space-y-6">
      {state.status === "saved" && state.message ? <Notice tone="ok">{state.message}</Notice> : null}
      {state.status === "error" && state.formError ? <Notice tone="error">{state.formError}</Notice> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name}>
          <input
            id="name"
            name="name"
            value={draft.name}
            maxLength={120}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name", undefined, errors.name)}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            className={`${inputClass} ${errors.name ? "border-danger" : "border-line"}`}
          />
        </Field>
        <Field id="slug" label="Web address" hint={`Shoppers see /shop/${draft.slug || "…"}`} error={errors.slug}>
          <input
            id="slug"
            name="slug"
            value={draft.slug}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={describedBy("slug", "x", errors.slug)}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            className={`${inputClass} ${errors.slug ? "border-danger" : "border-line"}`}
          />
        </Field>
      </div>

      <Field id="tagline" label="Short line (optional)" hint="Shown under the name on cards and the product page." error={errors.tagline}>
        <input
          id="tagline"
          name="tagline"
          value={draft.tagline}
          aria-describedby={describedBy("tagline", "x", errors.tagline)}
          onChange={(e) => set("tagline", e.target.value)}
          className={`${inputClass} ${errors.tagline ? "border-danger" : "border-line"}`}
        />
      </Field>

      <Field id="description" label="Description" hint={`${draft.description.length}/2000`} error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={draft.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy("description", "x", errors.description)}
          onChange={(e) => set("description", e.target.value)}
          className={`${inputClass} ${errors.description ? "border-danger" : "border-line"}`}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field id="price" label="Price (USD)" error={errors.price}>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            value={draft.price}
            aria-invalid={errors.price ? true : undefined}
            aria-describedby={describedBy("price", undefined, errors.price)}
            onChange={(e) => set("price", e.target.value)}
            className={`${inputClass} ${errors.price ? "border-danger" : "border-line"}`}
          />
        </Field>
        <Field id="category" label="Category" error={errors.category}>
          <select
            id="category"
            name="category"
            value={draft.category}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={describedBy("category", undefined, errors.category)}
            onChange={(e) => set("category", e.target.value)}
            className={`${inputClass} ${errors.category ? "border-danger" : "border-line"}`}
          >
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field id="stock" label="In stock" hint="0 shows Sold out." error={errors.stock}>
          <input
            id="stock"
            name="stock"
            inputMode="numeric"
            value={draft.stock}
            aria-invalid={errors.stock ? true : undefined}
            aria-describedby={describedBy("stock", "x", errors.stock)}
            onChange={(e) => set("stock", e.target.value)}
            className={`${inputClass} ${errors.stock ? "border-danger" : "border-line"}`}
          />
        </Field>
      </div>

      <fieldset id="options-editor" tabIndex={-1} className="rounded-2xl border border-line bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Options (optional)</legend>
        <p className="text-sm text-ink-soft">Choices a shopper makes, like size or glaze. A price adjustment is added to the base price.</p>
        {errors.options ? (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {errors.options}
          </p>
        ) : null}
        <input type="hidden" name="options" value={JSON.stringify(draft.options)} />

        <div className="mt-4 space-y-5">
          {draft.options.map((o, i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label htmlFor={`opt-name-${i}`} className="text-sm font-semibold">
                    Option name
                  </label>
                  <input
                    id={`opt-name-${i}`}
                    value={o.name}
                    placeholder="Size"
                    onChange={(e) => setOption(i, { name: e.target.value })}
                    className={`${inputClass} mt-1.5 border-line`}
                  />
                </div>
                <label className="flex items-center gap-2 pb-3 text-sm">
                  <input type="checkbox" checked={o.required} onChange={(e) => setOption(i, { required: e.target.checked })} />
                  Shoppers must choose
                </label>
                <button
                  type="button"
                  onClick={() => set("options", draft.options.filter((_, j) => j !== i))}
                  className="pb-3 text-sm font-semibold text-danger underline underline-offset-4"
                >
                  Remove option
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {o.values.map((v, k) => (
                  <li key={k} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`opt-${i}-v-${k}`}>
                      Choice {k + 1} of {o.name || "option"}
                    </label>
                    <input
                      id={`opt-${i}-v-${k}`}
                      value={v.label}
                      placeholder="Choice, like Large"
                      onChange={(e) => setOption(i, { values: o.values.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })}
                      className={`${inputClass} min-w-40 flex-1 border-line py-2`}
                    />
                    <label className="sr-only" htmlFor={`opt-${i}-p-${k}`}>
                      Price adjustment in dollars for {v.label || "this choice"}
                    </label>
                    <input
                      id={`opt-${i}-p-${k}`}
                      inputMode="decimal"
                      value={v.priceDelta}
                      placeholder="+ $ 0.00"
                      onChange={(e) => setOption(i, { values: o.values.map((x, j) => (j === k ? { ...x, priceDelta: e.target.value } : x)) })}
                      className={`${inputClass} w-28 border-line py-2`}
                    />
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name={`default-${i}`}
                        checked={o.defaultIndex === k}
                        onChange={() => setOption(i, { defaultIndex: k })}
                      />
                      Default
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove choice ${v.label || k + 1}`}
                      disabled={o.values.length === 1}
                      onClick={() =>
                        setOption(i, {
                          values: o.values.filter((_, j) => j !== k),
                          defaultIndex: o.defaultIndex === null ? null : o.defaultIndex === k ? null : o.defaultIndex > k ? o.defaultIndex - 1 : o.defaultIndex,
                        })
                      }
                      className="text-sm font-semibold text-danger underline underline-offset-4 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-4 text-sm font-semibold">
                <button type="button" onClick={() => setOption(i, { values: [...o.values, { label: "", priceDelta: "" }] })} className="text-clay underline underline-offset-4">
                  Add a choice
                </button>
                {o.defaultIndex !== null ? (
                  <button type="button" onClick={() => setOption(i, { defaultIndex: null })} className="underline underline-offset-4">
                    No default
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={draft.options.length >= 4}
          onClick={() => set("options", [...draft.options, structuredClone(EMPTY_OPTION)])}
          className={`${buttonStyles.secondary} mt-4`}
        >
          Add an option
        </button>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <button type="submit" name="intent" value="save" disabled={pending} className={buttonStyles.primary}>
          {pending ? "Saving…" : "Save"}
        </button>
        {published ? (
          <button type="submit" name="intent" value="unpublish" disabled={pending} className={buttonStyles.secondary}>
            Save and unpublish
          </button>
        ) : (
          <button type="submit" name="intent" value="publish" disabled={pending} className={buttonStyles.secondary}>
            Save and publish
          </button>
        )}
        <Link
          href="/admin/products"
          onClick={(e) => {
            if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) e.preventDefault();
          }}
          className={buttonStyles.ghost}
        >
          Cancel
        </Link>
        {dirty ? <span className="text-sm text-ink-soft">Unsaved changes</span> : null}
        {!published && !hasPhoto && productId !== null ? <span className="text-sm text-ink-soft">Add a photo to publish.</span> : null}
      </div>
    </form>
  );
}
