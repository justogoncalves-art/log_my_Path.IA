import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getDict } from "@/lib/i18n";
import { RecoverForm } from "./recover-form";

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const [{ t }, { e }] = await Promise.all([getDict(), searchParams]);
  return (
    <AuthShell>
      <p className="eyebrow">{t.ecosystem}</p>
      <h1 className="mt-3 font-display text-[28px] leading-tight">{t.recoverTitle}</h1>
      <div className="mt-5 h-0.5 w-12 bg-celeste" />
      <p className="mt-5 text-[15px] leading-relaxed text-muted">{t.recoverLead}</p>
      <div className="mt-8">
        <RecoverForm
          labels={{ email: t.email, send: t.recoverSend, sending: t.recoverSending, sent: t.recoverSent }}
          initialError={e === "link" ? t.recoverInvalid : undefined}
        />
      </div>
      <Link href="/login" className="mt-6 inline-block text-sm text-muted hover:text-ink">
        ← {t.backToLogin}
      </Link>
    </AuthShell>
  );
}
