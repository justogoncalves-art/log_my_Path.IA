"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { wizardSaveClasses, wizardSaveModules, wizardSaveOrg, wizardSavePrograms } from "@/app/admin/actions";
import { btnCls, inputCls, Label } from "@/app/admin/ui";
import type { OrgRow } from "@/lib/admin-data";
import { COUNTRY_CODES } from "@/lib/countries";

const names = new Intl.DisplayNames(["es"], { type: "region" });
const url = (org: string, step: number) => `/admin/organizaciones/nueva?org=${org}&paso=${step}`;

// Botones Anterior / Siguiente al pie de cada paso
export function StepNav({ org, step, canNext, nextHint, nextLabel = "Siguiente", onNext, pending }: {
  org: string; step: number; canNext: boolean; nextHint?: string; nextLabel?: string; onNext?: () => void; pending?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
      {step > 1 ? (
        <Link href={url(org, step - 1)} className="text-sm text-muted hover:text-ink">
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        {!canNext && nextHint ? <span className="text-sm text-muted">{nextHint}</span> : null}
        {onNext ? (
          <button className={btnCls} disabled={!canNext || pending} onClick={onNext}>
            {pending ? "Guardando…" : `${nextLabel} →`}
          </button>
        ) : canNext ? (
          <Link href={url(org, step + 1)} className={btnCls}>
            {nextLabel} →
          </Link>
        ) : (
          <button className={btnCls} disabled>
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorText({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {text}
    </p>
  ) : null;
}

// Paso 1: datos de la organización
export function OrgStep({ resellers, org }: { resellers: Array<{ id: string; name: string }>; org?: OrgRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: org?.name ?? "",
    kind: org?.kind ?? "colegio",
    country: org?.country && (COUNTRY_CODES as readonly string[]).includes(org.country) ? org.country : "",
    reseller: org?.reseller_id ?? "",
  });
  const countries = COUNTRY_CODES.map((c) => ({ c, n: names.of(c) ?? c })).sort((a, b) => a.n.localeCompare(b.n, "es"));

  function next() {
    setError(null);
    start(async () => {
      const res = await wizardSaveOrg({ id: org?.id, name: form.name, kind: form.kind, country: form.country, reseller: form.reseller || undefined });
      if (!res.ok) return setError(res.error);
      router.push(url(res.id, 2));
    });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Organización</h2>
      <p className="mt-1 text-muted">Los datos básicos. El país define el idioma sugerido de los programas y qué universidades ve primero en Campus.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Label text="Nombre">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} className={inputCls} placeholder="Ej. Escuela Internacional…" />
        </Label>
        <Label text="Tipo">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputCls}>
            <option value="colegio">Colegio</option>
            <option value="profesional">Profesional</option>
            <option value="particular">Particular</option>
          </select>
        </Label>
        <Label text="País">
          <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls}>
            <option value="">Elegí el país</option>
            {countries.map(({ c, n }) => (
              <option key={c} value={c}>
                {n} ({c})
              </option>
            ))}
          </select>
        </Label>
        <Label text="Reseller">
          <select value={form.reseller} onChange={(e) => setForm({ ...form, reseller: e.target.value })} className={inputCls}>
            <option value="">Sin reseller</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Label>
      </div>
      <ErrorText text={error} />
      <StepNav org={org?.id ?? ""} step={1} canNext={form.name.trim().length >= 2 && !!form.country} nextHint="Completá el nombre y el país." onNext={next} pending={pending} />
    </div>
  );
}

type ClassRow = { id: string; name: string; level: "primaria" | "secundaria" | null; grade: number | null; students: number };

// Paso 3: nivel y año de cada clase
export function ClassesStep({ org, classes }: { org: string; classes: ClassRow[] }) {
  const router = useRouter();
  // "10mo" llega de la carga como 1º (se adivina por el primer dígito): se deja vacío para elegirlo a mano
  const [rows, setRows] = useState(() =>
    classes.map((c) => (/^\d{2}/.test(c.name) && c.grade === Number(c.name[0]) ? { ...c, grade: null } : c)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const complete = rows.length > 0 && rows.every((r) => r.level && r.grade);
  const set = (id: string, patch: Partial<ClassRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  function next() {
    setError(null);
    start(async () => {
      const res = await wizardSaveClasses(org, rows.map((r) => ({ id: r.id, name: r.name, level: r.level, grade: r.grade })));
      if (!res.ok) return setError(res.error);
      router.push(url(org, 4));
    });
  }

  if (!rows.length) {
    return (
      <>
        <p className="mt-6 rounded-xl border border-line p-5 text-muted">No hay clases todavía: se crean solas con la columna Clase del Excel.</p>
        <StepNav org={org} step={3} canNext={false} nextHint="Volvé a Personas y cargá el Excel." />
      </>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="border-b border-line px-2 py-2 font-semibold">Clase (como vino en el Excel)</th>
              <th className="border-b border-line px-2 py-2 font-semibold">Personas</th>
              <th className="border-b border-line px-2 py-2 font-semibold">Nivel</th>
              <th className="border-b border-line px-2 py-2 font-semibold">Año</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line/60 px-2 py-2">
                  <input value={r.name} maxLength={40} onChange={(e) => set(r.id, { name: e.target.value })} className={inputCls} aria-label="Nombre de la clase" />
                </td>
                <td className="border-b border-line/60 px-2 py-2">{r.students}</td>
                <td className="border-b border-line/60 px-2 py-2">
                  <select value={r.level ?? ""} onChange={(e) => set(r.id, { level: (e.target.value || null) as ClassRow["level"] })} className={inputCls} aria-label="Nivel">
                    <option value="">Elegí</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                  </select>
                </td>
                <td className="border-b border-line/60 px-2 py-2">
                  <select value={r.grade ?? ""} onChange={(e) => set(r.id, { grade: e.target.value ? Number(e.target.value) : null })} className={inputCls} aria-label="Año">
                    <option value="">Elegí</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((g) => (
                      <option key={g} value={g}>
                        {g}º
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Usá el año del sistema de MY PATH: los programas de Mento.IA y Campus se asignan por nivel y año (Campus y EdFin desde 5º de secundaria).</p>
      <ErrorText text={error} />
      <StepNav org={org} step={3} canNext={complete} nextHint="Cada clase necesita nivel y año." onNext={next} pending={pending} />
    </>
  );
}

type ModuleRow = { id: string; name: string; contract: { active: boolean; starts_at: string | null; ends_at: string | null; seats: number | null } | null };
const MIN_GRADE: Record<string, number> = { campus: 5, edfin: 5 };

// Paso 4: módulos contratados, fechas y cupos
export function ModulesStep({ org, students, classIds, minGrade, modules, today, inAYear }: {
  org: string; students: number; classIds: string[]; minGrade: number; modules: ModuleRow[]; today: string; inAYear: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(
    modules.map((m) => ({
      module: m.id,
      name: m.name,
      active: m.contract?.active ?? false,
      starts: m.contract?.starts_at ?? today,
      ends: m.contract?.ends_at ?? inAYear,
      seats: m.contract?.seats ?? students,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (id: string, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r) => (r.module === id ? { ...r, ...patch } : r)));
  const anyActive = rows.some((r) => r.active);

  function next() {
    setError(null);
    start(async () => {
      const res = await wizardSaveModules(
        org,
        rows.map((r) => ({ module: r.module, active: r.active, starts: r.active ? r.starts : null, ends: r.active ? r.ends : null, seats: r.active ? r.seats : null })),
        classIds,
      );
      if (!res.ok) return setError(res.error);
      router.push(url(org, 5));
    });
  }

  return (
    <>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.module} className={`rounded-xl border p-4 ${r.active ? "border-celeste bg-celeste/5" : "border-line"}`}>
            <label className="flex cursor-pointer items-center gap-3 font-display font-semibold">
              <input type="checkbox" checked={r.active} onChange={(e) => set(r.module, { active: e.target.checked })} className="size-4 accent-[#399ab8]" />
              {r.name}
            </label>
            {r.active ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Label text="Desde">
                  <input type="date" value={r.starts} onChange={(e) => set(r.module, { starts: e.target.value })} className={inputCls} />
                </Label>
                <Label text="Hasta">
                  <input type="date" value={r.ends} min={r.starts} onChange={(e) => set(r.module, { ends: e.target.value })} className={inputCls} />
                </Label>
                <Label text="Cupos">
                  <input type="number" min={0} value={r.seats} onChange={(e) => set(r.module, { seats: Number(e.target.value) })} className={inputCls} />
                </Label>
              </div>
            ) : null}
            {r.active && r.seats < students ? <p className="mt-2 text-xs text-[#7a5310]">Hay {students} alumnos y {r.seats} cupos.</p> : null}
            {r.active && MIN_GRADE[r.module] && minGrade < MIN_GRADE[r.module] ? (
              <p className="mt-2 text-xs text-[#7a5310]">Se muestra desde {MIN_GRADE[r.module]}º de secundaria: las clases más chicas no lo van a ver.</p>
            ) : null}
          </div>
        ))}
      </div>
      <ErrorText text={error} />
      <StepNav org={org} step={4} canNext={anyActive} nextHint="Elegí al menos un módulo." onNext={next} pending={pending} />
    </>
  );
}

type Program = { id: string; module_id: string; title: string; level: string; grade: number; language: string; chapters: number; label: string };
type ClassP = { id: string; name: string; level: string | null; grade: number | null; programs: string[] };

// Idioma sugerido según el país
const suggestedLanguage = (country: string) =>
  ["AR", "UY", "PY"].includes(country) ? "es-AR" : country === "ES" ? "es-ES" : ["US", "GB", "IE", "CA", "AU", "NZ"].includes(country) ? "en" : ["BR", "PT"].includes(country) ? "pt" : "es-419";

// Paso 5: programas de cada clase
export function ProgramsStep({ org, country, modules, classes, programs }: { org: string; country: string; modules: Array<{ id: string; name: string }>; classes: ClassP[]; programs: Program[] }) {
  const router = useRouter();
  const lang = suggestedLanguage(country);
  const withPrograms = modules.filter((m) => programs.some((p) => p.module_id === m.id));
  // Arranca con lo asignado; si una clase no tiene nada de un módulo, se propone el programa de su año en el idioma sugerido
  const [chosen, setChosen] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      classes.map((c) => {
        const ids = [...c.programs];
        for (const m of withPrograms) {
          if (ids.some((id) => programs.find((p) => p.id === id)?.module_id === m.id)) continue;
          const match = programs.find((p) => p.module_id === m.id && p.level === c.level && p.grade === c.grade && p.language === lang);
          if (match) ids.push(match.id);
        }
        return [c.id, ids];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (classId: string, programId: string) =>
    setChosen((s) => ({ ...s, [classId]: s[classId].includes(programId) ? s[classId].filter((x) => x !== programId) : [...s[classId], programId] }));
  const allHave = classes.every((c) => chosen[c.id].length > 0);

  function next() {
    setError(null);
    start(async () => {
      const res = await wizardSavePrograms(
        classes.map((c) => ({ classId: c.id, add: chosen[c.id].filter((p) => !c.programs.includes(p)), remove: c.programs.filter((p) => !chosen[c.id].includes(p)) })),
      );
      if (!res.ok) return setError(res.error);
      router.push(url(org, 6));
    });
  }

  if (!withPrograms.length) {
    return (
      <>
        <p className="mt-6 rounded-xl border border-line p-5 text-muted">Los módulos elegidos no tienen programas con capítulos (por ejemplo Campus, que es un catálogo). Podés seguir.</p>
        <StepNav org={org} step={5} canNext />
      </>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {classes.map((c) => (
          <div key={c.id} className="rounded-xl border border-line p-4">
            <p className="font-display font-semibold">
              {c.name} <span className="font-normal text-muted">· {c.level ?? "sin nivel"} {c.grade ? `${c.grade}º` : ""}</span>
            </p>
            {withPrograms.map((m) => {
              const list = programs.filter((p) => p.module_id === m.id);
              const fit = list.filter((p) => p.level === c.level && p.grade === c.grade);
              const others = list.filter((p) => !fit.includes(p));
              return (
                <div key={m.id} className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{m.name}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {[...fit, ...others].map((p) => (
                      <li key={p.id}>
                        <label className={`flex cursor-pointer items-center gap-2 text-sm ${fit.includes(p) ? "" : "text-muted"}`}>
                          <input type="checkbox" checked={chosen[c.id].includes(p.id)} onChange={() => toggle(c.id, p.id)} className="accent-[#399ab8]" />
                          {p.label}
                          <span className="text-xs text-muted">
                            · {p.level} {p.grade}º · {p.chapters} capítulos
                          </span>
                          {p.language === lang && fit.includes(p) ? <span className="rounded-full bg-ok/15 px-2 text-xs text-ok">Sugerido</span> : null}
                          {!fit.includes(p) ? <span className="text-xs">(otro año)</span> : null}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ErrorText text={error} />
      <StepNav org={org} step={5} canNext={allHave} nextHint="Cada clase necesita al menos un programa." onNext={next} pending={pending} />
    </>
  );
}
