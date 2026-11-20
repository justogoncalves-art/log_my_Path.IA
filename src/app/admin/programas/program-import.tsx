"use client";

import { useState, useTransition } from "react";
import { importProgram, type ActionResult } from "@/app/admin/actions";
import { btnCls, inputCls, Label } from "@/app/admin/ui";
import { parseProgramSheet, type ParsedProgram } from "@/lib/program-import";
import { readFirstSheet } from "@/lib/xlsx";

type Existing = { code: string; title: string; module_id: string; level: string; grade: number };
type FileResult = { name: string; parsed: ParsedProgram; language: string; result?: ActionResult };

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export function ProgramImport({
  dims,
  modules,
  languages,
  existing,
}: {
  dims: Record<string, string>;
  modules: Array<{ id: string; name: string }>;
  languages: Array<{ code: string; name_es: string }>;
  existing: Existing[];
}) {
  const [moduleId, setModuleId] = useState("mento");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("secundaria");
  const [grade, setGrade] = useState(6);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [pending, start] = useTransition();
  const uniqueExisting = [...new Map(existing.map((e) => [e.code, e])).values()];

  function pickExisting(c: string) {
    const e = uniqueExisting.find((x) => x.code === c);
    if (!e) return;
    setCode(e.code);
    setTitle(e.title);
    setModuleId(e.module_id);
    setLevel(e.level);
    setGrade(e.grade);
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const out: FileResult[] = [];
    for (const f of Array.from(list).slice(0, 10)) {
      try {
        const parsed = parseProgramSheet(await readFirstSheet(f), dims);
        out.push({ name: f.name, parsed, language: parsed.language ?? "" });
      } catch {
        out.push({ name: f.name, parsed: { language: null, languageRaw: "", programName: "", chapters: [], warnings: [], errors: ["No pudimos leer el archivo (.xlsx)"] }, language: "" });
      }
    }
    setFiles(out);
  }

  const ready = files.length > 0 && files.every((f) => !f.parsed.errors.length && f.language) && code && title;

  function upload() {
    start(async () => {
      const next = [...files];
      for (let i = 0; i < next.length; i++) {
        if (next[i].result?.ok) continue;
        const result = await importProgram({
          module: moduleId,
          code,
          title,
          level,
          grade,
          language: next[i].language,
          chapters: next[i].parsed.chapters,
        });
        next[i] = { ...next[i], result };
        setFiles([...next]);
      }
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Label text="Programa existente (para cargar otro idioma o una versión nueva)">
          <select className={inputCls} defaultValue="" onChange={(e) => pickExisting(e.target.value)}>
            <option value="">Programa nuevo</option>
            {uniqueExisting.map((e) => (
              <option key={e.code} value={e.code}>
                {e.title} · {e.grade}º · {e.code}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Nombre del programa">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!uniqueExisting.some((x) => x.code === code)) setCode(`${moduleId}-y${grade}-${slug(e.target.value)}`);
            }}
            placeholder="Tu Manifiesto"
          />
        </Label>
        <Label text="Código (igual en todos los idiomas)">
          <input className={`${inputCls} font-mono text-sm`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="mento-y6-tu-manifiesto" />
        </Label>
        <Label text="Módulo">
          <select className={inputCls} value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Nivel">
          <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="primaria">Primaria</option>
            <option value="secundaria">Secundaria</option>
          </select>
        </Label>
        <Label text="Año">
          <select className={inputCls} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((g) => (
              <option key={g} value={g}>
                {g}º
              </option>
            ))}
          </select>
        </Label>
      </div>

      <div>
        <span className="font-display text-sm font-medium">Archivos Excel (uno por idioma; podés elegir varios a la vez)</span>
        <input
          type="file"
          multiple
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => onFiles(e.target.files)}
          className="mt-2 block text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-opulent file:px-4 file:py-2.5 file:font-display file:text-sm file:font-semibold file:text-white"
        />
      </div>

      {files.map((f, i) => {
        const nq = f.parsed.chapters.reduce((a, c) => a + c.questions.length, 0);
        const open = f.parsed.chapters.reduce((a, c) => a + c.questions.filter((q) => q.kind === "abierta").length, 0);
        return (
          <article key={f.name} className="rounded-lg border border-line/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display font-semibold">{f.name}</p>
                <p className="text-sm text-muted">
                  {f.parsed.programName || "—"} · {f.parsed.chapters.length} capítulos · {nq} preguntas ({open} abiertas)
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                Idioma
                <select
                  className={`${inputCls} w-56`}
                  value={f.language}
                  onChange={(e) => setFiles((s) => s.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)))}
                >
                  <option value="">Elegí</option>
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name_es}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {f.parsed.chapters.length ? (
              <ol className="mt-3 grid gap-1 text-sm md:grid-cols-2">
                {f.parsed.chapters.map((c) => (
                  <li key={c.position}>
                    <span className="text-muted">{c.position}.</span> {c.title}{" "}
                    <span className="text-xs text-muted">
                      · {c.assessment} · {c.questions.length} preg. · {c.video ? "con video" : <span className="text-danger">sin video</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            {f.parsed.errors.map((e) => (
              <p key={e} className="mt-2 text-sm text-danger">
                {e}
              </p>
            ))}
            {f.parsed.warnings.filter((w) => !w.includes("sin ID de video")).map((w) => (
              <p key={w} className="mt-2 text-sm text-[#7a5310]">
                {w}
              </p>
            ))}
            {f.result ? (
              <p className={`mt-2 text-sm ${f.result.ok ? "text-ok" : "text-danger"}`}>{f.result.ok ? f.result.message : f.result.error}</p>
            ) : null}
          </article>
        );
      })}

      {files.length ? (
        <div className="flex items-center gap-3">
          <button className={btnCls} disabled={!ready || pending} onClick={upload}>
            {pending ? "Cargando…" : `Cargar ${files.length} ${files.length === 1 ? "archivo" : "archivos"}`}
          </button>
          {!code || !title ? <span className="text-sm text-muted">Completá nombre y código.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
