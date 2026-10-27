import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Lecturas de My Campus.IA (catálogo público + afinidad propia calculada en la base).

export type RiasecScore = { letter: string; t: number };
export type CountryStat = { country_code: string; universities: number; programs: number };
export type AffinityRow = {
  name: string; riasec_primary: string; riasec_secondary: string | null; knowledge_area: string | null;
  affinity: number | null; universities: number; countries: number;
};
export type ProgramHit = {
  id: string; name: string; program_type: string | null; modality: string | null; knowledge_area: string | null;
  duration_years: number | null; riasec_primary: string | null; riasec_secondary: string | null; annual_cost: string | null;
  university_id: string; university: string; country_code: string; city: string | null; rank_qs: number | null;
  affinity: number | null; scholarships: string | null; is_home: boolean; total: number;
};
export type UniversityHit = {
  id: string; official_name: string; short_name: string | null; country_code: string; city: string | null;
  ownership: string | null; institution_type: string | null; instruction_language: string | null;
  rank_qs: number | null; programs: number; is_home: boolean; total: number;
};

export const PAGE_SIZE = 24;

// Filtros que llegan por la URL: siempre validados y acotados
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s.replace(/[%_\\]/g, " ").trim() || null)
    .optional()
    .catch(undefined);
export const filtersSchema = z.object({
  q: text(80),
  pais: z.string().regex(/^([A-Za-z]{2}|todos)$/).optional().catch(undefined),
  area: text(120),
  tipo: z.enum(["publica", "privada"]).optional().catch(undefined),
  orden: z.enum(["afinidad", "ranking"]).optional().catch(undefined),
  qs: z.coerce.number().int().min(1).max(2000).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  modalidad: z.enum(["presencial", "hibrida"]).optional().catch(undefined),
  duracion: z.coerce.number().int().refine((n) => [3, 4, 5, 6].includes(n)).optional().catch(undefined),
  becas: z.literal("si").optional().catch(undefined),
  riasec: z.enum(["R", "I", "A", "S", "E", "C"]).optional().catch(undefined),
  inst: text(80),
});
export type Filters = z.infer<typeof filtersSchema>;

export async function myRiasec(): Promise<RiasecScore[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_riasec");
  return ((data ?? []) as RiasecScore[]).map((r) => ({ letter: r.letter, t: Number(r.t) }));
}

export const hollandCode = (scores: RiasecScore[]) =>
  [...scores].sort((a, b) => b.t - a.t).slice(0, 3).map((s) => s.letter).join("");

export async function countryStats(): Promise<CountryStat[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_country_stats");
  return (data ?? []) as CountryStat[];
}

export async function areas(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_areas");
  return ((data ?? []) as { knowledge_area: string }[]).map((a) => a.knowledge_area);
}

// País del colegio del alumno: es el filtro por defecto
export async function homeCountry(organizationId: string | null): Promise<string | null> {
  if (!organizationId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("country").eq("id", organizationId).maybeSingle();
  return (data?.country as string | undefined)?.toUpperCase() ?? null;
}

export async function affinityList(country: string | null, limit = 15): Promise<AffinityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_affinity", { p_country: country, p_limit: limit });
  return (data ?? []) as AffinityRow[];
}

// País elegido en el filtro (null = todos). Sin filtro, primero el país del alumno y después el extranjero.
export const countryFilter = (f: Filters) => (f.pais && f.pais !== "todos" ? f.pais.toUpperCase() : null);

