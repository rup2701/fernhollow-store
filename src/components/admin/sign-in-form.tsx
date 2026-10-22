"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/admin/actions";
import { buttonStyles } from "@/components/ui";
import { Field, Notice, inputClass } from "@/components/admin/ui";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
      <Field id="email" label="Email">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={`${inputClass} border-line`} />
      </Field>
      <Field id="password" label="Password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={`${inputClass} border-line`} />
      </Field>
      <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
