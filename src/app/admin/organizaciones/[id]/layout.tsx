import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDashboard, getOrg } from "@/lib/admin-data";
import { NavIcon } from "../../nav";
import { Tabs } from "../../tabs";

const KIND: Record<string, string> = { colegio: "Colegio", profesional: "Profesional", particular: "Particular" };

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [org, dash] = await Promise.all([getOrg(id), adminDashboard()]);
  if (!org) notFound();
  const s = dash?.orgs.find((o) => o.id === id);
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const seg = (n: number) => (s?.students ? `${(n / s.students) * 100}%` : "0%");

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link href="/admin/organizaciones" className="text-sm text-muted hover:text-ink">
        ← Organizaciones
      </Link>

      <section className="mt-3 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-opulent text-white [&>svg]:size-6">
              <NavIcon name="orgs" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold text-balance">{org.name}</h1>
              <p className="mt-1 text-muted">
                {KIND[org.kind] ?? org.kind} · {names.of(org.country) ?? org.country}
                {!org.active ? " · Inactiva" : ""}
              </p>
            </div>
          </div>
          <Link
            href={`/admin/organizaciones/nueva?org=${id}&paso=7`}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 font-display text-sm font-medium hover:border-celeste"
          >
            <NavIcon name="revisar" />
            Revisar alta paso a paso
          </Link>
        </div>

        {s ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Alumnos", s.students],
                ["Docentes y coord.", s.staff],
                ["Con acceso", s.with_account],
                ["Activos 7 días", s.active7],
              ].map(([label, n]) => (
                <div key={label} className="rounded-xl bg-oat/60 px-4 py-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">Avance promedio</span>
                <span className="font-display text-2xl font-bold tabular-nums">{s.avg_pct} %</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${s.avg_pct >= 100 ? "bg-ok" : "bg-opulent"}`} style={{ width: `${s.avg_pct}%` }} />
              </div>
              {s.students ? (
                <>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="bg-ok" style={{ width: seg(s.reports) }} />
                    <span className="bg-[#c98a1b]" style={{ width: seg(s.in_progress) }} />
                    <span className="bg-[#e5487a]/70" style={{ width: seg(s.not_started) }} />
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      <span className="font-bold text-ok">✓</span> {s.reports} con reporte
                    </span>
                    <span>
                      <span className="font-bold text-[#7a5310]">⌛</span> {s.in_progress} en proceso
                    </span>
                    <span>
                      <span className="font-bold text-[#c2185b]">✗</span> {s.not_started} sin comenzar
                    </span>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-5">
        <Tabs
          tabs={[
            { href: `/admin/organizaciones/${id}/personas`, label: "Personas", icon: "personas" },
            { href: `/admin/organizaciones/${id}`, label: "Módulos y clases", icon: "clases", exact: true },
            { href: `/admin/organizaciones/${id}/mails`, label: "Mails de bienvenida", icon: "mail" },
            { href: `/admin/alta?org=${id}`, label: "Alta de personas", icon: "alta" },
          ]}
        />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
