import { isUuid } from "@/lib/staff";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Abre un PDF del programa: la base decide si la persona puede verlo (document_path) y
// el servidor firma un link de 5 minutos al archivo privado.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("No encontrado", { status: 404 });
  const supabase = await createClient();
  const { data: path } = await supabase.rpc("document_path", { p_doc: id });
  const db = serviceClient();
  if (!path || !db) return new Response("No encontrado", { status: 404 });
  const { data } = await db.storage.from("program-docs").createSignedUrl(String(path), 300);
  if (!data?.signedUrl) return new Response("No encontrado", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
