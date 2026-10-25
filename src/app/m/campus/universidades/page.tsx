import Link from "next/link";
import { countryStats, filtersSchema, homeCountry, PAGE_SIZE, searchUniversities } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { selectCls } from "../filters";
import { Pager } from "../pager";
import { CampusShell } from "../shell";

const QS = [50, 100, 200, 500, 1000];

export default async function UniversitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireModule("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const f = filtersSchema.parse(sp);
  const [stats, home] = await Promise.all([countryStats(), homeCountry(me.organizationId)]);
  const country = f.pais === "todos" ? null : (f.pais?.toUpperCase() ?? (stats.some((s) => s.country_code === home) ? home : null));
  const { rows, total, page } = await searchUniversities(f, country);
  const names = new Intl.DisplayNames([lang], { type: "region" });

  return (
    <CampusShell me={me} t={t} lang={lang} section="universidades">
      <p className="eyebrow">{c.universities}</p>
      <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.cardUnisTitle}</h1>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={f.q ?? ""} placeholder={c.searchUnis} aria-label={c.searchUnis} maxLength={80} className={selectCls} />
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
        <select name="tipo" defaultValue={f.tipo ?? ""} aria-label={c.kind} className={selectCls}>
          <option value="">{c.allKinds}</option>
          <option value="publica">{c.publica}</option>
          <option value="privada">{c.privada}</option>
        </select>
        <select name="qs" defaultValue={f.qs ? String(f.qs) : ""} aria-label={c.maxQs} className={selectCls}>
          <option value="">
            {c.maxQs}: {c.any}
          </option>
          {QS.map((n) => (
            <option key={n} value={n}>
              {c.maxQs} {n}
            </option>
          ))}
        </select>
        <button className="cursor-pointer rounded-lg bg-opulent px-5 py-2 font-display text-sm font-semibold text-white">{c.search}</button>
      </form>

      <p className="mt-6 text-sm text-muted">{c.results(total)}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map((u) => (
          <li key={u.id}>
            <Link href={`/m/campus/u/${u.id}`} className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-celeste">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">{u.official_name}</h2>
                  {u.rank_qs ? <span className="shrink-0 rounded-full bg-opulent px-2.5 py-1 font-mono text-[11px] text-white">QS #{u.rank_qs}</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{[u.city, names.of(u.country_code), u.ownership].filter(Boolean).join(" · ")}</p>
              </div>
              <p className="text-sm text-opulent">{c.programsCount(u.programs)} →</p>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="mt-4 rounded-xl border border-line bg-surface p-5 text-muted">{c.noResults}</p> : null}
      <Pager lang={lang} base="/m/campus/universidades" params={{ ...sp, pais: country ?? "todos" }} page={page} total={total} size={PAGE_SIZE} />
    </CampusShell>
  );
}
