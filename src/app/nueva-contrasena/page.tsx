import { AuthShell } from "@/components/auth-shell";
import { getMe } from "@/lib/dal";
import { getDict } from "@/lib/i18n";
import { ChangePasswordForm } from "../cambiar-contrasena/change-form";

// Después de entrar por el link del mail: la contraseña nueva reemplaza a la anterior
export default async function NewPasswordPage() {
  const [, { t }] = await Promise.all([getMe(), getDict()]);
  return (
    <AuthShell>
      <p className="eyebrow">{t.ecosystem}</p>
      <h1 className="mt-3 font-display text-[28px] leading-tight">{t.newPasswordTitle}</h1>
      <div className="mt-5 h-0.5 w-12 bg-celeste" />
      <p className="mt-5 text-[15px] leading-relaxed text-muted">{t.newPasswordLead}</p>
      <div className="mt-8">
        <ChangePasswordForm
          labels={{
            newPassword: t.newPassword,
            confirmPassword: t.confirmPassword,
            rule: t.passwordRule,
            save: t.save,
            saving: t.saving,
            show: t.showPassword,
            hide: t.hidePassword,
          }}
        />
      </div>
    </AuthShell>
  );
}
