import Link from "next/link";
import { dimensionLabels, listModulesAndLanguages, listProgramsDetailed } from "@/lib/admin-data";
import { programName } from "@/lib/program-names";
import { MiniStat, PageHeader, Section } from "../page-header";
import { ProgramImport } from "./program-import";

export default async function ProgramsPage() {
  const [programs, dims, { modules, languages }] = await Promise.all([listProgramsDetailed(), dimensionLabels(), listModulesAndLanguages()]);
  const langName = Object.fromEntries(languages.map((l) => [l.code, l.name_es]));
  const modName = Object.fromEntries(modules.map((m) => [m.id, m.name]));
  const active = programs.filter((p) => p.active);
  const old = programs.length - active.length;
  const missing = active.reduce((a, p) => a + p.missingVideos, 0);
  const byModule = [...new Set(active.map((p) => p.module_id))].map((m) => ({ id: m, items: active.filter((p) => p.module_id === m) }));

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <PageHeader
        icon="programas"
        eyebrow="Contenido"
        title="Programas"
        lead="Cada idioma es un programa propio con sus videos. Volver a cargar un programa crea una versión nueva; las respuestas de la anterior se conservan."
      >
        <a href="#cargar" className="inline-flex items-center gap-2 rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:bg-opulent/90">
          + Cargar programa
        </a>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Programas activos" value={active.length} sub={old ? `${old} versiones anteriores guardadas` : undefined} />
        <MiniStat label="Capítulos" value={active.reduce((a, p) => a + p.chapters, 0)} sub={`${active.reduce((a, p) => a + p.questions, 0)} preguntas`} />
        <MiniStat label="Videos" value={missing ? `Faltan ${missing}` : "Completos"} tone={missing ? "bad" : "ok"} sub="Capítulos sin video vinculado" />
      </div>

      {byModule.map((g) => (
        <section key={g.id} className="mt-8">
          <h2 className="font-display text-xl font-bold">{modName[g.id] ?? g.id}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {g.items.map((p) => {
              const withVideo = p.chapters - p.missingVideos;
              const pct = p.chapters ? Math.round((withVideo / p.chapters) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/admin/programas/${p.id}`}
                  className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-[border-color,box-shadow] hover:border-celeste hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold leading-snug">{programName(p.title, p.language)}</h3>
                    <span className="shrink-0 rounded-full bg-oat px-2.5 py-0.5 font-mono text-xs">v{p.version}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {p.grade}º {p.level} · {langName[p.language] ?? p.language}
                  </p>
                  <div className="mt-4 flex gap-2 text-center text-xs">
                    <span className="flex-1 rounded-lg bg-oat/60 py-2">
                      <span className="block font-display text-lg font-bold tabular-nums">{p.chapters}</span>
                      <span className="text-muted">capítulos</span>
                    </span>
                    <span className="flex-1 rounded-lg bg-oat/60 py-2">
                      <span className="block font-display text-lg font-bold tabular-nums">{p.questions}</span>
                      <span className="text-muted">preguntas</span>
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Videos</span>
                      <span className={`font-semibold ${p.missingVideos ? "text-[#c2185b]" : "text-ok"}`}>
                        {p.missingVideos ? `Faltan ${p.missingVideos}` : "✓ Completos"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className={`h-full rounded-full ${p.missingVideos ? "bg-[#e5487a]/70" : "bg-ok"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-[11px] text-muted">{p.code}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {!active.length ? <p className="mt-8 rounded-2xl border border-line bg-surface p-6 text-muted">Todavía no hay programas. Cargá el primero con el Excel.</p> : null}

      <div id="cargar" className="mt-10 scroll-mt-6">
        <Section title="Cargar programa desde Excel" lead="El Excel de 55 columnas. Primero ves cómo queda y después confirmás.">
          <ProgramImport dims={dims} modules={modules} languages={languages} existing={active.map((p) => ({ code: p.code, title: p.title, module_id: p.module_id, level: p.level, grade: p.grade }))} />
        </Section>
      </div>
    </div>
  );
}
