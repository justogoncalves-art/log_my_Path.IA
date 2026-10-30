"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { campusUnlocked } from "@/lib/campus-access";
import { getMe } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

// Guarda o quita un favorito del alumno. Devuelve si quedó guardado (null si falló).
const schema = z.object({ kind: z.enum(["carrera", "universidad"]), id: z.uuid() });

export async function toggleFavorite(kind: string, id: string): Promise<boolean | null> {
  const parsed = schema.safeParse({ kind, id });
  if (!parsed.success) return null;
  if (!(await campusUnlocked(await getMe()))) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("campus_toggle_favorite", { p_kind: parsed.data.kind, p_item: parsed.data.id });
  if (error) return null;
  revalidatePath("/m/campus/favoritos");
  return Boolean(data);
}
