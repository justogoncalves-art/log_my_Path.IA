"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/dal";
import { importRowsSchema, type ImportResult } from "@/lib/people-import";
import { isCountryCode } from "@/lib/countries";
import { appUrl, mailConfigured, renderTemplate, sendBatch } from "@/lib/mail";
import { listMuxAssets, muxApiConfigured } from "@/lib/mux";
import type { MuxAssetInfo } from "@/lib/mux-match";
import { generatePassword } from "@/lib/password";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { runWelcomeCampaigns } from "@/lib/welcome";

export type ImportResponse = { ok: true; results: ImportResult[]; saved: boolean } | { ok: false; error: string };

const orgId = z.uuid();

// Valida (commit = false) o guarda (commit = true) un lote de personas.
// La base vuelve a comprobar que quien llama es admin y guarda todo o nada.
export async function importPeople(org: string, rows: unknown, commit: boolean): Promise<ImportResponse> {
  const me = await getMe();
  if (!me.isAdmin) return { ok: false, error: "Sin acceso" };

  const parsedOrg = orgId.safeParse(org);
  const parsedRows = importRowsSchema.safeParse(rows);
  if (!parsedOrg.success) return { ok: false, error: "Elegí una organización" };
  if (!parsedRows.success) return { ok: false, error: "El archivo tiene filas con un formato que no reconocemos (máximo 2000 filas)" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_people", {
    p_org: parsedOrg.data,
    p_rows: parsedRows.data,
    p_commit: commit,
  });
  if (error) {
    // El mensaje de la base no incluye datos personales
    return { ok: false, error: error.message.startsWith("hay ") ? `No se guardó nada: ${error.message}` : "No pudimos procesar el alta" };
  }
  if (commit) revalidatePath("/admin");
  return { ok: true, results: (data ?? []) as ImportResult[], saved: commit };
}

// ─────────────────────────────────────────────────────────────
// Acciones del panel. Cada una vuelve a validar en la base que quien llama es admin.
// ─────────────────────────────────────────────────────────────

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const uuid = z.uuid();
const uuids = z.array(z.uuid()).max(500);
const moduleIds = z.array(z.string().regex(/^[a-z]{2,20}$/)).max(20);

// Mensajes de la base que se pueden mostrar tal cual (no traen datos personales)
const SAFE_ERRORS = [
  "módulo inexistente", "idioma inexistente", "capítulos inválidos", "tipo de pregunta inválido", "dimensión inexistente",
  "datos inválidos", "clase inexistente", "programa inexistente", "la persona no pertenece a la organización",
  "clase de otra organización", "el alumno tiene que tener una sola clase", "un coordinador ve todas las clases",
  "mail inválido", "el mail ya lo usa otra persona", "tope inválido", "límite diario inválido", "carreras sin su universidad", "la plantilla tiene que incluir {{contrasena}}",
];

async function rpc(fn: string, args: Record<string, unknown>) {
  const me = await getMe();
  if (!me.isAdmin) return { data: null, error: "Sin acceso" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const known = SAFE_ERRORS.find((m) => error.message.includes(m));
    return { data: null, error: known ? known.charAt(0).toUpperCase() + known.slice(1) : "No pudimos guardar el cambio" };
  }
  return { data, error: null };
}

function done(error: string | null, message?: string): ActionResult {
  if (error) return { ok: false, error };
  revalidatePath("/admin", "layout");
  return { ok: true, message };
}

const orgSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["colegio", "profesional", "particular"]),
  country: z.string().trim().toUpperCase().refine(isCountryCode),
  reseller: z.uuid().optional(),
});

