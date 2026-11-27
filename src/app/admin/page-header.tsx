import { NavIcon } from "./nav";

// Encabezado común de las pantallas del admin: ícono, título, descripción y acciones a la derecha
export function PageHeader({ icon, eyebrow, title, lead, children }: { icon: string; eyebrow: string; title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-opulent text-white shadow-sm sm:inline-flex [&>svg]:size-6">
          <NavIcon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-balance md:text-4xl">{title}</h1>
          {lead ? <p className="mt-1.5 max-w-3xl text-pretty text-muted">{lead}</p> : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

// Número destacado compacto
export function MiniStat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-[#7a5310]" : tone === "bad" ? "text-[#c2185b]" : "";
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

// Tarjeta de sección con título, bajada opcional y acción
export function Section({ title, lead, action, children, className = "" }: { title: string; lead?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {lead ? <p className="mt-1 max-w-3xl text-sm text-pretty text-muted">{lead}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
