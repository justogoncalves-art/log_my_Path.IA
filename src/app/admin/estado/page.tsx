import Link from "next/link";
import { ChartCard, ColumnChart, Kpi } from "@/components/charts/charts";
import { createClient } from "@/lib/supabase/server";
import { HealthControls } from "./controls";

// Estado de la plataforma: lo mide la base cada 5 minutos y el servidor suma CPU, RAM y disco.
type M = Record<string, number | boolean | string | null>;
type Health = {
  db: M | null;
  server: M | null;
  series: { at: string; source: "db" | "server"; m: M }[];
  alerts: { id: number; kind: string; level: "aviso" | "critico"; message: string; created_at: string; notified_at: string | null }[];
  security: Record<string, number>;
  slow_queries: { query: string; calls: number; mean_ms: number; total_s: number }[];
  settings: { app_url: string | null; alerts_enabled: boolean };
  cron_ok: boolean | null;
};

const RANGES = { "6": "6 h", "24": "24 h", "168": "7 días" } as const;
const SECURITY: Record<string, string> = {
  share_invalido: "Links de reporte inválidos",
  login_bloqueado: "Logins bloqueados por exceso de intentos",
  recuperar_bloqueado: "Pedidos de recuperar contraseña bloqueados",
  cron_no_autorizado: "Llamadas a tareas programadas sin permiso",
  ping_no_autorizado: "Controles de salud sin token",
};

