"use client";

import { useState } from "react";
import { reportText, type ReportLang } from "@/lib/i18n-report";
import type { ReportContent } from "@/lib/report";

export type EvalCard = ReportContent["evaluations"][number] & { name: string; top: { name: string; stars: number }[] };

// Reporte final de Mento.IA, con el diseño del prototipo: Evaluaciones, Resultados, Ikigai y Tips.
export function ReportView({ lang, content, evals }: { lang: ReportLang; content: ReportContent; evals: EvalCard[] }) {
  const r = reportText(lang);
  const [tab, setTab] = useState(0);

  return (
    <div className="mt-8">
      {/* Resumen */}
      <section className="rounded-2xl bg-opulent p-7 text-white md:p-9">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-celeste">
          {r.profile} · {content.profile_type}
        </span>
        <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{content.headline}</h2>
        <Paragraphs text={content.summary} className="mt-4 max-w-3xl leading-relaxed text-white/85" />
      </section>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4" role="tablist">
        {r.tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors ${
              tab === i ? "border-opulent bg-opulent text-white" : "border-line bg-surface hover:border-celeste"
            }`}
          >
            <span className={`font-display text-xl font-bold ${tab === i ? "text-celeste" : "text-faint"}`}>0{i + 1}</span>
            <span className="font-display font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === 0 ? <Evaluations lang={lang} evals={evals} /> : null}
        {tab === 1 ? <Results lang={lang} content={content} /> : null}
        {tab === 2 ? <Ikigai lang={lang} content={content} /> : null}
        {tab === 3 ? <Tips lang={lang} content={content} /> : null}
      </div>

      <p className="mt-12 text-sm text-muted">{r.note}</p>
    </div>
  );
}

function Evaluations({ lang, evals }: { lang: ReportLang; evals: EvalCard[] }) {
  const r = reportText(lang);
  const [i, setI] = useState(0);
  const e = evals[i];
  if (!e) return null;
  const go = (n: number) => setI((n + evals.length) % evals.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {r.evaluations} · {i + 1} / {evals.length}
        </span>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            {evals.map((x, n) => (
              <button
                key={x.assessment}
                aria-label={x.name}
                onClick={() => go(n)}
                className={`h-[5px] rounded-full transition-all ${n === i ? "w-6 bg-opulent" : "w-2.5 bg-line"}`}
              />
            ))}
          </div>
          <button aria-label={r.previous} onClick={() => go(i - 1)} className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-line bg-surface hover:border-celeste">
            <Chevron dir="left" />
          </button>
          <button aria-label={r.next} onClick={() => go(i + 1)} className="flex size-10 items-center justify-center rounded-full bg-opulent text-white">
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="h-1 bg-gradient-to-r from-celeste to-opulent" />
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-opulent">
              {r.evaluation} {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted">{e.model}</span>
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">{e.name}</h3>

          <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h4 className="font-display text-lg font-semibold">{e.what_title}</h4>
              {e.what_body.map((p, n) => (
                <p key={n} className="mt-3 leading-relaxed text-muted">
                  {p}
                </p>
              ))}

              <div className="mt-6 rounded-xl bg-opulent p-5 text-white">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-celeste">{r.aiAnalysis}</span>
                <h4 className="mt-2 font-display text-lg font-semibold">{e.ai_title}</h4>
                <p className="mt-2 leading-relaxed text-white/85">{e.ai_body}</p>
                {e.key_question ? (
                  <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-4">
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-celeste">{r.keyQuestion}</div>
                    <p className="mt-2 italic text-white/90">{e.key_question}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {e.top.length ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{r.yourScores}</div>
                <ul className="mt-3 flex flex-col gap-3">
                  {e.top.map((d) => (
                    <li key={d.name} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                      <span className="font-display font-medium">{d.name}</span>
                      <span className="flex gap-1" aria-label={`${d.stars} / 5`}>
                        {Array.from({ length: 5 }, (_, n) => (
                          <span key={n} className={`size-2.5 rounded-full border ${n < d.stars ? "border-opulent bg-opulent" : "border-line"}`} />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}

function Results({ lang, content }: { lang: ReportLang; content: ReportContent }) {
  const r = reportText(lang);
  const a = content.dominant_area;
  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-opulent p-7 text-white md:p-9">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-celeste">{r.dominantArea}</div>
        <h3 className="mt-3 font-display text-2xl font-bold md:text-3xl">{a.title}</h3>
        <p className="mt-2 font-mono text-sm text-celeste">
          {a.code} · {r.affinity} {Math.round(Math.max(0, Math.min(100, a.affinity)))}/100
        </p>
        <p className="mt-4 max-w-3xl leading-relaxed text-white/85">{a.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {a.strengths.map((s) => (
            <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-sm">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-xl font-bold">{r.careers}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {content.careers.map((c, n) => (
            <article key={c.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="font-display text-sm font-bold text-celeste">{String(n + 1).padStart(2, "0")}</span>
              <h4 className="mt-1 font-display text-lg font-semibold">{c.title}</h4>
              <p className="mt-2 leading-relaxed text-muted">{c.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Ikigai({ lang, content }: { lang: ReportLang; content: ReportContent }) {
  const r = reportText(lang);
  const k = content.ikigai;
  const parts = [
    { key: "love", label: r.love, part: k.love, pos: "left-[6%] top-[22%]" },
    { key: "good", label: r.good, part: k.good, pos: "right-[6%] top-[22%] text-right" },
    { key: "world", label: r.world, part: k.world, pos: "left-[6%] bottom-[18%]" },
    { key: "paid", label: r.paid, part: k.paid, pos: "right-[6%] bottom-[18%] text-right" },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">{r.ikigaiEyebrow}</p>
        <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">{r.ikigaiTitle}</h3>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">{r.ikigaiIntro}</p>
      </div>

      {/* Diagrama: cuatro círculos que se cruzan en el centro */}
      <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
        <span className="absolute left-[8%] top-[8%] size-[55%] rounded-full bg-celeste/20" />
        <span className="absolute right-[8%] top-[8%] size-[55%] rounded-full bg-opulent/15" />
        <span className="absolute bottom-[8%] left-[8%] size-[55%] rounded-full bg-opulent/15" />
        <span className="absolute bottom-[8%] right-[8%] size-[55%] rounded-full bg-celeste/20" />
        {parts.map((p) => (
          <span key={p.key} className={`absolute max-w-[34%] ${p.pos}`}>
            <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-muted">{p.label}</span>
            <span className="block font-display text-sm font-semibold leading-tight">{p.part.short}</span>
          </span>
        ))}
        <span className="absolute left-1/2 top-1/2 flex size-[28%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-opulent p-2 text-center text-white">
          <span className="font-mono text-[9px] tracking-[0.2em] text-celeste">IKIGAI</span>
          <span className="font-display text-xs font-semibold leading-tight md:text-sm">{k.center}</span>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {parts.map((p) => (
          <article key={p.key} className="rounded-2xl border border-line bg-surface p-5">
            <h4 className="font-display font-semibold">{p.label}</h4>
            <p className="mt-2 leading-relaxed text-muted">{p.part.long}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-celeste/40 bg-celeste/10 p-6">
        <h4 className="font-display font-bold">{r.howToRead}</h4>
        <p className="mt-2 leading-relaxed">{k.how_to_read}</p>
      </section>
    </div>
  );
}

function Tips({ lang, content }: { lang: ReportLang; content: ReportContent }) {
  const r = reportText(lang);
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="font-display text-2xl font-bold md:text-3xl">{r.errorsTitle}</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {content.errors.map((e, n) => (
            <article key={e.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="font-display text-2xl font-bold text-celeste">{String(n + 1).padStart(2, "0")}</span>
              <h4 className="mt-2 font-display font-semibold">{e.title}</h4>
              <p className="mt-2 leading-relaxed text-muted">{e.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <List title={r.seek} items={content.seek} mark="✓" markCls="bg-ok/15 text-ok" />
        <List title={r.avoid} items={content.avoid} mark="!" markCls="bg-[#f5e3c0] text-[#7a5310]" />
      </div>
    </div>
  );
}

function List({ title, items, mark, markCls }: { title: string; items: string[]; mark: string; markCls: string }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h4 className="font-display font-bold">{title}</h4>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((s) => (
          <li key={s} className="flex gap-3 leading-relaxed">
            <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${markCls}`} aria-hidden>
              {mark}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, n) => (
          <p key={n} className={n ? "mt-3" : undefined}>
            {p}
          </p>
        ))}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "M15 6 L9 12 L15 18" : "M9 6 L15 12 L9 18"} />
    </svg>
  );
}
