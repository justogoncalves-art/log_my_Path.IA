import Link from "next/link";
import { adminDashboard } from "@/lib/admin-data";
import { getMe } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AiSettingsForm } from "./ai-settings";
import { NavIcon } from "./nav";
import { OrgCard } from "./org-card";
import { RunQueueButton } from "./run-queue";

// "Generar reportes en cola ahora" llama a la IA desde esta página (puede tardar unos minutos)
export const maxDuration = 300;

type AiOverview = {
  reports_enabled: boolean;
  monthly_budget_usd: number;
  daily_max_calls: number;
  alert_email: string | null;
  month_spend: number;
  month_reports: number;
  last24h_calls: number;
  queued: number;
  generating: number;
  failing: number;
  ready: number;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const [me, dash, { data }] = await Promise.all([getMe(), adminDashboard(), supabase.rpc("admin_ai_overview")]);
  const ai = (data as AiOverview[] | null)?.[0];
  const spend = Number(ai?.month_spend ?? 0);
  const budget = Number(ai?.monthly_budget_usd ?? 0);
  const aiPct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;

  const orgs = dash?.orgs.filter((o) => o.active) ?? [];
  const students = dash?.totals.students ?? 0;
  // Avance promedio ponderado por la cantidad de alumnos de cada organización
  const avgPct = students ? Math.round(orgs.reduce((a, o) => a + o.avg_pct * o.students, 0) / students) : 0;
  const status = !dash ? null : dash.critical_1h ? "critico" : dash.alerts_1h ? "aviso" : "ok";
  const dayFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administración</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-balance md:text-4xl">Hola, {me.firstName}</h1>
          <p className="mt-1.5 text-muted">Así está la plataforma hoy.</p>
        </div>
        {status ? (
          <Link
            href="/admin/estado"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold ${
              status === "ok" ? "border-ok/30 bg-ok/10 text-ok" : status === "aviso" ? "border-[#c98a1b]/30 bg-[#c98a1b]/10 text-[#7a5310]" : "border-danger/30 bg-danger/10 text-danger"
            }`}
          >
            <span className={`size-2 rounded-full ${status === "ok" ? "bg-ok" : status === "aviso" ? "bg-[#c98a1b]" : "animate-pulse bg-danger"}`} aria-hidden />
            {status === "ok" ? "Plataforma funcionando bien" : status === "aviso" ? `${dash!.alerts_1h} aviso(s) en la última hora` : "Alerta crítica: ver Estado"}
          </Link>
        ) : null}
      </div>

      {/* Números grandes */}
      {dash ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon="orgs" label="Organizaciones" value={dash.totals.orgs} href="/admin/organizaciones" />
          <Stat icon="alta" label="Alumnos" value={students} sub={`${dash.totals.staff} docentes y coordinadores`} />
          <Stat icon="programas" label="Avance promedio" value={`${avgPct} %`} bar={avgPct} />
          <Stat icon="resumen" label="Reportes listos" value={dash.totals.reports} sub={students ? `${Math.round((dash.totals.reports / students) * 100)} % de los alumnos` : undefined} />
          <Stat icon="estado" label="Conectados hoy" value={dash.today} sub={`${dash.totals.active7} activos en 7 días`} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Actividad */}
        {dash ? (
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Actividad</h2>
              <p className="text-sm text-muted">Personas que entraron cada día · últimos 14 días</p>
            </div>
            <ActivityChart data={dash.activity} fmt={(d) => dayFmt.format(new Date(`${d}T12:00:00`))} />
          </section>
        ) : null}

        {/* Accesos rápidos */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-bold">Accesos rápidos</h2>
          <ul className="mt-4 grid gap-2">
            {[
              { href: "/admin/organizaciones/nueva", icon: "orgs", title: "Nueva organización", body: "Alta paso a paso" },
              { href: "/admin/alta", icon: "alta", title: "Alta de personas", body: "Cargar un Excel" },
              { href: "/admin/programas", icon: "programas", title: "Programas", body: "Contenidos, videos y PDF" },
              { href: "/admin/campus", icon: "campus", title: "Campus", body: "Universidades y carreras" },
            ].map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="group flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-celeste hover:bg-celeste/5">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-opulent/10 text-opulent">
                    <NavIcon name={a.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-semibold">{a.title}</span>
                    <span className="block text-xs text-muted">{a.body}</span>
                  </span>
                  <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Organizaciones */}
      {orgs.length ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Organizaciones</h2>
            <Link href="/admin/organizaciones" className="text-sm text-opulent hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {orgs.map((o) => (
              <OrgCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      ) : null}

      {/* IA */}
      {ai ? (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">IA · reportes</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ai.reports_enabled ? "bg-ok/15 text-ok" : "bg-danger/10 text-danger"}`}>
              {ai.reports_enabled ? "Activa" : "Pausada"}
            </span>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex items-center gap-5">
              <Ring pct={aiPct} warn={aiPct >= 80} />
              <div>
                <p className="text-xs text-muted">Gasto del mes</p>
                <p className="font-display text-2xl font-bold tabular-nums">US$ {spend.toFixed(2)}</p>
                <p className="text-sm text-muted">de US$ {budget.toFixed(2)}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              {[
                ["Listos", ai.ready],
                ["Este mes", ai.month_reports],
                ["En cola", ai.queued],
                ["Generando", ai.generating],
                ["Reintentando", ai.failing],
              ].map(([label, n]) => (
                <div key={label} className="rounded-xl bg-oat/60 px-4 py-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 text-xs text-muted">
            Llamadas en las últimas 24 h: {ai.last24h_calls} de {ai.daily_max_calls}. Al llegar al tope, los reportes quedan en cola y se generan solos; aviso por mail al 80 %.
          </p>
          <details className="mt-4 rounded-xl border border-line px-4 py-3">
            <summary className="cursor-pointer font-display text-sm font-semibold">Ajustes de la IA</summary>
            <RunQueueButton />
            <AiSettingsForm enabled={ai.reports_enabled} budget={budget} daily={ai.daily_max_calls} email={ai.alert_email ?? ""} />
          </details>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value, sub, bar, href }: { icon: string; label: string; value: string | number; sub?: string; bar?: number; href?: string }) {
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-opulent/10 text-opulent">
          <NavIcon name={icon} />
        </span>
      </span>
      <span className="mt-3 block font-display text-3xl font-bold tabular-nums">{value}</span>
      {bar !== undefined ? (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full rounded-full bg-celeste" style={{ width: `${bar}%` }} />
        </span>
      ) : null}
      {sub ? <span className="mt-1.5 block text-sm text-muted">{sub}</span> : null}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-celeste`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// Columnas de actividad diaria (14 días: barras anchas, legibles)
function ActivityChart({ data, fmt }: { data: { day: string; users: number }[]; fmt: (d: string) => string }) {
  const top = Math.max(...data.map((d) => d.users), 1);
  return (
    <figure className="mt-5">
      <div className="flex h-40 items-end gap-2" role="img" aria-label={data.map((d) => `${fmt(d.day)}: ${d.users}`).join(", ")}>
        {data.map((d, i) => (
          <div key={d.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[11px] font-semibold tabular-nums text-muted opacity-0 group-hover:opacity-100">{d.users}</span>
            <div
              className={`w-full max-w-10 rounded-t-md transition-colors ${i === data.length - 1 ? "bg-celeste" : "bg-opulent/80 group-hover:bg-opulent"}`}
              style={{ height: `${Math.max((d.users / top) * 100, d.users ? 4 : 1.5)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 truncate text-center text-[10px] text-muted">
            {i % 2 === 0 || i === data.length - 1 ? fmt(d.day) : ""}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">Ver datos</summary>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 text-xs sm:grid-cols-4">
          {data.map((d) => (
            <li key={d.day} className="flex justify-between border-b border-line/60 py-1">
              <span>{fmt(d.day)}</span>
              <span className="font-semibold">{d.users}</span>
            </li>
          ))}
        </ul>
      </details>
    </figure>
  );
}

// Anillo de porcentaje (gasto de IA)
function Ring({ pct, warn }: { pct: number; warn: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${pct} % del tope usado`} className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" strokeWidth="8" className="stroke-line" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 42 42)"
        className={warn ? "stroke-danger" : "stroke-celeste"}
      />
      <text x="42" y="47" textAnchor="middle" className="fill-ink font-display text-sm font-bold">
        {pct}%
      </text>
    </svg>
  );
}
