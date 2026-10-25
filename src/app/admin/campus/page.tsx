import { createClient } from "@/lib/supabase/server";
import { CampusImport } from "./campus-import";

type Stat = { country_code: string; universities: number; programs: number; updated_at: string | null };

export default async function CampusAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_country_stats");
  const stats = (data ?? []) as Stat[];
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const total = stats.reduce((a, s) => ({ u: a.u + s.universities, p: a.p + s.programs }), { u: 0, p: 0 });

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">My Campus.IA</h1>
      <p className="mt-3 max-w-3xl text-muted">
        Subí el Excel de Campus (la misma estructura de 43 columnas), completo o de un solo país. Lo que ya existe se actualiza, lo
        nuevo se agrega y nada se borra. Las notas internas nunca las ve un alumno.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-xl font-bold">Cargar archivo</h2>
        <CampusImport />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">
          Catálogo actual · {total.u} universidades · {total.p} carreras
        </h2>
        {stats.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="border-b border-line px-2 py-2 font-semibold">País</th>
                  <th className="border-b border-line px-2 py-2 text-right font-semibold">Universidades</th>
                  <th className="border-b border-line px-2 py-2 text-right font-semibold">Carreras</th>
                  <th className="border-b border-line px-2 py-2 font-semibold">Última carga</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.country_code}>
                    <td className="border-b border-line/60 px-2 py-2">
                      {names.of(s.country_code) ?? s.country_code} <span className="text-muted">({s.country_code})</span>
                    </td>
                    <td className="border-b border-line/60 px-2 py-2 text-right">{s.universities}</td>
                    <td className="border-b border-line/60 px-2 py-2 text-right">{s.programs}</td>
                    <td className="border-b border-line/60 px-2 py-2 text-muted">
                      {s.updated_at ? new Date(s.updated_at).toLocaleDateString("es-AR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-muted">Todavía no hay datos cargados.</p>
        )}
      </section>
    </div>
  );
}