export async function searchPrograms(f: Filters, home: string | null) {
  const supabase = await createClient();
  const page = f.pagina ?? 1;
  const { data } = await supabase.rpc("campus_find_programs", {
    p_q: f.q ?? null, p_country: countryFilter(f), p_home: home, p_area: f.area ?? null, p_kind: f.tipo ?? null,
    p_modality: f.modalidad ?? null, p_duration: f.duracion ?? null, p_scholarships: f.becas ? true : null,
    p_riasec: f.riasec ?? null, p_sort: f.orden ?? "afinidad", p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data ?? []) as ProgramHit[];
  return { rows, total: Number(rows[0]?.total ?? 0), page };
}

export async function searchUniversities(f: Filters, home: string | null) {
  const supabase = await createClient();
  const page = f.pagina ?? 1;
  const { data } = await supabase.rpc("campus_find_universities", {
    p_q: f.q ?? null, p_country: countryFilter(f), p_home: home, p_kind: f.tipo ?? null, p_institution: f.inst ?? null,
    p_max_qs: f.qs ?? null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data ?? []) as UniversityHit[];
  return { rows, total: Number(rows[0]?.total ?? 0), page };
}

export type FilterOption = { v: string; n: number };
export async function filterOptions(): Promise<{ areas: FilterOption[]; institutions: FilterOption[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_filter_options");
  const o = (data ?? {}) as { areas?: FilterOption[]; institutions?: FilterOption[] };
  return { areas: o.areas ?? [], institutions: o.institutions ?? [] };
}

// Foto para cada universidad (siempre la misma para la misma universidad)
const PHOTOS = ["uni-01", "uni-02", "uni-03", "uni-04", "uni-05", "uni-06", "uni-07", "uni-08", "uni-09", "students", "study-group"];
export function universityPhoto(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `/img/campus/${PHOTOS[h % PHOTOS.length]}.jpg`;
}

const UNI_FIELDS =
  "id, country_code, official_name, short_name, region, city, ownership, institution_type, instruction_language, rank_qs, rank_the, rank_arwu, rank_national, accreditations, students, founded, website, description_es, description_en";
const PROGRAM_FIELDS =
  "id, university_id, name, name_en, program_type, modality, knowledge_area, riasec_primary, riasec_secondary, duration_years, language, annual_cost, scholarships, admission, employment_rate, avg_salary, url, description, curriculum";

export type University = {
  id: string; country_code: string; official_name: string; short_name: string | null; region: string | null; city: string | null;
  ownership: string | null; institution_type: string | null; instruction_language: string | null; rank_qs: number | null;
  rank_the: number | null; rank_arwu: number | null; rank_national: number | null; accreditations: string | null;
  students: string | null; founded: number | null; website: string | null; description_es: string | null; description_en: string | null;
};
export type Program = {
  id: string; university_id: string; name: string; name_en: string | null; program_type: string | null; modality: string | null;
  knowledge_area: string | null; riasec_primary: string | null; riasec_secondary: string | null; duration_years: number | null;
  language: string | null; annual_cost: string | null; scholarships: string | null; admission: string | null;
  employment_rate: string | null; avg_salary: string | null; url: string | null; description: string | null; curriculum: string | null;
  affinity?: number | null;
};

async function withAffinity<T extends { id: string }>(rows: T[]): Promise<(T & { affinity: number | null })[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("campus_program_affinity", { p_ids: rows.map((r) => r.id) });
  const map = new Map(((data ?? []) as { id: string; affinity: number | null }[]).map((a) => [a.id, a.affinity]));
  return rows.map((r) => ({ ...r, affinity: map.get(r.id) ?? null }));
}

export async function getUniversity(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const [{ data: uni }, { data: programs }] = await Promise.all([
    supabase.from("campus_universities").select(UNI_FIELDS).eq("id", id).maybeSingle(),
    supabase.from("campus_programs").select(PROGRAM_FIELDS).eq("university_id", id).order("name").limit(500),
  ]);
  if (!uni) return null;
  const list = await withAffinity((programs ?? []) as Program[]);
  list.sort((a, b) => (b.affinity ?? -1) - (a.affinity ?? -1) || a.name.localeCompare(b.name));
  return { university: uni as University, programs: list };
}

export async function getProgramsForCompare(ids: string[]) {
  const valid = ids.filter((i) => z.uuid().safeParse(i).success).slice(0, 4);
  if (!valid.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("campus_programs")
    .select(`${PROGRAM_FIELDS}, university:campus_universities (id, official_name, country_code, city, rank_qs)`)
    .in("id", valid);
  const rows = await withAffinity(
    (data ?? []) as unknown as (Program & { university: { id: string; official_name: string; country_code: string; city: string | null; rank_qs: number | null } })[],
  );
  return valid.flatMap((id) => rows.find((r) => r.id === id) ?? []);
}
