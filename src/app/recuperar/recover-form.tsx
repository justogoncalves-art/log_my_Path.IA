"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form-fields";

type Labels = { email: string; send: string; sending: string; sent: string };

export function RecoverForm({ labels, initialError }: { labels: Labels; initialError?: string }) {
  const [state, action] = useActionState(requestPasswordReset, initialError ? { error: initialError } : undefined);
  if (state?.sent) {
    return (
      <p role="status" className="rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
        {labels.sent}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={labels.email} name="email" type="email" autoComplete="username" required maxLength={254} />
      <FormError message={state?.error} />
      <SubmitButton label={labels.send} pendingLabel={labels.sending} />
    </form>
  );
}
