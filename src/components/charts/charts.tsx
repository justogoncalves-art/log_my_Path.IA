// Gráficos simples en HTML (sin librería): barras finas con punta redondeada, el valor al pasar el mouse
// y siempre una tabla "Ver datos" con los números. Una sola serie: un solo color de la marca.

type Datum = { label: string; value: number; hint?: string };

function DataTable({ data, label, valueLabel }: { data: Datum[]; label: string; valueLabel: string }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs text-muted hover:text-ink">{label}</summary>
      <table className="mt-2 w-full border-collapse text-xs">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td className="border-b border-line/60 py-1 pr-3">{d.label}</td>
              <td className="border-b border-line/60 py-1 text-right font-medium">{d.hint ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">{valueLabel}</span>
    </details>
  );
}

// Columnas verticales (capítulos, días)
export function ColumnChart({ data, max, height = 180, seeData, valueLabel, labelEvery = 1 }: {
  data: Datum[]; max?: number; height?: number; seeData: string; valueLabel: string; labelEvery?: number;
}) {
  const top = Math.max(max ?? 0, ...data.map((d) => d.value), 1);
  return (
    <figure>
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${d.hint ?? d.value}`).join(", ")}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-opulent/85 transition-colors group-hover:bg-celeste"
              style={{ height: `${Math.max((d.value / top) * 100, d.value > 0 ? 2 : 0.5)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {d.label}: {d.hint ?? d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] border-t border-line pt-1.5">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 truncate text-center text-[10px] text-muted">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <DataTable data={data} label={seeData} valueLabel={valueLabel} />
    </figure>
  );
}

// Barras horizontales con etiqueta (dimensiones, opciones)
export function BarList({ data, max, seeData, valueLabel, reference }: {
  data: Datum[]; max?: number; seeData: string; valueLabel: string; reference?: { value: number; label: string };
}) {
  const top = Math.max(max ?? 0, ...data.map((d) => d.value), 1);
  return (
    <figure>
      <ul className="flex flex-col gap-2.5">
        {data.map((d) => (
          <li key={d.label} className="group">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{d.label}</span>
              <span className="shrink-0 font-display font-semibold">{d.hint ?? d.value}</span>
            </div>
            <div className="relative mt-1 h-2 rounded-full bg-line">
              <div className="h-full rounded-full bg-opulent/85 transition-colors group-hover:bg-celeste" style={{ width: `${(d.value / top) * 100}%` }} />
              {reference ? (
                <span className="absolute -top-1 h-4 w-px bg-ink/50" style={{ left: `${(reference.value / top) * 100}%` }} title={reference.label} aria-hidden />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <DataTable data={data} label={seeData} valueLabel={valueLabel} />
    </figure>
  );
}

// Número destacado
export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

export function ChartCard({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
