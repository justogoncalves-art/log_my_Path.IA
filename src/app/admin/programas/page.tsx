import Link from "next/link";
import { dimensionLabels, listModulesAndLanguages, listProgramsDetailed } from "@/lib/admin-data";
import { ProgramImport } from "./program-import";

export default async function ProgramsPage() {
  const [programs, dims, { modules, languages }] = await Promise.all([listProgramsDetailed(), dimensionLabels(), listModulesAndLanguages()]);
  const langName = Object.fromEntries(languages.map((l) => [l.code, l.name_es]));
  const modName = Object.fromEntries(modules.map((m) => [m.id, m.name]));
  const active = programs.filter((p) => p.active);
  const old = programs.length - active.length;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Programas</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Cada idioma es un programa propio con sus videos. Al volver a cargar un programa se crea una versión nueva; las respuestas de la
        anterior se conservan.
      </p>

      <section className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="border-b border-line px-4 py-3 font-semibold">Programa</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Año</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Idioma</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Versión</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Capítulos</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Preguntas</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Videos</th>
            </tr>
          </thead>
          <tbody>
            {active.map((p) => (
              <tr key={p.id}>
                <td className="border-b border-line/60 px-4 py-3">
                  <Link href={`/admin/programas/${p.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {p.title}
                  </Link>
                  <span className="block text-xs text-muted">
                    {modName[p.module_id] ?? p.module_id} · {p.code}
                  </span>
                </td>
                <td className="border-b border-line/60 px-4 py-3">
                  {p.grade}º {p.level}
                </td>
                <td className="border-b border-line/60 px-4 py-3">{langName[p.language] ?? p.language}</td>
                <td className="border-b border-line/60 px-4 py-3">v{p.version}</td>
                <td className="border-b border-line/60 px-4 py-3">{p.chapters}</td>
                <td className="border-b border-line/60 px-4 py-3">{p.questions}</td>
                <td className="border-b border-line/60 px-4 py-3">
                  {p.missingVideos ? (
                    <Link href={`/admin/programas/${p.id}`} className="text-danger underline">
                      Faltan {p.missingVideos}
                    </Link>
                  ) : (
                    <span className="text-ok">Completos</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {old ? <p className="px-4 py-3 text-xs text-muted">{old} versiones anteriores guardadas (no se muestran).</p> : null}
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Cargar programa desde Excel</h2>
        <ProgramImport dims={dims} modules={modules} languages={languages} existing={active.map((p) => ({ code: p.code, title: p.title, module_id: p.module_id, level: p.level, grade: p.grade }))} />
      </section>
    </div>
  );
}
