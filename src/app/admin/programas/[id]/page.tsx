import { programName } from "@/lib/program-names";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramWithChapters } from "@/lib/admin-data";
import { EXCEL_LANGUAGES } from "@/lib/program-import";
import { createClient } from "@/lib/supabase/server";
import { ProgramDocuments } from "./documents";
import { VideoLinker } from "./video-linker";
import { MiniStat, PageHeader } from "../../page-header";

export default async function ProgramDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const program = await getProgramWithChapters(id);
  if (!program) notFound();
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("program_documents")
    .select("id, kind, title, position, language, size_bytes, active")
    .eq("program_code", program.code)
    .order("kind")
    .order("position");
  const excelLang = Object.entries(EXCEL_LANGUAGES).find(([, v]) => v === program.language)?.[0] ?? program.language;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link href="/admin/programas" className="text-sm text-muted hover:text-ink">
        ← Programas
      </Link>
      <div className="mt-3">
        <PageHeader
          icon="programas"
          eyebrow="Programa"
          title={programName(program.title, program.language)}
          lead={`${program.grade}º ${program.level} · ${program.language} · v${program.version}${program.active ? "" : " · versión anterior (inactiva)"}`}
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Capítulos" value={program.chapters.length} />
        <MiniStat label="Preguntas" value={program.chapters.reduce((a, c) => a + c.questions, 0)} />
        <MiniStat
          label="Videos"
          value={`${program.chapters.filter((c) => c.mux_playback_id).length} de ${program.chapters.length}`}
          tone={program.chapters.every((c) => c.mux_playback_id) ? "ok" : "bad"}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Videos por capítulo</h2>
        <p className="mt-1 text-sm text-muted">
          Trae los videos del entorno MY PATH de Mux y los une por nombre de archivo:{" "}
          <span className="font-mono">
            {program.grade}-{program.title.toLowerCase().replace(/\s+/g, "-")}_{excelLang}_cap1
          </span>
          , <span className="font-mono">…_cap2</span>, etc. Lo que no coincida lo podés elegir a mano.
        </p>
        <VideoLinker
          chapters={program.chapters}
          grade={program.grade}
          title={program.title}
          excelLang={excelLang}
        />
      </section>
      <ProgramDocuments code={program.code} language={program.language} docs={(docs ?? []).filter((d) => !d.language || d.language === program.language)} />
    </div>
  );
}