export async function saveOrg(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const parsed = orgSchema.safeParse({
    id: form.get("id") || undefined,
    name: form.get("name"),
    kind: form.get("kind"),
    country: form.get("country"),
    reseller: form.get("reseller") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Revisá el nombre y el país (código de 2 letras, ej. AR)" };
  const d = parsed.data;
  const { error } = await rpc("admin_save_org", {
    p_id: d.id ?? null, p_name: d.name, p_kind: d.kind, p_country: d.country, p_reseller: d.reseller ?? null,
  });
  return done(error, "Organización guardada");
}

export async function setOrgModule(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      org: uuid,
      module: z.string().regex(/^[a-z]{2,20}$/),
      active: z.boolean(),
      starts: z.iso.date().optional(),
      ends: z.iso.date().optional(),
      seats: z.coerce.number().int().min(0).max(100000).optional(),
    })
    .safeParse({
      org: form.get("org"),
      module: form.get("module"),
      active: form.get("active") === "on",
      starts: form.get("starts") || undefined,
      ends: form.get("ends") || undefined,
      seats: form.get("seats") || undefined,
    });
  if (!parsed.success) return { ok: false, error: "Revisá las fechas y los cupos" };
  const d = parsed.data;
  const { error } = await rpc("admin_set_org_module", {
    p_org: d.org, p_module: d.module, p_active: d.active, p_starts: d.starts ?? null, p_ends: d.ends ?? null, p_seats: d.seats ?? null,
  });
  return done(error, "Módulo actualizado");
}

export async function saveClass(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      org: uuid,
      id: z.uuid().optional(),
      name: z.string().trim().min(1).max(40),
      level: z.enum(["primaria", "secundaria"]).optional(),
      grade: z.coerce.number().int().min(1).max(7).optional(),
    })
    .safeParse({
      org: form.get("org"),
      id: form.get("id") || undefined,
      name: form.get("name"),
      level: form.get("level") || undefined,
      grade: form.get("grade") || undefined,
    });
  if (!parsed.success) return { ok: false, error: "Revisá el nombre y el año de la clase" };
  const d = parsed.data;
  const { error } = await rpc("admin_save_class", {
    p_org: d.org, p_id: d.id ?? null, p_name: d.name, p_level: d.level ?? null, p_grade: d.grade ?? null,
  });
  return done(error, "Clase guardada");
}

export async function setClassModules(classId: string, modules: string[]): Promise<ActionResult> {
  if (!uuid.safeParse(classId).success || !moduleIds.safeParse(modules).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await rpc("admin_set_class_modules", { p_class: classId, p_modules: modules });
  return done(error, "Módulos de la clase actualizados");
}

export async function assignProgram(programId: string, classIds: string[], assign: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(programId).success || !uuids.safeParse(classIds).success || !classIds.length) {
    return { ok: false, error: "Elegí el programa y al menos una clase" };
  }
  const { data, error } = await rpc("admin_assign_program", { p_program: programId, p_classes: classIds, p_assign: assign });
  return done(error, assign ? `Programa asignado a ${data ?? 0} clases` : "Programa quitado");
}

export async function setPersonClasses(personId: string, orgId: string, classIds: string[]): Promise<ActionResult> {
  if (!uuid.safeParse(personId).success || !uuid.safeParse(orgId).success || !uuids.safeParse(classIds).success) {
    return { ok: false, error: "Datos inválidos" };
  }
  const { error } = await rpc("admin_set_classes", { p_person: personId, p_org: orgId, p_classes: classIds });
  return done(error, "Clases actualizadas");
}

export async function setPersonModules(personId: string, orgId: string, modules: string[]): Promise<ActionResult> {
  if (!uuid.safeParse(personId).success || !uuid.safeParse(orgId).success || !moduleIds.safeParse(modules).success) {
    return { ok: false, error: "Datos inválidos" };
  }
  const { error } = await rpc("admin_set_person_modules", { p_person: personId, p_org: orgId, p_modules: modules });
  return done(error, "Módulos actualizados");
}

export async function setMembershipActive(personId: string, orgId: string, active: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(personId).success || !uuid.safeParse(orgId).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await rpc("admin_set_membership_active", { p_person: personId, p_org: orgId, p_active: active });
  return done(error, active ? "Reactivada" : "Dada de baja en la organización");
}

