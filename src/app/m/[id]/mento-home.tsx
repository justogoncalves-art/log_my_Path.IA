import Image from "next/image";
import Link from "next/link";
import { languageLabel, programText, type ProgramLang } from "@/lib/i18n-program";
import type { ChapterSummary, MyProgram } from "@/lib/programs";

// Entrada de Mento.IA: el programa (con el capítulo donde quedó), el reporte y My Campus.
// Reporte y Campus se habilitan al terminar el programa.
export function MentoHome({
  lang,
  program,
  chapters,
  others,
}: {
  lang: ProgramLang;
  program: MyProgram;
  chapters: ChapterSummary[];
  others: MyProgram[];
}) {
  const p = programText(lang);
  const done = program.chapters > 0 && program.completed >= program.chapters;
  const nextChapter = chapters.find((c) => !c.completed) ?? chapters[chapters.length - 1];
  const pct = program.chapters ? Math.round((program.completed / program.chapters) * 100) : 0;
  const href = done || !nextChapter ? `/m/mento/${program.id}` : `/m/mento/${program.id}/${nextChapter.position}`;

  return (
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Programa */}
      <Link
        href={href}
        className="group relative min-h-[340px] overflow-hidden rounded-2xl border border-line transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-celeste md:col-span-2"
      >
        <Image src="/img/mento-hero.jpg" alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" style={{ objectPosition: "center 22%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-opulent via-opulent/60 to-opulent/10" />
        <div className="absolute inset-x-6 bottom-6 flex flex-col gap-5 md:inset-x-8 md:bottom-8">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white">
              {p.yourProgram} · {program.grade}º · {languageLabel(program.language)}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">{program.title}</h2>
            <p className="mt-2 text-white/85">
              {done
                ? p.allDone
                : nextChapter
                  ? `${program.completed === 0 ? p.startAt : p.continueAt(nextChapter.position)} · ${nextChapter.title}`
                  : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-48 flex-1">
              <div className="flex justify-between text-sm text-white/85">
                <span>{p.progress(program.completed, program.chapters)}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden>
                <div className="h-full rounded-full bg-celeste" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="rounded-lg bg-white px-5 py-2.5 font-display text-sm font-semibold text-opulent">
              {done ? p.review : program.completed === 0 ? p.start : p.resume} →
            </span>
          </div>
        </div>
      </Link>

      {/* Reporte */}
      <article
        className={`flex min-h-[220px] flex-col justify-between rounded-2xl border border-line bg-surface p-6 ${done ? "" : "opacity-70"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{p.reportTag}</span>
          {done ? null : <LockBadge label={p.lockedBadge} />}
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold">{p.reportTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{done ? p.reportPreparing : p.reportLocked}</p>
        </div>
      </article>

      {/* My Campus */}
      <article
        className={`relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-line p-6 ${done ? "" : "opacity-70"}`}
      >
        <Image src="/img/imagen-my-unni.jpg" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className={`object-cover ${done ? "" : "grayscale"}`} style={{ objectPosition: "center 60%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-opulent/95 via-opulent/60 to-opulent/30" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">{p.campusTag}</span>
          {done ? null : <LockBadge label={p.lockedBadge} light />}
        </div>
        <div className="relative">
          <h3 className="font-display text-2xl font-semibold text-white">{p.campusTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{done ? p.campusSoon : p.campusLocked}</p>
        </div>
      </article>

      {others.length ? (
        <section className="md:col-span-2">
          <h3 className="eyebrow">{p.otherPrograms}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/m/mento/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-celeste">
                  <span>
                    <span className="font-display font-medium">{o.title}</span>
                    <span className="text-sm text-muted">
                      {" "}
                      · {o.grade}º · {languageLabel(o.language)}
                    </span>
                  </span>
                  <span className="text-sm text-muted">{p.progress(o.completed, o.chapters)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function LockBadge({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${light ? "bg-white/15 text-white" : "bg-line text-muted"}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {label}
    </span>
  );
}
