"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form-fields";

type Labels = { email: string; password: string; signIn: string; signingIn: string };

export function LoginForm({ labels, initialError }: { labels: Labels; initialError?: string }) {
  const [state, action] = useActionState(login, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={labels.email} name="email" type="email" autoComplete="username" required maxLength={254} />
      <Field label={labels.password} name="password" type="password" autoComplete="current-password" required maxLength={128} />
      <FormError message={state?.error} />
      <SubmitButton label={labels.signIn} pendingLabel={labels.signingIn} />
    </form>
  );
}