const nowMs = () => Date.now();
const num = (v: unknown) => (typeof v === "number" ? v : v == null ? null : Number(v));
const pct = (v: unknown) => (num(v) == null ? "—" : `${Math.round(num(v)!)} %`);
const gb = (v: unknown) => (num(v) == null ? "—" : `${(num(v)! / 1e9).toFixed(2)} GB`);

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h } = await searchParams;
  const hours = h && h in RANGES ? Number(h) : 24;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_health", { p_hours: hours });
  const now = nowMs();

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        <h1 className="font-display text-3xl font-bold">Estado de la plataforma</h1>
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-muted">Todavía no hay mediciones: falta aplicar la migración del monitoreo en la base.</p>
      </div>
    );
  }
  const d = data as Health;
  const db = d.db ?? {};
  const sv = d.server ?? {};
  const fresh = d.db?.at ? now - new Date(String(d.db.at)).getTime() < 15 * 60_000 : false;
  const openAlerts = d.alerts.filter((a) => now - new Date(a.created_at).getTime() < 60 * 60_000);
  const status = !fresh ? "sin_datos" : openAlerts.some((a) => a.level === "critico") ? "critico" : openAlerts.length ? "aviso" : "ok";
  const banner = {
    ok: ["bg-ok/10 text-ok border-ok/30", "Todo funciona normalmente"],
    aviso: ["bg-[#b7791f]/10 text-[#8a5a12] border-[#b7791f]/30", `Hay ${openAlerts.length} aviso(s) en la última hora`],
    critico: ["bg-danger/10 text-danger border-danger/30", "Hay alertas críticas en la última hora"],
    sin_datos: ["bg-line/40 text-muted border-line", "Sin mediciones recientes: revisá que la tarea programada de la base esté activa"],
  }[status];

  // Series para los gráficos (cada punto con su hora)
  const timeFmt = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", day: hours > 24 ? "numeric" : undefined, timeZone: "America/Argentina/Buenos_Aires" });
  const series = (source: "db" | "server", key: string, unit = "") =>
    d.series
      .filter((s) => s.source === source && num(s.m[key]) != null)
      .map((s) => ({ label: timeFmt.format(new Date(s.at)), value: num(s.m[key])!, hint: `${Math.round(num(s.m[key])! * 10) / 10}${unit}` }));
  const every = (n: number) => Math.max(1, Math.round(n / 8));
  const charts = [
    { title: "CPU de la base", sub: "% de uso", data: series("server", "cpu_pct", " %"), max: 100 },
    { title: "RAM de la base", sub: "% de uso", data: series("server", "mem_pct", " %"), max: 100 },
    { title: "Usuarios conectados", sub: "Activos en los últimos 5 minutos", data: series("db", "users_5m") },
    { title: "Tiempo de respuesta de la base", sub: "Milisegundos", data: series("server", "db_ms", " ms") },
    { title: "Conexiones a la base", sub: `Máximo ${num(db.conn_max) ?? "—"}`, data: series("db", "conn_total") },
    { title: "Intentos de login fallidos", sub: "En los 15 minutos previos a cada medición", data: series("db", "login_fail_15m") },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Estado de la plataforma</h1>
          <p className="mt-1 text-sm text-muted">
            Medición automática cada 5 minutos.{" "}
            {d.db?.at ? `Última: ${timeFmt.format(new Date(String(d.db.at)))}.` : ""} {d.cron_ok === false ? "La tarea programada falló en las últimas ejecuciones." : ""}
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-line bg-surface p-1 text-sm" aria-label="Período">
          {Object.entries(RANGES).map(([k, label]) => (
            <Link key={k} href={`/admin/estado?h=${k}`} aria-current={Number(k) === hours ? "page" : undefined} className={`rounded-md px-3 py-1.5 ${Number(k) === hours ? "bg-opulent text-white" : "hover:bg-line/40"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <p className={`mt-6 rounded-xl border px-5 py-4 font-display font-semibold ${banner[0]}`}>{banner[1]}</p>

      <h2 className="mt-8 font-display text-lg font-semibold">Servidor de la base</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        <Kpi label="CPU" value={pct(sv.cpu_pct)} sub={num(sv.cores) ? `${sv.cores} núcleos` : undefined} />
        <Kpi label="RAM" value={pct(sv.mem_pct)} sub={num(sv.mem_total_bytes) ? `de ${gb(sv.mem_total_bytes)}` : undefined} />
        <Kpi label="Disco" value={pct(sv.disk_pct)} sub={num(sv.disk_total_bytes) ? `de ${gb(sv.disk_total_bytes)}` : undefined} />
        <Kpi label="Tamaño de la base" value={gb(db.db_bytes)} />
        <Kpi label="Respuesta de la base" value={num(sv.db_ms) == null ? "—" : `${sv.db_ms} ms`} sub={sv.db_ok === false ? "No respondió" : undefined} />
        <Kpi label="Respuesta del login" value={num(sv.auth_ms) == null ? "—" : `${sv.auth_ms} ms`} sub={sv.auth_ok === false ? "No respondió" : undefined} />
        <Kpi label="Conexiones" value={`${num(db.conn_total) ?? "—"}`} sub={`${num(db.conn_active) ?? 0} activas de ${num(db.conn_max) ?? "—"}`} />
        <Kpi label="Caché" value={num(db.cache_hit) == null ? "—" : `${db.cache_hit} %`} sub="Ideal > 99 %" />
      </div>
      {sv.infra_error ? (
        <p className="mt-3 text-sm text-muted">CPU, RAM y disco no disponibles ({String(sv.infra_error)}): Supabase no entregó sus métricas.</p>
      ) : null}

      <h2 className="mt-8 font-display text-lg font-semibold">Uso y seguridad</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        <Kpi label="Conectados ahora" value={`${num(db.users_5m) ?? 0}`} sub="Últimos 5 minutos" />
        <Kpi label="Usuarios hoy" value={`${num(db.users_today) ?? 0}`} />
        <Kpi label="Logins correctos" value={`${num(db.login_ok_15m) ?? 0}`} sub="Últimos 15 min" />
        <Kpi label="Logins fallidos" value={`${num(db.login_fail_15m) ?? 0}`} sub={`Máx. ${num(db.login_top_ip_15m) ?? 0} desde una IP`} />
        <Kpi label="Recuperar contraseña" value={`${num(db.resets_1h) ?? 0}`} sub="Última hora" />
        <Kpi label="Eventos de seguridad" value={`${num(db.security_15m) ?? 0}`} sub="Últimos 15 min" />
        <Kpi label="Consulta más larga" value={`${num(db.long_query_s) ?? 0} s`} />
        <Kpi label="Esperando bloqueos" value={`${num(db.lock_waits) ?? 0}`} />
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Procesos</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
        <Kpi label="Reportes en cola" value={`${num(db.reports_queue) ?? 0}`} sub={`${num(db.reports_error) ?? 0} con error · ${num(db.reports_waiting) ?? 0} esperando`} />
        <Kpi label="Resúmenes de clase en cola" value={`${num(db.class_queue) ?? 0}`} />
        <Kpi label="Gasto IA del mes" value={`US$ ${num(db.ai_month_usd) ?? 0}`} sub={`Tope US$ ${num(db.ai_budget_usd) ?? "—"}`} />
        <Kpi label="Llamadas IA 24 h" value={`${num(db.ai_calls_24h) ?? 0}`} sub={`${num(db.ai_fail_24h) ?? 0} fallidas`} />
        <Kpi label="Mails de bienvenida fallidos" value={`${num(db.welcome_error_24h) ?? 0}`} sub="Últimas 24 h" />
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        {charts.map((c) => (
          <ChartCard key={c.title} title={c.title} sub={c.sub}>
            {c.data.length ? (
              <ColumnChart data={c.data} max={c.max} height={150} seeData="Ver datos" valueLabel={c.title} labelEvery={every(c.data.length)} />
            ) : (
              <p className="text-sm text-muted">Sin mediciones en este período.</p>
            )}
          </ChartCard>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Alertas</h2>
          {d.alerts.length ? (
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {d.alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.level === "critico" ? "bg-danger/10 text-danger" : "bg-[#b7791f]/10 text-[#8a5a12]"}`}>
                    {a.level === "critico" ? "Crítico" : "Aviso"}
                  </span>
                  <span className="text-muted">{timeFmt.format(new Date(a.created_at))}</span>
                  <span className="min-w-0 flex-1">{a.message}</span>
                  <span className="text-xs text-muted">{a.notified_at ? "Avisado por mail" : "Mail pendiente"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Sin alertas.</p>
          )}
        </section>
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Seguridad · últimas 24 h</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {Object.entries(SECURITY).map(([k, label]) => (
              <li key={k} className="flex justify-between gap-4">
                <span>{label}</span>
                <span className="font-display font-semibold">{d.security[k] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Consultas más lentas</h2>
        <p className="mt-1 text-sm text-muted">Promedio por consulta desde el último reinicio de estadísticas de la base.</p>
        {d.slow_queries.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4">Consulta</th>
                  <th className="pr-4 text-right">Llamadas</th>
                  <th className="pr-4 text-right">Promedio</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {d.slow_queries.map((q) => (
                  <tr key={q.query} className="border-t border-line">
                    <td className="max-w-[60ch] truncate py-2 pr-4 font-mono text-xs" title={q.query}>{q.query}</td>
                    <td className="pr-4 text-right">{q.calls}</td>
                    <td className="pr-4 text-right">{q.mean_ms} ms</td>
                    <td className="text-right">{q.total_s} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sin datos.</p>
        )}
      </section>

      <HealthControls appUrl={d.settings.app_url ?? ""} enabled={d.settings.alerts_enabled} />
    </div>
  );
}
