"use server";

import { createHmac } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { appUrl, mailConfigured, renderTemplate, sendBatch } from "@/lib/mail";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

export type FormState = { error?: string } | undefined;

// Huella HMAC con una clave del servidor: no se puede revertir al mail o a la IP
const fingerprint = (value: string) => createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "").update(value).digest("hex");

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || "sin-ip";
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getDict();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  // Mismo mensaje para cualquier fallo: no revela si el mail existe.
  if (!parsed.success) return { error: t.badCredentials };

  // Límite propio de intentos por cuenta y por IP (solo huellas HMAC)
  const svc = serviceClient();
  const emailHash = fingerprint(parsed.data.email);
  const ipHash = fingerprint(await clientIp());
  if (svc) {
    const { data: allowed } = await svc.rpc("login_allowed", { p_email_hash: emailHash, p_ip_hash: ipHash });
    if (allowed === false) return { error: t.tooMany };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (svc) await svc.rpc("login_record", { p_email_hash: emailHash, p_ip_hash: ipHash, p_ok: !error });
  if (error) {
    if (error.status === 429) return { error: t.tooMany };
    return { error: t.badCredentials };
  }
  redirect("/");
}

// Al menos 10 caracteres, con letras y números
const strongPassword = z
  .string()
  .min(10)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getDict();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!strongPassword.safeParse(password).success) return { error: t.passwordWeak };
  if (password !== confirm) return { error: t.passwordMismatch };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: t.passwordSame };
    if (error.code === "weak_password") return { error: t.passwordWeak };
    return { error: t.genericError };
  }
  const { error: rpcError } = await supabase.rpc("complete_password_change");
  if (rpcError) return { error: t.genericError };
  redirect("/");
}

// ─────────────────────────────────────────────────────────────
// "¿Olvidaste tu contraseña?": el mail sale de nuestro servidor (Resend) con un link a nuestro dominio,
// que se valida en /auth/recuperar. Siempre responde lo mismo, exista o no el mail.
// ─────────────────────────────────────────────────────────────
export type RecoverState = { sent?: boolean; error?: string } | undefined;


export async function requestPasswordReset(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const { t, lang } = await getDict();
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) return { error: t.genericError };
  const email = parsed.data;
  const ip = await clientIp();
  const baseUrl = await appUrl();

  // El trabajo va después de responder: la respuesta tarda lo mismo exista o no la cuenta
  after(async () => {
    const svc = serviceClient();
    if (!svc || !mailConfigured()) return;
    const { data: allowed } = await svc.rpc("password_reset_allowed", { p_email_hash: fingerprint(email), p_ip_hash: fingerprint(ip) });
    if (!allowed) return;
    const { data, error } = await svc.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data.properties?.hashed_token) return; // mail no registrado: no se avisa nada
    const link = `${baseUrl}/auth/recuperar?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
    const en = lang === "en";
    await sendBatch([
      {
        to: email,
        subject: en ? "Choose your new MY PATH.IA password" : "Elegí tu nueva contraseña de MY PATH.IA",
        html: renderTemplate(
          en
            ? '<p>Hi,</p><p>We received a request to change your MY PATH.IA password.</p><p><a href="{{link}}">Choose my new password</a></p><p>The link is valid for 1 hour and works only once. If you didn\'t ask for it, ignore this email: your password stays the same.</p>'
            : '<p>Hola:</p><p>Recibimos un pedido para cambiar tu contraseña de MY PATH.IA.</p><p><a href="{{link}}">Elegir mi contraseña nueva</a></p><p>El link vale 1 hora y se usa una sola vez. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.</p>',
          { link },
        ),
      },
    ]).catch(() => console.error("recuperar: no se pudo enviar el mail"));
  });
  return { sent: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "en" ? "en" : "es";
  (await cookies()).set("lang", lang, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
