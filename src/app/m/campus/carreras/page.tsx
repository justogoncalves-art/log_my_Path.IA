import Image from "next/image";
import Link from "next/link";
import { countryFilter, countryStats, filterOptions, filtersSchema, homeCountry, PAGE_SIZE, searchPrograms, universityPhoto, type ProgramHit } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, type CampusLang } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CompareButton } from "../compare";
import { Pager } from "../pager";
import { CampusShell } from "../shell";
import { FilterSidebar } from "../sidebar";

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireModule("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const f = filtersSchema.parse(sp);
  const [stats, options, home] = await Promise.all([countryStats(), filterOptions(), homeCountry(me.organizationId)]);
  const { rows, total, page } = await searchPrograms(f, home);
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const grouped = !countryFilter(f) && !!home;
  const local = grouped ? rows.filter((r) => r.is_home) : rows;
  const abroad = grouped ? rows.filter((r) => !r.is_home) : [];

  return (
    <CampusShell me={me} t={t} lang={lang} section="carreras">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{c.programs}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{c.cardProgramsTitle}</h1>
        </div>
        <p className="text-sm text-muted">{c.results(total)}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr]">
        <FilterSidebar lang={lang} kind="programs" f={f} stats={stats} areas={options.areas} base="/m/campus/carreras" />
        <div>
          {grouped && local.length ? <GroupTitle text={c.inHome(names.of(home!) ?? home!)} /> : null}
          <Cards rows={local} lang={lang} names={names} />
          {abroad.length ? <GroupTitle text={c.abroad} spaced={local.length > 0} /> : null}
          <Cards rows={abroad} lang={lang} names={names} />
          {!rows.length ? <p className="rounded-xl border border-line bg-surface p-5 text-muted">{c.noResults}</p> : null}
          <Pager lang={lang} base="/m/campus/carreras" params={sp} page={page} total={total} size={PAGE_SIZE} />
        </div>
      </div>
    </CampusShell>
  );
}

function GroupTitle({ text, spaced = false }: { text: string; spaced?: boolean }) {
  return <h2 className={`mb-3 font-display text-lg font-bold ${spaced ? "mt-8" : ""}`}>{text}</h2>;
}

function Cards({ rows, lang, names }: { rows: ProgramHit[]; lang: CampusLang; names: Intl.DisplayNames }) {
  const c = campusText(lang);
  if (!rows.length) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <Link href={`/m/campus/u/${r.university_id}`} className="relative block h-28 shrink-0">
            <Image src={universityPhoto(r.university_id)} alt="" fill sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-opulent/80 to-transparent" />
            {r.affinity !== null ? (
              <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 font-display text-sm font-bold text-opulent">{r.affinity}%</span>
            ) : null}
            <span className="absolute bottom-2 left-3 right-3 truncate text-xs font-medium text-white">{r.university}</span>
          </Link>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold leading-snug">{r.name}</h3>
              {r.riasec_primary ? (
                <span className="shrink-0 rounded-full bg-celeste/15 px-2 py-0.5 font-mono text-[11px] text-opulent">
                  {r.riasec_primary}
                  {r.riasec_secondary ?? ""}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted">
              {[r.city, names.of(r.country_code)].filter(Boolean).join(", ")}
              {r.rank_qs ? ` · QS #${r.rank_qs}` : ""}
            </p>
            <p className="text-sm text-muted">
              {[r.program_type, r.duration_years ? c.years(Number(r.duration_years)) : null, r.knowledge_area].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <Link href={`/m/campus/u/${r.university_id}`} className="text-sm text-opulent hover:underline">
                {c.moreInfo} →
              </Link>
              <CompareButton id={r.id} lang={lang} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
