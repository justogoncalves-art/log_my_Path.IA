import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrg } from "@/lib/admin-data";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await getOrg(id);
  if (!org) notFound();
  const tabs = [
    { href: `/admin/organizaciones/${id}`, label: "Módulos y clases" },
    { href: `/admin/organizaciones/${id}/personas`, label: "Personas" },
    { href: `/admin/organizaciones/${id}/mails`, label: "Mails de bienvenida" },
    { href: `/admin/alta?org=${id}`, label: "Alta de personas" },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/organizaciones" className="text-sm text-muted hover:text-ink">
        ← Organizaciones
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{org.name}</h1>
      <nav aria-label="Secciones" className="mt-5 flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-lg px-3 py-1.5 font-display text-sm font-medium hover:bg-surface">
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
