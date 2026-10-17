"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { placeDemoOrder } from "@/app/checkout/actions";
import { useCart } from "@/components/cart/cart-context";
import { SummaryLine, Totals } from "@/components/cart/line-item";
import { Container, DemoNotice, EmptyState, buttonStyles } from "@/components/ui";
import {
  COUNTRIES,
  FIELD_ORDER,
  validateCustomer,
  type CheckoutState,
  type CustomerField,
  type CustomerInput,
  type FieldErrors,
} from "@/lib/checkout-schema";

const EMPTY: Record<CustomerField, string> = {
  fullName: "",
  email: "",
  address1: "",
  address2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United States",
};

export function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();
  const [values, setValues] = useState<Record<CustomerField, string>>(EMPTY);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [redirecting, setRedirecting] = useState(false);
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeDemoOrder, { status: "idle" });
  const summaryRef = useRef<HTMLDivElement>(null);
  const handledState = useRef<CheckoutState | null>(null);

  const errors = clientErrors;
  const formError = state.status === "error" ? state.formError : undefined;

  // React to the server's answer exactly once per response.
  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;
    if (state.status === "success") {
      setRedirecting(true);
      cart.clear();
      router.replace(`/orders/${state.reference}`);
    } else if (state.status === "error") {
      if (state.priceUpdates) cart.updatePrices(state.priceUpdates);
      setClientErrors(state.fieldErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }, [state, cart, router]);

  function update(field: CustomerField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setClientErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateCustomer(values as CustomerInput);
    if (!result.ok) {
      e.preventDefault();
      setClientErrors(result.errors);
      // Defer focus until the error summary has rendered.
      requestAnimationFrame(() => summaryRef.current?.focus());
    } else {
      setClientErrors({});
    }
  }

  if (redirecting) {
    return (
      <Container className="py-20 text-center">
        <p role="status" className="font-display text-2xl">
          Order placed. Taking you to your confirmation…
        </p>
      </Container>
    );
  }

  if (!cart.hydrated) {
    return (
      <Container className="py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-6 text-ink-soft" role="status">
          Loading your cart…
        </p>
      </Container>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <Container className="py-10 sm:py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-10">
          <EmptyState
            title="There's nothing to check out yet"
            body="Your cart is empty. Add something from the shop and come back here when you're ready."
            action={{ href: "/shop", label: "Browse the shop" }}
          />
        </div>
      </Container>
    );
  }

  const errorList = FIELD_ORDER.filter((f) => errors[f]);
  const unavailableIds = state.status === "error" ? (state.unavailableLineIds ?? []) : [];
  const unavailableInCart = cart.lines.filter((l) => unavailableIds.includes(l.id));

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Checkout</h1>
      <DemoNotice className="mt-6 max-w-3xl">
        <strong>This checkout is simulated.</strong> We only ask for contact and shipping details to show a finished order. No card or payment
        information is requested, and nothing is charged or shipped.
      </DemoNotice>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <form action={formAction} onSubmit={handleSubmit} noValidate aria-describedby="checkout-demo-note">
          <input type="hidden" name="idempotencyKey" value={cart.checkoutToken} />
          <input
            type="hidden"
            name="cart"
            value={JSON.stringify(
              cart.lines.map((l) => ({
                id: l.id,
                productId: l.productId,
                variantKey: l.variantKey,
                personalization: l.personalization,
                quantity: l.quantity,
                unitPriceCents: l.unitPriceCents,
              })),
            )}
          />

          {errorList.length > 0 || formError ? (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              className="mb-8 rounded-xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger"
            >
              <p className="font-semibold">{formError ?? "Please fix the highlighted fields."}</p>
              {errorList.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errorList.map((f) => (
                    <li key={f}>
                      <a href={`#field-${f}`} className="underline underline-offset-2">
                        {errors[f]}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {unavailableInCart.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {unavailableInCart.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-ink">
                      <span>
                        {l.name}
                        {l.options.length ? ` (${l.options.map((o) => o.value).join(" / ")})` : ""}
                      </span>
                      <button type="button" onClick={() => cart.removeLine(l.id)} className="font-semibold text-danger underline">
                        Remove<span className="sr-only"> {l.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div ref={summaryRef} tabIndex={-1} />
          )}

          <fieldset>
            <legend className="font-display text-xl font-semibold">Contact</legend>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field name="fullName" label="Full name" autoComplete="name" values={values} errors={errors} onChange={update} />
              <Field name="email" label="Email" type="email" autoComplete="email" inputMode="email" values={values} errors={errors} onChange={update} />
            </div>
          </fieldset>

          <fieldset className="mt-10">
            <legend className="font-display text-xl font-semibold">Shipping address</legend>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field name="address1" label="Street address" autoComplete="address-line1" values={values} errors={errors} onChange={update} wide />
              <Field
                name="address2"
                label="Apartment, suite, etc."
                optional
                autoComplete="address-line2"
                values={values}
                errors={errors}
                onChange={update}
                wide
              />
              <Field name="city" label="City" autoComplete="address-level2" values={values} errors={errors} onChange={update} />
              <Field name="region" label="State / Region" autoComplete="address-level1" values={values} errors={errors} onChange={update} />
              <Field name="postalCode" label="Postal code" autoComplete="postal-code" values={values} errors={errors} onChange={update} />
              <div>
                <label htmlFor="field-country" className="block text-sm font-semibold">
                  Country
                </label>
                <select
                  id="field-country"
                  name="country"
                  autoComplete="country-name"
                  value={values.country}
                  onChange={(e) => update("country", e.target.value)}
                  aria-invalid={errors.country ? true : undefined}
                  aria-describedby={errors.country ? "field-country-err" : undefined}
                  className={`mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-base ${errors.country ? "border-danger" : "border-line"}`}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {errors.country ? (
                  <p id="field-country-err" className="mt-1.5 text-sm font-medium text-danger">
                    {errors.country}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>

          <div className="mt-10 border-t border-line pt-6">
            <p id="checkout-demo-note" className="text-sm text-ink-soft">
              By placing this demo order you&apos;ll see a confirmation page. No payment is collected.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={pending} className={`${buttonStyles.primary} py-4 text-base sm:min-w-64`}>
                {pending ? (
                  <>
                    <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Placing demo order…
                  </>
                ) : (
                  "Place demo order"
                )}
              </button>
              <Link href="/cart" className={buttonStyles.ghost}>
                <span aria-hidden="true">←</span> Back to cart
              </Link>
            </div>
            {pending ? (
              <p role="status" className="sr-only">
                Placing your demo order
              </p>
            ) : null}
          </div>
        </form>

        <aside aria-labelledby="checkout-summary-heading" className="h-fit rounded-2xl border border-line bg-card p-6 lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <h2 id="checkout-summary-heading" className="font-display text-xl font-semibold">
              Order summary
            </h2>
            <Link href="/cart" className="text-sm font-medium text-clay underline underline-offset-4">
              Edit cart
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {cart.lines.map((l) => (
              <SummaryLine key={l.id} line={l} />
            ))}
          </ul>
          <div className="mt-2 border-t border-line pt-4">
            <Totals subtotalCents={cart.subtotalCents} shippingCents={cart.shippingCents} totalCents={cart.totalCents} />
          </div>
        </aside>
      </div>
    </Container>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  inputMode,
  optional,
  wide,
  values,
  errors,
  onChange,
}: {
  name: CustomerField;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  optional?: boolean;
  wide?: boolean;
  values: Record<CustomerField, string>;
  errors: FieldErrors;
  onChange: (field: CustomerField, value: string) => void;
}) {
  const id = `field-${name}`;
  const error = errors[name];
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label} {optional ? <span className="font-normal text-ink-soft">(optional)</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={values[name]}
        onChange={(e) => onChange(name, e.target.value)}
        required={!optional}
        aria-required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-base ${error ? "border-danger" : "border-line focus:border-ink/50"}`}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
