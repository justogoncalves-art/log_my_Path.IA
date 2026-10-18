import { AuthShell } from "@/components/auth-shell";
import { getDict } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { t } = await getDict();
  const { e } = await searchParams;
  return (
    <AuthShell>
      <p className="eyebrow">{t.ecosystem}</p>
      <h1 className="mt-3 font-display text-[28px] leading-tight">
        {t.welcomeTitle}
        <span className="mt-1 block font-brand text-[22px] font-bold tracking-[0.08em]">MY PATH.IA</span>
      </h1>
      <div className="mt-5 h-0.5 w-12 bg-celeste" />
      <p className="mt-5 text-[15px] leading-relaxed text-muted">{t.welcomeLead}</p>
      <div className="mt-8">
        <LoginForm
          labels={{ email: t.email, password: t.password, signIn: t.signIn, signingIn: t.signingIn }}
          initialError={e === "perfil" ? t.noOrg : undefined}
        />
      </div>
    </AuthShell>
  );
}
