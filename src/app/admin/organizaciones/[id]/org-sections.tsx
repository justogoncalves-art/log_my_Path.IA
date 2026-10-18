"use client";

import { useMemo, useState } from "react";
import { assignProgram, saveClass, setClassModules, setOrgModule } from "@/app/admin/actions";
import { ActionForm, btnCls, btnGhostCls, inputCls, Label, Result, useAction } from "@/app/admin/ui";
import type { ClassInfo, ModuleInfo, ProgramInfo } from "@/lib/admin-data";

type Mod = { id: string; name: string };

export function ModulesTable({ orgId, modules }: { orgId: string; modules: ModuleInfo[] }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {modules.map((m) => (
        <ActionForm key={m.id} action={setOrgModule} submit="Guardar" className="grid items-end gap-3 rounded-lg border border-line/70 p-3 md:grid-cols-[1.2fr_auto_1fr_1fr_0.7fr_auto]">
          <input type="hidden" name="org" value={orgId} />
          <input type="hidden" name="module" value={m.id} />
          <p className="font-display font-semibold">{m.name}</p>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={m.contract?.active ?? false} /> Activo
          </label>
          <Label text="Desde">
            <input type="date" name="starts" defaultValue={m.contract?.starts_at ?? ""} className={inputCls} />
          </Label>
          <Label text="Hasta">
            <input type="date" name="ends" defaultValue={m.contract?.ends_at ?? ""} className={inputCls} />
          </Label>
          <Label text="Cupos">
            <input type="number" min={0} name="seats" defaultValue={m.contract?.seats ?? ""} className={inputCls} />
          </Label>
        </ActionForm>
      ))}
    </div>
  );
}

export function NewClassForm({ orgId }: { orgId: string }) {
  return (
    <ActionForm action={saveClass} submit="Crear clase" className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_1fr_0.6fr_auto]">
      <input type="hidden" name="org" value={orgId} />
      <ClassFields />
    </ActionForm>
  );
}

function ClassFields({ c }: { c?: ClassInfo }) {
  return (
    <>
      <Label text="Nombre (ej. 4ºA)">
        <input name="name" required maxLength={40} defaultValue={c?.name} className={inputCls} />
      </Label>
      <Label text="Nivel">
        <select name="level" defaultValue={c?.level ?? "secundaria"} className={inputCls}>
          <option value="primaria">Primaria</option>
          <option value="secundaria">Secundaria</option>
        </select>
      </Label>
      <Label text="Año">
        <select name="grade" defaultValue={c?.grade ?? ""} className={inputCls}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((g) => (
            <option key={g} value={g}>
              {g}º
            </option>
          ))}
        </select>
      </Label>
    </>
  );
}

export function ClassCards({ orgId, classes, modules }: { orgId: string; classes: ClassInfo[]; modules: Mod[] }) {
  if (!classes.length) return <p className="mt-4 text-sm text-muted">Todavía no hay clases. Se crean solas al cargar el Excel.</p>;
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {classes.map((c) => (
        <ClassCard key={c.id} orgId={orgId} c={c} modules={modules} />
      ))}
    </div>
  );
}

function ClassCard({ orgId, c, modules }: { orgId: string; c: ClassInfo; modules: Mod[] }) {
  const [selected, setSelected] = useState<string[]>(c.modules);
  const save = useAction();
  const remove = useAction();
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line/70 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{c.name}</h3>
        <span className="text-sm text-muted">
          {c.level ? `${c.level} ${c.grade ?? ""}º · ` : "Sin nivel · "}
          {c.students} personas
        </span>
      </div>
      <ActionForm action={saveClass} submit="Guardar" className="grid items-end gap-3 md:grid-cols-[1fr_1fr_0.7fr_auto]">
        <input type="hidden" name="org" value={orgId} />
        <input type="hidden" name="id" value={c.id} />
        <ClassFields c={c} />
      </ActionForm>

      <div>
        <p className="font-display text-sm font-medium">Módulos de la clase</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {modules.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(m.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
              />
              {m.name}
            </label>
          ))}
          {!modules.length ? <span className="text-sm text-muted">Primero activá módulos para la organización.</span> : null}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button className={btnGhostCls} disabled={save.pending} onClick={() => save.run(() => setClassModules(c.id, selected))}>
            Guardar módulos
          </button>
          <Result result={save.result} />
        </div>
      </div>

      <div>
        <p className="font-display text-sm font-medium">Programas asignados</p>
        {c.programs.length ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {c.programs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {p.title} <span className="text-muted">· {p.language}</span>
                </span>
                <button
                  className="cursor-pointer text-xs text-danger hover:underline"
                  disabled={remove.pending}
                  onClick={() => remove.run(() => assignProgram(p.id, [c.id], false), `¿Quitar "${p.title}" de ${c.name}?`)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Ninguno.</p>
        )}
        <Result result={remove.result} />
      </div>
    </article>
  );
}

export function AssignProgram({ programs, classes, modules }: { programs: ProgramInfo[]; classes: ClassInfo[]; modules: Mod[] }) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [programId, setProgramId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const action = useAction();

  const options = programs.filter((p) => p.module_id === moduleId);
  const program = options.find((p) => p.id === programId);
  const suggested = useMemo(
    () => (program ? classes.filter((c) => c.level === program.level && c.grade === program.grade).map((c) => c.id) : []),
    [program, classes],
  );

  function chooseProgram(id: string) {
    setProgramId(id);
    const p = options.find((x) => x.id === id);
    setPicked(p ? classes.filter((c) => c.level === p.level && c.grade === p.grade).map((c) => c.id) : []);
    action.clear();
  }

  if (!modules.length) return <p className="mt-4 text-sm text-muted">Primero activá algún módulo.</p>;
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[0.6fr_1.4fr]">
        <Label text="Módulo">
          <select
            value={moduleId}
            onChange={(e) => {
              setModuleId(e.target.value);
              chooseProgram("");
            }}
            className={inputCls}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Programa">
          <select value={programId} onChange={(e) => chooseProgram(e.target.value)} className={inputCls}>
            <option value="">{options.length ? "Elegí un programa" : "Este módulo todavía no tiene programas cargados"}</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.level} {p.grade}º · {p.language} · {p.chapters} capítulos
              </option>
            ))}
          </select>
        </Label>
      </div>
      {program ? (
        <div>
          <p className="font-display text-sm font-medium">Clases</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {classes.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  picked.includes(c.id) ? "border-celeste bg-celeste/10" : "border-line"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={picked.includes(c.id)}
                  onChange={(e) => setPicked((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                />
                {c.name}
                {suggested.includes(c.id) ? <span className="text-xs text-celeste">sugerida</span> : null}
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              className={btnCls}
              disabled={action.pending || !picked.length}
              onClick={() => action.run(() => assignProgram(program.id, picked, true))}
            >
              Asignar a {picked.length} {picked.length === 1 ? "clase" : "clases"}
            </button>
            <Result result={action.result} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
