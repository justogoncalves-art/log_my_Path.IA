"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

// Acciones del alumno dentro de un programa. La base valida que el programa esté asignado.

export type StudentResult = { ok: true } | { ok: false };

const uuid = z.uuid();

export async function answerQuestion(questionId: string, optionId: string | null, text: string | null): Promise<StudentResult> {
  if (!uuid.safeParse(questionId).success || (optionId !== null && !uuid.safeParse(optionId).success)) return { ok: false };
  if (text !== null && (typeof text !== "string" || text.length > 4000)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_answer", { p_question: questionId, p_option: optionId, p_text: text });
  return error ? { ok: false } : { ok: true };
}

export async function completeChapter(chapterId: string, seconds: number): Promise<StudentResult> {
  if (!uuid.safeParse(chapterId).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_chapter_progress", {
    p_chapter: chapterId,
    p_completed: true,
    p_seconds: Math.max(0, Math.min(3600, Math.round(seconds || 0))),
  });
  if (error) return { ok: false };
  revalidatePath("/m", "layout");
  return { ok: true };
}

export async function rateProgram(programId: string, moment: "mitad" | "final", rating: number, comment: string): Promise<StudentResult> {
  const parsed = z
    .object({ programId: z.uuid(), moment: z.enum(["mitad", "final"]), rating: z.number().int().min(1).max(5), comment: z.string().max(2000) })
    .safeParse({ programId, moment, rating, comment });
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_program", {
    p_program: programId,
    p_moment: moment,
    p_rating: rating,
    p_comment: rating <= 3 ? comment : null,
  });
  if (error) return { ok: false };
  revalidatePath("/m", "layout");
  return { ok: true };
}

// Latido de conexión: suma como máximo 2 minutos por llamada (lo limita la base)
export async function heartbeat(): Promise<void> {
  const me = await getMe();
  if (!me.organizationId) return;
  const supabase = await createClient();
  await supabase.rpc("heartbeat", { p_org: me.organizationId });
}
