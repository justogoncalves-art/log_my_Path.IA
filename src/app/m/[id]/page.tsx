import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getDict } from "@/lib/i18n";
import { languageLabel, programText } from "@/lib/i18n-program";
import { getMyModules } from "@/lib/dal";
import { requireModule } from "@/lib/module-access";
import { getChapters, getMyPrograms } from "@/lib/programs";
import { MentoHome } from "./mento-home";

// Punto de entrada de cada módulo: los programas asignados con su avance.
export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ me, mod }, { t, lang }] = await Promise.all([requireModule(id), getDict()]);
  const p = programText(lang);
  const programs = await getMyPrograms(id);
  // Mento.IA: programa principal = el primero sin terminar (o el último si terminó todos)
  const main = id === "mento" ? (programs.find((x) => x.completed < x.chapters) ?? programs[programs.length - 1]) : undefined;
  const [mainChapters, modules] = await Promise.all([
    main ? getChapters(main.id, me.personId) : Promise.resolve([]),
    main && me.organizationId ? getMyModules(me.organizationId) : Promise.resolve([]),
  ]);
  const campusActive = modules.some((m) => m.id === "campus" && m.active);

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto w-full max-w-[1600px] px-5 md:px-10 pb-20 pt-12">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← {p.backHome}
        </Link>
        <p className="eyebrow mt-8">{mod.name}</p>
        <h1 className="mt-3 font-display text-4xl font-bold">{main ? `${t.hello}, ${me.firstName}` : p.myPrograms}</h1>

        {main ? (
          <MentoHome lang={lang} program={main} chapters={mainChapters} others={programs.filter((x) => x.id !== main.id)} campusActive={campusActive} />
        ) : programs.length ? (
          <ul className="mt-10 flex flex-col gap-4">
            {programs.map((pr) => {
              const pct = pr.chapters ? Math.round((pr.completed / pr.chapters) * 100) : 0;
              const label = pr.completed === 0 ? p.start : pr.completed >= pr.chapters ? p.review : p.resume;
              return (
                <li key={pr.id}>
                  <Link
                    href={`/m/${id}/${pr.id}`}
                    className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-celeste"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                        {pr.grade}º · {languageLabel(pr.language)}
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-semibold">{pr.title}</h2>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="h-1.5 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
                          <span className="block h-full bg-celeste" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="text-sm text-muted">{p.progress(pr.completed, pr.chapters)}</span>
                      </div>
                    </div>
                    <span className="rounded-lg bg-opulent px-4 py-2.5 font-display text-sm font-semibold text-white">{label} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-10 rounded-xl border border-line bg-surface p-6 text-muted">{p.noPrograms}</p>
        )}
      </main>
    </div>
  );
}
