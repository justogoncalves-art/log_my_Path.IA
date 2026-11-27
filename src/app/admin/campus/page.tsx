import { createClient } from "@/lib/supabase/server";
import { MiniStat, PageHeader, Section } from "../page-header";
import { CampusImport } from "./campus-import";

type Stat = { country_code: string; universities: number; programs: number; updated_at: string | null };

export default async function CampusAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_country_stats");
  const stats = ((data ?? []) as Stat[]).sort((a, b) => b.programs - a.programs);
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const total = stats.reduce((a, s) => ({ u: a.u + s.universities, p: a.p + s.programs }), { u: 0, p: 0 });
  const top = Math.max(...stats.map((s) => s.programs), 1);
  const last = stats.map((s) => s.updated_at).filter(Boolean).sort().at(-1);

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <PageHeader
        icon="campus"
        eyebrow="Contenido"
        title="My Campus.IA"
        lead="El catálogo de universidades y carreras. Subí el Excel (43 columnas), completo o de un país: lo que existe se actualiza, lo nuevo se agrega y nada se borra."
      >
        <a href="#cargar" className="inline-flex items-center gap-2 rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:bg-opulent/90">
          + Cargar archivo
        </a>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Universidades" value={total.u.toLocaleString("es")} />
        <MiniStat label="Carreras" value={total.p.toLocaleString("es")} />
        <MiniStat label="Países" value={stats.length} />
        <MiniStat label="Última carga" value={last ? new Date(last).toLocaleDateString("es-AR") : "—"} />
      </div>

      <Section title="Catálogo por país" lead="Carreras cargadas en cada país, de mayor a menor." className="mt-6">
        {stats.length ? (
          <ul className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
            {stats.map((s) => (
              <li key={s.country_code}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">
                    {names.of(s.country_code) ?? s.country_code} <span className="font-mono text-xs text-muted">{s.country_code}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    <strong className="font-display text-sm text-ink">{s.programs.toLocaleString("es")}</strong> carreras · {s.universities} univ.
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                  <div className="h-full rounded-full bg-opulent/85" style={{ width: `${(s.programs / top) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Todavía no hay datos cargados.</p>
        )}
      </Section>

      <div id="cargar" className="mt-6 scroll-mt-6">
        <Section title="Cargar archivo" lead="Las notas internas del Excel nunca las ve un alumno.">
          <CampusImport />
        </Section>
      </div>
    </div>
  );
}
