import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Lecturas del docente y del coordinador. La base verifica el acceso en cada función (private.can_see_*).

export type StaffProgram = { id: string; title: string; language: string; module_id: string; chapters: number };
export type StaffClass = {
  class_id: string; class_name: string; organization_id: string; organization_name: string; country: string;
  level: string | null; grade: number | null; students: number; programs: StaffProgram[];
};
export type StaffStudent = {
  person_id: string; first_name: string; last_name: string; email: string; birth_date: string | null;
  completed: number; total: number; next_position: number | null; next_title: string | null; seconds: number;
  last_seen: string | null; active_days_30: number; minutes_30: number; report_status: string | null;
  mid_rating: number | null; final_rating: number | null; finished_at: string | null;
};
export type StudentChapter = { chapter_position: number; title: string; status: string; seconds: number; completed_at: string | null; answered: number; questions: number };
export type ClassStats = {
  students: number; finished: number; reports_ready: number;
  chapters: { position: number; title: string; completed: number; started: number; avg_minutes: number | null }[];
  activity: { day: string; students: number; minutes: number }[];
  scores: { assessment: string; dimension: string; name: string; avg_t: number; n: number }[];
  holland: { letter: string; n: number }[];
  ratings: { mid: Record<string, number>; final: Record<string, number>; comments: number };
  questions: { chapter: number; position: number; prompt: string; kind: "simple" | "abierta"; answered: number; options: { text: string; n: number }[] | null }[];
};

const uuid = z.uuid();
export const isUuid = (v: unknown): v is string => uuid.safeParse(v).success;

export async function staffClasses(): Promise<StaffClass[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_classes");
  return (data ?? []) as StaffClass[];
}

export async function classStudents(classId: string, programId: string): Promise<StaffStudent[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_class_students", { p_class: classId, p_program: programId });
  return (data ?? []) as StaffStudent[];
}

export async function studentChapters(personId: string, programId: string): Promise<StudentChapter[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_student_chapters", { p_person: personId, p_program: programId });
  return (data ?? []) as StudentChapter[];
}

export async function classStats(classId: string, programId: string): Promise<ClassStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_class_stats", { p_class: classId, p_program: programId });
  return (data ?? null) as ClassStats | null;
}

export async function studentReport(personId: string, programId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_report", { p_person: personId, p_program: programId });
  return data as null | {
    status: string | null; content: unknown; first_name: string; last_name: string; program: { title: string; language: string };
  };
}

export async function programDocuments(programId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_documents", { p_program: programId });
  return (data ?? []) as { id: string; kind: "guia" | "actividad"; title: string; sort: number; size_bytes: number }[];
}

export async function classReport(classId: string, programId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_class_report", { p_class: classId, p_program: programId });
  return data as null | { status: string; content: unknown; generated_at: string | null };
}

export async function reportShares(personId: string, programId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_shares")
    .select("id, created_at, expires_at, revoked_at, views, last_view_at")
    .eq("person_id", personId)
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as { id: string; created_at: string; expires_at: string; revoked_at: string | null; views: number; last_view_at: string | null }[];
}

// Edad a partir de la fecha de nacimiento
export function ageOf(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}