// Eliminar bloquea además la cuenta de acceso; restaurar la desbloquea
export async function deletePerson(personId: string, restore = false): Promise<ActionResult> {
  if (!uuid.safeParse(personId).success) return { ok: false, error: "Datos inválidos" };
  const { data, error } = await rpc(restore ? "admin_restore_person" : "admin_delete_person", { p_person: personId });
  if (error) return { ok: false, error };
  const svc = serviceClient();
  if (data && svc) {
    await svc.auth.admin.updateUserById(String(data), { ban_duration: restore ? "none" : "876000h" });
  }
  return done(null, restore ? "Persona restaurada" : "Persona eliminada y sin acceso");
}

export async function changeEmail(personId: string, email: string): Promise<ActionResult> {
  const parsedEmail = z.email().max(254).safeParse(email.trim().toLowerCase());
  if (!uuid.safeParse(personId).success || !parsedEmail.success) return { ok: false, error: "Mail inválido" };
  const { data, error } = await rpc("admin_change_email", { p_person: personId, p_email: parsedEmail.data });
  if (error) return { ok: false, error };
  const row = (data as Array<{ auth_user_id: string | null; old_email: string }> | null)?.[0];
  if (row?.auth_user_id) {
    const svc = serviceClient();
    const res = svc ? await svc.auth.admin.updateUserById(row.auth_user_id, { email: parsedEmail.data, email_confirm: true }) : null;
    if (!res || res.error) {
      // Vuelve atrás para que la base y la cuenta no queden distintas
      await rpc("admin_change_email", { p_person: personId, p_email: row.old_email });
      return { ok: false, error: svc ? "No pudimos cambiar el mail de la cuenta" : "Falta configurar SUPABASE_SECRET_KEY en Vercel" };
    }
  }
  return done(null, "Mail actualizado");
}

// Genera una contraseña nueva, crea la cuenta si no existía y la manda por mail
export async function resetPassword(personId: string): Promise<ActionResult> {
  if (!uuid.safeParse(personId).success) return { ok: false, error: "Datos inválidos" };
  const svc = serviceClient();
  if (!svc || !mailConfigured()) return { ok: false, error: "Faltan configurar SUPABASE_SECRET_KEY y RESEND_API_KEY en Vercel" };

  const { data, error } = await rpc("admin_password_target", { p_person: personId });
  if (error) return { ok: false, error };
  const target = (data as Array<{ auth_user_id: string | null; email: string; first_name: string; locale: string }> | null)?.[0];
  if (!target) return { ok: false, error: "La persona no existe o está eliminada" };

  const password = generatePassword();
  if (target.auth_user_id) {
    const { error: e } = await svc.auth.admin.updateUserById(target.auth_user_id, { password });
    if (e) return { ok: false, error: "No pudimos cambiar la contraseña" };
  } else {
    const { data: created, error: e } = await svc.auth.admin.createUser({ email: target.email, password, email_confirm: true });
    if (e || !created.user) return { ok: false, error: "No pudimos crear la cuenta de acceso" };
    await rpc("admin_link_account", { p_person: personId, p_auth: created.user.id });
  }

  const en = target.locale.startsWith("en");
  const baseUrl = await appUrl();
  const [sent] = await sendBatch([
    {
      to: target.email,
      subject: en ? "Your new MY PATH.IA password" : "Tu nueva contraseña de MY PATH.IA",
      html: renderTemplate(
        en
          ? "<p>Hi {{nombre}},</p><p>Your new password is <strong>{{contrasena}}</strong>.</p><p>Sign in at <a href=\"{{link}}\">{{link}}</a>. You will be asked to choose your own password.</p>"
          : "<p>Hola {{nombre}}:</p><p>Tu nueva contraseña es <strong>{{contrasena}}</strong>.</p><p>Ingresá en <a href=\"{{link}}\">{{link}}</a>. Te vamos a pedir que elijas una propia.</p>",
        { nombre: target.first_name, contrasena: password, link: `${baseUrl}/login` },
      ),
    },
  ]).catch(() => [false]);
  return done(null, sent ? "Contraseña nueva enviada por mail" : "La contraseña cambió pero el mail no salió: volvé a intentar");
}

