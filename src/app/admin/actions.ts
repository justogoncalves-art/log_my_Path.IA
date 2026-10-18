"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/dal";
import { importRowsSchema, type ImportResult } from "@/lib/people-import";
import { createClient } from "@/lib/supabase/server";

export type ImportResponse = { ok: true; results: ImportResult[]; saved: boolean } | { ok: false; error: string };

const orgId = z.uuid();

// Valida (commit = false) o guarda (commit = true) un lote de personas.
// La base vuelve a comprobar que quien llama es admin y guarda todo o nada.
export async function importPeople(org: string, rows: unknown, commit: boolean): Promise<ImportResponse> {
  const me = await getMe();
  if (!me.isAdmin) return { ok: false, error: "Sin acceso" };

  const parsedOrg = orgId.safeParse(org);
  const parsedRows = importRowsSchema.safeParse(rows);
  if (!parsedOrg.success) return { ok: false, error: "Elegí una organización" };
  if (!parsedRows.success) return { ok: false, error: "El archivo tiene filas con un formato que no reconocemos (máximo 2000 filas)" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_people", {
    p_org: parsedOrg.data,
    p_rows: parsedRows.data,
    p_commit: commit,
  });
  if (error) {
    // El mensaje de la base no incluye datos personales
    return { ok: false, error: error.message.startsWith("hay ") ? `No se guardó nada: ${error.message}` : "No pudimos procesar el alta" };
  }
  if (commit) revalidatePath("/admin");
  return { ok: true, results: (data ?? []) as ImportResult[], saved: commit };
}
