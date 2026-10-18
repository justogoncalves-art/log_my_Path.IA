import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getMe } from "@/lib/dal";
import { getDict } from "@/lib/i18n";
import { ChangePasswordForm } from "./change-form";

export default async function ChangePasswordPage() {
  const [me, { t }] = await Promise.all([getMe(), getDict()]);
  if (!me.mustChangePassword) redirect("/");
  return (
    <AuthShell>
      <p className="eyebrow">{t.ecosystem}</p>
      <h1 className="mt-3 font-display text-[28px] leading-tight">{t.changeTitle}</h1>
      <div className="mt-5 h-0.5 w-12 bg-celeste" />
      <p className="mt-5 text-[15px] leading-relaxed text-muted">{t.changeLead}</p>
      <div className="mt-8">
        <ChangePasswordForm
          labels={{
            newPassword: t.newPassword,
            confirmPassword: t.confirmPassword,
            rule: t.passwordRule,
            save: t.save,
            saving: t.saving,
          }}
        />
      </div>
    </AuthShell>
  );
}
