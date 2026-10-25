import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversity } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CompareButton } from "../../compare";
import { CampusShell } from "../../shell";

// Solo links http(s): nunca otro esquema que venga en el Excel
const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export default async function UniversityPage({ params }: { params: Promise<{ uniId: string }> }) {
  const [{ me }, { t, lang }, { uniId }] = await Promise.all([requireModule("campus"), getDict(), params]);
  const c = campusText(lang);
  const data = await getUniversity(uniId);
  if (!data) notFound();
  const { university: u, programs } = data;
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const description = lang === "en" ? (u.description_en ?? u.description_es) : (u.description_es ?? u.description_en);
  const web = safeUrl(u.website);
  const ranks = [
    u.rank_qs ? `QS #${u.rank_qs}` : null,
    u.rank_the ? `THE #${u.rank_the}` : null,
    u.rank_arwu ? `ARWU #${u.rank_arwu}` : null,
    u.rank_national ? `${c.national} #${u.rank_national}` : null,
  ].filter(Boolean);
  const facts: [string, string | null][] = [
    [c.city, [u.city, u.region].filter(Boolean).join(", ") || null],
    [c.kind, u.ownership],
    [c.language, u.instruction_language],
    [c.founded, u.founded ? String(u.founded) : null],
    [c.students, u.students ? Number(u.students).toLocaleString(lang) : null],
    [c.accreditations, u.accreditations],
  ];

  return (
    <CampusShell me={me} t={t} lang={lang} section="universidades">
      <Link href="/m/campus/universidades" className="text-sm text-muted hover:text-ink">
        ← {c.back}
      </Link>
      <section className="mt-4 rounded-2xl bg-opulent p-7 text-white md:p-9">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-celeste">
          {names.of(u.country_code)} {u.short_name ? `· ${u.short_name}` : ""}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{u.official_name}</h1>
        {ranks.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {ranks.map((r) => (
              <span key={r} className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs">
                {r}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {description ? (
            <section>
              <h2 className="font-display text-xl font-bold">{c.about}</h2>
              <p className="mt-3 leading-relaxed text-muted">{description}</p>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">
              {c.programsHere} · {programs.length}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {programs.map((p) => (
                <li key={p.id} className="rounded-xl border border-line bg-surface px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-display font-semibold">{p.name}</span>
                      <p className="mt-0.5 text-sm text-muted">
                        {[p.program_type, p.duration_years ? c.years(Number(p.duration_years)) : null, p.modality, p.knowledge_area].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {p.affinity !== null && p.affinity !== undefined ? <span className="font-display text-lg font-bold text-opulent">{p.affinity}%</span> : null}
                    <CompareButton id={p.id} lang={lang} />
                  </div>
                  {p.description || p.curriculum ? (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-opulent">{c.moreInfo}</summary>
                      {p.description ? <p className="mt-2 leading-relaxed text-muted">{p.description}</p> : null}
                      {p.curriculum ? (
                        <p className="mt-2 text-muted">
                          <span className="font-medium text-ink">{c.programInfo}:</span> {p.curriculum}
                        </p>
                      ) : null}
                      {safeUrl(p.url) ? (
                        <a href={safeUrl(p.url)!} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-opulent underline">
                          {c.website} ↗
                        </a>
                      ) : null}
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-5">
          <dl className="flex flex-col gap-3 text-sm">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
          </dl>
          {web ? (
            <a href={web} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-lg bg-opulent px-4 py-2.5 text-center font-display text-sm font-semibold text-white">
              {c.website} ↗
            </a>
          ) : null}
          <p className="mt-4 text-xs text-muted">{c.dataNote}</p>
        </aside>
      </div>
    </CampusShell>
  );
}
