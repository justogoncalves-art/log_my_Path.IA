import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { BarList, ChartCard, ColumnChart, Kpi } from "@/components/charts/charts";
import { getDict } from "@/lib/i18n";
import { RIASEC_NAMES } from "@/lib/i18n-campus";
import { STAFF_TABS, staffText, type StaffLang, type StaffTab } from "@/lib/i18n-staff";
import { signPlayback } from "@/lib/mux";
import { programName } from "@/lib/program-names";
import { getChapterContent } from "@/lib/programs";
import { classReport, classStats, classStudents, programDocuments, staffClasses, type ClassStats } from "@/lib/staff";
import { requireStaff } from "../access";
import { ClassSummary } from "./class-summary";
import { MirrorPlayer } from "./mirror-player";
import { UrlSelect } from "./picker";
import { StudentsTable, type Row } from "./students-table";

// El resumen IA de la clase se pide desde acá cuando la clase terminó (puede tardar unos minutos)
export const maxDuration = 300;

const nowMs = () => Date.now();

function relative(iso: string | null, lang: StaffLang, never: string) {
  if (!iso) return never;
  const diff = Math.max(0, nowMs() - new Date(iso).getTime());
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const min = Math.round(diff / 60000);
  if (min < 60) return rtf.format(-min, "minute");
  const h = Math.round(min / 60);
  if (h < 48) return rtf.format(-h, "hour");
  return rtf.format(-Math.round(h / 24), "day");
}