// ─────────────────────────────────────────────────────────────
// Mails de bienvenida
// ─────────────────────────────────────────────────────────────
export async function scheduleWelcome(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      org: uuid,
      classId: z.uuid().optional(),
      sendAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      tz: z.coerce.number().int().min(-840).max(840),
      subject: z.string().trim().min(3).max(200),
      html: z.string().min(20).max(200000),
      onlyNew: z.boolean(),
    })
    .safeParse({
      org: form.get("org"),
      classId: form.get("classId") || undefined,
      sendAt: form.get("sendAt"),
      tz: form.get("tz"),
      subject: form.get("subject"),
      html: form.get("html"),
      onlyNew: form.get("onlyNew") === "on",
    });
  if (!parsed.success) return { ok: false, error: "Completá fecha, asunto y la plantilla HTML" };
  const d = parsed.data;
  // La fecha llega en la hora local del navegador; tz = minutos de diferencia con UTC
  const sendAt = new Date(new Date(`${d.sendAt}:00Z`).getTime() + d.tz * 60000).toISOString();
  const { error } = await rpc("admin_schedule_welcome", {
    p_org: d.org, p_class: d.classId ?? null, p_send_at: sendAt, p_subject: d.subject, p_html: d.html, p_only_new: d.onlyNew,
  });
  return done(error, "Mail programado");
}

export async function cancelWelcome(campaignId: string): Promise<ActionResult> {
  if (!uuid.safeParse(campaignId).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await rpc("admin_cancel_welcome", { p_campaign: campaignId });
  return done(error, "Envío cancelado");
}

export async function sendWelcomeNow(campaignId: string): Promise<ActionResult> {
  if (!uuid.safeParse(campaignId).success) return { ok: false, error: "Datos inválidos" };
  const { error } = await rpc("admin_send_welcome_now", { p_campaign: campaignId });
  if (error) return { ok: false, error };
  const run = await runWelcomeCampaigns({ campaignId, maxPeople: 600 });
  if (!run.ok) return { ok: false, error: run.error };
  return done(null, `Enviados: ${run.sent}${run.failed ? ` · con error: ${run.failed}` : ""}`);
}

// ─────────────────────────────────────────────────────────────
// Programas (carga desde Excel)
// ─────────────────────────────────────────────────────────────
const optionSchema = z.object({
  position: z.number().int().min(1).max(50),
  text: z.string().min(1).max(1000),
  weights: z.record(z.string().regex(/^[a-z_]+\.[a-z_]+$/), z.number().min(0).max(100)),
});
const questionSchema = z.object({
  position: z.number().int().min(1).max(100),
  kind: z.enum(["simple", "abierta"]),
  prompt: z.string().min(1).max(2000),
  options: z.array(optionSchema).max(20),
});
const chapterSchema = z.object({
  position: z.number().int().min(1).max(60),
  title: z.string().min(1).max(200),
  assessment: z.string().max(200),
  video: z.string().max(100),
  questions: z.array(questionSchema).max(100),
});
const programSchema = z.object({
  module: z.string().regex(/^[a-z]{2,20}$/),
  code: z.string().regex(/^[a-z0-9-]{3,60}$/),
  title: z.string().trim().min(2).max(120),
  level: z.enum(["primaria", "secundaria"]),
  grade: z.number().int().min(1).max(7),
  language: z.string().min(2).max(10),
  track: z.string().max(20).optional(),
  chapters: z.array(chapterSchema).min(1).max(60),
});

export async function importProgram(input: unknown): Promise<ActionResult> {
  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "El programa tiene datos con un formato que no reconocemos" };
  const d = parsed.data;
  const { data, error } = await rpc("admin_import_program", {
    p_module: d.module, p_code: d.code, p_title: d.title, p_level: d.level, p_grade: d.grade,
    p_language: d.language, p_track: d.track ?? null, p_chapters: d.chapters,
  });
  if (error) return { ok: false, error };
  const r = (data as Array<{ version: number; chapters: number; questions: number; moved_assignments: boolean }> | null)?.[0];
  return done(
    null,
    `Cargado como versión ${r?.version ?? 1}: ${r?.chapters ?? 0} capítulos y ${r?.questions ?? 0} preguntas` +
      (r && r.version > 1 ? (r.moved_assignments ? ". Las clases asignadas pasaron a esta versión." : ". La versión anterior ya tiene respuestas: las clases siguen con esa hasta que las reasignes.") : ""),
  );
}

