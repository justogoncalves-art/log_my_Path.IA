"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/dal";
import { generateReport } from "@/lib/report";
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
  // Si con este capítulo terminó el programa, el reporte empieza a generarse ya (la base lo verifica)
  const { data: chapter } = await supabase.from("chapters").select("program_id").eq("id", chapterId).maybeSingle();
  if (chapter) {
    const me = await getMe();
    after(() => generateReport(me.personId, chapter.program_id));
  }
  revalidatePath("/m", "layout");
  return { ok: true };
}

export type ReportStatus = "pendiente" | "generando" | "listo" | "error";

// Pide el reporte del programa (si falta o falló) y devuelve en qué estado está.
export async function requestReport(programId: string): Promise<ReportStatus | null> {
  if (!uuid.safeParse(programId).success) return null;
  const me = await getMe();
  const supabase = await createClient();
  const { data: mine } = await supabase.rpc("my_programs", { p_module: null });
  if (!(mine ?? []).some((p: { id: string }) => p.id === programId)) return null;
  const { data } = await supabase
    .from("program_reports")
    .select("status, attempts")
    .eq("person_id", me.personId)
    .eq("program_id", programId)
    .maybeSingle();
  if (data?.status === "listo") return "listo";
  if (!data || data.status === "pendiente" || (data.status === "error" && data.attempts < 3)) {
    after(() => generateReport(me.personId, programId));
    return "generando";
  }
  return data.status as ReportStatus;
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
