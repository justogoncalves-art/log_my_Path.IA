import Link from "next/link";
import { affinityList, countryStats, filtersSchema, hollandCode, homeCountry, myRiasec } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CountrySelect } from "../filters";
import { CampusShell } from "../shell";

export default async function AffinityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireModule("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const f = filtersSchema.parse(sp);
  const [riasec, stats, home] = await Promise.all([myRiasec(), countryStats(), homeCountry(me.organizationId)]);
  const country = f.pais === "todos" ? null : (f.pais?.toUpperCase() ?? (stats.some((s) => s.country_code === home) ? home : null));
  const list = riasec.length ? await affinityList(country, 15) : [];
  const code = hollandCode(riasec);
  const sorted = [...riasec].sort((a, b) => b.t - a.t);

  return (
    <CampusShell me={me} t={t} lang={lang} section="afinidad">
      <p className="eyebrow">{c.fromMento}</p>
      <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.cardAffinityTitle}</h1>

      {!riasec.length ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-7">
          <h2 className="font-display text-xl font-semibold">{c.noProfileTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted">{c.noProfileBody}</p>
          <Link href="/m/mento" className="mt-5 inline-block rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white">
            Mento.IA →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <section className="h-fit rounded-2xl bg-opulent p-6 text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-celeste">{c.yourCode}</span>
            <p className="mt-2 font-display text-5xl font-bold tracking-wider">{code}</p>
            <p className="mt-1 text-sm text-white/75">
              {code
                .split("")
                .map((l) => RIASEC_NAMES[lang][l])
                .join(" · ")}
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {sorted.map((s) => {
                const pct = Math.round(((s.t - 20) / 60) * 100);
                return (
                  <li key={s.letter}>
                    <div className="flex justify-between text-sm">
                      <span>
                        <span className="inline-block w-5 font-mono text-celeste">{s.letter}</span> {RIASEC_NAMES[lang][s.letter]}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
                      <div className="h-full rounded-full bg-celeste" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{c.affinityList}</h2>
              <CountrySelect lang={lang} stats={stats} value={country ?? "todos"} />
            </div>
            <ol className="mt-4 flex flex-col gap-2.5">
              {list.map((r, i) => (
                <li key={r.name}>
                  <Link
                    href={`/m/campus/carreras?q=${encodeURIComponent(r.name)}${country ? `&pais=${country}` : "&pais=todos"}`}
                    className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-celeste"
                  >
                    <span className="w-6 text-center font-display font-bold text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold">{r.name}</span>
                        <span className="rounded-full bg-celeste/15 px-2 py-0.5 font-mono text-[11px] text-opulent">
                          {r.riasec_primary}
                          {r.riasec_secondary ?? ""}
                        </span>
                        <span className="text-xs text-muted">
                          {r.knowledge_area ? `${r.knowledge_area} · ` : ""}
                          {c.offeredBy(r.universities)}
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                        <span className="block h-full rounded-full bg-celeste" style={{ width: `${r.affinity ?? 0}%` }} />
                      </span>
                    </span>
                    <span className="w-14 text-right font-display text-xl font-bold text-opulent">{r.affinity ?? "—"}%</span>
                  </Link>
                </li>
              ))}
            </ol>
            {!list.length ? <p className="mt-4 text-muted">{c.noResults}</p> : null}
            <p className="mt-4 text-xs text-muted">{c.affinityHow}</p>
          </section>
        </div>
      )}
    </CampusShell>
  );
}
