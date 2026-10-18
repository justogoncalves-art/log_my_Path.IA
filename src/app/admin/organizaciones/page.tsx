import Link from "next/link";
import { listOrgs, listResellers } from "@/lib/admin-data";
import { OrgForm } from "./org-form";

const KIND: Record<string, string> = { colegio: "Colegio", profesional: "Profesional", particular: "Particular" };

export default async function OrgsPage() {
  const [orgs, resellers] = await Promise.all([listOrgs(), listResellers()]);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Organizaciones</h1>

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
                <td className="border-b border-line/60 px-4 py-3">{o.country}</td>
                <td className="border-b border-line/60 px-4 py-3 text-muted">{o.resellerName ?? "—"}</td>
                <td className="border-b border-line/60 px-4 py-3">{o.people}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Nueva organización</h2>
        <OrgForm resellers={resellers} />
      </section>
    </div>
  );
}
