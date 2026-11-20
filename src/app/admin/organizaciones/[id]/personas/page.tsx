import Link from "next/link";
import { listPeople, orgClasses, orgModules } from "@/lib/admin-data";
import { inputCls } from "@/app/admin/ui";
import { PeopleTable } from "./people-table";

const PAGE_SIZE = 50;

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const filters = {
    q: sp.q?.slice(0, 100) || undefined,
    role: ["alumno", "docente", "coordinador"].includes(sp.rol ?? "") ? sp.rol : undefined,
    classId: /^[0-9a-f-]{36}$/.test(sp.clase ?? "") ? sp.clase : undefined,
    status: ["activos", "inactivos", "todos"].includes(sp.estado ?? "") ? sp.estado : "activos",
    page,
  };
  const [{ rows, total }, classes, modules] = await Promise.all([listPeople(id, filters, PAGE_SIZE), orgClasses(id), orgModules(id)]);
  const contracted = modules.filter((m) => m.contract?.active).map((m) => ({ id: m.id, name: m.name }));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filters.q, rol: filters.role, clase: filters.classId, estado: filters.status })) if (v) u.set(k, v);
    u.set("p", String(p));
    return `?${u.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <form className="grid items-end gap-3 rounded-xl border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block font-display text-sm font-medium">Buscar</span>
          <input name="q" defaultValue={filters.q} placeholder="Nombre, mail o DNI" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-sm font-medium">Tipo</span>
          <select name="rol" defaultValue={filters.role ?? ""} className={inputCls}>
            <option value="">Todos</option>
            <option value="alumno">Alumnos</option>
            <option value="docente">Docentes</option>
            <option value="coordinador">Coordinadores</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-sm font-medium">Clase</span>
          <select name="clase" defaultValue={filters.classId ?? ""} className={inputCls}>
            <option value="">Todas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-sm font-medium">Estado</span>
          <select name="estado" defaultValue={filters.status} className={inputCls}>
            <option value="activos">Activos</option>
            <option value="inactivos">De baja o eliminados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <button className="cursor-pointer rounded-lg bg-opulent px-4 py-2 font-display text-sm font-semibold text-white">Filtrar</button>
      </form>

      <p className="text-sm text-muted">
        {total} {total === 1 ? "persona" : "personas"}
      </p>
      <PeopleTable orgId={id} rows={rows} classes={classes.map((c) => ({ id: c.id, name: c.name }))} modules={contracted} />

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center gap-3 text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="underline">← Anterior</Link> : null}
          <span className="text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={qs(page + 1)} className="underline">Siguiente →</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
