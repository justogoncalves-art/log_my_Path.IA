import Link from "next/link";
import { adminDashboard } from "@/lib/admin-data";
import { OrgCard } from "../org-card";

export default async function OrgsPage() {
  const dash = await adminDashboard();
  const orgs = dash?.orgs ?? [];
  const active = orgs.filter((o) => o.active);
  const inactive = orgs.filter((o) => !o.active);
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <p className="eyebrow">Gestión</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Organizaciones</h1>
          <p className="mt-1.5 text-muted">
            {active.length} activas · {dash?.totals.students ?? 0} alumnos. Tocá una para ver sus personas y su avance.
          </p>
        </div>
        <Link href="/admin/organizaciones/nueva" className="rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:bg-opulent/90">
          + Nueva organización
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {active.map((o) => (
          <OrgCard key={o.id} o={o} />
        ))}
      </div>
      {!active.length ? <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-muted">Todavía no hay organizaciones. Empezá con «Nueva organización».</p> : null}

      {inactive.length ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-muted">Inactivas</h2>
          <div className="mt-4 grid gap-4 opacity-70 md:grid-cols-2 2xl:grid-cols-3">
            {inactive.map((o) => (
              <OrgCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
