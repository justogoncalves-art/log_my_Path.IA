import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { favoriteItems, myFavorites, universityPhoto } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CompareButton } from "../compare";
import { FavoriteButton } from "../favorite";
import { CampusShell, isCampusStaff } from "../shell";

// Favoritos del alumno: carreras y universidades que guardó
export default async function FavoritesPage() {
  const [{ me }, { t, lang }] = await Promise.all([requireModule("campus"), getDict()]);
  if (isCampusStaff(me)) redirect("/docente/campus");
  const c = campusText(lang);
  const favs = await myFavorites();
  const { programs, universities } = await favoriteItems(favs);
  const names = new Intl.DisplayNames([lang], { type: "region" });

  return (
    <CampusShell me={me} t={t} lang={lang} section="favoritos">
      <p className="eyebrow">{c.favorites}</p>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{c.favoritesTitle}</h1>
      <p className="mt-2 text-muted">{c.favoritesLead}</p>

      {!programs.length && !universities.length ? (
        <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-muted">{c.favoritesEmpty}</p>
      ) : null}

      {programs.length ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">
            {c.programs} · {programs.length}
          </h2>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {programs.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/m/campus/u/${p.university.id}`} className="font-display font-semibold hover:text-opulent">
                    {p.name}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {p.university.official_name} · {[p.university.city, names.of(p.university.country_code)].filter(Boolean).join(", ")}
                  </p>
                </div>
                {p.affinity !== null ? <span className="font-display text-lg font-bold text-opulent">{p.affinity}%</span> : null}
                <FavoriteButton kind="carrera" id={p.id} saved lang={lang} />
                <CompareButton id={p.id} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {universities.length ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">
            {c.universities} · {universities.length}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {universities.map((u) => (
              <li key={u.id} className="relative">
                <span className="absolute left-3 top-3 z-10">
                  <FavoriteButton kind="universidad" id={u.id} saved lang={lang} variant="overlay" />
                </span>
                <Link href={`/m/campus/u/${u.id}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface hover:border-celeste">
                  <span className="relative block h-32">
                    <Image src={universityPhoto(u.id)} alt="" fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
                  </span>
                  <span className="flex flex-col gap-1 p-4">
                    <span className="font-display font-semibold leading-snug">{u.official_name}</span>
                    <span className="text-sm text-muted">{[u.city, names.of(u.country_code)].filter(Boolean).join(", ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </CampusShell>
  );
}
