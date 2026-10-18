"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/dal";
import { importRowsSchema, type ImportResult } from "@/lib/people-import";
import { appUrl, mailConfigured, renderTemplate, sendBatch } from "@/lib/mail";
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
  "mail inválido", "el mail ya lo usa otra persona", "la plantilla tiene que incluir {{contrasena}}",
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
  country: z.string().trim().regex(/^[A-Za-z]{2}$/),
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
