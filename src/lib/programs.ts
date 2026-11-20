import "server-only";
import { createClient } from "@/lib/supabase/server";

// Lecturas del alumno sobre sus programas. El contenido (capítulos, preguntas, opciones) lo ve
// cualquier usuario autenticado; las respuestas y el avance, solo la persona (RLS).
// Las ponderaciones de las opciones no se leen nunca desde acá.

export type MyProgram = {
  id: string;
  module_id: string;
  code: string;
  title: string;
  grade: number;
  language: string;
  chapters: number;
  completed: number;
  mid_rated: boolean;
  final_rated: boolean;
};

export async function getMyPrograms(moduleId?: string): Promise<MyProgram[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_programs", { p_module: moduleId ?? null });
  return (data ?? []) as MyProgram[];
}

export type ChapterSummary = { id: string; position: number; title: string; completed: boolean };

// personId: siempre filtrar por la persona (el admin o un coordinador ven filas de otros por RLS)
export async function getChapters(programId: string, personId: string): Promise<ChapterSummary[]> {
  const supabase = await createClient();
  const [{ data: chapters }, { data: progress }] = await Promise.all([
    supabase.from("chapters").select("id, position, title").eq("program_id", programId).order("position"),
    supabase.from("chapter_progress").select("chapter_id, status").eq("person_id", personId),
  ]);
  const done = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.chapter_id));
  return (chapters ?? []).map((c) => ({ id: c.id, position: c.position, title: c.title, completed: done.has(c.id) }));
}

export type ChapterContent = {
  id: string;
  position: number;
  title: string;
  playbackId: string | null;
  signed: boolean;
  questions: Array<{
    id: string;
    position: number;
    kind: "simple" | "abierta";
    prompt: string;
    options: Array<{ id: string; position: number; text: string }>;
    answer: { optionId: string | null; text: string | null } | null;
  }>;
};

export async function getChapterContent(programId: string, position: number, personId: string): Promise<ChapterContent | null> {
  const supabase = await createClient();
  const { data: ch } = await supabase
    .from("chapters")
    .select("id, position, title, mux_playback_id, mux_signed, questions(id, position, kind, prompt, question_options(id, position, text))")
    .eq("program_id", programId)
    .eq("position", position)
    .maybeSingle();
  if (!ch) return null;
  const questions = (ch.questions as unknown as Array<{
    id: string;
    position: number;
    kind: "simple" | "abierta";
    prompt: string;
    question_options: Array<{ id: string; position: number; text: string }>;
  }>).sort((a, b) => a.position - b.position);

  const { data: responses } = questions.length
    ? await supabase
        .from("responses")
        .select("question_id, option_id, text_answer")
        .eq("person_id", personId)
        .in("question_id", questions.map((q) => q.id))
    : { data: [] };
  const byQ = new Map((responses ?? []).map((r) => [r.question_id, r]));

  return {
    id: ch.id,
    position: ch.position,
    title: ch.title,
    playbackId: ch.mux_playback_id,
    signed: ch.mux_signed,
    questions: questions.map((q) => {
      const r = byQ.get(q.id);
      return {
        id: q.id,
        position: q.position,
        kind: q.kind,
        prompt: q.prompt,
        options: [...q.question_options].sort((a, b) => a.position - b.position),
        answer: r ? { optionId: r.option_id, text: r.text_answer } : null,
      };
    }),
  };
}
