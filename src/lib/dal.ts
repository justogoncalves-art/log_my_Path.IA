import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Capa de acceso a datos: toda lectura pasa por acá y por las políticas RLS de la base.

export type Me = {
  personId: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  isAdmin: boolean;
  organizationId: string | null;
  organizationName: string | null;
  role: "coordinador" | "docente" | "alumno" | "profesional" | null;
};

export type ModuleTile = {
  id: string;
  name: string;
  summaryEs: string;
  summaryEn: string;
  infoUrl: string | null;
  active: boolean;
};

export const getMe = cache(async (): Promise<Me> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data, error } = await supabase.rpc("me").maybeSingle<{
    person_id: string;
    first_name: string;
    last_name: string;
    must_change_password: boolean;
    is_admin: boolean;
    organization_id: string | null;
    organization_name: string | null;
    role: Me["role"];
  }>();
  if (error || !data) redirect("/login?e=perfil");

  return {
    personId: data.person_id,
    firstName: data.first_name,
    lastName: data.last_name,
    mustChangePassword: data.must_change_password,
    isAdmin: data.is_admin,
    organizationId: data.organization_id,
    organizationName: data.organization_name,
    role: data.role,
  };
});

export async function getMyModules(organizationId: string): Promise<ModuleTile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_modules", { p_org: organizationId });
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((m) => ({
    id: String(m.id),
    name: String(m.name),
    summaryEs: String(m.summary_es),
    summaryEn: String(m.summary_en),
    infoUrl: (m.info_url as string | null) ?? null,
    active: Boolean(m.active),
  }));
}
