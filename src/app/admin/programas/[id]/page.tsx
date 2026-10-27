import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramWithChapters } from "@/lib/admin-data";
import { EXCEL_LANGUAGES } from "@/lib/program-import";
import { VideoLinker } from "./video-linker";

export default async function ProgramDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const program = await getProgramWithChapters(id);
  if (!program) notFound();
  const excelLang = Object.entries(EXCEL_LANGUAGES).find(([, v]) => v === program.language)?.[0] ?? program.language;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link href="/admin/programas" className="text-sm text-muted hover:text-ink">
        ← Programas
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{program.title}</h1>
      <p className="mt-2 text-muted">
        {program.grade}º {program.level} · {program.language} · v{program.version}
        {program.active ? "" : " · versión anterior (inactiva)"}
      </p>

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
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
    </div>
  );
}
