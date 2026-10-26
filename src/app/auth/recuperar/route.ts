import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link del mail de recuperación: valida el código (vale 1 hora, una sola vez), abre la sesión
// y lleva a elegir la contraseña nueva.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash") ?? "";
  const url = request.nextUrl.clone();
  url.search = "";
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) {
    url.pathname = "/recuperar";
    url.searchParams.set("e", "link");
    return NextResponse.redirect(url);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) {
    url.pathname = "/recuperar";
    url.searchParams.set("e", "link");
    return NextResponse.redirect(url);
  }
  url.pathname = "/nueva-contrasena";
  return NextResponse.redirect(url);
}
