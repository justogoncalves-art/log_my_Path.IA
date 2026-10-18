import "server-only";
import { notFound, redirect } from "next/navigation";
import { getMe, getMyModules } from "@/lib/dal";

// Verifica que el usuario tenga el módulo activo; si no, 404.
export async function requireModule(moduleId: string) {
  const me = await getMe();
  if (me.mustChangePassword) redirect("/cambiar-contrasena");
  if (!me.organizationId) notFound();
  const mod = (await getMyModules(me.organizationId)).find((m) => m.id === moduleId);
  if (!mod?.active) notFound();
  return { me, mod };
}
