import Link from "next/link";
import { areas, countryStats, filtersSchema, homeCountry, PAGE_SIZE, searchPrograms } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CompareButton } from "../compare";
import { selectCls } from "../filters";
import { Pager } from "../pager";
import { CampusShell } from "../shell";

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireModule("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const f = filtersSchema.parse(sp);
  const [stats, areaList, home] = await Promise.all([countryStats(), areas(), homeCountry(me.organizationId)]);
  const country = f.pais === "todos" ? null : (f.pais?.toUpperCase() ?? (stats.some((s) => s.country_code === home) ? home : null));
  const { rows, total, page } = await searchPrograms(f, country);
  const names = new Intl.DisplayNames([lang], { type: "region" });

  return (
    <CampusShell me={me} t={t} lang={lang} section="carreras">
      <p className="eyebrow">{c.programs}</p>
      <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.cardProgramsTitle}</h1>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={f.q ?? ""} placeholder={c.searchPrograms} aria-label={c.searchPrograms} maxLength={80} className={selectCls} />
        <select name="pais" defaultValue={country ?? "todos"} aria-label={c.inCountry} className={selectCls}>
          <option value="todos">{c.allCountries}</option>
          {stats
            .map((s) => ({ code: s.country_code, name: names.of(s.country_code) ?? s.country_code }))
            .sort((a, b) => a.name.localeCompare(b.name, lang))
            .map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
        </select>
        <select name="area" defaultValue={f.area ?? ""} aria-label={c.area} className={selectCls}>
          <option value="">{c.allAreas}</option>
          {areaList.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={f.tipo ?? ""} aria-label={c.kind} className={selectCls}>
          <option value="">{c.allKinds}</option>
          <option value="publica">{c.publica}</option>
          <option value="privada">{c.privada}</option>
        </select>
        <select name="orden" defaultValue={f.orden ?? "afinidad"} aria-label={c.sort} className={selectCls}>
          <option value="afinidad">{c.byAffinity}</option>
          <option value="ranking">{c.byRanking}</option>
        </select>
        <button className="cursor-pointer rounded-lg bg-opulent px-5 py-2 font-display text-sm font-semibold text-white">{c.search}</button>
      </form>

      <p className="mt-6 text-sm text-muted">{c.results(total)}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">{r.name}</span>
                {r.riasec_primary ? (
                  <span className="rounded-full bg-celeste/15 px-2 py-0.5 font-mono text-[11px] text-opulent">
                    {r.riasec_primary}
                    {r.riasec_secondary ?? ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted">
                <Link href={`/m/campus/u/${r.university_id}`} className="text-ink underline-offset-2 hover:underline">
                  {r.university}
                </Link>
                {" · "}
                {[r.city, names.of(r.country_code), r.program_type, r.duration_years ? c.years(Number(r.duration_years)) : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            {r.affinity !== null ? <span className="font-display text-lg font-bold text-opulent">{r.affinity}%</span> : null}
            <CompareButton id={r.id} lang={lang} />
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="mt-4 rounded-xl border border-line bg-surface p-5 text-muted">{c.noResults}</p> : null}
      <Pager lang={lang} base="/m/campus/carreras" params={{ ...sp, pais: country ?? "todos" }} page={page} total={total} size={PAGE_SIZE} />
    </CampusShell>
  );
}
