"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { staffText, type StaffLang } from "@/lib/i18n-staff";
import { requestClassReport } from "../actions";

type Item = { title: string; body: string };
type Content = {
  headline: string; summary: string; profile: string; strengths: Item[]; recommendations: Item[];
  alerts: Item[]; institution: Item[]; careers: string[];
};

// Resumen IA del curso: bloqueado hasta que toda la clase termina; después se pide y se espera sin mostrar errores.
export function ClassSummary({ lang, classId, programId, done, total, report }: {
  lang: StaffLang; classId: string; programId: string; done: number; total: number;
  report: { status: string; content: unknown; generated_at: string | null } | null;
}) {
  const s = staffText(lang);
  const router = useRouter();
  const complete = total > 0 && done >= total;
  const ready = report?.status === "listo" && report.content;

  useEffect(() => {
    if (!complete || ready) return;
    requestClassReport(classId, programId);
    const id = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(id);
  }, [complete, ready, classId, programId, router]);

  if (!complete) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return (
      <section className="rounded-2xl border border-line bg-surface p-8">
        <h2 className="font-display text-2xl font-bold">{s.summaryTitle}</h2>
        <p className="mt-2 text-muted">{s.summaryLocked(done, total)}</p>
        <div className="mt-6 h-2 max-w-xl rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-opulent" style={{ width: `${pct}%` }} />
        </div>
      </section>
    );
  }
  if (!ready) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-8">
        <h2 className="font-display text-2xl font-bold">{s.summaryTitle}</h2>
        <p className="mt-2 flex items-center gap-3 text-muted">
          <span className="inline-block size-3 animate-pulse rounded-full bg-celeste" aria-hidden />
          {s.summaryPreparing}
        </p>
      </section>
    );
  }

  const c = report.content as Content;
  const block = (title: string, items: Item[], tone = "") =>
    items.length ? (
      <section className={`rounded-2xl border border-line bg-surface p-6 ${tone}`}>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((i) => (
            <li key={i.title}>
              <p className="font-medium">{i.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{i.body}</p>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-opulent p-8 text-white md:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">{s.summaryTitle}</p>
        <h2 className="mt-3 max-w-4xl font-display text-2xl font-bold md:text-3xl">{c.headline}</h2>
        <div className="mt-5 max-w-5xl space-y-3 leading-relaxed text-white/90">
          {c.summary.split(/\n\n+/).map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-semibold">{s.summaryProfile}</h3>
          <p className="mt-3 leading-relaxed text-muted">{c.profile}</p>
          {c.careers.length ? (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{s.summaryCareers}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {c.careers.map((x) => (
                  <li key={x} className="rounded-full bg-celeste/10 px-3 py-1 text-sm text-opulent">
                    {x}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
        {block(s.summaryStrengths, c.strengths)}
        {block(s.summaryRecs, c.recommendations)}
        {block(s.summaryInstitution, c.institution)}
        {block(s.summaryAlerts, c.alerts, "border-l-4 border-l-danger/60")}
      </div>
    </div>
  );
}
