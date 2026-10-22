import "server-only";
import { createClient } from "@/lib/supabase/server";

// Lecturas del panel de admin. Pasan por RLS: solo el admin ve todo.

export type OrgRow = { id: string; name: string; kind: string; country: string; active: boolean; reseller_id: string | null };

export async function listOrgs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, kind, country, active, reseller_id, resellers(name), memberships(count)")
    .order("name");
  return (data ?? []).map((o) => ({
    ...(o as unknown as OrgRow),
    resellerName: (o.resellers as unknown as { name: string } | null)?.name ?? null,
    people: (o.memberships as unknown as Array<{ count: number }>)[0]?.count ?? 0,
  }));
}

export async function getOrg(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("id, name, kind, country, active, reseller_id").eq("id", id).maybeSingle();
  return data as OrgRow | null;
}

export async function listResellers() {
  const supabase = await createClient();
  const { data } = await supabase.from("resellers").select("id, name").order("name");
  return (data ?? []) as Array<{ id: string; name: string }>;
}

export type ModuleInfo = {
  id: string;
  name: string;
  contract: { active: boolean; starts_at: string | null; ends_at: string | null; seats: number | null } | null;
};

export async function orgModules(orgId: string): Promise<ModuleInfo[]> {
  const supabase = await createClient();
  const [{ data: modules }, { data: contracts }] = await Promise.all([
    supabase.from("modules").select("id, name, sort").order("sort"),
    supabase.from("organization_modules").select("module_id, active, starts_at, ends_at, seats").eq("organization_id", orgId),
  ]);
  return (modules ?? []).map((m) => {
    const c = contracts?.find((x) => x.module_id === m.id);
    return { id: m.id, name: m.name, contract: c ? { active: c.active, starts_at: c.starts_at, ends_at: c.ends_at, seats: c.seats } : null };
  });
}

export type ClassInfo = {
  id: string;
  name: string;
  level: "primaria" | "secundaria" | null;
  grade: number | null;
  modules: string[];
  programs: Array<{ id: string; title: string; language: string; module_id: string }>;
  students: number;
};

export async function orgClasses(orgId: string): Promise<ClassInfo[]> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from("classes")
    .select("id, name, level, grade, class_modules(module_id), class_programs(programs(id, title, language, module_id)), memberships(count)")
    .eq("organization_id", orgId)
    .eq("school_year", year)
    .order("name");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    grade: c.grade,
    modules: (c.class_modules as Array<{ module_id: string }>).map((m) => m.module_id),
    programs: (c.class_programs as unknown as Array<{ programs: ClassInfo["programs"][number] }>).map((p) => p.programs),
    students: (c.memberships as unknown as Array<{ count: number }>)[0]?.count ?? 0,
  }));
}

export type ProgramInfo = { id: string; module_id: string; title: string; level: string; grade: number; language: string; chapters: number };

export async function listPrograms(): Promise<ProgramInfo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, module_id, title, level, grade, language, chapters(count)")
    .eq("active", true)
    .order("module_id")
    .order("grade");
  return (data ?? []).map((p) => ({
    id: p.id,
    module_id: p.module_id,
    title: p.title,
    level: p.level,
    grade: p.grade,
    language: p.language,
    chapters: (p.chapters as unknown as Array<{ count: number }>)[0]?.count ?? 0,
  }));
}

export type PersonRow = {
  person_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "coordinador" | "docente" | "alumno" | "profesional";
  class_id: string | null;
  class_name: string | null;
  teacher_classes: string | null;
  membership_active: boolean;
  deleted: boolean;
  has_account: boolean;
  must_change_password: boolean;
  last_seen: string | null;
  modules: string[];
  total: number;
};

export async function listPeople(
  orgId: string,
  f: { q?: string; role?: string; classId?: string; status?: string; page: number },
  pageSize = 50,
) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_people", {
    p_org: orgId,
    p_search: f.q ?? null,
    p_role: f.role ?? null,
    p_class: f.classId ?? null,
    p_status: f.status ?? "activos",
    p_limit: pageSize,
    p_offset: (f.page - 1) * pageSize,
  });
  const rows = (data ?? []) as PersonRow[];
  return { rows, total: rows[0]?.total ?? 0 };
}

export type Campaign = {
  id: string;
  class_id: string | null;
  send_at: string;
  subject: string;
  status: string;
  only_new: boolean;
  sent_count: number;
  failed_count: number;
};

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("welcome_campaigns")
    .select("id, class_id, send_at, subject, status, only_new, sent_count, failed_count")
    .eq("organization_id", orgId)
    .order("send_at", { ascending: false });
  return (data ?? []) as Campaign[];
}

export type ProgramRow = {
  id: string;
  module_id: string;
  code: string;
  title: string;
  level: string;
  grade: number;
  language: string;
  version: number;
  active: boolean;
  chapters: number;
  questions: number;
  missingVideos: number;
};

export async function listProgramsDetailed(): Promise<ProgramRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, module_id, code, title, level, grade, language, version, active, chapters(id, mux_playback_id, questions(count))")
    .order("module_id")
    .order("grade")
    .order("code")
    .order("language")
    .order("version", { ascending: false });
  return (data ?? []).map((p) => {
    const chapters = p.chapters as unknown as Array<{ mux_playback_id: string | null; questions: Array<{ count: number }> }>;
    return {
      id: p.id,
      module_id: p.module_id,
      code: p.code,
      title: p.title,
      level: p.level,
      grade: p.grade,
      language: p.language,
      version: p.version,
      active: p.active,
      chapters: chapters.length,
      questions: chapters.reduce((a, c) => a + (c.questions[0]?.count ?? 0), 0),
      missingVideos: chapters.filter((c) => !c.mux_playback_id).length,
    };
  });
}

export async function dimensionLabels(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("dimensions").select("id, excel_label");
  return Object.fromEntries((data ?? []).map((d) => [d.excel_label, d.id]));
}

export async function listModulesAndLanguages() {
  const supabase = await createClient();
  const [{ data: modules }, { data: languages }] = await Promise.all([
    supabase.from("modules").select("id, name").order("sort"),
    supabase.from("languages").select("code, name_es").eq("active", true).order("sort"),
  ]);
  return { modules: modules ?? [], languages: languages ?? [] };
}

export async function getProgramWithChapters(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, module_id, code, title, level, grade, language, version, active, chapters(id, position, title, mux_playback_id, mux_signed, questions(count))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const chapters = (data.chapters as unknown as Array<{
    id: string;
    position: number;
    title: string;
    mux_playback_id: string | null;
    mux_signed: boolean;
    questions: Array<{ count: number }>;
  }>)
    .map((c) => ({ ...c, questions: c.questions[0]?.count ?? 0 }))
    .sort((a, b) => a.position - b.position);
  return { ...data, chapters };
}
