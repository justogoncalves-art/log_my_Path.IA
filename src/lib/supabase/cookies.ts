import type { CookieOptions } from "@supabase/ssr";

// Cookies de sesión sin fecha de vencimiento: se borran al cerrar el navegador,
// porque las computadoras del colegio son compartidas.
export function sessionCookieOptions(options: CookieOptions): CookieOptions {
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return { ...rest, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" };
}
