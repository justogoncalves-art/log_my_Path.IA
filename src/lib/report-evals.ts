import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvalCard } from "@/app/m/[id]/[programId]/reporte/report-view";
import type { ReportLang } from "@/lib/i18n-report";
import { programAssessments, topDimensions, type ReportContent } from "@/lib/report";

// Tarjetas de evaluación del reporte: solo las del programa, con nombre y las 3 dimensiones más altas
export async function reportEvals(db: SupabaseClient, content: ReportContent, lang: ReportLang): Promise<EvalCard[]> {
  const { data: assessments } = await db.from("assessments").select("id, name_es, name_en");
  const names = new Map((assessments ?? []).map((a) => [a.id as string, (lang === "en" ? a.name_en : a.name_es) as string]));
  const included = new Set<string>(programAssessments(content.scores));
  return content.evaluations
    .filter((e) => included.has(e.assessment))
    .map((e) => ({ ...e, name: names.get(e.assessment) ?? e.assessment, top: topDimensions(content.scores, e.assessment) }));
}
