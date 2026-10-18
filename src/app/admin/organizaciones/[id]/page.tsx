import { getOrg, listPrograms, listResellers, orgClasses, orgModules } from "@/lib/admin-data";
import { OrgForm } from "../org-form";
import { AssignProgram, ClassCards, ModulesTable, NewClassForm } from "./org-sections";

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [org, modules, classes, programs, resellers] = await Promise.all([
    getOrg(id),
    orgModules(id),
    orgClasses(id),
    listPrograms(),
    listResellers(),
  ]);
  const contracted = modules.filter((m) => m.contract?.active).map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Módulos contratados</h2>
        <p className="mt-1 text-sm text-muted">Activá cada módulo con sus fechas y cupos. Después elegí qué clases lo usan.</p>
        <ModulesTable orgId={id} modules={modules} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Asignar programa por curso</h2>
        <p className="mt-1 text-sm text-muted">
          Elegí el programa y las clases. Se marcan solas las clases del mismo año; al asignar, el módulo queda habilitado en esas clases.
        </p>
        <AssignProgram programs={programs.filter((p) => contracted.some((m) => m.id === p.module_id))} classes={classes} modules={contracted} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Clases {new Date().getFullYear()}</h2>
          <p className="text-sm text-muted">{classes.length} clases</p>
        </div>
        <NewClassForm orgId={id} />
        <ClassCards orgId={id} classes={classes} modules={contracted} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Datos de la organización</h2>
        {org ? <OrgForm org={org} resellers={resellers} /> : null}
      </section>
    </div>
  );
}
