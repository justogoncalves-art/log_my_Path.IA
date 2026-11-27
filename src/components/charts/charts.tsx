import { Icon } from "@/components/icon";

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

// Línea en el tiempo (series largas: mediciones cada pocos minutos). Área suave, último valor destacado,
// valor al pasar el mouse por cada tramo y la tabla "Ver datos".
export function LineChart({ data, max, height = 160, seeData, valueLabel, unit = "" }: {
  data: Datum[]; max?: number; height?: number; seeData: string; valueLabel: string; unit?: string;
}) {
  const values = data.map((d) => d.value);
  const peak = Math.max(...values, 0);
  const top = max ?? (peak > 0 ? niceCeil(peak * 1.15) : 1);
  const W = 1000;
  const n = data.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => height - (Math.min(v, top) / top) * (height - 4) - 2;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const last = data[n - 1];
  const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit}`;
  const avg = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  // Zonas para el mouse: una por punto (o por grupo, si hay muchos)
  const step = Math.max(1, Math.ceil(n / 120));
  const zones = data.filter((_, i) => i % step === 0);
  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span>
          <span className="font-display text-2xl font-bold">{last ? (last.hint ?? fmt(last.value)) : "—"}</span>
          <span className="ml-1.5 text-xs text-muted">última</span>
        </span>
        <span className="text-xs text-muted">Máx. {fmt(peak)} · Prom. {fmt(avg)}</span>
      </div>
      <div className="relative" style={{ height }}>
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ top: `${(1 - f) * 100}%` }}>
            {/* En conteos no tiene sentido una marca fraccionaria (0,5 usuarios) */}
            {unit || Number.isInteger(top * f) ? <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted">{fmt(top * f)}</span> : null}
          </div>
        ))}
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-opulent" role="img" aria-label={`${valueLabel}: última ${last ? fmt(last.value) : "sin datos"}, máximo ${fmt(peak)}`}>
          <path d={area} fill="currentColor" fillOpacity={0.1} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {zones.map((d, i) => {
            const idx = i * step;
            const w = (W / Math.max(zones.length, 1));
            return (
              <rect key={idx} x={Math.max(0, x(idx) - w / 2)} y={0} width={w} height={height} fill="transparent" className="hover:fill-celeste/10">
                <title>{`${d.label}: ${d.hint ?? fmt(d.value)}`}</title>
              </rect>
            );
          })}
        </svg>
        {last ? (
          <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-opulent" style={{ left: `${(x(n - 1) / W) * 100}%`, top: `${(y(last.value) / height) * 100}%` }} />
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor((n - 1) / 2)]?.label}</span>
        <span>{last?.label}</span>
      </div>
      <DataTable data={data} label={seeData} valueLabel={valueLabel} />
    </figure>
  );
}

// Redondea hacia arriba a un número "lindo" para el eje (1, 2, 5, 10, 20, 50…)
function niceCeil(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

// Número destacado
export function Kpi({ label, value, sub, icon, bar }: { label: string; value: string; sub?: string; icon?: string; bar?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon ? (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-opulent/10 text-opulent">
            <Icon name={icon} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      {bar !== undefined ? (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full rounded-full bg-celeste" style={{ width: `${Math.min(bar, 100)}%` }} />
        </span>
      ) : null}
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
