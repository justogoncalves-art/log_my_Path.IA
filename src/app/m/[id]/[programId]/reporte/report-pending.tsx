"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { requestReport, type ReportStatus } from "@/app/actions/program";
import { reportText, type ReportLang } from "@/lib/i18n-report";

// Pide el reporte (si falta) y vuelve a mirar cada 10 segundos hasta que esté listo.
export function ReportPending({ lang, programId, status }: { lang: ReportLang; programId: string; status: ReportStatus }) {
  const r = reportText(lang);
  const router = useRouter();
  const [current, setCurrent] = useState<ReportStatus>(status);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    const ask = async () => {
      const s = await requestReport(programId);
      if (!alive || !s) return;
      setCurrent(s);
      if (s === "listo") router.refresh();
    };
    ask();
    const timer = setInterval(ask, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [programId, router]);

  if (current === "error") {
    return (
      <div className="mt-10 rounded-2xl border border-line bg-surface p-8">
        <h2 className="font-display text-2xl font-semibold">{r.errorTitle}</h2>
        <p className="mt-2 text-muted">{r.errorBody}</p>
        <button
          className="mt-6 rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
          disabled={pending}
          onClick={() => start(async () => setCurrent((await requestReport(programId)) ?? "error"))}
        >
          {r.retry}
        </button>
      </div>
    );
  }

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
