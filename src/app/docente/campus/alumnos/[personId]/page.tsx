import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList, ChartCard } from "@/components/charts/charts";
import { CampusShell } from "@/app/m/campus/shell";
import { staffCampusStudent } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { isUuid } from "@/lib/staff";
import { requireStaff } from "../../../access";

// Ficha Campus de un alumno: perfil RIASEC, carreras con más afinidad y lo que guardó
export default async function StaffCampusStudent({ params, searchParams }: { params: Promise<{ personId: string }>; searchParams: Promise<{ clase?: string }> }) {
  const [{ personId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(personId)) notFound();
  const [{ me }, { t, lang }] = await Promise.all([requireStaff("campus"), getDict()]);
  const c = campusText(lang);
  const f = await staffCampusStudent(personId);
  if (!f) notFound();
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });
  const hasProfile = Object.keys(f.profile).length > 0;
  const back = `/docente/campus/alumnos${sp.clase && isUuid(sp.clase) ? `?clase=${sp.clase}` : ""}`;

  return (
    <CampusShell me={me} t={t} lang={lang} section="alumnos">
      <Link href={back} className="text-sm text-muted hover:text-ink">
        ← {c.back}
      </Link>
      <section className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-opulent p-7 text-white md:p-9">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-celeste">{c.profile}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            {f.first_name} {f.last_name}
          </h1>
        </div>
        {f.holland ? (
          <div className="text-right">
            <p className="font-display text-5xl font-bold tracking-[0.15em]">{f.holland}</p>
            <p className="mt-1 text-sm text-white/80">{f.holland.split("").map((l) => RIASEC_NAMES[lang][l]).join(" · ")}</p>
          </div>
        ) : null}
      </section>

      {!hasProfile ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-6 text-muted">{c.noProfileStaff}</p>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ChartCard title={c.profile} sub="T 50 = promedio">
            <BarList
              data={["R", "I", "A", "S", "E", "C"]
                .map((l) => ({ l, t: Number(f.profile[l] ?? 0) }))
                .sort((a, b) => b.t - a.t)
                .map(({ l, t: v }) => ({ label: `${l} · ${RIASEC_NAMES[lang][l]}`, value: Math.max(0, v - 20), hint: String(Math.round(v)) }))}
              max={60}
              reference={{ value: 30, label: "T 50" }}
              seeData={c.seeData}
              valueLabel={c.profile}
            />
          </ChartCard>
          <ChartCard title={c.topPrograms} sub={f.country ? c.inCountryOf(names.of(f.country) ?? f.country) : undefined}>
            <ul className="flex flex-col divide-y divide-line">
              {f.top_programs.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <Link href={`/m/campus/carreras?q=${encodeURIComponent(p.name)}`} className="font-medium hover:text-opulent">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {[p.area, `${p.rp}${p.rs ?? ""}`, c.offeredBy(p.universities)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {p.affinity !== null ? <span className="shrink-0 font-display text-lg font-bold text-opulent">{p.affinity}%</span> : null}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">
            {c.savedPrograms} · {f.favorite_programs.length}
          </h2>
          {f.favorite_programs.length ? (
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {f.favorite_programs.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <Link href={`/m/campus/u/${p.university_id}`} className="font-medium hover:text-opulent">
                      {p.name}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {p.university} · {[p.city, names.of(p.country_code)].filter(Boolean).join(", ")} · {c.savedOn(fmt.format(new Date(p.saved_at)))}
                    </span>
                  </span>
                  {p.affinity !== null ? <span className="shrink-0 font-display font-bold text-opulent">{p.affinity}%</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{c.nothingSaved}</p>
          )}
        </section>
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">
            {c.savedUnis} · {f.favorite_universities.length}
          </h2>
          {f.favorite_universities.length ? (
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {f.favorite_universities.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <Link href={`/m/campus/u/${u.id}`} className="font-medium hover:text-opulent">
                      {u.name}
                    </Link>
                    <span className="block text-xs text-muted">
                      {[u.city, names.of(u.country_code)].filter(Boolean).join(", ")} · {c.savedOn(fmt.format(new Date(u.saved_at)))}
                    </span>
                  </span>
                  {u.rank_qs ? <span className="shrink-0 font-mono text-xs text-muted">QS #{u.rank_qs}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{c.nothingSaved}</p>
          )}
        </section>
      </div>
    </CampusShell>
  );
}