// ─────────────────────────────────────────────────────────────
// Videos de Mux por capítulo
// ─────────────────────────────────────────────────────────────
export async function listVideos(): Promise<{ ok: true; assets: MuxAssetInfo[] } | { ok: false; error: string }> {
  const me = await getMe();
  if (!me.isAdmin) return { ok: false, error: "Sin acceso" };
  if (!muxApiConfigured()) return { ok: false, error: "Faltan MUX_TOKEN_ID y MUX_TOKEN_SECRET en Vercel (Production y Preview)" };
  try {
    const assets = await listMuxAssets();
    return { ok: true, assets: assets.filter((a) => a.status === "ready" && a.playbackId) };
  } catch {
    return { ok: false, error: "No pudimos leer los videos de Mux. Revisá que la clave tenga permiso de lectura." };
  }
}

const videoItems = z
  .array(z.object({ chapterId: z.uuid(), playbackId: z.string().regex(/^[A-Za-z0-9]{10,100}$/).nullable(), signed: z.boolean() }))
  .min(1)
  .max(60);

export async function setChapterVideos(items: unknown): Promise<ActionResult> {
  const parsed = videoItems.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  for (const it of parsed.data) {
    const { error } = await rpc("admin_set_chapter_video", { p_chapter: it.chapterId, p_playback_id: it.playbackId, p_signed: it.signed });
    if (error) return { ok: false, error };
  }
  return done(null, `Videos guardados en ${parsed.data.length} capítulos`);
}

// ─────────────────────────────────────────────────────────────
// IA: tope de gasto, freno diario, interruptor y mail de avisos
// ─────────────────────────────────────────────────────────────
export async function setAiSettings(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      enabled: z.boolean(),
      budget: z.coerce.number().min(0).max(1000),
      daily: z.coerce.number().int().min(0).max(5000),
      email: z.union([z.email(), z.literal("")]),
    })
    .safeParse({ enabled: form.get("enabled") === "on", budget: form.get("budget"), daily: form.get("daily"), email: String(form.get("email") ?? "").trim() });
  if (!parsed.success) return { ok: false, error: "Revisá los valores" };
  const { error } = await rpc("admin_set_ai_settings", {
    p_enabled: parsed.data.enabled,
    p_budget: parsed.data.budget,
    p_daily: parsed.data.daily,
    p_email: parsed.data.email || null,
  });
  return done(error, "Guardado");
}

// ─────────────────────────────────────────────────────────────
// Campus: carga del catálogo en tandas (actualiza lo existente, agrega lo nuevo, no borra)
// ─────────────────────────────────────────────────────────────
const s = (max: number) => z.string().max(max).nullable();
const campusUniversity = z.object({
  country_code: z.string().regex(/^[A-Z]{2}$/), official_name: z.string().min(2).max(200), short_name: s(60),
  region: s(120), city: s(120), ownership: s(80), institution_type: s(80), instruction_language: s(80),
  rank_qs: z.number().int().nullable(), rank_the: z.number().int().nullable(), rank_arwu: z.number().int().nullable(),
  rank_national: z.number().int().nullable(), accreditations: s(400), students: s(40), founded: z.number().int().nullable(),
  website: s(300), description_es: s(3000), description_en: s(3000), data_source: s(500), data_updated: s(300), notes: s(2000),
});
const campusProgram = z.object({
  country_code: z.string().regex(/^[A-Z]{2}$/), university: z.string().min(2).max(200), name: z.string().min(1).max(200),
  program_type: s(80), modality: s(80), name_en: s(200), knowledge_area: s(120), professional_family: s(120),
  riasec_primary: z.enum(["R", "I", "A", "S", "E", "C"]).nullable(), riasec_secondary: z.enum(["R", "I", "A", "S", "E", "C"]).nullable(),
  duration_years: z.number().min(0).max(99).nullable(), language: s(80), annual_cost: s(300), scholarships: s(200),
  admission: s(500), cutoff_type: s(200), cutoff_source: s(500), employment_rate: s(40), avg_salary: s(120), url: s(400),
  description: s(3000), curriculum: s(1500), source: s(500), data_updated: s(60),
});
const campusBatch = z.object({ universities: z.array(campusUniversity).max(500), programs: z.array(campusProgram).max(3000) });

