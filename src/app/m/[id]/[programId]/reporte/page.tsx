import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getDict } from "@/lib/i18n";
import { reportLang, reportText } from "@/lib/i18n-report";
import { requireModule } from "@/lib/module-access";
import { getMyPrograms } from "@/lib/programs";
import type { ReportContent } from "@/lib/report";
import { topDimensions } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import { ReportPending } from "./report-pending";
import { ReportView, type EvalCard } from "./report-view";

// La generación corre en segundo plano desde la acción que la pide (puede tardar unos minutos)
export const maxDuration = 300;

export default async function ReportPage({ params }: { params: Promise<{ id: string; programId: string }> }) {
  const { id, programId } = await params;
  const [{ me }, { t, lang }] = await Promise.all([requireModule(id), getDict()]);
  const program = (await getMyPrograms(id)).find((x) => x.id === programId);
  if (!program) notFound();

  const rl = reportLang(program.language);
  const r = reportText(rl);
  const done = program.chapters > 0 && program.completed >= program.chapters;

  const supabase = await createClient();
  // Filtrar siempre por la persona: el admin ve por RLS los reportes de todos
  const [{ data: report }, { data: assessments }] = await Promise.all([
    supabase.from("program_reports").select("status, content").eq("person_id", me.personId).eq("program_id", programId).maybeSingle(),
    supabase.from("assessments").select("id, name_es, name_en"),
  ]);

  let body: React.ReactNode;
  if (!done) {
    body = <p className="mt-10 rounded-xl border border-line bg-surface p-6 text-muted">{r.notDone}</p>;
  } else if (report?.status === "listo" && report.content) {
    const content = report.content as ReportContent;
    const names = new Map((assessments ?? []).map((a) => [a.id as string, (rl === "en" ? a.name_en : a.name_es) as string]));
    const evals: EvalCard[] = content.evaluations.map((e) => ({
      ...e,
      name: names.get(e.assessment) ?? e.assessment,
      top: topDimensions(content.scores, e.assessment),
    }));
    body = <ReportView lang={rl} content={content} evals={evals} />;
  } else {
    body = <ReportPending lang={rl} programId={programId} status={report?.status ?? "pendiente"} />;
  }

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 md:px-8">
        <Link href={`/m/${id}`} className="text-sm text-muted hover:text-ink">
          ← {r.back}
        </Link>
        <p className="eyebrow mt-6">{r.eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{r.title}</h1>
        <div className="mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-celeste to-opulent" aria-hidden />
        {body}
      </main>
    </div>
  );
}
