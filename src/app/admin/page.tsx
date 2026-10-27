import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AiSettingsForm } from "./ai-settings";

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
  const { data } = await supabase.rpc("admin_ai_overview");
  const ai = (data as AiOverview[] | null)?.[0];
  const spend = Number(ai?.month_spend ?? 0);
  const budget = Number(ai?.monthly_budget_usd ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Resumen</h1>
      <p className="mt-4 text-muted">Las estadísticas por colegio y por reseller llegan en la próxima entrega.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/organizaciones" className="rounded-lg bg-opulent px-4 py-2.5 font-display text-sm font-semibold text-white">
          Organizaciones
        </Link>
        <Link href="/admin/alta" className="rounded-lg border border-line px-4 py-2.5 font-display text-sm font-semibold">
          Alta de personas
        </Link>
      </div>

      {ai ? (
        <section className="mt-12 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-bold">IA · reportes</h2>
            <span className={`text-sm ${ai.reports_enabled ? "text-ok" : "text-danger"}`}>{ai.reports_enabled ? "Activa" : "Pausada"}</span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span>
                Gasto del mes: <strong>US$ {spend.toFixed(2)}</strong> de US$ {budget.toFixed(2)}
              </span>
              <span className="text-muted">{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className={`h-full rounded-full ${pct >= 80 ? "bg-danger" : "bg-celeste"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Al llegar al tope, los reportes nuevos quedan en cola y se generan solos el mes siguiente o cuando subas el tope. Aviso por mail al 80 %.
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[
              ["Listos", ai.ready],
              ["Este mes", ai.month_reports],
              ["En cola", ai.queued],
              ["Generando", ai.generating],
              ["Reintentando", ai.failing],
            ].map(([label, n]) => (
              <div key={label} className="rounded-xl border border-line px-3 py-2">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-display text-xl font-semibold">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">Llamadas a la IA en las últimas 24 h: {ai.last24h_calls} de {ai.daily_max_calls} permitidas.</p>

          <AiSettingsForm enabled={ai.reports_enabled} budget={budget} daily={ai.daily_max_calls} email={ai.alert_email ?? ""} />
        </section>
      ) : null}
    </div>
  );
}