export type CampusBatchResult =
  | { ok: true; universities_new: number; universities_updated: number; programs_new: number; programs_updated: number }
  | { ok: false; error: string };

export async function importCampusBatch(batch: unknown): Promise<CampusBatchResult> {
  const parsed = campusBatch.safeParse(batch);
  if (!parsed.success) return { ok: false, error: "Hay datos con un formato que no reconocemos" };
  const { data, error } = await rpc("admin_import_campus", { p_universities: parsed.data.universities, p_programs: parsed.data.programs });
  if (error) return { ok: false, error };
  const row = (data as { universities_new: number; universities_updated: number; programs_new: number; programs_updated: number }[])[0];
  return { ok: true, ...row };
}

// ─────────────────────────────────────────────────────────────
// Asistente de alta de organización (paso a paso)
// ─────────────────────────────────────────────────────────────
export async function wizardSaveOrg(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = orgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Completá el nombre (mínimo 2 letras) y elegí el país" };
  const d = parsed.data;
  const { data, error } = await rpc("admin_save_org", {
    p_id: d.id ?? null, p_name: d.name, p_kind: d.kind, p_country: d.country, p_reseller: d.reseller ?? null,
  });
  if (error || !data) return { ok: false, error: error ?? "No pudimos guardar la organización" };
  revalidatePath("/admin", "layout");
  return { ok: true, id: String(data) };
}

const classItems = z
  .array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(40), level: z.enum(["primaria", "secundaria"]), grade: z.number().int().min(1).max(7) }))
  .min(1)
  .max(200);

export async function wizardSaveClasses(org: string, items: unknown): Promise<ActionResult> {
  const parsedOrg = uuid.safeParse(org);
  const parsed = classItems.safeParse(items);
  if (!parsedOrg.success || !parsed.success) return { ok: false, error: "Cada clase necesita nivel y año" };
  for (const c of parsed.data) {
    const { error } = await rpc("admin_save_class", { p_org: org, p_id: c.id, p_name: c.name, p_level: c.level, p_grade: c.grade });
    if (error) return { ok: false, error: `${c.name}: ${error}` };
  }
  return done(null, "Clases guardadas");
}

const moduleItems = z
  .array(
    z.object({
      module: z.string().regex(/^[a-z]{2,20}$/),
      active: z.boolean(),
      starts: z.iso.date().nullable(),
      ends: z.iso.date().nullable(),
      seats: z.number().int().min(0).max(100000).nullable(),
    }),
  )
  .max(20);

// Guarda los módulos contratados y los habilita en todas las clases de la organización
export async function wizardSaveModules(org: string, items: unknown, classIds: string[]): Promise<ActionResult> {
  const parsed = moduleItems.safeParse(items);
  if (!uuid.safeParse(org).success || !parsed.success || !uuids.safeParse(classIds).success) return { ok: false, error: "Revisá las fechas y los cupos" };
  for (const m of parsed.data) {
    if (m.active && (!m.starts || !m.ends || m.ends < m.starts)) return { ok: false, error: `Revisá las fechas de ${m.module}` };
    const { error } = await rpc("admin_set_org_module", {
      p_org: org, p_module: m.module, p_active: m.active, p_starts: m.starts, p_ends: m.ends, p_seats: m.seats,
    });
    if (error) return { ok: false, error };
  }
  const active = parsed.data.filter((m) => m.active).map((m) => m.module);
  for (const c of classIds) {
    const { error } = await rpc("admin_set_class_modules", { p_class: c, p_modules: active });
    if (error) return { ok: false, error };
  }
  return done(null, "Módulos guardados");
}

