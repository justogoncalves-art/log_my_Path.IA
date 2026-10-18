"use client";

import { useState, useTransition } from "react";
import { importPeople } from "@/app/admin/actions";
import { parseImportRows, type ImportResult, type ImportRow } from "@/lib/people-import";
import { readFirstSheet } from "@/lib/xlsx";

type Org = { id: string; name: string; country: string };

const STATUS_LABEL: Record<ImportResult["status"], string> = {
  nuevo: "Nueva",
  existe: "Ya existe",
  aviso: "Revisar",
  error: "Error",
};
const STATUS_STYLE: Record<ImportResult["status"], string> = {
  nuevo: "bg-ok/15 text-ok",
  existe: "bg-celeste/15 text-opulent",
  aviso: "bg-[#c98a1b]/15 text-[#7a5310]",
  error: "bg-danger/10 text-danger",
};

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-celeste";

function maskDoc(doc: string) {
  const d = doc.replace(/[^0-9A-Za-z]/g, "");
  return d.length > 3 ? `•••${d.slice(-3)}` : d;
}

export function AltaPersonas({ orgs, initialOrg }: { orgs: Org[]; initialOrg?: string }) {
  const [org, setOrg] = useState(initialOrg ?? (orgs.length === 1 ? orgs[0].id : ""));
  const [tab, setTab] = useState<"excel" | "una">("excel");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRows([]);
    setResults(null);
    setError(null);
    setSaved(null);
  }

  function preview(next: ImportRow[]) {
    setRows(next);
    setResults(null);
    setSaved(null);
    setError(null);
    startTransition(async () => {
      const res = await importPeople(org, next, false);
      if (res.ok) setResults(res.results);
      else setError(res.error);
    });
  }

  function commit() {
    startTransition(async () => {
      const res = await importPeople(org, rows, true);
      if (!res.ok) return setError(res.error);
      const created = res.results.filter((r) => r.status === "nuevo").length;
      setSaved(`Listo: ${created} personas nuevas y ${res.results.length - created} actualizadas.`);
      setResults(null);
      setRows([]);
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    reset();
    try {
      const sheet = await readFirstSheet(file);
      const { rows: parsed, missing } = parseImportRows(sheet);
      if (missing.length) return setError(`Faltan columnas en el Excel: ${missing.join(", ")}`);
      if (!parsed.length) return setError("El Excel no tiene filas para cargar");
      if (parsed.length > 2000) return setError("Máximo 2000 filas por archivo");
      preview(parsed);
    } catch {
      setError("No pudimos leer el archivo. Tiene que ser un .xlsx");
    }
  }

  function onSingle(form: FormData) {
    const s = (k: string) => String(form.get(k) ?? "").trim();
    preview([
      {
        doc_type: s("doc_type") || undefined,
        doc_number: s("doc_number"),
        first_name: s("first_name"),
        last_name: s("last_name"),
        email: s("email").toLowerCase(),
        role: s("role"),
        class: s("class"),
        sex: s("sex") || undefined,
        birth_date: s("birth_date") || undefined,
        province: s("province") || undefined,
        city: s("city") || undefined,
        guardian_consent: form.get("guardian_consent") === "on",
      },
    ]);
  }

  const counts = results?.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  const errors = counts?.error ?? 0;
  const shown = results?.filter((r) => !onlyProblems || r.status === "error" || r.status === "aviso") ?? [];

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block min-w-64">
          <span className="mb-1.5 block font-display text-sm font-medium">Organización</span>
          <select
            className={inputCls}
            value={org}
            onChange={(e) => {
              setOrg(e.target.value);
              reset();
            }}
          >
            <option value="">Elegí un colegio o profesional</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="Forma de alta" className="flex rounded-full border border-line bg-surface p-1">
          {(
            [
              ["excel", "Desde Excel"],
              ["una", "Una persona"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => {
                setTab(k);
                reset();
              }}
              className={`cursor-pointer rounded-full px-4 py-2 font-display text-sm font-semibold ${
                tab === k ? "bg-opulent text-white" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!org ? (
        <p className="rounded-xl border border-line bg-surface p-5 text-muted">Elegí la organización para empezar.</p>
      ) : tab === "excel" ? (
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Excel del colegio</h2>
          <p className="mt-1 text-sm text-muted">
            Columnas: Dni, Tipo de documento (opcional, DNI por defecto), Nombre, Apellido, Mail, Tipo (Alumno, Docente o
            Coordinador), Clase (un docente puede tener varias separadas por coma), Sexo, Fecha de nacimiento, País,
            Provincia, Ciudad y Consentimiento del tutor (Sí/No).{" "}
            <a href="/plantilla-alta.xlsx" download className="text-celeste underline">
              Descargar plantilla
            </a>
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="mt-4 block text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-opulent file:px-4 file:py-2.5 file:font-display file:text-sm file:font-semibold file:text-white"
          />
        </section>
      ) : (
        <form action={onSingle} className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-6 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-medium">Tipo de documento</span>
            <select name="doc_type" className={inputCls} defaultValue="dni">
              <option value="dni">DNI</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="nie">NIE</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <TextField name="doc_number" label="Número de documento" required />
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-medium">Tipo</span>
            <select name="role" className={inputCls} defaultValue="alumno">
              <option value="alumno">Alumno</option>
              <option value="docente">Docente</option>
              <option value="coordinador">Coordinador</option>
            </select>
          </label>
          <TextField name="first_name" label="Nombre" required />
          <TextField name="last_name" label="Apellido" required />
          <TextField name="email" label="Mail del colegio" type="email" required />
          <TextField name="class" label="Clase (ej. 4ºA)" />
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-medium">Sexo</span>
            <select name="sex" className={inputCls} defaultValue="">
              <option value="">Sin dato</option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
              <option value="otro">Otro</option>
              <option value="no_informa">Prefiere no decir</option>
            </select>
          </label>
          <TextField name="birth_date" label="Fecha de nacimiento" type="date" />
          <TextField name="province" label="Provincia" />
          <TextField name="city" label="Ciudad" />
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" name="guardian_consent" /> Consentimiento del tutor
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-60"
            >
              Revisar
            </button>
          </div>
        </form>
      )}

      {pending ? <p className="text-sm text-muted">Procesando…</p> : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-lg border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          {saved}
        </p>
      ) : null}

      {results ? (
        <section className="rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {(Object.keys(STATUS_LABEL) as ImportResult["status"][]).map((s) =>
                counts?.[s] ? (
                  <span key={s} className={`rounded-full px-3 py-1 font-display font-medium ${STATUS_STYLE[s]}`}>
                    {STATUS_LABEL[s]}: {counts[s]}
                  </span>
                ) : null,
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Ver solo
              errores y avisos
            </label>
          </div>

          <div className="mt-4 max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="border-b border-line px-2 py-2 font-semibold">Fila</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Persona</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Documento</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Tipo y clase</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Estado</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const row = rows[r.row_no - 1];
                  return (
                    <tr key={r.row_no}>
                      <td className="border-b border-line/60 px-2 py-2 text-muted">{r.row_no}</td>
                      <td className="border-b border-line/60 px-2 py-2">
                        <span className="font-semibold">
                          {row?.first_name} {row?.last_name}
                        </span>
                        <span className="block text-xs text-muted">{row?.email}</span>
                      </td>
                      <td className="border-b border-line/60 px-2 py-2 font-mono text-xs">{maskDoc(row?.doc_number ?? "")}</td>
                      <td className="border-b border-line/60 px-2 py-2 capitalize">
                        {row?.role} {row?.class ? `· ${row.class}` : ""}
                      </td>
                      <td className="border-b border-line/60 px-2 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-2 py-2 text-muted">{r.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              onClick={commit}
              disabled={pending || errors > 0}
              className="cursor-pointer rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar alta de {results.length} {results.length === 1 ? "persona" : "personas"}
            </button>
            {errors > 0 ? (
              <p className="text-sm text-danger">Corregí las filas con error en el Excel y volvé a subirlo: no se guarda nada a medias.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TextField({ label, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-sm font-medium">{label}</span>
      <input {...input} className={inputCls} />
    </label>
  );
}
