import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { ReportView } from "@/app/m/[id]/[programId]/reporte/report-view";
import { Brand } from "@/components/brand";
import { reportLang, reportText } from "@/lib/i18n-report";
import { programName } from "@/lib/program-names";
import type { ReportContent } from "@/lib/report";
import { reportEvals } from "@/lib/report-evals";
import { requestIp, securityEvent } from "@/lib/health";
import { serviceClient } from "@/lib/supabase/admin";

// Reporte compartido por un docente: se abre sin cuenta con un link que vence.
// La base solo guarda la huella del token; sin token válido no se muestra nada.
export const metadata: Metadata = { title: "MY PATH.IA", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = serviceClient();
  const valid = /^[A-Za-z0-9_-]{20,64}$/.test(token);
  const { data } = valid && db ? await db.rpc("share_read", { p_token_hash: createHash("sha256").update(token).digest("hex") }) : { data: null };
  const share = data as null | { content: ReportContent | null; first_name: string; last_name: string; program: { title: string; language: string } };

  if (!share?.content || !db) {
    // Muchos links inválidos seguidos = alguien probando tokens
    await securityEvent("share_invalido", requestIp(await headers()));
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
        <Brand />
        <h1 className="font-display text-2xl font-bold">Este link ya no está disponible</h1>
        <p className="text-muted">Venció o fue anulado. Pedile un link nuevo a quien te lo envió. · This link has expired or was revoked.</p>
      </main>
    );
  }
  const rl = reportLang(share.program.language);
  const r = reportText(rl);
  const evals = await reportEvals(db, share.content, rl);
  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-5 py-3.5 md:px-10">
        <Brand compact />
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-10 md:px-10">
        <p className="eyebrow">{programName(share.program.title, share.program.language)}</p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
          {share.first_name} {share.last_name}
        </h1>
        <p className="mt-2 text-muted">{r.title}</p>
        <div className="mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-celeste to-opulent" aria-hidden />
        <ReportView lang={rl} content={share.content} evals={evals} />
      </main>
    </div>
  );
}
