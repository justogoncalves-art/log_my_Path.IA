import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportView } from "@/app/m/[id]/[programId]/reporte/report-view";
import { AppHeader } from "@/components/app-header";
import { getDict } from "@/lib/i18n";
import { reportLang } from "@/lib/i18n-report";
import { staffText } from "@/lib/i18n-staff";
import { programName } from "@/lib/program-names";
import type { ReportContent } from "@/lib/report";
import { reportEvals } from "@/lib/report-evals";
import { ageOf, classStudents, isUuid, reportShares, staffClasses, studentChapters, studentReport } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "../../../access";
import { SharePanel } from "./share-panel";

const nowMs = () => Date.now();

export default async function StaffStudentPage({ params, searchParams }: {
  params: Promise<{ personId: string }>; searchParams: Promise<{ clase?: string; programa?: string }>;
}) {
  const [{ personId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(personId) || !isUuid(sp.clase) || !isUuid(sp.programa)) notFound();
  const [{ me }, { t, lang }] = await Promise.all([requireStaff("mento"), getDict()]);
  const s = staffText(lang);

  const klass = (await staffClasses()).find((c) => c.class_id === sp.clase);
  const program = klass?.programs.find((p) => p.id === sp.programa);
  if (!klass || !program) notFound();
  const student = (await classStudents(klass.class_id, program.id)).find((x) => x.person_id === personId);
  if (!student) notFound();

  const [chapters, report, shares] = await Promise.all([studentChapters(personId, program.id), studentReport(personId, program.id), reportShares(personId, program.id)]);
  const rl = reportLang(program.language);
  const content = report?.status === "listo" ? (report.content as ReportContent | null) : null;
  const evals = content ? await reportEvals(await createClient(), content, rl) : [];
  const age = ageOf(student.birth_date);
  const back = `/docente/mento?clase=${klass.class_id}&programa=${program.id}`;
  const name = `${student.first_name} ${student.last_name}`;
  const now = nowMs();
  const dateFmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 md:px-10">
        <Link href={back} className="text-sm text-muted hover:text-ink">
          ← {s.back} · {klass.class_name}
        </Link>
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl border border-line bg-surface p-6 md:p-8">
            <p className="eyebrow">{s.studentFile}</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{name}</h1>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label={s.age} value={age !== null ? s.years(age) : "—"} />
              <Info label={s.email} value={student.email} />
              <Info label={s.colLastSeen} value={student.last_seen ? dateFmt.format(new Date(student.last_seen)) : s.never} />
              <Info label={s.colTime} value={`${s.minutes(Math.round(student.seconds / 60))} · ${s.days30(student.active_days_30, student.minutes_30)}`} />
            </dl>
            <h2 className="mt-8 font-display text-lg font-semibold">
              {s.byChapter} · {programName(program.title, program.language)}
            </h2>
            <ol className="mt-4 grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
              {chapters.map((c) => {
                const done = c.status === "completed";
                return (
                  <li key={c.chapter_position} className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-muted">{s.chapterOf(c.chapter_position, chapters.length)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${done ? "bg-ok/10 text-ok" : c.status === "pendiente" ? "bg-line text-muted" : "bg-celeste/15 text-opulent"}`}>
                        {done ? s.completed : c.status === "pendiente" ? s.pending : s.started}
                      </span>
                    </div>
                    <p className="mt-1.5 font-medium leading-snug">{c.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {s.answered(c.answered, c.questions)} · {s.minutes(Math.round(c.seconds / 60))}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
          <SharePanel
            lang={lang}
            personId={personId}
            programId={program.id}
            studentName={name}
            programLabel={programName(program.title, program.language)}
            ready={!!content}
            now={now}
            shares={shares}
          />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">{s.report}</h2>
          {content ? (
            <ReportView lang={rl} content={content} evals={evals} />
          ) : (
            <p className="mt-4 rounded-xl border border-line bg-surface p-6 text-muted">{student.finished_at ? s.reportPreparing : s.reportNotYet}</p>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