export default async function StaffMentoPage({ searchParams }: { searchParams: Promise<{ clase?: string; programa?: string; tab?: string; cap?: string }> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireStaff("mento"), getDict(), searchParams]);
  const s = staffText(lang);
  const classes = (await staffClasses()).map((c) => ({ ...c, programs: c.programs.filter((p) => p.module_id === "mento") }));
  const klass = classes.find((c) => c.class_id === sp.clase) ?? classes.find((c) => c.programs.length) ?? classes[0];
  const program = klass?.programs.find((p) => p.id === sp.programa) ?? klass?.programs[0];
  const tab: StaffTab = STAFF_TABS.includes(sp.tab as StaffTab) ? (sp.tab as StaffTab) : "seguimiento";
  const q = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ ...(klass ? { clase: klass.class_id } : {}), ...(program ? { programa: program.id } : {}), ...extra });
    return `/docente/mento?${u.toString()}`;
  };

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">{s.eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{s.title}</h1>
          </div>
          {klass ? (
            <div className="flex flex-wrap gap-3">
              <UrlSelect
                name="clase"
                label={s.klass}
                value={klass.class_id}
                reset={["programa", "cap"]}
                options={classes.map((c) => ({ value: c.class_id, label: `${c.class_name} · ${c.organization_name} (${c.students})` }))}
              />
              {program ? (
                <UrlSelect
                  name="programa"
                  label={s.program}
                  value={program.id}
                  reset={["cap"]}
                  options={klass.programs.map((p) => ({ value: p.id, label: programName(p.title, p.language) }))}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {!klass ? (
          <p className="mt-10 rounded-2xl border border-line bg-surface p-6 text-muted">{s.noClasses}</p>
        ) : !program ? (
          <p className="mt-10 rounded-2xl border border-line bg-surface p-6 text-muted">{s.noProgram}</p>
        ) : (
          <>
            <nav aria-label={s.title} className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
              {STAFF_TABS.map((k) => (
                <Link
                  key={k}
                  href={q({ tab: k })}
                  aria-current={tab === k ? "page" : undefined}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 font-display text-sm font-medium ${tab === k ? "border-opulent text-opulent" : "border-transparent text-muted hover:text-ink"}`}
                >
                  {s.tabs[k]}
                </Link>
              ))}
            </nav>
            <div className="mt-8">
              {tab === "seguimiento" ? <Tracking lang={lang} classId={klass.class_id} programId={program.id} /> : null}
              {tab === "contenido" ? <Content lang={lang} programId={program.id} chapters={program.chapters} cap={Number(sp.cap) || 1} q={q} personId={me.personId} /> : null}
              {tab === "estadisticas" ? <Stats lang={lang} classId={klass.class_id} programId={program.id} /> : null}
              {tab === "resumen" ? <Summary lang={lang} classId={klass.class_id} programId={program.id} /> : null}
              {tab === "guia" || tab === "actividades" ? <Docs lang={lang} programId={program.id} kind={tab === "guia" ? "guia" : "actividad"} /> : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Seguimiento ──────────────────────────────────────────────
async function Tracking({ lang, classId, programId }: { lang: StaffLang; classId: string; programId: string }) {
  const s = staffText(lang);
  const students = await classStudents(classId, programId);
  const now = nowMs();
  const n = students.length;
  const avg = n ? Math.round((students.reduce((a, x) => a + (x.total ? x.completed / x.total : 0), 0) / n) * 100) : 0;
  const finished = students.filter((x) => x.finished_at).length;
  const ready = students.filter((x) => x.report_status === "listo").length;
  const active7 = students.filter((x) => x.last_seen && now - new Date(x.last_seen).getTime() < 7 * 86400000).length;
  const avgMin = n ? Math.round(students.reduce((a, x) => a + x.seconds, 0) / n / 60) : 0;
  const rows: Row[] = students.map((x) => ({
    id: x.person_id,
    name: `${x.last_name}, ${x.first_name}`,
    completed: x.completed,
    total: x.total,
    nextTitle: x.next_title,
    nextPosition: x.next_position,
    lastSeen: x.last_seen,
    lastSeenLabel: relative(x.last_seen, lang, s.never),
    minutes: Math.round(x.seconds / 60),
    days30: x.active_days_30,
    minutes30: x.minutes_30,
    report: x.report_status,
    finished: !!x.finished_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label={s.kpiStudents} value={String(n)} />
        <Kpi label={s.kpiProgress} value={`${avg}%`} />
        <Kpi label={s.kpiFinished} value={String(finished)} sub={s.ofN(n)} />
        <Kpi label={s.kpiReports} value={String(ready)} sub={s.ofN(n)} />
        <Kpi label={s.kpiActive7} value={String(active7)} sub={s.ofN(n)} />
        <Kpi label={s.kpiMinutes} value={s.minutes(avgMin)} />
      </div>
      <StudentsTable lang={lang} rows={rows} hrefBase="/docente/mento/alumno" hrefQuery={`?clase=${classId}&programa=${programId}`} now={now} />
    </div>
  );
}

// ── Contenido (espejo de lo que ve el alumno, sin guardar nada) ──
async function Content({ lang, programId, chapters, cap, q, personId }: {
  lang: StaffLang; programId: string; chapters: number; cap: number; q: (e: Record<string, string>) => string; personId: string;
}) {
  const s = staffText(lang);
  const position = Math.min(Math.max(cap, 1), Math.max(chapters, 1));
  const content = await getChapterContent(programId, position, personId);
  const tokens = content?.playbackId && content.signed ? signPlayback(content.playbackId) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <nav aria-label={s.tabs.contenido} className="flex flex-col gap-1.5">
        {Array.from({ length: chapters }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={q({ tab: "contenido", cap: String(n) })}
            aria-current={n === position ? "page" : undefined}
            className={`rounded-xl border px-4 py-3 text-sm ${n === position ? "border-opulent bg-opulent text-white" : "border-line bg-surface hover:border-celeste"}`}
          >
            {s.chapterOf(n, chapters)}
          </Link>
        ))}
      </nav>
      {content ? (
        <MirrorPlayer
          lang={lang}
          title={content.title}
          playbackId={content.playbackId && (!content.signed || tokens) ? content.playbackId : null}
          tokens={tokens}
          questions={content.questions.map((x) => ({ id: x.id, kind: x.kind, prompt: x.prompt, options: x.options.map((o) => ({ id: o.id, text: o.text })) }))}
        />
      ) : null}
    </div>
  );
}

// ── Estadísticas ─────────────────────────────────────────────
async function Stats({ lang, classId, programId }: { lang: StaffLang; classId: string; programId: string }) {
  const s = staffText(lang);
  const st = await classStats(classId, programId);
  if (!st) return <p className="text-muted">{s.noData}</p>;
  const pct = (x: number) => (st.students ? Math.round((x / st.students) * 100) : 0);
  const dayFmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const byAssessment = groupScores(st);
  const ratingsData = (r: Record<string, number>) => [5, 4, 3, 2, 1].map((n) => ({ label: "★".repeat(n), value: r[String(n)] ?? 0 }));
  const ratingAvg = (r: Record<string, number>) => {
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    return total ? (Object.entries(r).reduce((a, [k, v]) => a + Number(k) * v, 0) / total).toFixed(1) : "—";
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title={s.statsCompletion} sub={s.statsCompletionSub}>
        <ColumnChart
          data={st.chapters.map((c) => ({ label: `C${c.position}`, value: c.completed, hint: `${c.completed} (${pct(c.completed)}%)` }))}
          max={st.students}
          seeData={s.seeData}
          valueLabel={s.statsCompletion}
        />
      </ChartCard>
      <ChartCard title={s.statsActivity} sub={s.statsActivitySub}>
        <ColumnChart
          data={st.activity.map((d) => ({ label: dayFmt.format(new Date(`${d.day}T12:00:00`)), value: d.students, hint: `${d.students} · ${d.minutes} min` }))}
          seeData={s.seeData}
          valueLabel={s.statsActivity}
          labelEvery={5}
        />
      </ChartCard>
      <ChartCard title={s.statsTime} sub={s.statsTimeSub}>
        <BarList
          data={st.chapters.map((c) => ({ label: `${c.position}. ${c.title}`, value: Number(c.avg_minutes ?? 0), hint: c.avg_minutes ? s.minutes(Number(c.avg_minutes)) : "—" }))}
          seeData={s.seeData}
          valueLabel={s.statsTime}
        />
      </ChartCard>
      <ChartCard title={s.statsHolland} sub={s.statsHollandSub}>
        {st.holland.length ? (
          <BarList
            data={["R", "I", "A", "S", "E", "C"].map((l) => ({ label: `${l} · ${RIASEC_NAMES[lang][l]}`, value: st.holland.find((h) => h.letter === l)?.n ?? 0 }))}
            seeData={s.seeData}
            valueLabel={s.statsHolland}
          />
        ) : (
          <p className="text-sm text-muted">{s.noData}</p>
        )}
      </ChartCard>
      {byAssessment.map(([assessment, dims]) => (
        <ChartCard key={assessment} title={`${s.statsScores} · ${assessment}`} sub={s.statsScoresSub}>
          <BarList
            data={dims.map((d) => ({ label: d.name, value: d.avg_t - 20, hint: String(d.avg_t) }))}
            max={60}
            reference={{ value: 30, label: "T 50" }}
            seeData={s.seeData}
            valueLabel={s.statsScores}
          />
        </ChartCard>
      ))}
      <ChartCard title={s.statsRatings} sub={`${s.statsRatingsMid}: ${ratingAvg(st.ratings.mid)} · ${s.statsRatingsFinal}: ${ratingAvg(st.ratings.final)}`}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{s.statsRatingsMid}</p>
            <BarList data={ratingsData(st.ratings.mid)} seeData={s.seeData} valueLabel={s.statsRatingsMid} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{s.statsRatingsFinal}</p>
            <BarList data={ratingsData(st.ratings.final)} seeData={s.seeData} valueLabel={s.statsRatingsFinal} />
          </div>
        </div>
      </ChartCard>
      <ChartCard title={s.statsAnswers} sub={s.statsAnswersSub} className="xl:col-span-2">
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {st.questions
            .filter((x) => x.kind === "simple" && x.options?.length)
            .map((x) => {
              const total = x.options!.reduce((a, o) => a + o.n, 0);
              return (
                <div key={`${x.chapter}-${x.position}`} className="rounded-xl border border-line p-4">
                  <p className="text-xs text-muted">
                    C{x.chapter} · {s.answeredN(x.answered)}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug">{x.prompt}</p>
                  <div className="mt-3">
                    <BarList
                      data={x.options!.map((o, i) => ({ label: `${String.fromCharCode(65 + i)}. ${o.text}`, value: o.n, hint: total ? `${Math.round((o.n / total) * 100)}%` : "0%" }))}
                      max={Math.max(total, 1)}
                      seeData={s.seeData}
                      valueLabel={x.prompt}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </ChartCard>
    </div>
  );
}

function groupScores(st: ClassStats): [string, ClassStats["scores"]][] {
  const map = new Map<string, ClassStats["scores"]>();
  for (const d of st.scores) map.set(d.assessment, [...(map.get(d.assessment) ?? []), d]);
  return [...map.entries()].map(([k, v]) => [k.toUpperCase(), v.sort((a, b) => b.avg_t - a.avg_t)]);
}

// ── Resumen IA de la clase ───────────────────────────────────
async function Summary({ lang, classId, programId }: { lang: StaffLang; classId: string; programId: string }) {
  const [report, students] = await Promise.all([classReport(classId, programId), classStudents(classId, programId)]);
  const done = students.filter((x) => x.finished_at).length;
  return <ClassSummary lang={lang} classId={classId} programId={programId} done={done} total={students.length} report={report} />;
}

// ── Guía didáctica y actividades ─────────────────────────────
async function Docs({ lang, programId, kind }: { lang: StaffLang; programId: string; kind: "guia" | "actividad" }) {
  const s = staffText(lang);
  const docs = (await programDocuments(programId)).filter((d) => d.kind === kind);
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">{kind === "guia" ? s.guideTitle : s.activitiesTitle}</h2>
      <p className="mt-1 text-muted">{kind === "guia" ? s.guideLead : s.activitiesLead}</p>
      {docs.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((d, i) => (
            <li key={d.id}>
              <a
                href={`/api/docs/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-celeste"
              >
                <span className="flex items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger/10 font-mono text-xs font-bold text-danger">PDF</span>
                  <span>
                    <span className="block font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}.</span>
                    <span className="block font-display font-semibold leading-snug">{d.title}</span>
                  </span>
                </span>
                <span className="text-sm text-opulent">{s.openPdf} ↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-surface p-5 text-muted">{s.noDocs}</p>
      )}
    </section>
  );
}
