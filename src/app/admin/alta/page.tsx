import { createClient } from "@/lib/supabase/server";
import { AltaPersonas } from "./alta-personas";

export default async function AltaPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, country")
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Alta de personas</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Cargá una persona o el Excel del colegio. Primero ves cómo queda cada fila y después confirmás. El documento se guarda
        cifrado y la contraseña se genera recién cuando sale el mail de bienvenida.
      </p>
      <AltaPersonas orgs={orgs ?? []} />
    </div>
  );
}
