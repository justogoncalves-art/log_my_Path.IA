import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getDict } from "@/lib/i18n";
import { programText } from "@/lib/i18n-program";
import { requireModule } from "@/lib/module-access";
import { getChapters, getMyPrograms } from "@/lib/programs";

export default async function ProgramPage({ params }: { params: Promise<{ id: string; programId: string }> }) {
  const { id, programId } = await params;
  const [{ me, mod }, { t, lang }] = await Promise.all([requireModule(id), getDict()]);
  const p = programText(lang);
  const program = (await getMyPrograms(id)).find((x) => x.id === programId);
  if (!program) notFound();
  const chapters = await getChapters(programId, me.personId);
  const firstOpen = chapters.find((c) => !c.completed);

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-12 md:px-8">
        <Link href={`/m/${id}`} className="text-sm text-muted hover:text-ink">
          ← {mod.name}
        </Link>
        <p className="eyebrow mt-8">
          {mod.name} · {program.grade}º
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold">{program.title}</h1>
        <p className="mt-3 text-muted">{p.progress(program.completed, program.chapters)}</p>
        {program.completed >= program.chapters && program.chapters > 0 ? (
          <p className="mt-6 rounded-xl border border-ok/30 bg-ok/10 p-4 text-ok">{p.programDone}</p>
        ) : null}

        <ol className="mt-10 flex flex-col gap-3">
          {chapters.map((c, i) => {
            const unlocked = c.completed || i === 0 || chapters[i - 1].completed;
            const inner = (
              <>
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full font-display font-semibold ${
                    c.completed ? "bg-ok/15 text-ok" : unlocked ? "bg-celeste/15 text-opulent" : "bg-line text-muted"
                  }`}
                >
                  {c.completed ? "✓" : c.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-medium">{c.title}</span>
                  <span className="block text-sm text-muted">
                    {p.chapter} {c.position}
                    {c.completed ? ` · ${p.completed}` : unlocked ? "" : ` · ${p.locked}`}
                  </span>
                </span>
                {unlocked ? <span className="text-celeste">→</span> : null}
              </>
            );
            return (
              <li key={c.id}>
                {unlocked ? (
                  <Link
                    href={`/m/${id}/${programId}/${c.position}`}
                    className={`flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors hover:border-celeste ${
                      firstOpen?.id === c.id ? "border-celeste" : "border-line"
                    }`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 rounded-xl border border-line bg-surface/60 p-4 opacity-70">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
