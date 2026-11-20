import Link from "next/link";
import type { CountryStat, Filters, FilterOption } from "@/lib/campus";
import { campusText, RIASEC_NAMES, type CampusLang } from "@/lib/i18n-campus";
import { selectCls } from "./filters";

// Filtros al costado (formulario GET: funciona sin JavaScript y la búsqueda queda en la URL)
export function FilterSidebar({
  lang,
  kind,
  f,
  stats,
  areas,
  institutions,
  base,
}: {
  lang: CampusLang;
  kind: "programs" | "universities";
  f: Filters;
  stats: CountryStat[];
  areas?: FilterOption[];
  institutions?: FilterOption[];
  base: string;
}) {
  const c = campusText(lang);
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const countries = stats
    .map((s) => ({ code: s.country_code, name: names.of(s.country_code) ?? s.country_code, n: kind === "programs" ? s.programs : s.universities }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));

  const radio = (name: string, value: string, label: string, checked: boolean) => (
    <label key={`${name}-${value}`} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="accent-[#399ab8]" />
      {label}
    </label>
  );

  return (
    <aside className="lg:sticky lg:top-6 lg:h-fit">
      <details open className="group rounded-2xl border border-line bg-surface p-5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between font-display font-semibold lg:cursor-default">
          {c.filters}
          <span className="text-muted lg:hidden" aria-hidden>
            ▾
          </span>
        </summary>
        <form method="get" action={base} className="mt-4 flex flex-col gap-5">
          <input name="q" defaultValue={f.q ?? ""} placeholder={kind === "programs" ? c.searchPrograms : c.searchUnis} aria-label={c.search} maxLength={80} className={selectCls} />

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.inCountry}</span>
            <select name="pais" defaultValue={f.pais && f.pais !== "todos" ? f.pais.toUpperCase() : "todos"} className={selectCls}>
              <option value="todos">{c.allCountries}</option>
              {countries.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.name} ({x.n.toLocaleString(lang)})
                </option>
              ))}
            </select>
          </label>

          {kind === "programs" && areas ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.area}</span>
              <select name="area" defaultValue={f.area ?? ""} className={selectCls}>
                <option value="">{c.allAreas}</option>
                {areas.map((a) => (
                  <option key={a.v} value={a.v}>
                    {a.v} ({a.n.toLocaleString(lang)})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "universities" && institutions ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.institution}</span>
              <select name="inst" defaultValue={f.inst ?? ""} className={selectCls}>
                <option value="">{c.allInstitutions}</option>
                {institutions.map((a) => (
                  <option key={a.v} value={a.v}>
                    {a.v} ({a.n})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{c.kind}</legend>
            <div className="mt-1.5">
              {radio("tipo", "", c.allKinds, !f.tipo)}
              {radio("tipo", "publica", c.publica, f.tipo === "publica")}
              {radio("tipo", "privada", c.privada, f.tipo === "privada")}
            </div>
          </fieldset>

          {kind === "programs" ? (
            <>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{c.modality}</legend>
                <div className="mt-1.5">
                  {radio("modalidad", "", c.any, !f.modalidad)}
                  {radio("modalidad", "presencial", c.presencial, f.modalidad === "presencial")}
                  {radio("modalidad", "hibrida", c.hibrida, f.modalidad === "hibrida")}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{c.duration}</legend>
                <div className="mt-1.5">
                  {radio("duracion", "", c.any, !f.duracion)}
                  {[3, 4, 5, 6].map((d) => radio("duracion", String(d), c.dur[d], f.duracion === d))}
                </div>
              </fieldset>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                {c.riasecType}
                <select name="riasec" defaultValue={f.riasec ?? ""} className={`${selectCls} mt-1.5 w-full font-normal normal-case tracking-normal text-ink`}>
                  <option value="">{c.any}</option>
                  {["R", "I", "A", "S", "E", "C"].map((l) => (
                    <option key={l} value={l}>
                      {l} · {RIASEC_NAMES[lang][l]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="becas" value="si" defaultChecked={!!f.becas} className="accent-[#399ab8]" />
                {c.scholarshipsOnly}
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                {c.sort}
                <select name="orden" defaultValue={f.orden ?? "afinidad"} className={`${selectCls} mt-1.5 w-full font-normal normal-case tracking-normal text-ink`}>
                  <option value="afinidad">{c.byAffinity}</option>
                  <option value="ranking">{c.byRanking}</option>
                </select>
              </label>
            </>
          ) : (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{c.maxQs}</legend>
              <div className="mt-1.5">
                {radio("qs", "", c.any, !f.qs)}
                {[50, 100, 200, 500, 1000].map((n) => radio("qs", String(n), `Top ${n}`, f.qs === n))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <button className="cursor-pointer rounded-lg bg-opulent px-4 py-2.5 font-display text-sm font-semibold text-white">{c.apply}</button>
            <Link href={base} className="text-center text-sm text-muted hover:text-ink">
              {c.clearFilters}
            </Link>
          </div>
        </form>
      </details>
    </aside>
  );
}
