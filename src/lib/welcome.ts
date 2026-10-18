import "server-only";
import { APP_URL, mailConfigured, renderTemplate, sendBatch } from "@/lib/mail";
import { generatePassword } from "@/lib/password";
import { serviceClient } from "@/lib/supabase/admin";

// Envío de los mails de bienvenida programados.
// Por cada persona: genera la contraseña, crea o actualiza su cuenta y manda el mail.
// La contraseña solo existe en memoria y en el mail; si el mail falla, se reintenta en la próxima pasada.

type Campaign = {
  id: string;
  organization_id: string;
  class_id: string | null;
  subject: string;
  template_html: string;
  only_new: boolean;
  sent_count: number;
  failed_count: number;
};

type Target = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  auth_user_id: string | null;
  must_change_password: boolean;
};

export type WelcomeRun = { ok: true; campaigns: number; sent: number; failed: number } | { ok: false; error: string };

const PAGE = 1000;

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function runWelcomeCampaigns(opts: { campaignId?: string; maxPeople?: number } = {}): Promise<WelcomeRun> {
  const svc = serviceClient();
  if (!svc || !mailConfigured()) return { ok: false, error: "Faltan configurar SUPABASE_SECRET_KEY y RESEND_API_KEY en Vercel" };
  let budget = opts.maxPeople ?? 800;

  let q = svc
    .from("welcome_campaigns")
    .select("id, organization_id, class_id, subject, template_html, only_new, sent_count, failed_count")
    .in("status", ["programado", "enviando"])
    .lte("send_at", new Date().toISOString())
    .order("send_at")
    .limit(5);
  if (opts.campaignId) q = q.eq("id", opts.campaignId);
  const { data: campaigns, error } = await q;
  if (error) return { ok: false, error: "No pudimos leer los mails programados" };

  let sent = 0;
  let failed = 0;
  for (const c of (campaigns ?? []) as Campaign[]) {
    if (budget <= 0) break;
    await svc.from("welcome_campaigns").update({ status: "enviando" }).eq("id", c.id);

    const targets = await loadTargets(svc, c);
    const batch = targets.slice(0, budget);
    budget -= batch.length;

    // 1. Contraseña y cuenta de acceso
    const prepared = await pool(batch, 8, async (t) => {
      const password = generatePassword();
      if (t.auth_user_id) {
        const { error: e } = await svc.auth.admin.updateUserById(t.auth_user_id, { password });
        if (e) return { t, password: null, code: "cuenta" };
        await svc.from("people").update({ must_change_password: true }).eq("id", t.id);
      } else {
        const { data: created, error: e } = await svc.auth.admin.createUser({ email: t.email, password, email_confirm: true });
        if (e || !created.user) return { t, password: null, code: "cuenta" };
        await svc.from("people").update({ auth_user_id: created.user.id, must_change_password: true }).eq("id", t.id);
      }
      return { t, password, code: null as string | null };
    });

    // 2. Mails
    const ready = prepared.filter((p) => p.password);
    const results = ready.length
      ? await sendBatch(
          ready.map((p) => ({
            to: p.t.email,
            subject: c.subject,
            html: renderTemplate(c.template_html, {
              nombre: p.t.first_name,
              apellido: p.t.last_name,
              mail: p.t.email,
              contrasena: p.password!,
              link: `${APP_URL}/login`,
            }),
          })),
        ).catch(() => ready.map(() => false))
      : [];

    const deliveries = [
      ...ready.map((p, i) => ({ campaign_id: c.id, person_id: p.t.id, status: results[i] ? "enviado" : "error", error_code: results[i] ? null : "mail" })),
      ...prepared.filter((p) => !p.password).map((p) => ({ campaign_id: c.id, person_id: p.t.id, status: "error", error_code: p.code })),
    ];
    if (deliveries.length) await svc.from("welcome_deliveries").upsert(deliveries);

    const okCount = deliveries.filter((d) => d.status === "enviado").length;
    const errCount = deliveries.length - okCount;
    sent += okCount;
    failed += errCount;

    const pendingLeft = targets.length - batch.length;
    await svc
      .from("welcome_campaigns")
      .update({
        sent_count: c.sent_count + okCount,
        failed_count: errCount,
        ...(pendingLeft === 0 ? { status: "enviado", finished_at: new Date().toISOString() } : {}),
      })
      .eq("id", c.id);
  }
  return { ok: true, campaigns: campaigns?.length ?? 0, sent, failed };
}

async function loadTargets(svc: NonNullable<ReturnType<typeof serviceClient>>, c: Campaign): Promise<Target[]> {
  const people = new Map<string, Target>();
  for (let from = 0; ; from += PAGE) {
    let q = svc
      .from("memberships")
      .select("class_id, people!inner(id, first_name, last_name, email, auth_user_id, must_change_password, deleted_at)")
      .eq("organization_id", c.organization_id)
      .eq("active", true)
      .is("people.deleted_at", null)
      .range(from, from + PAGE - 1);
    if (c.class_id) q = q.eq("class_id", c.class_id);
    const { data } = await q;
    for (const row of data ?? []) {
      const p = row.people as unknown as Target;
      people.set(p.id, p);
    }
    if (!data || data.length < PAGE) break;
  }

  // Docentes de esa clase
  if (c.class_id) {
    const { data } = await svc
      .from("class_teachers")
      .select("people!inner(id, first_name, last_name, email, auth_user_id, must_change_password, deleted_at)")
      .eq("class_id", c.class_id)
      .is("people.deleted_at", null);
    for (const row of data ?? []) {
      const p = row.people as unknown as Target;
      people.set(p.id, p);
    }
  }

  const done = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data } = await svc
      .from("welcome_deliveries")
      .select("person_id")
      .eq("campaign_id", c.id)
      .eq("status", "enviado")
      .range(from, from + PAGE - 1);
    for (const d of data ?? []) done.add(d.person_id as string);
    if (!data || data.length < PAGE) break;
  }

  return [...people.values()].filter(
    (p) => !done.has(p.id) && (!c.only_new || !p.auth_user_id || p.must_change_password),
  );
}
