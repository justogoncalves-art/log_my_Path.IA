"use client";

import { useState, useTransition } from "react";
import { addDocument, documentUploadUrl, setDocumentActive } from "@/app/admin/actions";

type Doc = { id: string; kind: "guia" | "actividad"; title: string; position: number; language: string | null; size_bytes: number; active: boolean };

const KIND = { guia: "Guía didáctica", actividad: "Actividad de clase" };

// PDF del programa: se atan al código del programa (siguen en las versiones nuevas) y, si se elige, a un idioma.
export function ProgramDocuments({ code, language, docs }: { code: string; language: string; docs: Doc[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"guia" | "actividad">("guia");
  const [onlyLang, setOnlyLang] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const upload = () =>
    start(async () => {
      setMsg(null);
      if (!file || file.type !== "application/pdf" || file.size > 50 * 1024 * 1024) {
        setMsg({ ok: false, text: "Elegí un PDF de hasta 50 MB" });
        return;
      }
      const signed = await documentUploadUrl(code);
      if (!signed.ok) return setMsg({ ok: false, text: signed.error });
      const res = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": "application/pdf", "x-upsert": "false" }, body: file }).catch(() => null);
      if (!res?.ok) return setMsg({ ok: false, text: "No se pudo subir el archivo" });
      const position = docs.filter((d) => d.kind === kind).length + 1;
      const r = await addDocument({ code, language: onlyLang ? language : "", kind, title: title || file.name.replace(/\.pdf$/i, ""), position, size: file.size }, signed.path);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Listo" } : { ok: false, text: r.error });
      if (r.ok) {
        setFile(null);
        setTitle("");
      }
    });

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold">Documentos para el docente</h2>
      <p className="mt-1 text-sm text-muted">
        Los ven automáticamente los docentes de las clases que tienen este programa (pestañas «Guía didáctica» y «Actividades»).
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted">Archivo PDF</span>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted">Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={file?.name.replace(/\.pdf$/i, "") ?? ""} className="rounded-lg border border-line bg-bg px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted">Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as "guia" | "actividad")} className="rounded-lg border border-line bg-bg px-3 py-2">
            <option value="guia">{KIND.guia}</option>
            <option value="actividad">{KIND.actividad}</option>
          </select>
        </label>
        <button onClick={upload} disabled={pending || !file} className="cursor-pointer rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Subiendo…" : "Subir"}
        </button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyLang} onChange={(e) => setOnlyLang(e.target.checked)} />
        Solo para este idioma ({language}). Sin marcar, lo ven todos los idiomas del programa.
      </label>
      <p aria-live="polite" className={`mt-2 text-sm ${msg?.ok ? "text-ok" : "text-danger"}`}>
        {msg?.text}
      </p>
      {docs.length ? (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2">Título</th>
              <th>Tipo</th>
              <th>Idioma</th>
              <th>Tamaño</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className={`border-t border-line ${d.active ? "" : "text-muted line-through"}`}>
                <td className="py-2">
                  <a href={`/api/docs/${d.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-opulent">
                    {d.title}
                  </a>
                </td>
                <td>{KIND[d.kind]}</td>
                <td>{d.language ?? "Todos"}</td>
                <td>{(d.size_bytes / 1024 / 1024).toFixed(1)} MB</td>
                <td className="text-right">
                  <button onClick={() => start(async () => void (await setDocumentActive(d.id, !d.active)))} disabled={pending} className="cursor-pointer text-xs text-opulent hover:underline">
                    {d.active ? "Ocultar" : "Mostrar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
