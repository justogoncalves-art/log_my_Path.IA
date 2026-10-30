import Link from "next/link";
import { BarList, ChartCard, Kpi } from "@/components/charts/charts";
import { CampusShell } from "@/app/m/campus/shell";
import { staffCampusClass } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { requireStaff } from "../../access";
import { UrlSelect } from "../../mento/picker";
import { pickClass } from "../class-picker";

// Lo que más le interesa a la clase: tipos RIASEC y favoritos más guardados (sin nombres)
export default async function StaffCampusClass({ searchParams }: { searchParams: Promise<{ clase?: string }> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireStaff("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const { classes, klass } = await pickClass(sp.clase);
  const d = klass ? await staffCampusClass(klass.class_id) : null;
  const names = new Intl.DisplayNames([lang], { type: "region" });

  return (
    <CampusShell me={me} t={t} lang={lang} section="clase">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{c.staffEyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{c.tileClass}</h1>
          <p className="mt-2 text-muted">{c.tileClassBody}</p>
        </div>
        {klass ? (
          <UrlSelect name="clase" label={c.klass} value={klass.class_id} options={classes.map((k) => ({ value: k.class_id, label: `${k.class_name} · ${k.organization_name} (${k.students})` }))} />
        ) : null}
      </div>
      {!d ? (
        <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-muted">{c.noClasses}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Kpi label={c.students} value={String(d.students)} />
            <Kpi label={c.profile} value={String(d.with_profile)} sub={c.classWithProfile(d.with_profile, d.students)} />
            <Kpi label={c.favorites} value={String(d.with_favorites)} sub={c.classWithFavs(d.with_favorites, d.students)} />
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            <ChartCard title={c.classProfile} sub={c.classWithProfile(d.with_profile, d.students)}>
              <BarList
                data={["R", "I", "A", "S", "E", "C"].map((l) => ({ label: `${l} · ${RIASEC_NAMES[lang][l]}`, value: d.holland[l] ?? 0 }))}
                seeData={c.seeData}
                valueLabel={c.classProfile}
              />
            </ChartCard>
            <ChartCard title={c.mostSavedPrograms}>
              {d.top_programs.length ? (
                <BarList
                  data={d.top_programs.map((p) => ({ label: p.name, value: p.n, hint: c.studentsN(p.n) }))}
                  seeData={c.seeData}
                  valueLabel={c.mostSavedPrograms}
                />
              ) : (
                <p className="text-sm text-muted">{c.nothingSaved}</p>
              )}
            </ChartCard>
            <ChartCard title={c.mostSavedUnis}>
              {d.top_universities.length ? (
                <ul className="flex flex-col divide-y divide-line">
                  {d.top_universities.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <Link href={`/m/campus/u/${u.id}`} className="font-medium hover:text-opulent">
                          {u.name}
                        </Link>
                        <span className="block text-xs text-muted">{names.of(u.country_code)}</span>
                      </span>
                      <span className="shrink-0 font-display font-semibold">{c.studentsN(u.n)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{c.nothingSaved}</p>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </CampusShell>
  );
}
