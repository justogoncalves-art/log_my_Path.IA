import Image from "next/image";
import Link from "next/link";
import { countryFilter, countryStats, filterOptions, filtersSchema, homeCountry, myFavorites, PAGE_SIZE, searchUniversities, universityPhoto, type UniversityHit } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, type CampusLang } from "@/lib/i18n-campus";
import { requireCampus } from "@/lib/campus-access";
import { Pager } from "../pager";
import { FavoriteButton } from "../favorite";
import { CampusShell, isCampusStaff } from "../shell";
import { FilterSidebar } from "../sidebar";

export default async function UniversitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireCampus(), getDict(), searchParams]);
  const c = campusText(lang);
  const f = filtersSchema.parse(sp);
  const staff = isCampusStaff(me);
  const [stats, options, home, favs] = await Promise.all([countryStats(), filterOptions(), homeCountry(me.organizationId), staff ? Promise.resolve(null) : myFavorites()]);
  const { rows, total, page } = await searchUniversities(f, home);
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const grouped = !countryFilter(f) && !!home;
  const local = grouped ? rows.filter((r) => r.is_home) : rows;
  const abroad = grouped ? rows.filter((r) => !r.is_home) : [];

  return (
    <CampusShell me={me} t={t} lang={lang} section="universidades">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{c.universities}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{c.cardUnisTitle}</h1>
        </div>
        <p className="text-sm text-muted">{c.results(total)}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr]">
        <FilterSidebar lang={lang} kind="universities" f={f} stats={stats} institutions={options.institutions} base="/m/campus/universidades" />
        <div>
          {grouped && local.length ? <h2 className="mb-3 font-display text-lg font-bold">{c.inHome(names.of(home!) ?? home!)}</h2> : null}
          <Cards rows={local} lang={lang} names={names} favs={favs} />
          {abroad.length ? <h2 className={`mb-3 font-display text-lg font-bold ${local.length ? "mt-8" : ""}`}>{c.abroad}</h2> : null}
          <Cards rows={abroad} lang={lang} names={names} favs={favs} />
          {!rows.length ? <p className="rounded-xl border border-line bg-surface p-5 text-muted">{c.noResults}</p> : null}
          <Pager lang={lang} base="/m/campus/universidades" params={sp} page={page} total={total} size={PAGE_SIZE} />
        </div>
      </div>
    </CampusShell>
  );
}

function Cards({ rows, lang, names, favs }: { rows: UniversityHit[]; lang: CampusLang; names: Intl.DisplayNames; favs: Set<string> | null }) {
  const c = campusText(lang);
  if (!rows.length) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map((u) => (
        <li key={u.id} className="relative">
          {favs ? (
            <span className="absolute left-3 top-3 z-10">
              <FavoriteButton kind="universidad" id={u.id} saved={favs.has(`universidad:${u.id}`)} lang={lang} variant="overlay" />
            </span>
          ) : null}
          <Link href={`/m/campus/u/${u.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-celeste">
            <span className="relative block h-36 shrink-0">
              <Image src={universityPhoto(u.id)} alt="" fill sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-opulent/70 to-transparent" />
              {u.rank_qs ? <span className="absolute right-3 top-3 rounded-full bg-opulent px-2.5 py-1 font-mono text-[11px] text-white">QS #{u.rank_qs}</span> : null}
            </span>
            <span className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="font-display font-semibold leading-snug">{u.official_name}</span>
              <span className="text-sm text-muted">{[u.city, names.of(u.country_code)].filter(Boolean).join(", ")}</span>
              <span className="text-sm text-muted">{u.institution_type ?? u.ownership}</span>
              <span className="mt-auto pt-2 text-sm text-opulent">{c.programsCount(u.programs)} →</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
