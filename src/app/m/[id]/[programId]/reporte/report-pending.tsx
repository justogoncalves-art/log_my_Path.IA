"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { requestReport } from "@/app/actions/program";
import { reportText, type ReportLang } from "@/lib/i18n-report";

// Pide el reporte (si falta) y vuelve a mirar cada 15 segundos hasta que esté listo.
// Si algo falla del lado de la IA, el reporte queda en cola: el alumno solo ve "lo estamos preparando".
export function ReportPending({ lang, programId }: { lang: ReportLang; programId: string }) {
  const r = reportText(lang);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const ask = async () => {
      const s = await requestReport(programId);
      if (alive && s === "listo") router.refresh();
    };
    ask();
    const timer = setInterval(ask, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [programId, router]);

  return (
    <div className="mt-10 flex items-start gap-5 rounded-2xl border border-line bg-surface p-8" role="status" aria-live="polite">
      <span className="mt-1 inline-block size-6 shrink-0 animate-spin rounded-full border-2 border-celeste border-t-transparent motion-reduce:animate-none" aria-hidden />
      <div>
        <h2 className="font-display text-2xl font-semibold">{r.generatingTitle}</h2>
        <p className="mt-2 max-w-xl text-muted">{r.generatingBody}</p>
      </div>
    </div>
  );
}