// Deja en cada clase exactamente los programas elegidos
export async function wizardSavePrograms(items: unknown): Promise<ActionResult> {
  const parsed = z
    .array(z.object({ classId: z.uuid(), add: z.array(z.uuid()).max(50), remove: z.array(z.uuid()).max(50) }))
    .max(200)
    .safeParse(items);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  for (const c of parsed.data) {
    for (const p of c.add) {
      const { error } = await rpc("admin_assign_program", { p_program: p, p_classes: [c.classId], p_assign: true });
      if (error) return { ok: false, error };
    }
    for (const p of c.remove) {
      const { error } = await rpc("admin_assign_program", { p_program: p, p_classes: [c.classId], p_assign: false });
      if (error) return { ok: false, error };
    }
  }
  return done(null, "Programas guardados");
}

// ─────────────────────────────────────────────────────────────
// Documentos PDF del programa (guía didáctica, actividades). El navegador sube el archivo directo
// a Storage con un permiso firmado de un solo uso; después se registra en la base.
// ─────────────────────────────────────────────────────────────
const docSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]{3,60}$/),
  language: z.string().max(10),
  kind: z.enum(["guia", "actividad"]),
  title: z.string().trim().min(2).max(200),
  position: z.number().int().min(1).max(99),
  size: z.number().int().min(1).max(50 * 1024 * 1024),
});

export async function documentUploadUrl(code: string): Promise<{ ok: true; path: string; url: string } | { ok: false; error: string }> {
  const me = await getMe();
  if (!me.isAdmin) return { ok: false, error: "Sin acceso" };
  if (!/^[a-z0-9-]{3,60}$/.test(code)) return { ok: false, error: "Datos inválidos" };
  const svc = serviceClient();
  if (!svc) return { ok: false, error: "Falta la clave del servidor" };
  const path = `${code}/${crypto.randomUUID()}.pdf`;
  const { data, error } = await svc.storage.from("program-docs").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No pudimos preparar la subida" };
  return { ok: true, path, url: data.signedUrl };
}

export async function addDocument(input: unknown, path: string): Promise<ActionResult> {
  const parsed = docSchema.safeParse(input);
  if (!parsed.success || !/^[a-z0-9-]{3,60}\/[0-9a-f-]{36}\.pdf$/.test(path)) return done("Revisá el título y el archivo (PDF de hasta 50 MB)");
  const d = parsed.data;
  if (!path.startsWith(`${d.code}/`)) return done("Datos inválidos");
  const { error } = await rpc("admin_add_document", {
    p_code: d.code, p_language: d.language, p_kind: d.kind, p_title: d.title, p_position: d.position, p_path: path, p_size: d.size,
  });
  revalidatePath("/admin/programas/[id]", "page");
  return done(error, "Documento agregado");
}

export async function setDocumentActive(docId: string, active: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(docId).success) return done("Datos inválidos");
  const { error } = await rpc("admin_set_document_active", { p_doc: docId, p_active: active });
  revalidatePath("/admin/programas/[id]", "page");
  return done(error, active ? "Documento visible" : "Documento oculto");
}

// ─────────────────────────────────────────────────────────────
// Estado de la plataforma
// ─────────────────────────────────────────────────────────────
export async function setHealthSettings(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  const url = String(form.get("app_url") ?? "").trim().replace(/\/+$/, "");
  if (url && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(url)) return { ok: false, error: "La dirección tiene que ser https://dominio (sin rutas)" };
  const { error } = await rpc("admin_set_health_settings", { p_app_url: url || null, p_enabled: form.get("enabled") === "on" });
  return done(error, "Guardado");
}

export async function checkHealthNow(): Promise<ActionResult> {
  const me = await getMe();
  if (!me.isAdmin) return { ok: false, error: "Sin acceso" };
  const { runHealthCheck } = await import("@/lib/health");
  const r = await runHealthCheck();
  revalidatePath("/admin/estado");
  return r.ok ? { ok: true, message: "Medición hecha" } : { ok: false, error: "Falta la clave del servidor" };
}
