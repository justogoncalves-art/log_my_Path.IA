import Link from "next/link";
import { listOrgs } from "@/lib/admin-data";

const KIND: Record<string, string> = { colegio: "Colegio", profesional: "Profesional", particular: "Particular" };

export default async function OrgsPage() {
  const orgs = await listOrgs();
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <p className="eyebrow">Administración</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Organizaciones</h1>
        <Link href="/admin/organizaciones/nueva" className="rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white">
          + Nueva organización
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">El alta es paso a paso: datos, personas, clases, módulos, programas y mail de bienvenida.</p>

      <section className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="border-b border-line px-4 py-3 font-semibold">Nombre</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Tipo</th>
              <th className="border-b border-line px-4 py-3 font-semibold">País</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Reseller</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Personas</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="hover:bg-oat/60">
                <td className="border-b border-line/60 px-4 py-3">
                  <Link href={`/admin/organizaciones/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {o.name}
                  </Link>
                </td>
                <td className="border-b border-line/60 px-4 py-3">{KIND[o.kind] ?? o.kind}</td>
                <td className="border-b border-line/60 px-4 py-3">{names.of(o.country) ?? o.country}</td>
                <td className="border-b border-line/60 px-4 py-3 text-muted">{o.resellerName ?? "—"}</td>
                <td className="border-b border-line/60 px-4 py-3">{o.people}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
