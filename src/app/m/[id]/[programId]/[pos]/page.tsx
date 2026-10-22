import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getDict } from "@/lib/i18n";
import { requireModule } from "@/lib/module-access";
import { signPlayback } from "@/lib/mux";
import { getChapterContent, getChapters, getMyPrograms } from "@/lib/programs";
import { ChapterPlayer } from "./chapter-player";

export default async function ChapterPage({ params }: { params: Promise<{ id: string; programId: string; pos: string }> }) {
  const { id, programId, pos } = await params;
  const position = Number(pos);
  if (!Number.isInteger(position) || position < 1) notFound();

  const [{ me, mod }, { t, lang }] = await Promise.all([requireModule(id), getDict()]);
  const program = (await getMyPrograms(id)).find((x) => x.id === programId);
  if (!program) notFound();

  const chapters = await getChapters(programId, me.personId);
  const idx = chapters.findIndex((c) => c.position === position);
  if (idx < 0) notFound();
  // Los capítulos se hacen en orden
  if (idx > 0 && !chapters[idx - 1].completed && !chapters[idx].completed) redirect(`/m/${id}/${programId}`);

  const content = await getChapterContent(programId, position, me.personId);
  if (!content) notFound();
  const next = chapters[idx + 1];
  // Videos "signed": permiso temporal firmado en el servidor, solo para este video
  const tokens = content.playbackId && content.signed ? signPlayback(content.playbackId) : null;
  const playable = content.playbackId && (!content.signed || tokens) ? content.playbackId : null;

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 md:px-8">
        <Link href={`/m/${id}/${programId}`} className="text-sm text-muted hover:text-ink">
          ← {program.title}
        </Link>
        <p className="eyebrow mt-6">
          {mod.name} · {position} / {chapters.length}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{content.title}</h1>
        <ChapterPlayer
          lang={lang}
          content={{ ...content, playbackId: playable }}
          tokens={tokens}
          programId={programId}
          completed={chapters[idx].completed}
          nextHref={next ? `/m/${id}/${programId}/${next.position}` : `/m/${id}/${programId}`}
          isLast={!next}
          askMid={position === Math.ceil(chapters.length / 2) && !program.mid_rated && chapters.length > 1}
          askFinal={!next && !program.final_rated}
        />
      </main>
    </div>
  );
}
