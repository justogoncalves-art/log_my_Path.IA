"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { FormError, PasswordField, SubmitButton } from "@/components/form-fields";

type Labels = { newPassword: string; confirmPassword: string; rule: string; save: string; saving: string; show: string; hide: string };

export function ChangePasswordForm({ labels }: { labels: Labels }) {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <PasswordField label={labels.newPassword} name="password" showLabel={labels.show} hideLabel={labels.hide} autoComplete="new-password" required minLength={10} maxLength={128} hint={labels.rule} />
      <PasswordField label={labels.confirmPassword} name="confirm" showLabel={labels.show} hideLabel={labels.hide} autoComplete="new-password" required minLength={10} maxLength={128} />
      <FormError message={state?.error} />
      <SubmitButton label={labels.save} pendingLabel={labels.saving} />
    </form>
  );
}
