import "server-only";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/module-access";

// Solo docentes, coordinadores y el admin. El alumno vuelve a su propia vista.
export async function requireStaff(moduleId = "mento") {
  const ctx = await requireModule(moduleId);
  if (!ctx.me.isAdmin && ctx.me.role !== "docente" && ctx.me.role !== "coordinador") redirect(`/m/${moduleId}`);
  return ctx;
}
