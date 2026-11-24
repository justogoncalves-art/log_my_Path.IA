"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Field, FormError, PasswordField, SubmitButton } from "@/components/form-fields";

type Labels = { email: string; password: string; signIn: string; signingIn: string; show: string; hide: string; forgot: string };

export function LoginForm({ labels, initialError }: { labels: Labels; initialError?: string }) {
  const [state, action] = useActionState(login, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={labels.email} name="email" type="email" autoComplete="username" required maxLength={254} />
      <PasswordField label={labels.password} name="password" autoComplete="current-password" required maxLength={128} showLabel={labels.show} hideLabel={labels.hide} />
      <p className="-mt-1 text-right">
        <Link href="/recuperar" className="text-sm text-opulent hover:underline">
          {labels.forgot}
        </Link>
      </p>
      <FormError message={state?.error} />
      <SubmitButton label={labels.signIn} pendingLabel={labels.signingIn} />
    </form>
  );
}
