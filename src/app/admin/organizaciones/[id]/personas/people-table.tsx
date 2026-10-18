"use client";

import { Fragment, useState } from "react";
import {
  changeEmail,
  deletePerson,
  resetPassword,
  setMembershipActive,
  setPersonClasses,
  setPersonModules,
} from "@/app/admin/actions";
import { btnGhostCls, inputCls, Result, useAction } from "@/app/admin/ui";
import type { PersonRow } from "@/lib/admin-data";

type Opt = { id: string; name: string };

const ROLE: Record<PersonRow["role"], string> = { alumno: "Alumno", docente: "Docente", coordinador: "Coordinador", profesional: "Profesional" };

function status(p: PersonRow) {
  if (p.deleted) return { label: "Eliminado", cls: "bg-danger/10 text-danger" };
  if (!p.membership_active) return { label: "De baja", cls: "bg-line text-muted" };
  if (!p.has_account) return { label: "Sin acceso aún", cls: "bg-[#c98a1b]/15 text-[#7a5310]" };
  if (p.must_change_password) return { label: "No ingresó", cls: "bg-celeste/15 text-opulent" };
  return { label: "Activo", cls: "bg-ok/15 text-ok" };
}

function lastSeen(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function PeopleTable({ orgId, rows, classes, modules }: { orgId: string; rows: PersonRow[]; classes: Opt[]; modules: Opt[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="rounded-xl border border-line bg-surface p-5 text-muted">No hay personas con ese filtro.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="border-b border-line px-4 py-3 font-semibold">Persona</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Tipo</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Clase</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Estado</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Última conexión</th>
            <th className="border-b border-line px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const s = status(p);
            const isOpen = open === p.person_id;
            return (
              <Fragment key={p.person_id}>
                <tr className={isOpen ? "bg-oat/60" : undefined}>
                  <td className="border-b border-line/60 px-4 py-3">
                    <span className="font-semibold">
                      {p.last_name}, {p.first_name}
                    </span>
                    <span className="block text-xs text-muted">{p.email}</span>
                  </td>
                  <td className="border-b border-line/60 px-4 py-3">{ROLE[p.role]}</td>
                  <td className="border-b border-line/60 px-4 py-3">{p.role === "docente" ? p.teacher_classes ?? "—" : p.class_name ?? "—"}</td>
                  <td className="border-b border-line/60 px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="border-b border-line/60 px-4 py-3 text-muted">{lastSeen(p.last_seen)}</td>
                  <td className="border-b border-line/60 px-4 py-3 text-right">
                    <button className={btnGhostCls} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.person_id)}>
                      {isOpen ? "Cerrar" : "Acciones"}
                    </button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td colSpan={6} className="border-b border-line bg-oat/40 px-4 py-4">
                      <PersonActions orgId={orgId} p={p} classes={classes} modules={modules} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PersonActions({ orgId, p, classes, modules }: { orgId: string; p: PersonRow; classes: Opt[]; modules: Opt[] }) {
  const a = useAction();
  const currentClasses =
    p.role === "docente"
      ? classes.filter((c) => (p.teacher_classes ?? "").split(", ").includes(c.name)).map((c) => c.id)
      : p.class_id
        ? [p.class_id]
        : [];
  const [cls, setCls] = useState<string[]>(currentClasses);
  const [mods, setMods] = useState<string[]>(p.modules);
  const [email, setEmail] = useState(p.email);

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {p.role === "alumno" || p.role === "docente" ? (
        <div>
          <p className="font-display text-sm font-medium">{p.role === "alumno" ? "Mover de clase" : "Clases del docente"}</p>
          {p.role === "alumno" ? (
            <select value={cls[0] ?? ""} onChange={(e) => setCls([e.target.value])} className={`${inputCls} mt-2`}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={cls.includes(c.id)}
                    onChange={(e) => setCls((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <button className={`${btnGhostCls} mt-2`} disabled={a.pending} onClick={() => a.run(() => setPersonClasses(p.person_id, orgId, cls))}>
            Guardar clase
          </button>
        </div>
      ) : null}

      <div>
        <p className="font-display text-sm font-medium">Módulos extra para esta persona</p>
        <p className="text-xs text-muted">Además de los de su clase.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {modules.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={mods.includes(m.id)}
                onChange={(e) => setMods((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
              />
              {m.name}
            </label>
          ))}
        </div>
        <button className={`${btnGhostCls} mt-2`} disabled={a.pending} onClick={() => a.run(() => setPersonModules(p.person_id, orgId, mods))}>
          Guardar módulos
        </button>
      </div>

      <div>
        <p className="font-display text-sm font-medium">Mail</p>
        <p className="text-xs text-muted">Solo el admin lo cambia. También cambia el mail de ingreso.</p>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-2`} />
        <button
          className={`${btnGhostCls} mt-2`}
          disabled={a.pending || email.trim().toLowerCase() === p.email}
          onClick={() => a.run(() => changeEmail(p.person_id, email), `¿Cambiar el mail de ${p.first_name} a ${email}?`)}
        >
          Cambiar mail
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-span-3">
        {!p.deleted ? (
          <button
            className={btnGhostCls}
            disabled={a.pending}
            onClick={() => a.run(() => resetPassword(p.person_id), `¿Generar una contraseña nueva para ${p.first_name} y mandársela por mail?`)}
          >
            {p.has_account ? "Nueva contraseña por mail" : "Crear acceso y mandar por mail"}
          </button>
        ) : null}
        {!p.deleted ? (
          <button
            className={btnGhostCls}
            disabled={a.pending}
            onClick={() =>
              a.run(
                () => setMembershipActive(p.person_id, orgId, !p.membership_active),
                p.membership_active ? `¿Dar de baja a ${p.first_name} en esta organización? Sus datos se conservan.` : undefined,
              )
            }
          >
            {p.membership_active ? "Dar de baja" : "Reactivar"}
          </button>
        ) : null}
        <button
          className={`${btnGhostCls} ${p.deleted ? "" : "border-danger/40 text-danger"}`}
          disabled={a.pending}
          onClick={() =>
            a.run(
              () => deletePerson(p.person_id, p.deleted),
              p.deleted ? undefined : `¿Eliminar a ${p.first_name} ${p.last_name}? Pierde el acceso a toda la plataforma.`,
            )
          }
        >
          {p.deleted ? "Restaurar" : "Eliminar"}
        </button>
        {a.pending ? <span className="text-sm text-muted">Guardando…</span> : <Result result={a.result} />}
      </div>
    </div>
  );
}
