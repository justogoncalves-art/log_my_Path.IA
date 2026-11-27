import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../page-header";
import { AltaPersonas } from "./alta-personas";

const STEPS = [
  { n: 1, title: "Cargá", body: "Una persona a mano o el Excel del colegio." },
  { n: 2, title: "Revisá", body: "Ves cómo queda cada fila y qué hay que corregir." },
  { n: 3, title: "Confirmá", body: "Se guarda todo junto. El documento queda cifrado." },
];

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("organizations").select("id, name, country").eq("active", true).order("name");

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <PageHeader
        icon="alta"
        eyebrow="Gestión"
        title="Alta de personas"
        lead="La contraseña se genera recién cuando sale el mail de bienvenida (o con «Generar contraseña y mostrarla» en Personas)."
      />
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-celeste/20 font-display text-sm font-bold text-opulent">{s.n}</span>
            <span>
              <span className="block font-display font-semibold">{s.title}</span>
              <span className="block text-sm text-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <AltaPersonas orgs={orgs ?? []} initialOrg={orgs?.some((o) => o.id === org) ? org : undefined} />
    </div>
  );
}
