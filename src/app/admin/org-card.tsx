import Link from "next/link";
import type { DashboardOrg } from "@/lib/admin-data";

const KIND: Record<string, string> = { colegio: "Colegio", profesional: "Profesional", particular: "Particular" };

// Tarjeta de organización: avance promedio, alumnos, accesos, actividad y estado de los reportes
export function OrgCard({ o }: { o: DashboardOrg }) {
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const seg = (n: number) => (o.students ? `${(n / o.students) * 100}%` : "0%");
  return (
    <Link href={`/admin/organizaciones/${o.id}/personas`} className="group block rounded-2xl border border-line bg-surface p-5 transition-[border-color,box-shadow] hover:border-celeste hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold">{o.name}</h3>
          <p className="text-sm text-muted">
            {KIND[o.kind] ?? o.kind} · {names.of(o.country) ?? o.country}
            {o.reseller ? ` · ${o.reseller}` : ""}
          </p>
        </div>
        <span className="shrink-0 font-display text-2xl font-bold tabular-nums">{o.avg_pct} %</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" aria-label={`Avance promedio ${o.avg_pct} %`}>
        <div className={`h-full rounded-full ${o.avg_pct >= 100 ? "bg-ok" : "bg-opulent"}`} style={{ width: `${o.avg_pct}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-oat/60 py-2">
          <dt className="text-muted">Alumnos</dt>
          <dd className="font-display text-lg font-bold tabular-nums">{o.students}</dd>
        </div>
        <div className="rounded-lg bg-oat/60 py-2">
          <dt className="text-muted">Con acceso</dt>
          <dd className="font-display text-lg font-bold tabular-nums">{o.with_account}</dd>
        </div>
        <div className="rounded-lg bg-oat/60 py-2">
          <dt className="text-muted">Activos 7 días</dt>
          <dd className="font-display text-lg font-bold tabular-nums">{o.active7}</dd>
        </div>
      </dl>
      {o.students ? (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="bg-ok" style={{ width: seg(o.reports) }} />
            <span className="bg-[#c98a1b]" style={{ width: seg(o.in_progress) }} />
            <span className="bg-[#e5487a]/70" style={{ width: seg(o.not_started) }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              <span className="font-bold text-ok">✓</span> {o.reports} con reporte
            </span>
            <span>
              <span className="font-bold text-[#7a5310]">⌛</span> {o.in_progress} en proceso
            </span>
            <span>
              <span className="font-bold text-[#c2185b]">✗</span> {o.not_started} sin comenzar
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">Todavía sin alumnos cargados.</p>
      )}
    </Link>
  );
}

