"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importCampusBatch } from "@/app/admin/actions";
import { btnCls } from "@/app/admin/ui";
import { campusBatches, parseCampusSheet, type CampusParse } from "@/lib/campus-import";
import { readFirstSheet } from "@/lib/xlsx";

type Totals = { universities_new: number; universities_updated: number; programs_new: number; programs_updated: number };

export function CampusImport() {
  const router = useRouter();
  const [parse, setParse] = useState<CampusParse | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const names = new Intl.DisplayNames(["es"], { type: "region" });

  async function onFile(file: File | undefined) {
    setParse(null);
    setError(null);
    setTotals(null);
    if (!file) return;
    setReading(true);
    try {
      setParse(parseCampusSheet(await readFirstSheet(file, 25 * 1024 * 1024)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer el archivo");
    } finally {
      setReading(false);
    }
  }

  async function upload() {
    if (!parse) return;
    const batches = campusBatches(parse);
    const sum: Totals = { universities_new: 0, universities_updated: 0, programs_new: 0, programs_updated: 0 };
    setError(null);
    setProgress({ done: 0, total: batches.length });
    for (let i = 0; i < batches.length; i++) {
      // Cada tanda es independiente: si una falla se puede volver a subir el archivo y lo ya cargado queda igual
      let res = await importCampusBatch(batches[i]);
      if (!res.ok) res = await importCampusBatch(batches[i]);
      if (!res.ok) {
        setError(`Se cortó en la tanda ${i + 1} de ${batches.length}: ${res.error}. Lo anterior quedó guardado; volvé a subir el archivo para completar.`);
        setTotals(sum);
        setProgress(null);
        router.refresh();
        return;
      }
      sum.universities_new += res.universities_new;
      sum.universities_updated += res.universities_updated;
      sum.programs_new += res.programs_new;
      sum.programs_updated += res.programs_updated;
      setProgress({ done: i + 1, total: batches.length });
    }
    setTotals(sum);
    setProgress(null);
    setParse(null);
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <input
        type="file"
        accept=".xlsx"
        disabled={reading || !!progress}
        onChange={(e) => onFile(e.target.files?.[0])}
        className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-opulent file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-white"
      />
      {reading ? <p className="text-sm text-muted">Leyendo el archivo… (uno grande puede tardar unos segundos)</p> : null}

      {parse ? (
        <div className="flex flex-col gap-3">
          {parse.errors.length ? (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
              <p className="font-semibold">No se puede subir así:</p>
              <ul className="mt-2 list-disc pl-5">
                {parse.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">
              <strong>{parse.universities.length}</strong> universidades y <strong>{parse.programs.length}</strong> carreras en{" "}
              {parse.countries.length} países:{" "}
              <span className="text-muted">
                {parse.countries.map((c) => `${names.of(c.code) ?? c.code} (${c.universities}/${c.programs})`).join(" · ")}
              </span>
            </p>
          )}
          {parse.warnings.length ? (
            <ul className="list-disc rounded-xl border border-[#e3c98f] bg-[#fbf4e4] p-4 pl-8 text-sm text-[#7a5310]">
              {parse.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {!parse.errors.length ? (
            <div>
              <button className={btnCls} onClick={upload} disabled={!!progress}>
                Guardar en Campus
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {progress ? (
        <div role="status" aria-live="polite">
          <p className="text-sm">
            Subiendo tanda {progress.done} de {progress.total}…
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-celeste transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {totals && !error ? (
        <p role="status" className="text-sm text-ok">
          ✓ Listo. Universidades: {totals.universities_new} nuevas, {totals.universities_updated} actualizadas. Carreras:{" "}
          {totals.programs_new} nuevas, {totals.programs_updated} actualizadas. Lo que ya estaba igual no se tocó.
        </p>
      ) : null}
    </div>
  );
}
