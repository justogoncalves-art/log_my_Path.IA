import { getProgramsForCompare } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/module-access";
import { CampusShell, isCampusStaff } from "../shell";
import { CompareSync } from "./compare-sync";

// Primer número que aparece en un texto libre ("85%", "28000", "£22,000-45,000/yr")
const firstNumber = (s: string | null | undefined) => {
  const m = (s ?? "").replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireModule("campus"), getDict(), searchParams]);
  // Docentes y coordinadores tienen su propia vista de Campus
  if (isCampusStaff(me)) redirect("/docente/campus");
  const c = campusText(lang);
  const ids = (sp.c ?? "").split(",").filter(Boolean).slice(0, 4);
  const rows = await getProgramsForCompare(ids);
  const names = new Intl.DisplayNames([lang], { type: "region" });

  type Row = { label: string; values: (string | null)[]; best?: number | null };
  const pickBest = (nums: (number | null)[], higher: boolean) => {
    const valid = nums.map((n, i) => [n, i] as const).filter((x): x is readonly [number, number] => x[0] !== null);
    if (valid.length < 2) return null;
    return valid.reduce((a, b) => (higher ? (b[0] > a[0] ? b : a) : b[0] < a[0] ? b : a))[1];
  };
  const table: Row[] = [
    { label: c.rows.affinity, values: rows.map((r) => (r.affinity !== null ? `${r.affinity}%` : null)), best: pickBest(rows.map((r) => r.affinity), true) },
    { label: c.rows.university, values: rows.map((r) => r.university.official_name) },
    { label: c.rows.country, values: rows.map((r) => [r.university.city, names.of(r.university.country_code)].filter(Boolean).join(", ")) },
    { label: c.rows.qs, values: rows.map((r) => (r.university.rank_qs ? `#${r.university.rank_qs}` : null)), best: pickBest(rows.map((r) => r.university.rank_qs), false) },
    { label: c.rows.riasec, values: rows.map((r) => (r.riasec_primary ? `${r.riasec_primary}${r.riasec_secondary ?? ""}` : null)) },
    { label: c.rows.type, values: rows.map((r) => r.program_type) },
    { label: c.rows.duration, values: rows.map((r) => (r.duration_years ? c.years(Number(r.duration_years)) : null)) },
    { label: c.rows.modality, values: rows.map((r) => r.modality) },
    { label: c.rows.language, values: rows.map((r) => r.language) },
    { label: c.rows.cost, values: rows.map((r) => r.annual_cost) },
    { label: c.rows.scholarships, values: rows.map((r) => r.scholarships) },
    { label: c.rows.admission, values: rows.map((r) => r.admission) },
    { label: c.rows.employment, values: rows.map((r) => r.employment_rate), best: pickBest(rows.map((r) => firstNumber(r.employment_rate)), true) },
    { label: c.rows.salary, values: rows.map((r) => r.avg_salary) },
  ];

  return (
    <CampusShell me={me} t={t} lang={lang} section="comparar">
      <CompareSync ids={rows.map((r) => r.id)} fromUrl={ids.length > 0} />
      <p className="eyebrow">{c.compare}</p>
      <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.compareTitle}</h1>
      <p className="mt-3 max-w-2xl text-muted">{c.compareLead}</p>

      {rows.length ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-44 border-b border-line p-4" />
                {rows.map((r) => (
                  <th key={r.id} scope="col" className="border-b border-l border-line p-4 text-left align-top">
                    <span className="font-display text-base font-semibold">{r.name}</span>
                    <CompareSync.Remove id={r.id} lang={lang} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="border-b border-line p-4 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className={`border-b border-l border-line p-4 align-top ${row.best === i ? "bg-celeste/10 font-semibold text-opulent" : ""}`}>
                      {v ?? "—"}
                      {row.best === i ? <span className="sr-only"> ({c.best})</span> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-muted">{c.compareEmpty}</p>
      )}
      <p className="mt-4 text-xs text-muted">{c.dataNote}</p>
    </CampusShell>
  );
}
