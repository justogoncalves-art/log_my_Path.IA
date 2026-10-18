"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/form-fields";

type Labels = { newPassword: string; confirmPassword: string; rule: string; save: string; saving: string };

export function ChangePasswordForm({ labels }: { labels: Labels }) {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={labels.newPassword} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} hint={labels.rule} />
      <Field label={labels.confirmPassword} name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
      <FormError message={state?.error} />
      <SubmitButton label={labels.save} pendingLabel={labels.saving} />
    </form>
  );
}
