import "server-only";
import { redirect } from "next/navigation";
import type { Me } from "@/lib/dal";
import { requireModule } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

// Campus se habilita al alumno cuando termina un programa de Mento.IA (de ahí sale su perfil RIASEC).
// Docentes, coordinadores y el admin lo ven siempre.
export async function campusUnlocked(me: Me) {
  if (me.isAdmin || me.role === "docente" || me.role === "coordinador") return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_completions")
    .select("program_id, programs!inner(module_id)")
    .eq("person_id", me.personId)
    .eq("programs.module_id", "mento")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function requireCampus() {
  const ctx = await requireModule("campus");
  if (!(await campusUnlocked(ctx.me))) redirect("/m/campus/bloqueado");
  return ctx;
}
