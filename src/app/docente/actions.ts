"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { generateClassReport } from "@/lib/class-report";
import { getMe } from "@/lib/dal";
import { appUrl, mailConfigured, renderTemplate, sendBatch } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";

// Acciones del docente y del coordinador. La base verifica en cada función que pueda ver a ese alumno o esa clase.

const uuid = z.uuid();
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type ShareResult = { ok: true; url: string; token: string; expiresAt: string } | { ok: false; error: string };

// Link para ver el reporte sin cuenta. El token va solo en el link: la base guarda su huella.
export async function createShare(personId: string, programId: string, days: number): Promise<ShareResult> {
  if (!uuid.safeParse(personId).success || !uuid.safeParse(programId).success) return { ok: false, error: "datos" };
  const token = randomBytes(24).toString("base64url");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_create_share", {
    p_person: personId,
    p_program: programId,
    p_token_hash: sha256(token),
    p_days: Math.min(90, Math.max(1, Math.round(days) || 30)),
  });
  if (error) return { ok: false, error: /listo/.test(error.message) ? "no_listo" : "error" };
  revalidatePath("/docente/mento/alumno/[personId]", "page");
  return { ok: true, token, url: `${await appUrl()}/r/${token}`, expiresAt: String(data) };
}

export async function revokeShare(shareId: string) {
  if (!uuid.safeParse(shareId).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_revoke_share", { p_share: shareId });
  revalidatePath("/docente/mento/alumno/[personId]", "page");
  return { ok: !error };
}

const mailSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  to: z.array(z.email().max(254)).min(1).max(10),
  note: z.string().max(600),
});

// Manda el link por mail desde nuestro servidor (Resend). Solo con un link vigente que el docente puede ver.
export async function emailShare(token: string, to: string, note: string): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const parsed = mailSchema.safeParse({
    token,
    to: to.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean),
    note: note.trim(),
  });
  if (!parsed.success) return { ok: false, error: "datos" };
  if (!mailConfigured()) return { ok: false, error: "mail" };
  const supabase = await createClient();
  const { data: share } = await supabase
    .from("report_shares")
    .select("person_id, program_id, expires_at, revoked_at")
    .eq("token_hash", sha256(parsed.data.token))
    .maybeSingle();
  if (!share || share.revoked_at || new Date(share.expires_at) < new Date()) return { ok: false, error: "link" };
  const me = await getMe();
  const { data: report } = await supabase.rpc("staff_report", { p_person: share.person_id, p_program: share.program_id });
  const person = report as { first_name: string; last_name: string } | null;
  const program = (report as { program?: { title: string } } | null)?.program ?? null;
  const values = {
    nombre: `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim(),
    programa: program?.title ?? "",
    docente: `${me.firstName} ${me.lastName}`,
    nota: parsed.data.note,
    link: `${await appUrl()}/r/${parsed.data.token}`,
  };
  const html = renderTemplate(
    `<p>Hola:</p><p>{{docente}} te comparte el reporte de <strong>{{nombre}}</strong> del programa {{programa}} de MY PATH.IA.</p>` +
      (values.nota ? `<p style="white-space:pre-line">{{nota}}</p>` : "") +
      `<p><a href="{{link}}">Ver el reporte</a></p><p style="color:#666;font-size:13px">El link es personal y vence. No lo reenvíes.</p>`,
    values,
  );
  const results = await sendBatch(parsed.data.to.map((addr) => ({ to: addr, subject: `Reporte de ${values.nombre} · MY PATH.IA`, html }))).catch(() => []);
  const sent = results.filter(Boolean).length;
  return sent ? { ok: true, sent } : { ok: false, error: "mail" };
}

// Pide el resumen IA de la clase (la base verifica que la clase terminó y el tope de gasto)
export async function requestClassReport(classId: string, programId: string) {
  if (!uuid.safeParse(classId).success || !uuid.safeParse(programId).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_class_report", { p_class: classId, p_program: programId });
  const status = (data as { status?: string } | null)?.status;
  if (status === "listo") return "listo";
  // Solo si el docente ve la clase (staff_classes la incluye)
  const { data: classes } = await supabase.rpc("staff_classes");
  if (!(classes ?? []).some((c: { class_id: string }) => c.class_id === classId)) return null;
  after(() => generateClassReport(classId, programId));
  return "generando";
}

// "Quiero saber más" de un módulo no contratado: queda registrado y le avisa al equipo de My Path
export async function registerInterest(moduleId: string) {
  if (!/^[a-z0-9_-]{2,40}$/.test(moduleId)) return { ok: false };
  const me = await getMe();
  if (!me.organizationId) return { ok: false };
  const supabase = await createClient();
  const { data: isNew, error } = await supabase.rpc("register_module_interest", { p_org: me.organizationId, p_module: moduleId });
  if (error) return { ok: false };
  const dest = process.env.ALERT_EMAIL;
  if (isNew && dest && mailConfigured()) {
    after(() =>
      sendBatch([
        {
          to: dest,
          subject: `MY PATH · Interés en ${moduleId}`,
          html: renderTemplate("<p>{{org}} pidió más información sobre <strong>{{modulo}}</strong>.</p><p>Panel: admin → Organizaciones.</p>", {
            org: me.organizationName ?? "",
            modulo: moduleId,
          }),
        },
      ]).catch(() => console.error("interés: no se pudo enviar el aviso")),
    );
  }
  return { ok: true };
}
