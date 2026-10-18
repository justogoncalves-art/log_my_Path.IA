"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

export type FormState = { error?: string } | undefined;

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
