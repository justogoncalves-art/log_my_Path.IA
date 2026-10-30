import Link from "next/link";
import { CampusShell } from "@/app/m/campus/shell";
import { staffCampusStudents } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { requireStaff } from "../../access";
import { UrlSelect } from "../../mento/picker";
import { pickClass } from "../class-picker";

// Alumnos de la clase: código RIASEC y favoritos; clic para ver la ficha
export default async function StaffCampusStudents({ searchParams }: { searchParams: Promise<{ clase?: string; q?: string }> }) {
  const [{ me }, { t, lang }, sp] = await Promise.all([requireStaff("campus"), getDict(), searchParams]);
  const c = campusText(lang);
  const { classes, klass } = await pickClass(sp.clase);
  const students = klass ? await staffCampusStudents(klass.class_id) : [];
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });

  return (
    <CampusShell me={me} t={t} lang={lang} section="alumnos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{c.staffEyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{c.tileStudents}</h1>
          <p className="mt-2 text-muted">{c.tileStudentsBody}</p>
        </div>
        {klass ? (
          <UrlSelect name="clase" label={c.klass} value={klass.class_id} options={classes.map((k) => ({ value: k.class_id, label: `${k.class_name} · ${k.organization_name} (${k.students})` }))} />
        ) : null}
      </div>
      {!klass ? (
        <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-muted">{c.noClasses}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">{c.colStudent}</th>
                <th className="px-3 py-3">{c.colCode}</th>
                <th className="px-3 py-3 text-right">{c.colFavPrograms}</th>
                <th className="px-3 py-3 text-right">{c.colFavUnis}</th>
                <th className="px-5 py-3 text-right">{c.colLastFav}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.person_id} className="border-t border-line/70 hover:bg-celeste/5">
                  <td className="px-5 py-3">
                    <Link href={`/docente/campus/alumnos/${s.person_id}?clase=${klass.class_id}`} className="font-medium hover:text-opulent">
                      {s.last_name}, {s.first_name} →
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {s.holland ? (
                      <span title={s.holland.split("").map((l) => RIASEC_NAMES[lang][l]).join(" · ")} className="rounded-full bg-celeste/15 px-2.5 py-1 font-mono text-xs font-semibold text-opulent">
                        {s.holland}
                      </span>
                    ) : (
                      <span className="text-muted">{c.noProfile}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-display font-semibold">{s.favorite_programs}</td>
                  <td className="px-3 py-3 text-right font-display font-semibold">{s.favorite_universities}</td>
                  <td className="px-5 py-3 text-right text-muted">{s.last_favorite_at ? fmt.format(new Date(s.last_favorite_at)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CampusShell>
  );
}
